# AGENTS.md

本文件用於記錄本專案的重要操作規則，避免後續修改造成已修復功能回歸。

## 1. 專案目的
- 離線可用的商品效期管理 PWA。
- 主要檔案：`inventory-management-app.html`、`app.js`、`styles_washi.css`、`legacy-webview.js`、`settings.html`、`settings.js`、`sw.js`。

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
- 目前 `version.js` 版本為 `v1.5.2`；目前 `sw.js` 快取版本為 `expiry-manager-cache-v290`。

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
  - `legacy-webview.js`
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
- 已選擇支援 Android 8 預設舊 WebView，並完成第一輪前端相容性修改：
  - 已移除所有 optional chaining `?.`。
  - 已改寫所有 object / array spread `...`。
  - 已改寫所有 `String.prototype.replaceAll()`。
  - 已掃描空值合併、邏輯賦值、optional catch binding、`Array.prototype.flat()` 等其他現代 JavaScript 語法。
  - 已同步更新 `sw.js` 與 `CHANGELOG.md`；目前快取版本為 `expiry-manager-cache-v290`。
  - 已將修改後的 `app.js`、`i18n.js`、三個頁面 HTML、`settings.js`、`sw.js` 覆蓋到 Android Studio `assets`，並以 SHA-256 確認來源與目標一致。
- 已修正設定頁底部提示與錯誤視窗未套用英日翻譯的問題，並重新掃描主頁、設定頁、隱私權頁、更新紀錄與動態執行訊息。
- API 26 模擬器已可開啟程式；已針對舊 WebView 不支援 `inset` 與 `display: contents` 的問題，補上 modal、輸入框覆蓋層及商品檢查按鈕的 CSS 相容性修正。
- 已加入 `legacy-webview` 舊引擎偵測，針對 Flex / Grid `gap`、loading 圓環置中、fixed 背景異常放大加入專用 fallback，不影響新版 WebView 樣式。
- 已建立共用 `legacy-webview.js`，集中提供 `includes`、`startsWith`、`endsWith`、`padStart`、`NodeList.forEach`、`Element.closest` 與 `CustomEvent` 等舊 WebView API fallback。
- 已完成全專案 CSS 相容性掃描，針對 `min()` / `max()` 尺寸、安全區定位、`place-items` 與主要 Flex 間距加入 `legacy-webview` 專用覆蓋；純裝飾效果允許舊 WebView 自然降級。
- 下一步需清除 API 26 模擬器 App 資料、重新安裝並確認月曆間距、loading 圓環、背景比例與其餘元素間距。
- 完整裝置測試仍需涵蓋：主頁 / 設定 / 隱私頁、CRUD、分類排序、日期、月曆、所有主題、相機允許 / 拒絕、CSV / JSON、原生檔案位置、modal / dropdown / 掃描返回鍵、IndexedDB 關閉重開後保留。

### 9.5 條碼掃描分析與原生 ML Kit 接續方向
- API 26 開啟鏡頭掃描時出現不支援提示，需依實際提示文字判斷原因：
  - 顯示不支援 `BarcodeDetector`：屬於舊 WebView 缺少 Web Barcode Detection API，不是模擬器相機本身故障。
  - 顯示不支援 `mediaDevices.getUserMedia`：屬於舊 WebView 缺少相機 Web API。
  - 顯示找不到鏡頭或無法開啟鏡頭：才優先檢查模擬器 Camera 設定。
- Android 原生相機權限、`WebChromeClient.onPermissionRequest()` 與 Manifest 設定目前方向正確；尚未透過 ADB 驗證 API 26 模擬器的實際 WebView 版本與 Camera 狀態。
- 建議 Android App 改用 CameraX + bundled ML Kit Barcode Scanning：
  - bundled 模型可離線立即使用，較符合本專案離線需求，但會增加 APK 體積。
  - Web / PWA 環境繼續保留目前 HTML + `BarcodeDetector` 掃描流程作為非 Android fallback。
  - Android 前端透過新增的 `AndroidBridge.requestBarcodeScan(target)` 呼叫原生掃描，掃描成功後由原生事件把條碼與目標欄位資訊傳回網頁。
- CameraX 的 `PreviewView` 是 Android 原生 View，無法直接放入目前 HTML 掃描 modal；若採用原生 ML Kit，需建立新的原生全螢幕掃描 Activity 或等效原生畫面。
- 原生掃描畫面應維持目前視覺風格，但不要求與 HTML modal 像素完全相同：
  - 左上角放關閉按鈕，並支援 Android 返回鍵關閉。
  - 右上角放手電筒按鈕；CameraX / ML Kit 不會自動建立可見按鈕，需自行實作，且只在 `cameraInfo.hasFlashUnit()` 為 true 時顯示。
  - 中央顯示掃描框，掃描框下方顯示「將條碼置於掃描框內」等已翻譯提示。
  - 掃描成功後自動關閉原生畫面，並將結果傳回新增、編輯、搜尋等原本 HTML 欄位。
  - 需處理重複辨識抑制、權限拒絕、生命週期、返回鍵、低階裝置效能及無相機模擬器。
- 尚未開始實作 CameraX / ML Kit；下一個視窗若要執行，應先檢查 Android Studio 專案目前 Gradle、`MainActivity.kt`、`AndroidBridge.kt` 與資源結構，再新增原生掃描流程。

### 9.6 目前未提交工作狀態
- 最後一次提交為：
  - `16adcfe Document Android integration and fix CSV picker`
- 舊 WebView 相容性、翻譯修正、CSS fallback、`legacy-webview.js`、部署資產清單與文件更新目前仍是未提交修改。
- 目前修改 / 新增檔案：
  - `.github/workflows/deploy-pages.yml`
  - `AGENTS.md`
  - `CHANGELOG.md`
  - `README.md`
  - `app.js`
  - `i18n.js`
  - `inventory-management-app.html`
  - `privacy-policy.html`
  - `settings.html`
  - `settings.js`
  - `styles_washi.css`
  - `sw.js`
  - `legacy-webview.js`
- 已完成的驗證：
  - 所有 JavaScript 已通過 `node --check`。
  - 三個 HTML inline script 已完成語法解析檢查。
  - 已掃描已知舊 WebView 不相容 JavaScript 語法。
  - `git diff --check` 已通過。
  - 最新 runtime 前端資產已複製到 Android Studio `app/src/main/assets/`，並以 SHA-256 確認來源與目標一致。
- 開啟新視窗後應先重新讀取本文件與 `git status`；不要遺失或覆蓋目前未提交修改。
