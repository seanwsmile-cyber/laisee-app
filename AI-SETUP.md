# AI 設定

本網站預設呼叫同源 /api/generate；key 只放伺服器環境變數。瀏覽器提交 {style, category, greeting, message, tweak, photos}；最多兩張相片，完整 prompt 及款式模板由伺服器建立。

## 本機安全測試

設定 AI_MOCK=1、AUTH_DISABLED=1，再執行 npm start。畫面可選本地合成；此模式不打付費 API。

## 正式供應商

OpenRouter 使用 AI_PROVIDER=openrouter、OPENROUTER_API_KEY、OPENROUTER_MODEL。預設走 POST /api/v1/images，模板及兩張相片放入 input_references。OPENROUTER_IMAGE_API=0 只適用於支援 chat image generation 的模型；沒有自動跨 endpoint 重試。

Google 使用 AI_PROVIDER=gemini、GEMINI_API_KEY、GEMINI_MODEL，走 Interactions API，store=false。各供應商的保留／濫用防護政策仍適用。

模型供應情況、支援參考圖數量及價格會變；正式上線前在你的帳戶驗證所選模型。不要因為 health 顯示 ready 就當作模型或 key 已測通；ready 只代表設定存在及未被暫停。

## 圖片比例與裁切

目前使用的供應商比例選項沒有 14:27。OpenRouter 的 bytedance-seed 模型預設請求原生 1:2，其他模型預設 9:16；Google Interactions 固定請求 9:16。OPENROUTER_ASPECT_RATIO 可覆寫，但必須是正數 W:H，且等比例置中裁成 14:27 時總裁切不得超過 9%；例如 2:3 會令伺服器拒絕啟動。覆寫值仍須由所選模型支援。

1:2 轉成 14:27 會上下各裁約 1.8%；9:16 則左右各裁約 3.9%。原圖等比例縮放，不拉伸、不補邊。Prompt 要求上下外 5%、左右外 7% 只放可裁背景，主體和文字放得更內。前端會核對實際圖片尺寸，比例偏差過大時報錯並保留原有作品，不會自動付費重試。供應商對 explicit-pixel size 的處理未經實測，不應假設填寫 14:27 像素尺寸就會原樣返回。

參考官方文件：
- https://openrouter.ai/docs/guides/overview/multimodal/image-generation
- https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-5-0-lite/endpoints
- https://openrouter.ai/docs/api/api-reference/api-keys/create-a-new-api-key
- https://ai.google.dev/gemini-api/docs/image-generation

## 費用及失敗

每次 AI 呼叫前先預留配額；每個按鈕操作最多一次 upstream 呼叫。失敗或超時仍可能被供應商計費，因此仍佔網站次數。用戶可明確重試或改用本地合成；不會自動重試或偷偷改用另一個付費模型。

為正式網站使用獨立 key，於供應商端設定金額上限。網站的次數限制不等於實際金額限制。

AI_TIMEOUT_MS 預設 90000，AI_DISABLED=1 可暫停服務。GEN_USAGE_FILE 必須存放在持久磁碟。其他配置及部署步驟見 README.md 和 .env.production.example。
