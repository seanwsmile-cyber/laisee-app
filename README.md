# e-print AI 利是封

香港新年利是封設計器——單頁網頁 app（Vanilla HTML / CSS / JS ES Modules）＋可選本機／雲端 Node proxy。啟用 AI 時相片經伺服器轉送供應商；失敗時可本地 Canvas 合成。

流程參考 Google Gemini × 日本郵便「#Geminiで年賀状」，主體改為利是封。

## 運行方法

**推薦（含 AI proxy）：**

```bash
cd /workspace/laisee-app
cp .env.example .env   # 可先唔填 key
npm start              # node server.mjs → http://127.0.0.1:8765/
```

無 key 時仍可完整用本地 Canvas 合成；詳見 [AI-SETUP.md](./AI-SETUP.md)。

**登入閘：** 預設要 Google／e-print 登入先用得；本機可設 `AUTH_DISABLED=1`。詳見 [AUTH-SETUP.md](./AUTH-SETUP.md)。

**純靜態（無 `/api`）：**

```bash
npm run start:static
# 或 python3 -m http.server 8765
```

ES modules 需經 http(s)，唔好用 `file://`。

## 六個步驟

1. **開始頁** — 品牌「e-print AI 利是封」、繁中／English 切換、揀「🐾 小動物／毛孩」或「👶 小朋友／親子」設計對象、「開始設計」
2. **條款** — 捲到最底先可「同意」；相片權限、個人用途、AI 轉送／本地 fallback 說明
3. **揀款式** — 固定直式 3.5×6.75（約 14:27；API `aspect_ratio` 用 2:3）；分兩大專區獨立顯示：
   - **🐾 小動物／毛孩（8款）**：金光醒獅、牡丹富貴、雪庭柿語、醒獅巡遊、紅韻燈籠、金庭暖陽、燈火許願、煙花螢火（AI Prompt 專注保留品種、毛色、斑紋與喜慶配件）
   - **👶 小朋友／親子（5款・易印簡約版）**：**Q版童趣**、**二頭身寶貝**、**醒獅萌娃**、**小財神寶貝**、**桃花迎春**（專為實體印刷優化：純紅底色、粗線條扁平插畫、零碎光斑，確保印製清晰乾淨）
4. **上載相片** — 1–5 張；拖放或揀檔；可刪縮圖
5. **賀詞** — 預設「恭喜發財」等；自由輸入／短訊息（各 30 字）；「生成利是封」
6. **結果** — 預覽可縮放移動；修改指示＋再生成；**主按鈕「下載 PNG（含出血）」** → `laisee-2026-<時間>-bleed.png`（1125×2100）；**分享**（優先 Web Share 檔案／PNG，否則 url+title；本機無公開 URL 時提示下載後分享）；次要「淨尺寸」→ `laisee-2026-<時間>.png`（1050×2025）；重新開始

## 架構

```
laisee-app/
├── index.html          # 單頁結構（6 個 screen）
├── server.mjs          # 靜態檔 + /api/generate AI proxy（讀 .env）
├── .env.example        # 環境變數範本（唔含真 key）
├── AI-SETUP.md         # AI 出圖設定與驗證
├── AUTH-SETUP.md       # Google／e-print 登入閘
├── auth.mjs            # session + OAuth routes
├── css/styles.css
├── js/
│   ├── i18n.js
│   ├── styles.js       # 十三款風格（毛孩 8 款 + 小朋友易印簡約 5 款）；隱藏 AI prompt（buildPacketPrompt）
│   ├── generate.js     # proxy 優先 → Canvas fallback + 全景刀模展開圖合成
│   ├── auth.js         # 前端登入閘
│   └── app.js
├── assets/styles/
├── scripts/
└── README.md
```

### 生成核心

`generatePacket(...)`（`js/generate.js`）：

1. **AI proxy**（預設）：`POST /api/generate`，由 `server.mjs` 用 `GEMINI_API_KEY`／`OPENROUTER_API_KEY` 代 call；瀏覽器唔放 key
2. **Canvas fallback**：無 key、mock、或上游失敗時，用 front 圖＋相片本地合成，toast／console 有狀態
3. 每款隱藏 prompt 喺 `js/styles.js` 嘅 `buildPacketPrompt`

詳見 [AI-SETUP.md](./AI-SETUP.md)。

### 印刷尺寸（PRINT_SPEC）

| | 吋 | px @ 300 dpi |
|--|--|--|
| **Trim（淨尺寸／預覽）** | 3.5×6.75 | **1050×2025** |
| **含出血（下載主檔）** | 3.75×7（每邊 +0.125 in） | **1125×2100** |
| 安全區 | 距 trim 邊緣約 0.15 in | — |

下載含出血時，會把 trim 圖置中畫上 1125×2100 canvas，邊緣用 **edge-clamp（延伸邊緣色）**，紅底利是封唔會留白邊。預覽／AI 生成仍維持 trim 尺寸。

`js/generate.js` 匯出 `PRINT_SPEC.bleedWidthPx` / `bleedHeightPx`、`getPrintBleedLayout()`、`canvasWithBleed()` / `exportPngWithBleed()`。

### 設計 token

| 變數 | 色值 |
|------|------|
| `--red` | `#b52a2d` |
| `--gold` | `#e1bd62` |
| `--cream` | `#f6efe4` |

字體：Noto Serif TC（標題／賀詞）、Noto Sans TC（介面）。

## 自動化測試截圖

```bash
cd /workspace/laisee-app
npm run test:smoke   # OpenRouter defaults + bleed 尺寸
node scripts/e2e.mjs
```

產出：`shots/style.png`、`greeting.png`、`result.png`、`packet.png`（桌面＋手機闊度）。

## 已知限制

- 無 `.env` key 時為 Canvas 合成；真 AI 需 `GEMINI_API_KEY` 或 `OPENROUTER_API_KEY`
- 目前本機 live 常用 `OPENROUTER_MODEL=bytedance-seed/seedream-5-0-lite`（Google 圖像模型喺部分 OpenRouter 帳號會 403 TOS）
- 字體需載入 Google Fonts（離線時回退系統字）
- 瀏覽器須支援 ES modules、Canvas、Pointer Events、fetch
- Cloudflare quick tunnel URL 會變、無 SLA；長期請用 Fly／Render 等（見 AI-SETUP.md）

## 授權說明

示範專案；產出利是封僅供個人用途（見 app 內條款）。
