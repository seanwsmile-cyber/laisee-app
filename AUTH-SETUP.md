# Google 登入設定

第一版只開放 Google 登入；e-print SSO 尚未實作，不顯示為可用登入方式。

## 本機

AUTH_DISABLED=1 僅可用於開發，production 會拒絕此設定。正式模式前端不會因 API 失敗而自行放行登入。

## 正式設定

在 Google Cloud 建立正式網站的 Web application OAuth client，設定首頁、品牌、私隱頁及支援聯絡。Authorized redirect URI 必須完全匹配 https://你的網域/auth/google/callback。

填入環境變數：PUBLIC_URL、GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、GOOGLE_REDIRECT_URI、SESSION_SECRET、SITE_OPERATOR、SUPPORT_EMAIL。SESSION_SECRET 使用至少 32 字元的高熵隨機值，不要用示例文字。密鑰只在伺服器設定，不要貼入聊天、Git 或截圖。

正式模式啟用 Secure、HttpOnly、SameSite=Lax cookie；session 最長七日。Google token/userinfo 請求有 timeout。登入過期時，介面可開新分頁重新登入，再回原頁繼續本次設計，避免把相片寫入 localStorage。

登出清除本機 cookie；現階段沒有逐一撤銷已複製 session 的管理後台。如有 session 洩漏，輪換 SESSION_SECRET 令舊 session 失效（亦會影響所有用戶及帳戶用量雜湊識別）。

開發／正式 OAuth 分開設定，遵循 Google 的正式應用要求：
https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance

檢查：npm run test:auth 測試未登入阻擋及本機 bypass；npm test 包括 OAuth 錯誤輸入和正式設定驗證。這些測試不聯絡 Google，正式 OAuth 必須另外驗收。
