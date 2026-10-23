# e-print AI 利是封

免費設計及下載的單頁網站：Vanilla HTML/CSS/JS + Node.js，沒有 production npm dependencies。

## 本機預覽

使用 Node.js 22 或以上；正式部署建議使用有安全更新的 Node.js 24 LTS。

1. 複製 .env.example 為 .env。
2. 本機測試設定 AUTH_DISABLED=1、AI_MOCK=1。
3. 在項目資料夾執行 `node server.mjs`（或 `npm start`）。Windows 也可雙擊 `start-local.bat`，它會優先使用 bundled Node，否則使用已安裝的 Node。開啟 [本機預覽](http://127.0.0.1:8765/)。

GitHub 下載版不附 Node.js，請先安裝 Node.js 22 或以上。只啟動網站不需要 `npm install`；以下測試才需要安裝開發依賴。

本機 .env 不會自動成為正式環境設定。測試不讀取 .env、不會打付費 AI。網站需要 Node API，不支援單獨使用靜態 http.server。

## 使用流程

登入 → 同意相片處理條款 → 揀寵物／親子款式 → 上載最多兩張 JPEG/PNG/WebP → 賀詞 → AI 或本地合成 → 下載。

- AI 失敗會保留已有結果，提供明確重試／本地合成選項。
- AI 圖片按接近比例生成後等比裁至 14:27，不拉伸或補邊；邊緣會有少量裁切，重要內容應留在安全區內。
- 主下載是正面含出血 PNG：1125×2100 px，trim 1050×2025 px。
- 刀模展開 PNG 只供預覽，有可見摺線／裁切線，不是印廠認證生產檔。
- 分享圖片及分享網站分開；沒有雲端作品庫、付款或訂單功能。
- privacy.html 和 help.html 在登入前可閱讀。營運者及聯絡資料由環境設定提供。

現有 13 款：毛孩 8 款、小朋友／親子 5 款。親子款包括朱紅祥雲、金橘萌寶、醒獅孖寶、粉桃財神、親子拜年，保留不同底色及單人／雙人模板；實際人數以相片中的人物為準。

## 安全及配額

靜態伺服器使用明確 allowlist；.env、程式碼、測試相片、log、tmp 不公開。生成端點只接受指定款式及受限欄位，prompt 和模板由伺服器建立。正式模式強制 Google 登入、HTTPS callback、安全 cookie 及必要設定。

每次送交 AI 前先持久保存用量，預設每帳戶每日 5 次、每 IP 每日 20 次、全站每日 100 次、全站同時 3 個、每帳戶同時 1 個。限額可調；每日於香港午夜更新。失敗、超時等已送交供應商的嘗試仍佔次數；伺服器不自動重試付費請求。供應商 API key 另設金額上限。

目前僅支援一個 Node 程序／一個容器實例及一份持久用量檔。增加實例前必須改用共享交易式配額儲存，不能直接橫向擴展。

## 正式部署（server 資料之後填）

1. 將 .env.production.example 複製為伺服器的 .env.production，填正式域名、營運者／客服、Google OAuth、SESSION_SECRET 及 AI key。
2. Google OAuth 的 callback 必須完全等於 PUBLIC_URL + /auth/google/callback；正式環境 AUTH_DISABLED=0。
3. 使用 docker compose up -d --build。容器只在主機 127.0.0.1:8765 開放，由你現有 HTTPS reverse proxy 轉送。
4. Proxy 需容許至少 130 秒 upstream response timeout 及 12 MiB request body。不能讓 CDN 公開快取 /api/* 或 /auth/*。
5. 按實際部署填 TRUSTED_PROXY_IPS。只填直接連接 Node 的可信代理 IP；該代理必須覆寫／在 X-Forwarded-For 最後加入真實來源。未設定時忽略所有 forwarded headers，所有 proxy 後用戶可能共用一個 IP 額度。
6. 使用持久 volume 保存 /data，備份用量檔。不要在更新時刪除 volume；不要執行 compose down -v。
7. 補正式 Google 登入、一次真 AI 出圖、iPhone/Android 上載及下載驗收，再對外公布。

Docker image 只包含服務及公開素材，不含 .env、測試相片、node_modules 或 bundled Windows Node。正式環境缺少必要設定會拒絕啟動。若不用 Docker，將相同環境變數交予服務管理器，GEN_USAGE_FILE 設為絕對持久路徑，配置自動重啟。

## 維護

- GET /api/health：程序健康及 AI 模式；不會打 AI 供應商。
- GET /api/usage：登入後可見本人及全站剩餘額度。
- 生成 log 只記 requestId、結果與耗時，不記相片、prompt 或 key。監察失敗率、延遲、磁碟及供應商消費；主機 log retention 由營運者配置。
- 暫停 AI：設定 AI_DISABLED=1 並重新啟動，或在 AI_DISABLE_FILE 指定位置建立空檔（Compose 為 /data/ai-paused）；移除該空檔可恢復。請先確認該路徑是這個網站的暫停標記。網站本地合成仍可用。
- 回退：部署上一版來源／image，保留同一份環境變數及持久 volume；不要重新歸零用量。
- 本機開發輸出及資料不應進 Git。首次公開前，若舊版曾公開過，輪換可能外露的 API/OAuth/session secrets。

## 驗證

```powershell
npm install
npm test
npm run test:e2e
```

Browser tests 會使用已安裝的 Chrome／Edge；若兩者都沒有，先執行 `npx playwright install chromium`。

Smoke tests 包括輸入驗證、私有檔案封鎖、OAuth 錯誤、IP 偽造、並行配額、持久儲存及印刷出血。Browser tests 使用合成圖片及 mock API，驗證桌面／手機尺寸的設計、失敗恢復、下載及資料披露；產物位於 shots/。無法代替真機、真 Google 或真 AI 驗收。

本專案尚未部署至你的正式 server。正式營運及客服資料、供應商保留政策和印廠交稿規格，需在公開前填妥／確認。
