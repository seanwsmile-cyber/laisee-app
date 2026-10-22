# AI 出圖設定（本機 proxy）

> **登入閘：** 預設未登入時 `POST /api/generate` 回 **401**。本機開發可設 `AUTH_DISABLED=1`。詳見 [AUTH-SETUP.md](./AUTH-SETUP.md)。

瀏覽器**唔會**持有 API key。出圖經本機 `server.mjs` 代 call Gemini（預設）或 OpenRouter；無 key／失敗時自動 **Canvas 本地合成**。

## 快速開始（無 key／dry-run）

```bash
cd /workspace/laisee-app
cp .env.example .env   # 可留空 key
npm start              # node server.mjs → http://127.0.0.1:8765/
```

驗證：

```bash
curl -s http://127.0.0.1:8765/api/health
# → ai.ready=false, reason 含 GEMINI_API_KEY missing

curl -s -X POST http://127.0.0.1:8765/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test red packet"}'
# → HTTP 503, fallback:true, error: AI_NOT_CONFIGURED
```

開瀏覽器跑完整流程：結果 toast 會顯示「AI 未接通／失敗，已用本地合成」；console 有 `[laisee] AI proxy → Canvas fallback`。

純靜態（無 proxy）仍可用：

```bash
npm run start:static
# 或 python3 -m http.server 8765
```

此時 `/api/generate` 404，前端同樣 fallback 到 Canvas。

## 接真 AI（Sean 提供 key 後）

1. 喺 [Google AI Studio](https://aistudio.google.com/apikey) 開 `GEMINI_API_KEY`（或改用 OpenRouter）。
2. 寫入 `.env`（唔好 commit）：

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=你的key
# 可選：GEMINI_MODEL=gemini-nano-banana-2.1
```

3. 重啟 `npm start`，再 `curl /api/health` 應見 `ready: true`。
4. App 內生成成功會 toast「已用 AI 生成利是封」。

### OpenRouter

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-2.5-flash-image
# 可選：OPENROUTER_ASPECT_RATIO=2:3   # 利是封約 2:3／9:16
# 可選：OPENROUTER_IMAGE_API=1        # 預設用 POST /api/v1/images（失敗會 fallback chat）
```

有效模型 id 例：`google/gemini-2.5-flash-image`、`google/gemini-3.1-flash-image`、`google/gemini-nano-banana-2.1`。
**唔好**再用已下架嘅 `google/gemini-2.5-flash-image-preview`（會 404）。
Proxy 優先打 OpenRouter Image API（`aspect_ratio` + `input_references`），失敗先試 chat completions。

若 Google 模型回 **403 Terms Of Service**（即使 text model 都係），通常係 OpenRouter 帳號對 Google provider 被拒，唔係 model id 錯。可改：

```bash
OPENROUTER_MODEL=bytedance-seed/seedream-5-0-lite
```

`server.mjs` 預設仍係 `google/gemini-2.5-flash-image`（正確 slug）；本機 `.env` 可覆寫。

## 環境變數

| 變數 | 說明 |
|------|------|
| `AI_PROVIDER` | `gemini`（預設）或 `openrouter` |
| `GEMINI_API_KEY` | Gemini key |
| `GEMINI_MODEL` | 預設 `gemini-2.5-flash-image` |
| `OPENROUTER_API_KEY` | OpenRouter key |
| `OPENROUTER_MODEL` | OpenRouter 圖像模型 id |
| `AI_MOCK` | `1` = 強制唔 call 上游（dry-run） |
| `PORT` | 預設 `8765` |

## API

- `GET /api/health` → `{ ok, ai: { ready, mode, provider, ... } }`
- `POST /api/generate` body: `{ prompt, photos?: string[] /* data URLs */ }`  
  成功：`{ ok, mode:'ai', dataUrl, provider, model }`  
  未設定／失敗：`{ ok:false, fallback:true, error, message }`

## 注意

- 會上傳相片到本機／部署 server，再轉送供應商；條款（`js/i18n.js` termsBody）已改為誠實描述 AI 轉送與 Canvas fallback。
- 唔好喺前端、git、截圖披露真 key。
- 本專案唔代發佈 production、唔代買域名。

## 安全備註

- `.env` 已列入 `.gitignore`；只提交 `.env.example`。
- 若 shell 已 export `GEMINI_API_KEY`，即使 `.env` 留空，server 仍可能進入 live 模式。本機 dry-run 請設 `AI_MOCK=1`，或 `env -u GEMINI_API_KEY npm start`。
- Executor／本機驗證**唔會**故意打付費上游；要真出圖請 Sean 明確確認預算後先關 mock。

## 公開 HTTPS（最快路徑）

### A. Cloudflare Quick Tunnel（免帳號、臨時）

本機已跑 `npm start`（`127.0.0.1:8765`）時：

```bash
cloudflared tunnel --url http://127.0.0.1:8765
```

會印出 `https://….trycloudflare.com`。手機用該 HTTPS 開；`/api/generate` 經同一 origin，key 只喺 server。
注意：URL 每次重啟會變、無 uptime 保證。

### B. 可跑 Node 的平台（較穩）

共通：

1. 唔好 commit `.env`；喺平台設 secret：`AI_PROVIDER`、`OPENROUTER_API_KEY`、`OPENROUTER_MODEL`（建議 `bytedance-seed/seedream-5-0-lite`）、`PORT`（平台通常自設）
2. Start command：`node server.mjs`
3. 確保 process listen `0.0.0.0`（見下方 `HOST`）

**Render：** Web Service，root = repo，build 可空或 `npm ci`，start = `node server.mjs`，加 env。

**Railway / Fly.io / DigitalOcean App Platform：** 同樣 Node start；Fly 可用 `fly launch` 再 `fly secrets set OPENROUTER_API_KEY=…`。

`server.mjs` 支援 `HOST`（預設 `127.0.0.1` 本機安全；雲端設 `HOST=0.0.0.0`）。
