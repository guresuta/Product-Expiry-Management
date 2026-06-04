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
- 目前 `version.js` 版本為 `v1.5.2`；目前 `sw.js` 快取版本為 `expiry-manager-cache-v286`。

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

## 9. Android Studio 正式整合接續紀錄（2026-06-05）

### 9.1 Android Studio 專案與 assets
- 使用者已在 Android Studio 建立 `ProductExpiryCyberControl2` 專案，正式 package / namespace / applicationId 已改為：
  - `com.guresuta.productexpirycybercontrol`
- Android Studio 專案位於：
  - `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2`
- `KEITAIHAN` 是前端原始來源；測試發現前端問題時，先修改本資料夾，再把必要前端資產複製到 Android Studio 的：
  - `app/src/main/assets/`
- Android 原生檔案（例如 `MainActivity.kt`、`AndroidBridge.kt`、`AndroidManifest.xml`、Gradle、`res/`）只在 Android Studio 專案維護。
- assets 必須包含目前實際執行資產：
  - `inventory-management-app.html`
  - `settings.html`
  - `privacy-policy.html`
  - `index.html`
  - `styles_washi.css`
  - `i18n.js`
  - `app.js`
  - `settings.js`
  - `version.js`
  - `sw.js`
  - `manifest.webmanifest`
  - `favicon.ico`
  - `fonts/`
  - `icons/`
  - `key-visuals/background-neon-cyber.png`
  - `key-visuals/background-daylight-cyber.png`
  - `key-visuals/background-vibrant-oasis.png`
  - `key-visuals/background-midnight-oasis.png`
- `background.png` 與 `key-visuals/key-visual-hybrid-*.jpg` 是來源 / 預覽素材，不是目前執行必要資產。

### 9.2 已完成的 Android 原生整合
- `app/build.gradle.kts` 已加入 AndroidX WebKit；專案目前使用 `compileSdk = 36`、`targetSdk = 36`、`minSdk = 26`。
- 若 AndroidX Core 解析到 `1.19.0` 並要求 API 37，應在 version catalog 將 Core / Core KTX 固定為與 `compileSdk 36` 相容的版本；不要為了此依賴直接改用 API 37 preview。
- `MainActivity.kt` 已使用 `WebViewAssetLoader`，入口網址為：
  - `https://appassets.androidplatform.net/assets/inventory-management-app.html`
- WebView 安全設定需維持：
  - `javaScriptEnabled = true`
  - `domStorageEnabled = true`
  - `allowFileAccess = false`
  - `allowContentAccess = false`
  - `mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW`
- 已加入相機 runtime permission 與 `WebChromeClient.onPermissionRequest()`；只允許 `appassets.androidplatform.net` 的 `RESOURCE_VIDEO_CAPTURE`。
- 已加入 `WebChromeClient.onShowFileChooser()`；JSON 還原可選擇，CSV 若在 Android 檔案選擇器反灰，需要以 `ACTION_OPEN_DOCUMENT` + `type = "*/*"` + CSV / JSON MIME 清單處理。
- 已建立完整 `AndroidBridge`，前端目前會使用以下方法：
  - `hasSelectedDbFile`
  - `readDatabaseFile`
  - `writeDatabaseFile`
  - `requestSelectDbFile`
  - `requestExportCsvFile`
  - `requestExportJsonFile`
  - `setStatusBarColor`
  - `setScreenBrightnessMax`
  - `resetScreenBrightness`
- 原生檔案建立 / 匯出完成後，需通知前端以下事件：
  - `android-db-file-selected`
  - `android-csv-exported`
  - `android-json-exported`
- `AndroidBridge` 使用 Storage Access Framework；禁止加入 `READ_EXTERNAL_STORAGE`、`WRITE_EXTERNAL_STORAGE`、`MANAGE_EXTERNAL_STORAGE`。
- 加入 `addJavascriptInterface` 後，WebView 導航必須限制為 `appassets.androidplatform.net`；外部 HTTP / HTTPS 連結用系統瀏覽器開啟。
- `window.statusBarColor` 在新版 Android 顯示 deprecated 警告，但不是建置錯誤；目前可保留功能。
- Android 返回鍵已改為主頁二次確認；第一次透過網頁既有 `showToast()` 顯示主題化「再按一次返回鍵關閉app」，2 秒內第二次才關閉 App，不使用 Android 原生 Toast。

### 9.3 已完成的裝置測試
- Pixel 7：可成功執行。
- Pixel 10 Pro XL：可成功執行。
- Android 8 / API 26 預設智慧型手機模擬器：只能看到藍色畫面。
- API 26 Logcat 已確認沒有 Android `FATAL EXCEPTION`；問題是舊 Chromium / WebView 無法解析目前前端 JavaScript：
  - `Uncaught SyntaxError: Unexpected token '.'`
  - `Uncaught SyntaxError: Unexpected token '...'`
- 已確認的舊 WebView 不相容語法包含：
  - `i18n.js` optional chaining，例如 `element?.closest?.(...)`
  - `settings.js` optional chaining，例如 `entry?.version`
  - `app.js` / `settings.js` object spread、array spread，例如 `{ ...item }`、`[...products]`
  - `app.js` / `settings.js` 的 `String.prototype.replaceAll()`
- 因此 API 26 藍畫面不是 MainActivity / AndroidBridge 原生崩潰，而是舊 WebView JavaScript 相容性問題。

### 9.4 下一步
- 先決定 Android 8 / API 26 支援策略：
  1. 僅支援已更新 Android System WebView 的 Android 8 裝置；使用 Google Play API 26 映像更新 WebView 後重新測試。
  2. 若必須支援 Android 8 預設舊 WebView，需完整進行前端相容性修改 / transpile，不可只修 Logcat 當下顯示的三行。
  3. 若不支援 Android 8，可提高 `minSdk`，但仍應測試目標最低版本的 WebView。
- 若執行舊 WebView 相容性修改，必須至少處理：
  - 所有 optional chaining `?.`
  - 所有 object / array spread `...`
  - 所有 `replaceAll()`
  - 再掃描其他現代 JavaScript 語法
  - 更新 `sw.js` 快取版本與 `CHANGELOG.md`
  - 重新複製修改後資產到 Android Studio `assets`
  - 清除 API 26 模擬器 App 資料並重新安裝測試
- 完整裝置測試仍需涵蓋：主頁 / 設定 / 隱私頁、CRUD、分類排序、日期、月曆、所有主題、相機允許 / 拒絕、CSV / JSON、原生檔案位置、modal / dropdown / 掃描返回鍵、IndexedDB 關閉重開後保留。
