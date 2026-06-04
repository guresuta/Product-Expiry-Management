# AGENTS.md

本文件用於記錄本專案的重要操作規則，避免後續修改造成已修復功能回歸。

## 1. 專案目的
- 離線可用的商品效期管理 PWA。
- 主要檔案：`inventory-management-app.html`、`app.js`、`styles_washi.css`、`settings.html`、`settings.js`、`sw.js`。

## 2. 資料與儲存
- 預設資料儲存在裝置本機 `IndexedDB`。
- 不主動上傳商品資料到 GitHub Pages。
- 匯入匯出支援 CSV / JSON（JSON 用於備份與還原）。

## 3. 目前 UI / 互動關鍵規則
- 商品清單在 `< 1525px` 顯示卡片模式；`>= 1526px` 顯示表格模式。
- 月曆可點擊有標示顏色的日期，篩選該日商品；再點同日取消篩選。
- 月曆標示色使用主題變數（相似色調）：
  - `--calendar-mark-bg`
  - `--calendar-mark-border`
  - `--calendar-mark-text`
- 商品清單桌面表格欄寬固定（`>= 1526px`）避免篩選後排版跳動。
- 長按商品列可開啟條碼視窗；桌面右鍵不觸發條碼視窗。
- 主頁與設定頁標題區塊固定在畫面上方，不跟隨下方內容捲動；標題區塊有 3px 主題色底部邊框，標題文字飾條桌面模式顯示完整寬度，手機模式顯示縮短版底線。
- 主頁底部有「返回頂端」按鈕，滾動到一定距離後顯示。
- 商品清單「刪除」按鈕目前與「編輯」按鈕同樣式，不使用紅色 danger 樣式。
- 目前只保留四個主題：「霓虹電馭」「日光電馭」「活力綠洲」「深夜綠洲」；預設主題為「霓虹電馭」，主題 key 使用 `dark-1`、`light-1`、`light-2`、`dark-2`。
- 設定頁「介面模式」有語言選單，語言設定存在 `localStorage.appLanguage`，預設 `zh-Hant`，由 `i18n.js` 套用到主頁、設定頁與隱私權頁；語言選單需使用與主頁分類選單相同的主題化自建 dropdown，選單內文字固定顯示「中文」「English」「日本語」，不套用翻譯。
- Android / WebView 測試版需維持基本返回鍵行為：modal 或掃描視窗開啟時，返回鍵先關閉最上層視窗；設定頁返回主頁。
- 觸控操作元件需盡量接近 Android 48dp 觸控目標，避免按鈕、分類刪除、checkbox、月曆日期過小。
- 四種主題背景紋路使用 `key-visuals/background-*.png` 的 3840x2160 高解析資產與 CSS `background-attachment: fixed`；主頁、設定頁、隱私權頁與讀取頁面都需套用對應主題背景，讀取頁面需等背景圖 ready 後再與 spinner 同步顯示，商品清單/卡片透明度需跟商品效期月曆一致。
- 新增商品視窗的分類選單需記憶上一次成功新增或覆蓋商品時使用的分類；手機卡片模式商品卡片需比商品效期月曆再提高 15% 透明度。
- 主頁、設定頁與隱私權頁的 inline boot script 需在 loading 畫面前段先呼叫 `AndroidBridge.setStatusBarColor()`，避免 Android 狀態列先顯示舊色再切換。

## 4. 版面佈局（桌面）
- 新增商品區塊已改為彈出式 modal，由頂部導覽列「新增商品」按鈕開啟。
- 主內容為單欄排列：月曆（上）+ 商品清單（下）。
- 月曆固定顯示，不提供「關閉月曆 / 打開月曆」切換按鈕。
- 月曆寬度跟隨商品清單欄寬。

## 5. Service Worker / 發版規則
- 每次改動前端資產（HTML/CSS/JS）需同步遞增 `sw.js` 的 `CACHE_NAME`。
- 若使用者回報「未生效」，先確認快取版本與強制重新整理。
- 不主動更新 `version.js`；只有使用者明確要求更新版本 / 更新紀錄時才修改。
- 打包 APK 時需以 `version.js` 的 `APP_RELEASE.version` 作為 Android `versionName` 來源，並同步產生對應 `versionCode`。
- 每次專案修改都要同步更新 `CHANGELOG.md`。
- 目前 `version.js` 版本為 `v1.5.2`；目前 `sw.js` 快取版本為 `expiry-manager-cache-v285`。

## 6. 修改準則
- 以「不破壞既有功能」為最高優先。
- 優先小幅變更，避免一次大改動。
- 使用者已要求維持現狀：不要主動刪除疑似多餘代碼，除非使用者明確指定要刪。
- 變更 UI 前先比對以下影響面：
  - 桌面版（>=1526）
  - 卡片版（<1525）
  - 深色主題
  - 月曆篩選後清單排版

## 7. 已檢視但暫不刪除的疑似多餘代碼
- `.theme-section`、`.release-history-section`、`.update-notice-modal`、`.empty-hint` 等語意 class 可保留，不建議為了精簡而主動刪除。

## 8. 建議測試清單
- 新增 / 編輯 / 刪除商品
- 月曆標示與日期篩選
- 條碼掃描（輸入、搜尋、編輯）
- 主題切換（含月曆標示色）
- CSV/JSON 匯入匯出
- 重新整理後資料保留與 PWA 快取更新
