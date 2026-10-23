import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { isIP } from 'node:net';

const heldLocks = new Set();

export function hongKongDay(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}

const normalizeIp = (ip) => String(ip || '').replace(/^::ffff:/, '');

export function clientIp(req, trustedProxies = []) {
  const remote = normalizeIp(req.socket?.remoteAddress);
  // Trust only an explicitly configured proxy peer, and take its appended hop.
  if (trustedProxies.includes(remote)) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim();
    if (isIP(forwarded)) return normalizeIp(forwarded);
  }
  return remote || 'unknown';
}

/** ponytail: one process and one persistent volume; use a transactional database before scaling out. */
export function createUsageStore({ file, secret, dailyLimit = 100, accountLimit = 5, ipDailyLimit = 20, ipLimit = 10, ipWindowMs = 600000, concurrency = 3 }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  const lockKey = process.platform === 'win32' ? path.resolve(lock).toLowerCase() : path.resolve(lock);
  const owner = JSON.stringify({ pid: process.pid, hostname: os.hostname(), token: crypto.randomUUID() });
  if (heldLocks.has(lockKey)) throw new Error('EEXIST: usage store is already open in this process');
  try {
    const existing = JSON.parse(fs.readFileSync(lock, 'utf8'));
    const existingPid = typeof existing === 'number' ? existing : existing.pid;
    if (!Number.isSafeInteger(existingPid) || existingPid <= 0) throw new Error('Invalid usage lock; operator must inspect it');
    if (existing.hostname && existing.hostname !== os.hostname()) throw new Error('Usage volume is locked by another host/container. Stop the previous instance and inspect/remove the stale .lock file before starting.');
    // A restarted container may reuse its previous Node PID. This module has not
    // acquired this lock, so a same-host, same-PID record is a previous process.
    // This is a single-instance guard, not a distributed/container lease.
    if (existingPid === process.pid) fs.unlinkSync(lock);
    else {
      try { process.kill(existingPid, 0); }
      catch (error) {
        if (error.code === 'ESRCH') fs.unlinkSync(lock);
        else throw error;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  fs.writeFileSync(lock, owner, { flag: 'wx', mode: 0o600 });
  heldLocks.add(lockKey);
  let state;
  let failed = false;
  let active = 0;
  const activeUsers = new Set();
  const ipHits = new Map();
  const hash = (value) => crypto.createHmac('sha256', secret).update(value).digest('hex');
  const fresh = () => ({ version: 1, day: hongKongDay(), count: 0, accounts: {}, ips: {} });
  let closed = false;
  const close = () => {
    if (closed) return;
    if (fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === owner) fs.unlinkSync(lock);
    heldLocks.delete(lockKey);
    closed = true;
  };
  try {
    try {
      state = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Preserve the previous version's global count during the first upgrade.
      if (state && !state.version && Number.isSafeInteger(state.count)) state = { ...state, version: 1, accounts: {}, ips: {} };
      if (!state || state.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(state.day) || !Number.isSafeInteger(state.count) || state.count < 0 || !state.accounts || !state.ips || Array.isArray(state.accounts) || Array.isArray(state.ips)) throw new Error('Invalid usage record');
      for (const values of [state.accounts, state.ips]) {
        if (typeof values !== 'object' || Object.values(values).some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid usage counters');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = fresh();
    }
  } catch (error) { close(); throw error; }

  function save(next) {
    let fd;
    try {
      fd = fs.openSync(`${file}.tmp`, 'w', 0o600);
      fs.writeFileSync(fd, JSON.stringify(next));
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(`${file}.tmp`, file);
      state = next;
    } catch {
      failed = true;
      throw Object.assign(new Error('暫時無法確認生成額度，請稍後再試。'), { status: 503, code: 'USAGE_UNAVAILABLE' });
    } finally { if (fd !== undefined) fs.closeSync(fd); }
  }

  function usage(userKey, ip) {
    if (state.day !== hongKongDay()) save(fresh());
    const user = hash(`account:${userKey}`);
    const ipKey = hash(`ip:${ip}`);
    const now = Date.now();
    for (const [key, times] of ipHits) {
      const current = times.filter((time) => now - time < ipWindowMs);
      if (current.length) ipHits.set(key, current); else ipHits.delete(key);
    }
    const remaining = Math.max(0, dailyLimit - state.count);
    const userUsed = state.accounts[user] || 0;
    const userRemaining = Math.max(0, accountLimit - userUsed);
    const busy = active >= concurrency || activeUsers.has(user);
    const scope = failed ? 'storage' : remaining === 0 ? 'daily' : userRemaining === 0 ? 'account' : (state.ips[ipKey] || 0) >= ipDailyLimit || (ipHits.get(ipKey) || []).length >= ipLimit ? 'ip' : busy ? 'busy' : null;
    return { day: state.day, used: state.count, limit: dailyLimit, remaining, userUsed, userLimit: accountLimit, userRemaining, busy, available: !scope, scope, resetAt: new Date(Date.parse(`${state.day}T00:00:00+08:00`) + 86400000).toISOString(), maxPhotos: 2 };
  }

  function reserve(userKey, ip) {
    const current = usage(userKey, ip);
    if (!current.available) {
      const busy = current.scope === 'busy';
      throw Object.assign(new Error(busy ? '正在處理生成，請稍後再試。' : current.scope === 'storage' ? '暫時無法確認生成額度。' : '生成次數已達上限，請稍後或香港時間午夜後再試。'), { status: current.scope === 'storage' ? 503 : 429, code: current.scope === 'storage' ? 'USAGE_UNAVAILABLE' : busy ? 'BUSY' : 'RATE_LIMITED', scope: current.scope });
    }
    const user = hash(`account:${userKey}`);
    const ipKey = hash(`ip:${ip}`);
    // Persist before the network call. Failed/ambiguous provider attempts stay charged.
    save({ ...state, count: state.count + 1, accounts: { ...state.accounts, [user]: (state.accounts[user] || 0) + 1 }, ips: { ...state.ips, [ipKey]: (state.ips[ipKey] || 0) + 1 } });
    ipHits.set(ipKey, [...(ipHits.get(ipKey) || []), Date.now()]);
    active++;
    activeUsers.add(user);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active--;
      activeUsers.delete(user);
    };
  }
  return { usage, reserve, close };
}
