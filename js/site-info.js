// Public metadata only. Never render server configuration as HTML.
try {
  const response = await fetch('/api/site-config', { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('unavailable');
  const config = await response.json();
  document.querySelectorAll('[data-site-operator]').forEach((el) => {
    if (config.operatorName) el.textContent = config.operatorName;
  });
  document.querySelectorAll('[data-site-contact]').forEach((el) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail || '')) return;
    const link = document.createElement('a');
    link.href = `mailto:${encodeURIComponent(config.supportEmail)}`;
    link.textContent = config.supportEmail;
    el.replaceChildren(link);
  });
  document.querySelectorAll('[data-site-provider]').forEach((el) => {
    el.textContent = config.aiProvider === 'gemini' ? 'Google Gemini' : config.aiProvider === 'openrouter' ? 'OpenRouter 及其上游模型供應商 / OpenRouter and its model provider' : '尚未設定 / Not configured';
  });
  if (!config.operatorName || !config.supportEmail) {
    document.querySelectorAll('[data-site-status]').forEach((el) => {
      el.textContent = '測試版本：正式營運及聯絡資料尚未設定。 / Test version: operator and contact details are not yet configured.';
    });
  }
} catch {
  document.querySelectorAll('[data-site-provider]').forEach((el) => { el.textContent = '未能載入，請稍後再試 / Unable to load'; });
  document.querySelectorAll('[data-site-status]').forEach((el) => { el.textContent = '暫時未能取得聯絡資料，請稍後重新整理。 / Contact details could not be loaded. Please refresh later.'; });
}
