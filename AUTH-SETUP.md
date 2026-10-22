# 登入閘設定（Google + e-print）

未登入時只見登入頁；已登入先可用六步流程同 `POST /api/generate`。  
Session 用 **httpOnly cookie**（HMAC 簽章，`SESSION_SECRET`）。

## 本機快速跳過（開發）

```bash
# .env
AUTH_DISABLED=1
```

重啟 `npm start` 後無需登入；`/api/me` 回傳假用戶。**預設要登入**（唔設或 `AUTH_DISABLED=0`）。

## 環境變數（見 `.env.example`）

| 變數 | 說明 |
|------|------|
| `SESSION_SECRET` | 簽 session cookie 用（長隨機字串）；未設且非 `AUTH_DISABLED` 時 Google 登入會拒絕 |
| `AUTH_DISABLED` | `1` = 本機跳過登入閘 |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret（**唔好 commit／print**） |
| `GOOGLE_REDIRECT_URI` | 預設 `http://127.0.0.1:8765/auth/google/callback` |
| `EPRINT_AUTH_URL` | 有則「e-print 帳號登入」會 redirect 去呢個 URL |
| `EPRINT_AUTH_ENABLED` | `0` = 掣顯示「即將推出」並 disabled（預設：無 URL 時等同未啟用） |
| `COOKIE_SECURE` | `1` = cookie 加 `Secure`（HTTPS 先開） |

## 申請 Google OAuth（Sean 要做）

1. 開 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. 建立 **OAuth 2.0 Client ID**（類型：Web application）
3. Authorized redirect URIs 加：
   - `http://127.0.0.1:8765/auth/google/callback`
   - （日後正式域名）`https://你的域名/auth/google/callback`
4. 將 Client ID / Secret 寫入本機 `.env`（唔好 commit）：

```bash
SESSION_SECRET=請用長隨機字串
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=....
GOOGLE_REDIRECT_URI=http://127.0.0.1:8765/auth/google/callback
```

5. 重啟 `npm start`，開 `http://127.0.0.1:8765/` → 「使用 Google 登入」

**未填 client id 時：** 登入頁 Google 掣會 disabled，並顯示「未設定 Google 登入」——伺服器唔會 crash。

### 流程（已實作）

- `GET /auth/google` → redirect Google authorization code flow
- `GET /auth/google/callback` → 換 token、讀 userinfo、設 session cookie → `/`
- `GET /api/me` → 而家用戶（未登入 401）
- `POST /api/logout` → 清 cookie
- `GET /api/auth/config` → 前端用嚟決定掣可唔可用（唔含 secret）

## e-print SSO（待接 — 唔好自稱已接通）

UI 已有「e-print 帳號登入」掣。

- 未有 `EPRINT_AUTH_URL`（或 `EPRINT_AUTH_ENABLED=0`）：掣 **disabled**，文案「即將推出／待接 e-print SSO」
- 有 `EPRINT_AUTH_URL`：`GET /auth/eprint` redirect 去該 URL（query／state 日後再接）
- **預留** `GET|POST /auth/eprint/callback` → 而家回 **501** `EPRINT_SSO_NOT_WIRED`

### 請 e-print／Sean 提供

1. **Authorize URL**（OAuth／OIDC authorization endpoint）
2. **Client ID**（同如有 Client Secret）
3. **Redirect / callback URI**（建議：`http://127.0.0.1:8765/auth/eprint/callback`；正式環境對應 HTTPS）
4. **Scopes**
5. **Userinfo 格式**（或 ID token claims）：至少要有穩定 `sub`／用戶 id、顯示名、電郵
6. Token endpoint（authorization code flow）同任何 brand 要求（按鈕文案／logo）

收到後再喺 `auth.mjs` 接真換 token＋寫 session；而家刻意唔假稱已接通。

## API 保護

- `POST /api/generate`：未登入 → **401** `UNAUTHORIZED`（`AUTH_DISABLED=1` 除外）
- 靜態頁（`index.html`、JS、CSS）仍可開；前端用 `#auth-gate` 擋住六步流程

## Smoke（唔打真 Google）

```bash
node scripts/smoke-auth.mjs
```

會測：未登入 generate → 401；`AUTH_DISABLED=1` 時放行（子進程短測）。

## 安全提醒

- **唔好**把 `GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`、OpenRouter／Gemini key 寫入 git、截圖或 chat
- **唔好** embed 假 Google client id
- 本文件唔做公開 HTTPS 部署步驟；本地預設 `127.0.0.1`
