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
- 設定頁分類標籤需允許手指落在標籤上時仍可滑動頁面；只有長按進入分類排序拖曳後才鎖定頁面捲動，並允許分類標籤上下拖曳重排。
- 四種主題背景紋路使用 `key-visuals/background-*.png` 的 3840x2160 高解析資產與 CSS `background-attachment: fixed`；主頁、設定頁、隱私權頁與讀取頁面都需套用對應主題背景，讀取頁面需等背景圖 ready 後再與 spinner 同步顯示，商品清單/卡片透明度需跟商品效期月曆一致。
- 新增商品視窗的分類選單需記憶上一次成功新增或覆蓋商品時使用的分類；手機卡片模式商品卡片需比商品效期月曆再提高 15% 透明度。
- 主頁、設定頁與隱私權頁的 inline boot script 需在 loading 畫面前段先呼叫 `AndroidBridge.setStatusBarColor()`，避免 Android 狀態列先顯示舊色再切換。
- Android WebView 內的頂部標題列需使用 `--android-statusbar` 作為不透明背景，並與 Android 原生狀態列顏色保持一致；一般瀏覽器 / PWA 可保留 `--topbar` 半透明效果。

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
- 目前 `version.js` 版本為 `v2.0.5`；目前 `sw.js` 快取版本為 `expiry-manager-cache-v370`。

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
  - `analytics.html`
  - `index.html`
  - `styles_washi.css`
  - `legacy-webview.js`
  - `analytics.js`
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
  - `allowFileAccessFromFileURLs = false`
  - `allowUniversalAccessFromFileURLs = false`
  - `blockNetworkLoads = true`
  - `safeBrowsingEnabled = true`
  - `setGeolocationEnabled(false)`
  - `mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW`
  - `setSupportMultipleWindows(false)`
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
- `AndroidBridge` 應維持輸入限制：檔名清理、內容長度上限、掃描 target / language / theme 白名單、狀態列顏色只接受 `#RRGGBB`。
- Android manifest 需維持移除 `INTERNET` 權限；WebView 只載入 `WebViewAssetLoader` 的本機 appassets，外部連結交給系統瀏覽器。
- `backup_rules.xml` 與 `data_extraction_rules.xml` 應明確排除所有資料；同時 manifest 維持 `android:allowBackup="false"`。
- 已移除 Google Play 贊助 / Billing 解鎖流程；不要再依賴 `supporter_title_unlock`。
- 自訂主頁標題為免費本機功能，設定頁「介面模式」中語言選擇上方可設定；自訂標題存在本機 `localStorage.customAppTitle`，不影響商品資料、IndexedDB schema 或備份格式。
- `window.statusBarColor` 在新版 Android 顯示 deprecated 警告，但不是建置錯誤；目前可保留功能。
- Android 返回鍵已改為主頁二次確認；第一次透過網頁既有 `showToast()` 顯示主題化「再按一次返回鍵關閉app」，2 秒內第二次才關閉 App，不使用 Android 原生 Toast。
- 主頁返回鍵固定由 `AppNativeBack.handleBack()` 觸發二次關閉流程；從設定頁或隱私權頁回主頁時，原生層需清除 WebView history，避免主頁返回鍵又回到設定頁或隱私權頁。

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
  - 已同步更新 `sw.js` 與 `CHANGELOG.md`；目前快取版本為 `expiry-manager-cache-v303`。
  - 已將修改後的 `app.js`、`i18n.js`、三個頁面 HTML、`settings.js`、`sw.js` 覆蓋到 Android Studio `assets`，並以 SHA-256 確認來源與目標一致。
- 已修正設定頁底部提示與錯誤視窗未套用英日翻譯的問題，並重新掃描主頁、設定頁、隱私權頁、更新紀錄與動態執行訊息。
- API 26 模擬器已可開啟程式；已針對舊 WebView 不支援 `inset` 與 `display: contents` 的問題，補上 modal、輸入框覆蓋層及商品檢查按鈕的 CSS 相容性修正。
- 已加入 `legacy-webview` 舊引擎偵測，針對 Flex / Grid `gap`、loading 圓環置中、fixed 背景異常放大加入專用 fallback，不影響新版 WebView 樣式。
- 已建立共用 `legacy-webview.js`，集中提供 `includes`、`startsWith`、`endsWith`、`padStart`、`NodeList.forEach`、`Element.closest` 與 `CustomEvent` 等舊 WebView API fallback。
- 已完成全專案 CSS 相容性掃描，針對 `min()` / `max()` 尺寸、安全區定位、`place-items` 與主要 Flex 間距加入 `legacy-webview` 專用覆蓋；純裝飾效果允許舊 WebView 自然降級。
- 下一步需清除 API 26 模擬器 App 資料、重新安裝並確認月曆間距、loading 圓環、背景比例與其餘元素間距。
- 完整裝置測試仍需涵蓋：主頁 / 設定 / 隱私頁、CRUD、分類排序、日期、月曆、所有主題、相機允許 / 拒絕、CSV / JSON、原生檔案位置、modal / dropdown / 掃描返回鍵、IndexedDB 關閉重開後保留。

### 9.5 Android 原生 ML Kit 條碼掃描
- Android App 已改用 CameraX + bundled ML Kit Barcode Scanning：
  - bundled 模型可離線立即使用，較符合本專案離線需求，但會增加 APK 體積。
  - Web / PWA 環境繼續保留目前 HTML + `BarcodeDetector` 掃描流程作為非 Android fallback。
  - Android 前端透過 `AndroidBridge.requestBarcodeScan(target, language, theme)` 呼叫原生掃描，掃描成功後由事件把條碼與目標欄位資訊傳回網頁。
- 已新增原生全螢幕掃描 Activity，包含中央掃描框、下方提示、返回鍵關閉、手電筒控制及重複辨識抑制。
- 原生掃描框不使用額外白色四角線條，且中間掃描框使用直角；掃描頁頂部列、按鈕、掃描框、遮罩與提示框需依 `dark-1`、`light-1`、`light-2`、`dark-2` 四個主題套用接近前端的色調，明亮主題提示文字需維持深色可讀。
- 日文原生掃描頁標題使用「スキャン」，底部提示文字需縮小到可單行顯示；四個主題的掃描框外遮罩統一使用霓虹電馭的黑色遮罩設定。
- 原生掃描頁目前不顯示頂部標題欄，也不顯示左上角關閉按鈕；關閉方式以 Android 返回鍵為主，提示文字使用「請將條碼置於框內」。
- 原生掃描頁需隱藏 Android 狀態列；手電筒按鈕約縮小 30%，放在提示文字框右上方且上下間隔約 20px，配色跟提示文字框一致。
- 原生掃描頁底部提示文字框不顯示邊框，固定白字與 60% 灰底；手電筒按鈕使用相同灰底，關閉時顯示關閉手電筒圖示，開啟時顯示手電筒圖示。
- 原生手電筒按鈕使用 Android vector drawable 扁平化圖示，不使用 emoji 或文字圖示。
- HTML 掃描視窗仍是 Web / PWA fallback，需保留 `legacy-webview` 專用排版與四主題配色 fallback。
- 前端 Android 掃描入口會呼叫 `AndroidBridge.requestBarcodeScan(target, language, theme)`；成功後由 `android-barcode-scanned` 事件回填新增、編輯或搜尋欄位。
- Web / PWA 環境繼續保留 HTML + `BarcodeDetector` 掃描流程。
- `:app:assembleDebug` 曾在原生掃描初版完成後通過；後續多次微調依使用者要求未打包 APK，只執行 `:app:compileDebugKotlin`，目前通過。CameraX / ML Kit 建置只出現狀態列顏色 API deprecated 警告。

### 9.6 目前未提交工作狀態
- 最後一次提交為：
  - `273be6c Support legacy Android WebView compatibility`
- 本視窗已完成 Android 原生 ML Kit 掃描整合與多次 UI 微調、Android 主頁返回鍵修正、設定頁分類標籤觸控排序修正；使用者多次要求不要打包 APK，後續只做源碼同步與 `compileDebugKotlin` 檢查。
- 目前 `D:\AI Code\KEITAIHAN` 未提交修改：
  - `AGENTS.md`
  - `CHANGELOG.md`
  - `app.js`
  - `i18n.js`
  - `privacy-policy.html`
  - `settings.js`
  - `styles_washi.css`
  - `sw.js`
- Android Studio 專案 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2` 已被覆蓋更新的原生檔案 / 資源：
  - `app/build.gradle.kts`
  - `app/src/main/AndroidManifest.xml`
  - `app/src/main/java/com/guresuta/productexpirycybercontrol/AndroidBridge.kt`
  - `app/src/main/java/com/guresuta/productexpirycybercontrol/MainActivity.kt`
  - `app/src/main/java/com/guresuta/productexpirycybercontrol/BarcodeScannerActivity.kt`
  - `app/src/main/java/com/guresuta/productexpirycybercontrol/ScannerOverlayView.kt`
  - `app/src/main/res/drawable/ic_flashlight_off.xml`
  - `app/src/main/res/drawable/ic_flashlight_on.xml`
- 最新同步到 Android Studio `app/src/main/assets/` 的前端 runtime 檔案至少包含：
  - `settings.js`
  - `styles_washi.css`
  - `privacy-policy.html`
  - `sw.js`
  - 先前亦已同步 `app.js`、`i18n.js`、三個頁面 HTML、`legacy-webview.js` 與其他必要 runtime assets，並多次以 SHA-256 確認來源與 assets 一致。
- 已完成的驗證：
  - 最近一次前端檢查：`node --check settings.js`、`node --check sw.js`、`git diff --check` 通過。
  - 最近一次 Android 原生檢查：`:app:compileDebugKotlin` 通過；未執行 `assembleDebug`，未產生新版 APK。
  - assets 同步檢查：最近修改的 `settings.js`、`sw.js` 已以 SHA-256 確認來源與 Android Studio assets 一致；前面也已針對 runtime assets 做過全量 SHA-256 比對。
  - 已掃描已知舊 WebView 不相容 JavaScript 語法。
- 開啟新視窗後應先重新讀取本文件與 `git status`，並檢查 Android Studio 專案檔案；不要遺失或覆蓋目前未提交修改。若要實機驗證最新原生掃描或返回鍵修正，需另行打包 / 安裝 APK。

### 9.7 目前工作階段交接紀錄（2026-06-27）
- 使用者準備另開視窗；新視窗應先閱讀本段與 `git status --short`，再決定是否提交 / 打包 / 簽署。
- `D:\AI Code\KEITAIHAN` 目前最後一次已推送提交為：
  - `3337017 Move sponsor settings section`
- GitHub Pages 已部署並驗證：
  - `settings.html` 中贊助區塊順序為 `theme-section` → `sponsor-section` → `release-history-section`。
  - 網頁版 / 一般瀏覽器仍以 `.sponsor-section { display: none; }` 隱藏贊助區塊，不保留空白；Android WebView 以 `html.android-webview .sponsor-section { display: block; }` 顯示。
  - 可填入 Play Console 的隱私權頁 URL：
    - `https://guresuta.github.io/Product-Expiry-Management/privacy-policy.html`
- `version.js` 目前為 `v1.8.0`；`sw.js` 快取版本為 `expiry-manager-cache-v303`；Android Studio `app/build.gradle.kts` 已同步 `versionName = "1.8.0"`、`versionCode = 10800`。
- Android Studio 專案 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2` 已完成但不在本 Git repo 追蹤的原生變更包含：
  - Google Play Billing 一次性非消耗型商品 `supporter_title_unlock` 整合。
  - `SponsorBillingManager.kt`、`AndroidBridge` 贊助相關受限 API、`MainActivity` 贊助狀態事件。
  - WebView 安全強化、導航限制、狀態列與 Android WebView topbar 同色顯示。
  - Launcher icon 已由 Android Studio 預設機器人改為本專案 `icons/icon-app-maskable-512.png` 產生的各密度 `ic_launcher*.png`，並移除預設 `drawable/ic_launcher_foreground.xml`。
  - 新增 Android 原生 App 名稱多語系資源：
    - `app/src/main/res/values-zh/strings.xml`
    - `app/src/main/res/values-zh-rTW/strings.xml`
    - `app/src/main/res/values-ja/strings.xml`
  - APK badging 已驗證包含：
    - `application-label-ja:'商品期限サイバー管理装置'`
    - `application-label-zh:'商品終期電馭監管裝置'`
    - `application-label-zh-TW:'商品終期電馭監管裝置'`
- 最近產物：
  - Debug APK 已成功產生：
    - `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\build\outputs\apk\debug\app-debug.apk`
    - package `com.guresuta.productexpirycybercontrol`，`versionName 1.8.0`，`versionCode 10800`。
  - Release AAB 曾以 `:app:bundleRelease` 產生：
    - `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\build\outputs\bundle\release\app-release.aab`
    - 但 `jarsigner` 檢查結果為 `jar is unsigned`，尚不可上傳 Google Play Console。
    - 需由使用者在 Android Studio `Build → Generate Signed App Bundle or APK...` 選擇 / 建立 release keystore 後產生 signed AAB；keystore 與密碼不可提交到 Git。
- Android Studio 開啟時曾出現 IDE internal error：JVM native memory allocation failed；原因偏向 Android Studio / Gradle / 模擬器記憶體不足，不是專案程式錯誤。建議重啟、一次只開一台模擬器、必要時調整 Windows 虛擬記憶體與 Android Studio heap。
- 下一步建議：
  - 若要上架，先用 Android Studio 產生 signed AAB，並確認 Play Console one-time product `supporter_title_unlock` 已建立、價格 NT$50、狀態 Active。
  - 若繼續開發，先檢查 Android Studio 專案與本 repo 的差異，避免覆蓋未納入 Git 的原生檔案 / 資源。

### 9.8 目前工作階段交接紀錄（2026-06-27 版本更新後）
- 本段為 9.7 之後的最新狀態；若與 9.7 的 `v1.8.0` / `10800` 資訊衝突，以本段為準。
- `D:\AI Code\KEITAIHAN` 目前最後一次已推送提交為：
  - `ef6a2b2 Bump version to 1.8.3`
- 目前工作樹狀態：
  - 追加本段前 `git status --short` 為乾淨。
  - 追加本段後只應有 `AGENTS.md` 工作紀錄變更，除非後續另有修改。
- 版本狀態：
  - `version.js` 目前為 `v1.8.3`。
  - `sw.js` 快取版本目前為 `expiry-manager-cache-v307`。
  - `CHANGELOG.md` 已加入 `v1.8.3`，更新內容為「版面最佳化」。
  - `i18n.js` 已補齊 `v1.8.3` 更新內容標題翻譯：
    - English: `v1.8.3 Release Notes`
    - 日本語: `v1.8.3 更新内容`
- Android Studio 專案版本已同步：
  - 路徑：`C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2`
  - `app/build.gradle.kts` 目前為 `versionName = "1.8.3"`、`versionCode = 10803`。
  - 已同步到 `app/src/main/assets/` 的前端版本相關檔案包含 `version.js`、`i18n.js`、`sw.js`，並以 SHA-256 確認來源與 Android assets 一致。
- 已完成的驗證：
  - `node --check version.js`
  - `node --check i18n.js`
  - `node --check sw.js`
  - `git diff --check`
  - 以上皆已通過。
- 依使用者要求，本次 `v1.8.3` 更新沒有打包 debug APK，也沒有重新產生 release AAB。
- Play Console 狀態提醒：
  - 使用者回報 `versionCode 10801` 已被 Play Console 判定使用過，因此目前改用 `10803`。
  - 舊的 signed AAB 不會自動更新到 `10803`；上傳前必須在 Android Studio 重新執行 `Build -> Generate Signed App Bundle or APK...` 產生新的 signed release AAB。
  - 新 signed AAB 產生後需再驗證其 `versionCode = 10803`、`versionName = 1.8.3`，再上傳 Play Console。
### 9.9 目前工作階段交接紀錄（2026-06-29 贊助功能移除後）
- 本段為 9.8 之後的最新狀態；若與 9.7 / 9.8 的贊助功能、`v1.8.3`、`10803` 資訊衝突，以本段為準。
- 已移除前端 Google Play 贊助 / Billing 解鎖流程，保留自訂主頁標題為免費本機功能。
- 設定頁自訂主頁標題已移到「介面模式」區塊，位置在語言選擇上方；GitHub Pages / 一般瀏覽器版與 Android WebView 都支援自訂標題。
- `version.js` 目前升級為 `v1.8.5`，更新內容為「加入標題自訂功能」。
- `sw.js` 快取版本目前升級為 `expiry-manager-cache-v308`。
- Android Studio 專案已同步移除原生 Billing 相關檔案 / 依賴，並同步 `versionName = "1.8.5"`、`versionCode = 10805` 與最新 assets。
- Android 驗證：:app:compileDebugKotlin 已通過；未打包 APK / AAB。
### 9.10 Android Studio 警告修復紀錄（2026-06-29）
- 本段記錄 Android Studio 專案 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2` 的原生檔案警告修復；`D:\AI Code\KEITAIHAN` 前端來源未修改。
- 已修復 `BarcodeScannerActivity.kt` 的 Kotlin redundant qualifier 警告：
  - `Activity.RESULT_OK`、`Activity.RESULT_CANCELED`、`Activity.RESULT_FIRST_USER` 改用未限定名稱。
  - `androidx.camera.core.TorchState.ON` 改為匯入 `TorchState` 後使用 `TorchState.ON`。
- 已修復 `AndroidManifest.xml` 的 Android 16 / ChromeOS 固定方向警告：
  - 移除 `BarcodeScannerActivity` 的 `android:screenOrientation="portrait"`。
- 已掃描並修復 Android lint 其餘可由專案檔案處理的警告：
  - `AndroidBridge.kt` 的 `Color.parseColor()` 改為 KTX `toColorInt()`。
  - `build.gradle.kts` 的硬編碼依賴移入 `gradle/libs.versions.toml`，CameraX 更新為 `1.6.1`。
  - 移除未使用的 `res/values/colors.xml`。
  - 移除舊版 launcher PNG fallback，只保留 adaptive icon XML 與 foreground，消除 icon shape / duplicate lint 警告。
  - 本機未安裝 SDK 37，且本專案目前維持 `compileSdk 36.1` / `targetSdk 36`；對 `OldTargetApi` 與 SDK 37 版本提示以 lint 設定排除，避免在未升級 SDK 前反覆出現環境性警告。
- 驗證結果：
  - `:app:compileDebugKotlin` 通過。
  - `:app:lintDebug` 通過，lint 報告顯示 `No issues found.`。
  - 曾因並行執行 compile/lint 出現 Kotlin daemon incremental cache contention；已執行 `gradlew --stop` 後依序重跑並通過。
- 本次只修改 Android Studio 原生專案檔，不打包 APK / AAB；若換機或重建 Android Studio 專案，需依本段同步這些原生修正。
### 9.11 本視窗工作紀錄（2026-06-29）
- 本視窗主要處理兩條線：
  - 移除 Google Play 贊助 / Billing 解鎖流程，保留並開放免費本機「自訂主頁標題」功能。
  - 修復 Android Studio 專案中的 IDE / lint 警告。
- `D:\AI Code\KEITAIHAN` 已完成並推送的最新提交：
  - `26a7bf7 Remove sponsor unlock and add title customization`
  - `62254ae Document Android Studio warning fixes`
- 前端 / GitHub Pages 狀態：
  - `version.js` 目前為 `v1.8.7`。
  - `sw.js` 目前為 `expiry-manager-cache-v310`。
  - GitHub Pages 線上 `version.js` 已確認回傳 `v1.8.5` 與「加入標題自訂功能」。
  - 設定頁「介面模式」中、語言選擇上方提供自訂主頁標題；一般瀏覽器 / GitHub Pages 與 Android WebView 都可使用。
  - 主頁標題只讀取 `localStorage.customAppTitle`，不再依賴 Android Billing bridge 或 `android-sponsor-state-changed` 事件。
- Android Studio 專案狀態：
  - 路徑：`C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2`。
  - `app/build.gradle.kts` 已同步 `versionName = "1.8.7"`、`versionCode = 10807`。
  - 已移除原生 Billing 相關流程與 `SponsorBillingManager.kt`，並同步最新前端 assets。
  - 已修復 `BarcodeScannerActivity.kt` redundant qualifier、`AndroidManifest.xml` 固定方向、`AndroidBridge.kt` `toColorInt()`、version catalog、CameraX `1.6.1`、未使用 colors、launcher icon lint 警告。
  - `:app:compileDebugKotlin` 與 `:app:lintDebug` 已通過，lint 報告顯示 `No issues found.`。
- 本視窗未打包 debug APK，也未產生 release AAB。
- 下一個視窗接續時應先檢查：
  - `git status --short`。
  - Android Studio 專案是否仍保留上述原生修正，因為這些原生檔案不在 `D:\AI Code\KEITAIHAN` Git repo 追蹤內。
  - 若要上架新版，需在 Android Studio 重新產生 signed AAB，並確認 `versionCode = 10805`、`versionName = 1.8.5`。
### 9.12 本視窗六項收尾紀錄（2026-06-29）
- 已修正第 5 節發版狀態：`version.js` 目前為 `v1.8.7`，`sw.js` 目前為 `expiry-manager-cache-v310`。
- 已重新檢查 Android Studio 專案 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2` 的原生修正仍保留：
  - `SponsorBillingManager.kt` 不存在，Google Play Billing / 贊助解鎖原生流程未恢復。
  - `BarcodeScannerActivity.kt` 已使用未限定 `RESULT_OK` / `RESULT_CANCELED` / `RESULT_FIRST_USER`，並使用 `TorchState.ON`。
  - `AndroidBridge.kt` 使用 `toColorInt()`，未再出現 `Color.parseColor()`。
  - `AndroidManifest.xml` 的 `INTERNET` 權限為 `tools:node="remove"`，`BarcodeScannerActivity` 未固定 `screenOrientation`，`allowBackup="false"` 保留。
  - `res/values/colors.xml` 不存在，CameraX 版本仍由 `gradle/libs.versions.toml` 管理且為 `1.6.1`。
- 已確認前端 runtime assets 與 Android Studio `app/src/main/assets/` 同步：`version.js`、`i18n.js`、`sw.js`、`app.js`、`settings.js`、`styles_washi.css`、三個 HTML 與 `legacy-webview.js` 的 SHA-256 皆一致。
- 已執行 Android 建置與檢查：
  - `:app:compileDebugKotlin` 通過。
  - `:app:lintDebug` 通過。
  - `:app:assembleDebug` 通過，產生 debug APK。
  - debug APK 已以 `aapt dump badging` 確認 `versionCode='10805'`、`versionName='1.8.5'`，並以 `apksigner verify` 確認 Android Debug certificate / v2 scheme 簽章有效。
- 已執行 API 26 模擬器 `Small_Phone` 清資料、重新安裝與煙霧測試：
  - `pm clear com.guresuta.productexpirycybercontrol` 成功。
  - 安裝最新版 debug APK 成功。
  - 主頁可載入，UI dump 可見 `商品終期電馭監管裝置`、`商品效期月曆`、`新 增 商 品`、`設 定`，不再是舊 WebView JavaScript 藍畫面。
  - 初次儲存方式選擇 IndexedDB 成功，更新內容 modal 顯示 `v1.8.5更新內容` / `加入標題自訂功能`。
  - 設定頁可開啟，UI dump 可見 `設定 | 商品終期電馭監管裝置`、`系統設定`、`介面模式`；Android 返回鍵可回到主頁。
  - 最近 logcat 未見本 App 的 `FATAL EXCEPTION`、`Uncaught SyntaxError` 或 `Unexpected token`。
- 已產生 release AAB 作為建置驗證：`:app:bundleRelease` 通過，產物位於 `app/build/outputs/bundle/release/app-release.aab`；但 `jarsigner -verify` 仍顯示 `jar is unsigned`，因此尚不可上傳 Play Console。
- 尚不能由本視窗完全完成的項目：
  - Play Console 可上傳的 signed AAB 仍需使用者在 Android Studio 以 release keystore 產生；keystore 與密碼不可寫入 repo 或交給 Codex 自動猜測。
  - 完整人工裝置測試尚需實機覆蓋相機允許 / 拒絕、原生檔案選擇器、CSV / JSON 匯入匯出、真實條碼掃描、CRUD、分類長按排序、所有主題與 IndexedDB 關閉重開保留；本次已完成 API 26 clean install 與主頁 / 設定 / 返回鍵煙霧測試。
### 9.13 Android 15 edge-to-edge 修正紀錄（2026-07-02）
- 針對 Google Play Console Android 15 edge-to-edge / deprecated system bar API 警告進行修正。
- `MainActivity.kt` 維持 `WindowCompat.setDecorFitsSystemWindows(window, false)`，WebView 延伸到狀態列後方；native root 只保留左右與底部 insets，並把頂部 inset 注入 CSS `--safe-area-top`，由 HTML `.topbar` 自行繪製狀態列背景。
- `AndroidBridge.setStatusBarColor()` 保留前端呼叫入口，但不再呼叫 deprecated `window.statusBarColor`；目前只根據主題色調整狀態列圖示明暗。
- `BarcodeScannerActivity.kt` 移除 deprecated `window.statusBarColor` / `window.navigationBarColor`，保留沉浸式掃描並用 WindowInsets 調整底部提示框與手電筒按鈕位置。
- `styles_washi.css` 移除 Android WebView 強制 `--safe-area-top: 0px` 的覆蓋，讓 native 注入值與 CSS safe-area 生效。
- 版本更新為 `v1.8.7`，更新內容為「版面最佳化」；`sw.js` 快取版本為 `expiry-manager-cache-v310`，Android `versionName = "1.8.7"`、`versionCode = 10807`。
### 9.14 Android WebView 頂部間距微調（2026-07-02）
- 依使用者截圖回報，修正 Android WebView 內狀態列與標題文字之間留白過大的問題。
- `styles_washi.css` 新增 Android WebView 專用 topbar 覆蓋：標題列頂部內距由原本 `safe-area + 0.85rem` 壓縮為 `safe-area + 0.25rem`，並同步調整 Android WebView 的 `--topbar-fixed-offset`，不影響一般瀏覽器 / PWA。後續模擬器檢查確認真正造成留白過大的主因是 native 將 Android 實體像素直接注入 CSS px，已改為依 `displayMetrics.density` 轉成 WebView CSS px。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v312`；版本仍維持 `v1.8.7`。
- 已重新打包 debug APK 並在 `emulator-5554` 清除資料後安裝檢查；`appMainTitle` UI dump 位置由修正前 `[24,489][1320,567]` 改為 `[24,171][1320,249]`，確認狀態列與標題間距已回到合理範圍。

### 9.15 v1.8.9 發版與掃描修正紀錄（2026-07-02）
- 版本更新為 `v1.8.9`，更新內容為「版面最佳化、修正鏡頭掃描有機率發生閃退錯誤」。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v314`。
- Android Studio 專案 `MainActivity.kt` 已修正原生事件 dispatch 字串中的錯誤字面插值，避免關閉掃描 Activity 時 WebView 執行非法 JS 並顯示 `Script error.`。
- `BarcodeScannerActivity.kt` 保留權限回呼、CameraX listener 與 `onDestroy()` 的 Activity 狀態防呆，降低初次或取消鏡頭掃描時的閃退風險。
- 設定頁更新紀錄內容項目已移除邊框與陰影，並以最後覆蓋規則壓過各主題樣式。

### 9.16 v1.8.10 Android 13 狀態列修正紀錄（2026-07-02）
- 版本更新為 `v1.8.10`，更新內容維持「版面最佳化、修正鏡頭掃描有機率發生閃退錯誤」。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v315`。
- Android Studio 專案 `AndroidBridge.setStatusBarColor()` 對 Android 14 以下恢復 `window.statusBarColor` fallback；Android 15+ 仍由 WebView topbar 繪製狀態列背景，避免重新依賴 Android 15 deprecated 行為。
- 補齊 `v1.8.10更新內容` 與「修正鏡頭掃描有機率發生閃退錯誤」的英日翻譯，避免設定頁更新內容回退顯示中文。

### 9.17 讀取速度優化紀錄（2026-07-03）
- 採用方案 A 並保留既有讀取畫面；新增 `resource-preload.js`，在頁面 load 後空閒時間背景預熱主頁 / 設定頁 / 隱私頁、共用 JS/CSS、字型與四個主題背景圖。
- 三個 HTML 頁面皆以 `defer` 載入 `resource-preload.js`；不改頁面結構、loading UI、Android 返回鍵與 WebView history 邏輯。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v316`，並將 `resource-preload.js` 加入 app shell cache。

### 9.18 Washi Cyber 主題草案處理紀錄（2026-07-03）
- 使用者已明確放棄 Washi Cyber 主題草案。
- 未追蹤檔案 `washicyber.css` 已從工作流程刪除，後續不需整合主題選單、`THEME_PRESETS`、`THEME_ALIASES`、i18n、`sw.js` cache 或 Android assets。

### 9.19 v1.9.0 版本更新紀錄（2026-07-03）
- 版本更新為 `v1.9.0`，更新內容為「版面最佳化、提高頁面讀取速度」。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v318`。
- 已同步補齊英文與日文更新內容翻譯。

### 9.20 v2.0 商品效期趨勢分析紀錄（2026-07-04）
- 新增分析頁 `analytics.html` / `analytics.js`，入口為設定頁頂部「商品效期趨勢分析」按鈕；分析頁返回按鈕與 Android 返回鍵皆回 `settings.html`。
- 新增共用資料層 `data-store.js`，主頁、設定頁與分析頁共用 IndexedDB / 本機 JSON 檔案讀取與分類設定讀取邏輯。
- 分析頁資料即時計算、不寫入 IndexedDB 或本機 JSON；本機檔案模式優先讀目前選定 JSON，失敗時才回退 IndexedDB 並顯示提示。
- 商品分類健康狀態規則：30 天內到期比例 >= 50% 或過期+30 天內到期數量 >= 10 為高風險；30 天內比例 >= 20% 或 60 天內比例 >= 40% 為中等風險；其餘為低風險。
- 版本更新為 `v2.0`，`sw.js` 快取版本更新為 `expiry-manager-cache-v319`；需同步 Android Studio assets 並打包 debug APK。

### 9.21 GitHub Pages v2.0 部署修正紀錄（2026-07-04）
- GitHub Pages 部署清單 `.github/workflows/deploy-pages.yml` 已補上 `analytics.html`、`analytics.js`、`data-store.js` 與 `resource-preload.js`。

- 修正原因：v2.0 首次部署 artifact 漏掉新增頁面與共用資料層，導致線上版 window.AppDataStore 不存在並顯示初始化錯誤，分析頁 URL 顯示 404。

### 9.22 分析頁表格版面修正紀錄（2026-07-04）
- 分析頁的分類商品數量分布、商品分類健康狀態與平均剩餘效期分析表格改為兩欄清單式呈現，不顯示複製圖示。
- sw.js 快取版本更新為 expiry-manager-cache-v320，版本仍維持 v2.0。
### 9.23 分析頁表格背景修正紀錄（2026-07-04）
- 移除分析頁三個清單式表格在黑暗模式下的灰色背景，表格本體、表頭、列與儲存格背景皆維持透明。
- sw.js 快取版本更新為 expiry-manager-cache-v321，版本仍維持 v2.0。
### 9.24 分析頁表格欄位間距修正紀錄（2026-07-04）
- 分析頁三個清單式表格共用欄位間距調整：第一欄保留左側內距，第二欄靠右對齊並保留右側內距。
- sw.js 快取版本更新為 expiry-manager-cache-v322，版本仍維持 v2.0。
### 9.25 分析頁表格裁切修正紀錄（2026-07-04）
- 修正 analytics-section 的 overflow 裁切問題，三個清單式表格底部內容不再被區塊吃掉；表格 wrapper 只負責橫向捲動。
- sw.js 快取版本更新為 expiry-manager-cache-v323，版本仍維持 v2.0。
### 9.26 分析頁表格裁切深度修正紀錄（2026-07-04）
- 分析頁三個清單式表格改為專用 block/grid 排版，移除橫向 overflow 容器與全站 table / tbody tr 規則影響，避免重開頁面後底部內容仍被裁切。
- sw.js 快取版本更新為 expiry-manager-cache-v324，版本仍維持 v2.0。
### 9.27 分析頁表格邊線修正紀錄（2026-07-04）
- 分析頁三個清單式表格補上最後一列底線，並明確移除表格與儲存格左右邊線。
- sw.js 快取版本更新為 expiry-manager-cache-v325，版本仍維持 v2.0。
### 9.28 手機前景恢復閃爍與分析備份狀態修正紀錄（2026-07-04）
- 調查結果：分析頁不會在首頁背景執行資料讀取；首頁閃爍較可能來自手機/Android WebView 在前景恢復時重建 fixed 高解析背景、topbar backdrop blur，以及 resource-preload 預抓分析頁與多張背景圖造成的資源競爭。
- resource-preload.js 已針對手機與 Android WebView 降低預抓強度，不再預熱四張高解析背景圖，且 document.hidden 時不執行暖機 fetch/image/font。
- Android WebView body 背景改用 scroll/repeat-y 並停用 topbar backdrop blur，降低多工返回時黑畫面或白畫面閃爍機率。
- 商品效期概況新增備份狀態：主頁新增、覆蓋或編輯商品後累加 productChangeCountSinceBackup；主頁或設定頁 JSON 備份成功後歸零；分析頁顯示已備份/尚未備份。
- sw.js 快取版本更新為 expiry-manager-cache-v326，版本仍維持 v2.0。
### 9.29 隱私權與資料安全頁分析功能補充紀錄（2026-07-04）
- privacy-policy.html 補充商品效期趨勢分析與備份狀態只使用本機商品資料與本機設定即時計算；分析結果不會上傳或另存到遠端伺服器。
- 資料使用段落加入商品效期趨勢分析用途，資料保存段落補充 productChangeCountSinceBackup 只記錄上次 JSON 備份後新增/編輯筆數，會隨本機設定保留或刪除。
- i18n.js 已同步英文與日文翻譯；sw.js 快取版本更新為 expiry-manager-cache-v327，版本仍維持 v2.0。
### 9.30 GitHub Pages workflow 假陰性部署修正紀錄（2026-07-04）
- 觀察到 GitHub 內建 pages build and deployment 成功、線上 sw.js 已更新，但自訂 Deploy to GitHub Pages workflow 的 actions/deploy-pages step 仍回報 Deployment failed, try again later。
- .github/workflows/deploy-pages.yml 已將 deploy-pages step 設為 continue-on-error，並新增 Verify GitHub Pages deployment step，會讀取 pages-dist/sw.js 的 CACHE_NAME 並輪詢線上 sw.js；只有線上未提供預期快取版本時才讓 workflow 失敗。
- 本次只修改 workflow 與文件，不更新 sw.js，也不更動 version.js。

### 9.31 分析頁排序與延後載入修正紀錄（2026-07-05）
- 分析頁三個清單式表格已改為有資料優先並由高到低排序：
  - 分類商品數量分布依商品筆數高到低，0 筆分類排在後面。
  - 分類商品即期風險依高風險、中等風險、低風險排序，同風險時依過期+30 天內到期數量與 60 天內到期數量排序，無商品資料分類排在後面。
  - 平均剩餘效期分析依平均剩餘天數高到低排序，無日期資料分類排在後面。
- 為降低手機與 Android WebView 首頁從多工頁面返回時的閃爍風險，`resource-preload.js` 已移除首頁背景預載 `analytics.html` 與 `analytics.js`；分析資料只在使用者進入 `analytics.html` 後讀取。
- `analytics.js` 在 `pagehide` / `beforeunload` 時清空分析頁記憶體中的 products、categories、fileHandle 與備份狀態；資料本身仍只保留在 IndexedDB 或使用者選定的本機 JSON 檔，不會另存分析結果。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v329`，版本仍維持 `v2.0`，`version.js` 更新內容不變。
- 已同步 `analytics.js`、`resource-preload.js`、`sw.js` 到 Android Studio 專案 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\src\main\assets`，並以 SHA-256 確認一致。
- 已重新打包 debug APK：`C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\build\outputs\apk\debug\app-debug.apk`；`aapt dump badging` 確認 `versionName='2.0'`、`versionCode='20000'`。
- GitHub 已推送提交：
  - `d855e87 Defer analytics loading and sort analytics tables`
  - `4dc1a72 Retry GitHub Pages deployment`
- GitHub Pages 最終確認：`Deploy to GitHub Pages` 與 `pages build and deployment` 皆為 success，線上 `sw.js` 已回傳 `expiry-manager-cache-v329`。

### 9.32 Android WebView 閃爍 / 背景延遲調查與目前狀態（2026-07-10）
- 使用者回報 v2.0 新增分析頁後，Android 裝置從多工頁面切回本 App 時會短暫閃爍；程式內頁面切換也曾露出底色。已確認此現象不是單純 data-store.js 或分析頁即時資料讀取造成：停用主頁 data-store.js、分析頁改獨立讀取後仍存在；單頁 iframe 測試分支也未消除露底。
- 曾建立 checkpoint 與測試分支：
  - `08a5c98 Checkpoint before single-page navigation test`（main 上的 checkpoint）。
  - `codex/single-page-navigation-test` / `68a0179 Test single-page WebView navigation` 測試 iframe 單頁導覽；使用者測試後仍有藍底/底色露出，已切回 main，測試分支保留但不作為目前基準。
- 已做的 Android 原生緩解：
  - `MainActivity.kt` 的 `APP_BACKGROUND_COLOR` 從 `0xFF000824` 改為 `0xFF050505`，並套用於 `window.decorView`、`WebView` 與 root `FrameLayout`，將原本藍底露出改為接近主題的黑底。
  - `navigateHomeAndClearHistory()` 改為先檢查 WebView back-forward history，若首頁已存在則使用 `goBackOrForward()` 回首頁並清 history；找不到首頁才 `loadUrl(APP_HOME_URL)`，降低設定/分析返回主頁時重新載入造成的露底。
- 已做的前端 / CSS 緩解：
  - Android WebView 專用 `--boot-bg` 與 app-booting 背景維持 `#050505`，但已恢復 loading 畫面的主題背景圖；不要再把 `.app-boot-screen` 的 `background-image` 關掉，否則 loading 畫面背景會消失。
  - 四個頁面 `inventory-management-app.html`、`settings.html`、`privacy-policy.html`、`analytics.html` 的 boot 流程已改為 Android WebView 至少顯示約 700ms，並等待目前主題背景 ready 後再淡出 boot，最多等 1400ms；一般瀏覽器 / PWA 仍維持較長的原本 loading 行為。
  - `resource-preload.js` 已改為 Android / 小螢幕只預載「目前主題」背景，不一次預載四張高解析背景，避免主頁資料多時從分頁切回主頁背景延遲顯示。
- 目前結論：
  - loading 背景消失與主頁資料多時背景延遲，屬於上一輪 Android boot 背景優化造成的回歸，已修正並打包新版 debug APK。
  - Android 多工頁面返回本程式仍閃爍，且只改 native / CSS 背景色會把藍底改成黑底但無法消除，判斷主因高機率是 Android WebView surface / Activity snapshot 恢復時短暫沒有網頁內容可畫，露出 native root 背景。
  - 若使用者仍要求進一步消除多工返回閃爍，下一個有效方向應是 Android 原生層加入短暫主題背景或最近畫面截圖遮罩，等 WebView 第一幀恢復後移除；只靠 CSS 或換背景色預期效果有限。
- 最新前端狀態：
  - `sw.js` 快取版本已更新為 `expiry-manager-cache-v344`，`version.js` 仍維持 `v2.0` / `versionCode 20000`。
  - 已同步 Android Studio assets，已重新打包 debug APK：`C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\build\outputs\apk\debug\app-debug.apk`。
  - 驗證通過：`node --check app.js`、`node --check settings.js`、`node --check analytics.js`、`node --check sw.js`、`node --check resource-preload.js`、`git diff --check`、`:app:assembleDebug`、`aapt dump badging`、`apksigner verify --verbose`。
  - APK badging 確認 `package='com.guresuta.productexpirycybercontrol'`、`versionName='2.0'`、`versionCode='20000'`、`targetSdkVersion='36'`。
- 目前未提交 / 未推送：
  - Repo 內未提交檔案包含 `CHANGELOG.md`、`analytics.html`、`inventory-management-app.html`、`privacy-policy.html`、`resource-preload.js`、`settings.html`、`styles_washi.css`、`sw.js`。
  - Android Studio 專案原生檔 `MainActivity.kt` 已修改但不在 `D:\AI Code\KEITAIHAN` Git repo 追蹤內；若重建 Android Studio 專案需依本段重新套用。
### 9.33 本視窗副標輪替、資料層清理與 Android 同步紀錄（2026-07-11）
- 本輪完成並已推送的 Git 提交：
  - `7ffb41d Speed up Android WebView resume`
  - `851d190 Improve home startup performance`
  - `d9a3358 Rotate home subtitles and remove unused data store`
  - `4040b44 Fix subtitle rotation on Android resume`
  - `e5decfb Fix localized home subtitle rendering`
- Android 多工快速恢復：
  - `MainActivity.kt` 正常背景返回會保留既有 WebView，先等待短暫 visual-state callback；逾時才顯示較短的原生讀取遮罩。
  - Activity 重建時會使用 `WebView.saveState()` / `restoreState()` 復原導覽狀態。
  - Android WebView 從背景返回時，`MainActivity.kt` 會派送 `android-app-resumed` 事件給網頁。
- 主頁副標：
  - 新增 `home-subtitles.js`，目前由使用者維護 8 筆、ID 1–8 的中文副標資料。
  - `app.js` 已建立 `ui.appMainSubtitle` DOM 參照；先前缺少此參照使隨機邏輯直接返回，已修正。
  - 僅中文介面讀取隨機副標清單：首次隨機選取，同一副標連續顯示 3 次，第四次開啟／回到前景時再換一則。
  - 英文與日文介面固定使用 `i18n.js` 既有的英／日主頁副標，不套用中文隨機清單。
- 前端與資料層：
  - 新增商品視窗不再自動聚焦商品名稱欄位，避免 Android 自動開啟鍵盤。
  - 商品健康統計改為單次走訪；搜尋輸入每個畫面週期最多觸發一次重繪；Android／小螢幕取消背景預抓其他頁面與大型腳本，降低記憶體壓力。
  - 已確認 `data-store.js` 不再有執行頁面載入或程式呼叫，已從來源、Android assets、GitHub Pages workflow 移除；保留各頁既有獨立資料讀取邏輯。
  - 已移除未追蹤的 flicker / recents 診斷截圖、log 與影片，未影響程式功能。
- 隱私權與更新紀錄：
  - `privacy-policy.html` 的使用者手動更新已提交並同步 Android Studio assets。
  - 設定頁免責聲明新增第四條：中文主頁副標為原創裝飾與提醒文案，並補齊英日翻譯。
  - `version.js` 的 v2.0 更新內容現含「中文介面新增隨機出現裝飾性主頁副標」，英日翻譯已同步。
- 發版與驗證：
  - `version.js` 維持 `v2.0`，Android APK `versionName='2.0'`、`versionCode='20000'`。
  - `sw.js` 目前快取版本為 `expiry-manager-cache-v358`。
  - 已多次同步 runtime assets 至 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\src\main\assets` 並以 SHA-256 驗證；最新 APK 已確認包含 `home-subtitles.js`、不包含已移除的 `data-store.js`，且包含副標 DOM 修正與英日語言限制。
  - 最新 debug APK：`C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\build\outputs\apk\debug\app-debug.apk`。
  - 最近一次 `:app:assembleDebug` 通過；僅保留既有 WebView `allowFileAccessFromFileURLs` / `allowUniversalAccessFromFileURLs` deprecated 警告。
- 下個視窗接續前先執行 `git status --short`，並確認 Android Studio 外部原生 `MainActivity.kt` 的上述修改仍存在；該原生專案不由 `D:\AI Code\KEITAIHAN` Git repo 追蹤。

### 9.34 v2.0.1 政策資訊翻譯與實機驗證結案（2026-07-11）
- 使用者已完成完整人工實機驗證，Android 多工返回不再出現閃爍；後續工作流程不再將多工返回閃爍列為待驗證或待修正項目。
- `privacy-policy.html` 維持政策資訊適用範圍的兩段式排版，並為兩段文字補齊英日翻譯。
- 設定頁免責聲明第四條改為限定「本 App 中文介面」的主頁副標短語，`i18n.js` 的英日翻譯已同步更新。
- 版本更新為 `v2.0.1`，更新內容維持既有項目；`sw.js` 快取版本為 `expiry-manager-cache-v359`，Android `versionCode` 應同步為 `20001`。
### 9.35 v2.0.1 更新內容翻譯確認（2026-07-11）
- 使用者手動調整 `version.js` 的 v2.0.1 更新項目順序；英日翻譯標題與四項內容皆已存在且對應正確，無須新增翻譯 key。
- 依前端資產發版規則，`sw.js` 快取版本更新為 `expiry-manager-cache-v360`。
- 已同步最新 `version.js`、`i18n.js`、`sw.js` 至 Android Studio assets，並重新打包 debug APK；Android 版本維持 `versionName = 2.0.1`、`versionCode = 20001`。
### 9.36 Android R8 與資源縮減最佳化（2026-07-11）
- Android Studio `release` 已啟用 R8 程式碼縮減／混淆與未使用資源縮減：`isMinifyEnabled = true`、`isShrinkResources = true`。
- 新增 `minifiedDebug` build type：沿用 debug 簽章、使用 `.r8test` application ID suffix，但設為 `isDebuggable = false` 以實際啟用 R8，並套用相同資源縮減設定，供不需 release keystore 的可安裝功能驗證。
- `proguard-rules.pro` 保留 `AndroidBridge` 的 `@JavascriptInterface` 方法與 RuntimeVisibleAnnotations，避免 R8 移除或改名 WebView 反射呼叫的原生 API。
- 後續需以 `:app:assembleMinifiedDebug` 建置、安裝 `com.guresuta.productexpirycybercontrol.r8test`，驗證 WebView Bridge、本機檔案、匯出、相機掃描與返回鍵；若 R8 報錯，僅依 `missing_rules.txt` 補入最小必要規則。
### 9.37 Android R8 最佳化建置與模擬器驗證（2026-07-11）
- `:app:assembleRelease` 與修正後的 `:app:assembleMinifiedDebug` 均通過；`minifiedDebug` 確認執行 `minifyMinifiedDebugWithR8` 與 `optimizeMinifiedDebugResources`。
- `app-minifiedDebug.apk` 使用 `com.guresuta.productexpirycybercontrol.r8test`、`versionName=2.0.1-r8test`，由 debug 簽章簽署但 `isDebuggable=false`；可安裝於測試裝置而不覆蓋正式 App。
- APK 體積：debug 118,597,657 bytes；R8 測試版 109,462,754 bytes；release unsigned 109,410,898 bytes，R8 測試版較 debug 減少約 9.1 MB（7.7%）。
- R8 mapping 已確認 `AndroidBridge` 的 `hasSelectedDbFile`、`readDatabaseFile`、`writeDatabaseFile`、`requestBarcodeScan`、`openAppInfo`、`setStatusBarColor` 等 `@JavascriptInterface` 方法保留原名；`BarcodeScannerActivity` 也保留在 mapping。
- API 26 `Small_Phone` 與 Pixel_7 模擬器皆可安裝／啟動 R8 測試版至 MainActivity，API 26 第一段返回鍵仍由 App 接收，logcat 未見本 App 的 FATAL EXCEPTION、ClassNotFound 或 NoSuchMethod。API 26 UIAutomator 無 WebView root；Pixel_7 可見 WebView 容器但無子節點，Windows 畫面控制連線亦受本機 sandbox helper 錯誤阻擋。因此相機掃描、本機檔案、CSV／JSON 匯出入的端對端點擊流程仍待使用者手動測試。
- 由 adb 外部啟動 `BarcodeScannerActivity` 被 `exported=false` 正確拒絕，屬既有安全設定，不是 R8 問題；應從 App 內掃描入口測試。
### 9.38 R8 ML Kit Scanner 修正（2026-07-11）
- 使用者在 `minifiedDebug` R8 測試 APK 發現點擊掃描會使程式無回應；以 Pixel_7 直接啟動掃描 Activity 並取得 logcat 重現。
- 根因：ML Kit `MlKitInitProvider` 反射載入 `CommonComponentRegistrar`、`BarcodeRegistrar`、`VisionCommonRegistrar` 時，R8 已移除其無參數建構子，造成 `NoSuchMethodException` 與 Scanner Activity `onCreate()` NPE / FATAL EXCEPTION。
- `proguard-rules.pro` 已以三條精確 `-keep class ... { <init>(); }` 規則保留上述 Registrar 的 class name 與建構子；不擴大保留整個 ML Kit 套件。
- 修正後需重新建置 R8 測試 APK、在 Pixel_7 啟動 Scanner Activity，確認不再出現 ComponentDiscovery / NoSuchMethodException / FATAL EXCEPTION；最後移除僅供 adb 啟動的 minifiedDebug test manifest，重建 production-safe R8 測試版與一般 debug APK。
### 9.39 R8 Scanner 修正驗證完成（2026-07-11）
- Pixel_7 以暫時只作用於 `minifiedDebug` 的 exported Scanner manifest 重現後，套用 ML Kit Registrar keep rules 再測：Scanner Activity 可持續啟動、`libbarhopper_v3.so` 正常載入，logcat 未見 ComponentDiscovery、NoSuchMethodException 或 FATAL EXCEPTION。
- 診斷用 `app/src/minifiedDebug/AndroidManifest.xml` 已移除，最終 `minifiedDebug` 與 release 均維持正式 Manifest 的 `BarcodeScannerActivity android:exported="false"`。
- 已重建 `:app:assembleMinifiedDebug`、`:app:assembleDebug`、`:app:assembleRelease`；Pixel_7 已安裝並啟動最終 R8 測試版與一般 debug APK，皆無本 App 崩潰。
- 供使用者手動測試的 R8 APK：`app/build/outputs/apk/minifiedDebug/app-minifiedDebug.apk`；一般 debug APK：`app/build/outputs/apk/debug/app-debug.apk`。
### 9.40 v2.0.2 分析頁標題行距與 R8 測試版（2026-07-11）
- `styles_washi.css` 對 `.analytics-section .section-title-bar` 設定 `line-height: 1.28`，改善英文「Category Product Count Distribution」換行後兩行文字過於緊密的問題；不影響表格資料與其他頁面標題。
- 版本升級為 `v2.0.2`，更新內容為「改善應用程式容量與效能」、「版面最佳化」；`i18n.js` 已補齊英日標題與第一項新內容翻譯。
- `sw.js` 快取版本更新為 `expiry-manager-cache-v361`；Android 版本應同步為 `versionName = 2.0.2`、`versionCode = 20002`。
- 本次只需建置 `:app:assembleMinifiedDebug` 供 R8 手動測試，不再例行建置一般 debug APK。

### 9.41 v2.0.3 分析頁分隔線與商品清單互動改善（2026-07-12）
- 分析頁 `.analytics-list-table` 的分隔線改由每一列統一繪製，避免兩欄 Grid 邊界因小數像素產生斷裂。
- 商品清單健康檢查統計改為單次資料走訪；清單列使用 `DocumentFragment` 批次插入。
- 搜尋、分類、排序與健康檢查操作統一排入下一個畫面更新幀；非日期篩選操作不再重繪效期月曆，以降低點擊延遲。
- 版本為 `v2.0.3`，更新內容為「改善點擊延遲、版面最佳化」；英日翻譯已同步，Service Worker 快取為 `expiry-manager-cache-v362`。
- Android Studio 已同步前端 runtime assets 與 `versionName = "2.0.3"`、`versionCode = 20003`；本批次將以 `minifiedDebug` R8 APK 進行模擬器啟動測試。

### 9.42 v2.0.3 主頁其餘控制項延遲續行改善（2026-07-12）
- 月曆日期篩選、掃描後搜尋、清除健康篩選皆改用延後批次清單更新，且不重繪未改變的月曆。
- 勾選單筆商品與全選／取消全選不再重建完整商品清單，只同步勾選框、全選狀態與已勾選筆數。
- 清單重繪安排為雙重動畫幀，讓下拉選單、健康檢查與月曆選取樣式先完成畫面回饋，再執行較重的清單工作。
- Service Worker 快取更新為 `expiry-manager-cache-v363`；版本維持 `v2.0.3`、Android `versionCode = 20003`。
- Pixel 7 R8 版已重新啟動並通過行程／崩潰檢查。Windows 自動畫面連線無法讀取 WebView 內部 HTML 控制項，因此觸控回應以事件路徑與建置後啟動驗證為準。

### 9.43 原生掃描隨機閃退生命週期修正（2026-07-12）
- 根因為原生 `BarcodeScannerActivity` 在暫停／銷毀或快速重開時，CameraX 分析器、相機綁定與 ML Kit 尚在處理的影像回呼缺少共同的生命週期協調；可能導致關閉中的資源仍被回呼使用。
- 現已加入可見狀態與相機綁定鎖，僅在 Activity 可見且權限已授予時綁定；暫停時清除 `ImageAnalysis` analyzer、解除 CameraX 綁定並停用手電筒。
- 取消、成功、錯誤與銷毀皆會標記完成；ML Kit scanner 會等待當前影像處理完成後才關閉，避免關閉競態。
- 使用暫時僅限 `minifiedDebug` 的 exported manifest 在 Pixel_7 授權相機後，先後完成 8 次與修正後 12 次掃描 Activity 開關壓力測試；未見 CameraX、ML Kit、executor、NoSuchMethod 或 FATAL EXCEPTION。最終已移除測試 manifest，正式掃描 Activity 維持 `exported="false"`。
- 使用者手動更新的 `settings.html` 免責聲明引號格式已保留並同步 Android assets；Service Worker 快取為 `expiry-manager-cache-v364`。

### 9.44 Play Console 原生偵錯符號警告確認（2026-07-12）
- Android Studio release 設定已加入 `ndk { debugSymbolLevel = "SYMBOL_TABLE" }`，供未來自有 native library 自動隨 AAB 納入符號 metadata。
- `:app:bundleRelease` 通過，並以 `:app:extractReleaseNativeSymbolTables --rerun-tasks --info` 驗證目前無 symbols ZIP／AAB debug-symbol metadata 可產生。
- 原因已由 Gradle 確認：ML Kit／CameraX 預編譯的 `libbarhopper_v3.so`、`libimage_processing_util_jni.so`、`libsurface_util_jni.so` 在全部 ABI 的 native debug metadata 均已經 stripped；本專案未含自有 C/C++ library，因此無可補上的符號檔。
- Play Console 警告屬建議性、不阻擋上架；對這些第三方原生庫的符號化需要供應商提供對應 symbols。正常 Java/Kotlin／R8 堆疊仍使用 `mapping.txt`，與此警告不同。
- `app-release.aab` 仍是未簽署建置驗證產物；正式上傳仍需使用者在 Android Studio 以自己的 release keystore 產生 signed AAB。

### 9.45 主頁控制項後捲動跳動修正與測試（2026-07-13）
- 原因為 v2.0.3 的雙重動畫幀清單重繪可在使用者開始滑動時才替換商品列，內容高度重算會造成頁面捲動跳動。
- `scheduleProductRender()` 改為單一動畫幀；若偵測到頁面捲動，待最後一次 scroll 120ms 後才重繪，並在排程期間確認 scroll position 未變才替換清單。
- 版本維持 `v2.0.3`，Service Worker 快取為 `expiry-manager-cache-v365`；本批次依使用者要求需重新建置 `minifiedDebug` R8 APK 與 Pixel_7 操作／壓力測試。
- Pixel_7 實測已完成：主頁完成 14 次新增／取消、14 筆新增、18 次編輯開關、分類／排序／搜尋／健康篩選／勾選，以及點擊後立即滑動測試；scroll position 維持不變。設定頁完成 12 次標題儲存／還原、分類新增刪除、主題與語言切換；分析與隱私權頁皆正常載入且未顯示錯誤。
- 另完成 40 次新增視窗開關及 30 次篩選壓力測試；無崩潰或未關閉 modal，僅觀察到一次 67ms long task，發生於連續篩選造成的清單重繪，尚未達明顯卡頓，本輪不自行改善，待使用者決定。
- 最終 `minifiedDebug` R8 APK 已以 Pixel_7 清除資料後安裝啟動，確認 `versionName=2.0.3-r8test`、v2 debug 簽章有效、無 App crash；測試用 WebView debugging hook 已移除。

### 9.46 1,200 筆主頁資料效能實測（2026-07-13）
- 以 Pixel_7 的隔離 R8 `minifiedDebug` WebView 建立 1,200 筆商品資料後量測：完整排序約 365ms、完整分類重繪約 323ms、健康篩選並重繪 680 筆約 197ms、搜尋縮小至 100 筆約 67ms、全選 1,200 筆約 10ms。
- 篩選後立即滑動的 scroll position 差值為 0，9.45 的滑動跳動修正仍有效。
- 結論：大資料量下的瓶頸是 `renderProducts()` 完整移除並重建所有商品列，排序／分類／健康篩選可造成明顯卡頓；依使用者指示僅報告，不在本輪自行改善。
- 測試用 WebView debugging hook 已移除、1,200 筆資料已從 Pixel_7 R8 測試包清除，最終 R8 APK 已重新建置與安裝。
### 9.47 1,200 筆商品分段渲染（2026-07-13）
- 商品清單改為保留完整排序／篩選結果、但初始只透過 `DocumentFragment` 建立前 100 筆列；清單尾端進入距離視窗底部約 2.5 個螢幕高度時，下一批 100 筆會先於 idle 時段建構，接近時再直接接上。
- 篩選、搜尋、排序或日期變動會使分段狀態安全重置；以 token 忽略舊的預建工作。舊 WebView 若不支援 `IntersectionObserver`，以位置檢查作為降級行為。
- 全選／取消全選改為作用於目前完整篩選結果，而非只作用於已建立的 DOM 列；後續接上的商品列會維持正確勾選狀態。
- Pixel_7 R8 隔離測試以 1,200 筆資料驗證：初始 100 列，接近尾端依序載入至 200、300 列；第二批第 150 列連續 5 次開啟／關閉編輯視窗均正常。完整 1,200 筆全選會延續到後續批次。
- 操作量測：排序首次畫面更新約 94ms、分類約 24ms、精確搜尋約 28ms；篩選後立即滑動的位移誤差約 0.2px，未見跳動。Service Worker 快取更新為 `expiry-manager-cache-v366`，版本維持 `v2.0.3`。
- 測試用 WebView debugging hook 已移除，Pixel_7 的隔離 R8 測試資料已清除；已重新建置正式設定的 `minifiedDebug` R8 APK。
### 9.48 共用按壓視覺回饋（2026-07-13）
- `legacy-webview.js` 在所有頁面共用的 capture 階段監聽 `pointerdown`／`pointerup`／`pointercancel`；按下按鈕、導覽、自訂選單、月曆、健康檢查、分類與主題等可點擊控制項時，立即加入 `is-pressed`，放開後至少保留 120ms。
- `styles_washi.css` 以深色覆蓋、微下壓與短轉場呈現按壓狀態；原本 click handler 仍立即執行，不增加操作延遲。空白月曆格、disabled 與 `aria-disabled` 控制項不套用。
- 同時保留 `:active` 作為 JavaScript 不可用時的基本回饋，並設定 `touch-action: manipulation`。
- 版本維持 `v2.0.3`，Service Worker 快取更新為 `expiry-manager-cache-v367`。Pixel_7 R8 實測確認主頁新增、健康檢查、自訂選單，以及設定頁主題／導覽、分析頁導覽均可呈現按壓變色與下壓；新增視窗仍立即開啟。測試用 WebView debugging hook 已移除；最終 `minifiedDebug` R8 APK 已在 Pixel_7 重新安裝啟動，無 FATAL EXCEPTION，且未暴露 WebView debugging endpoint。
### 9.49 v2.0.5 操作回饋、商品鍵與中文副標（2026-07-13）
- 共用按壓回饋的進場動畫改為立即生效，放開後仍由最短 120ms 的 `is-pressed` 狀態維持可見回饋；功能不延後。
- 回饋涵蓋 `a[href]` 功能連結，並補上鍵盤 Enter／Space／Spacebar 的按下與放開處理；`prefers-reduced-motion` 會保留變色但取消下壓位移。
- 設定、分析、隱私權頁返回鍵改為「商 品」：英文 `Products`、日文「商 品」。分析頁商品鍵直接連回 `inventory-management-app.html`。
- 版本更新為 `v2.0.5`／Android `versionCode = 20005`；更新內容英日翻譯已同步。使用者手動更新的 `home-subtitles.js` 必須一併同步 Android assets 並納入 Git 提交。
- Service Worker 快取版本為 `expiry-manager-cache-v368`。Pixel_7 R8 實測確認：按壓效果立即呈現、鍵盤 Enter 回饋正常、設定頁英文 `Products`／日文「商 品」、分析頁商品鍵直回主頁。最終 R8 APK 已重建與重新安裝，`versionCode=20005`、無 FATAL EXCEPTION 且未暴露 WebView debugging endpoint。
### 9.50 v2.0.5 設定頁英日翻譯修正（2026-07-13）
- 修正根因：`i18n.js` 內設定頁「關於」與免責聲明四項的翻譯 key 仍使用舊版文案與標點，無法命中使用者更新後的 `settings.html` 原文。
- 已以目前原文更新英文與日文鍵值；「關於」中的執行、代碼、排版、色彩、翻譯與測試欄位，以及免責聲明四項均會完整翻譯。
- 版本維持 `v2.0.5`，Service Worker 快取更新為 `expiry-manager-cache-v369`；需同步 `i18n.js`、`settings.html`、`privacy-policy.html`、`sw.js` 至 Android Studio assets，並重建 `minifiedDebug` R8 APK。
### 9.51 v2.0.5 中文主頁副標同步（2026-07-13）
- 使用者手動更新 `home-subtitles.js` 第 11 則中文副標文案；已保留原始編號與輪替邏輯。
- 此檔為主頁 runtime asset，需與 `i18n.js`、`sw.js` 一併同步 Android Studio `app/src/main/assets/`，並以 SHA-256 確認。
- 版本維持 `v2.0.5`，Service Worker 快取更新為 `expiry-manager-cache-v370`；完成 R8 `minifiedDebug` 重建後，將本批次變更提交並推送 GitHub。
### 9.52 Android 15+ edge-to-edge 複核（2026-07-13）
- Play Console 的提示屬 target SDK 35 以上預設無邊框的通用相容性提醒，不代表目前已發生遮擋；本專案目前 `targetSdk = 36`，必須持續自行處理 inset。
- 現有實作已符合需求：`MainActivity` 主動採 `WindowCompat.setDecorFitsSystemWindows(window, false)`；以 `ViewCompat.setOnApplyWindowInsetsListener` 讀取 system bars 與 display cutout，原生 WebView 套用左右／底部 padding，並依 display density 將上／下 inset 注入 CSS `--safe-area-top`／`--safe-area-bottom`。前端 topbar、modal、toast 與返回頂端按鈕均使用這些變數。
- Android 15 以上的 `AndroidBridge.setStatusBarColor()` 不再呼叫無效的 `window.statusBarColor`，只更新狀態列圖示明暗；原生掃描 Activity 則維持沉浸式 system-bar 隱藏，並以 `WindowInsets` 調整底部提示與手電筒控制項。
- 不要僅為此提示額外加入 `enableEdgeToEdge()`：現有手動實作已主動進入 edge-to-edge 且已處理 inset；重複初始化沒有額外效益，也可能干擾目前的 WebView／CSS 分工。
- 實測 R8 `minifiedDebug` v2.0.5-r8test：Pixel 7（API 36，1080x2400）完成 clean launch、主頁、設定頁及設定頁底部免責聲明可視檢查，狀態列與手勢導覽列均未遮擋內容；Pixel 10 Pro XL（API 37，1344x2992）完成 clean launch 與初始資料儲存視窗檢查，頂／底 system bar 未裁切視窗。兩台測試期間 logcat 未見本 App `FATAL EXCEPTION`／`AndroidRuntime`。
- 本輪結論為無需修改原生／前端程式、版本、快取或重新打包；僅新增本工作紀錄。未來若改動固定頂欄、modal、toast、返回頂端按鈕或掃描底部提示，需在 Android 15+ 再次檢查 inset。

### 9.53 Android 雙 Logo Splash、狀態列啟動修正與 R8 重建（2026-07-20）
- Android 原生 Splash 改為全黑 `#050505` 的無縫銜接流程：系統 Splash 使用透明 placeholder 隱藏預設 app 圖示，隨後由 `MainActivity.kt` 的原生黑色 overlay 顯示雙 Logo。第一個為使用者提供的 `references/android-splash-ketaihan.svg` 轉出的 `res/drawable-nodpi/splash_keitaihan_logo.png`；第二個為 `icons/icon-app-512.png` 去除方形透明區、保留中央圓形圖示後的 `splash_app_icon.png`。
- 雙 Logo 動畫設定為各自 600ms 淡入、顯示 2.3 秒、500ms 淡出；首頁完成可視渲染後以 1.5 倍縮放、583ms 的 zoom-in 顯示。系統 Splash 到原生 overlay、以及 overlay 到 WebView 首頁之間均維持黑底，避免露出 launcher icon、底圖或閃爍。
- 修正「最後選擇非霓虹主題後重新啟動，Android 狀態列會先顯示上次主題色」：`MainActivity` 啟動時先套用黑色狀態列；`AndroidBridge.setStatusBarColor()` 在原生 Splash 尚可見時只暫存前端要求的色彩，待 Splash overlay 淡出完成後才套用。Android 15+ 仍維持 edge-to-edge，只更新狀態列圖示明暗；較舊 Android 則在 Splash 期間保留實體黑色狀態列。
- 已將最新前端 runtime assets 完整同步至 Android Studio `app/src/main/assets/`。曾因錯誤的資料夾複製方式產生 `fonts/fonts`、`icons/icons`、`key-visuals/key-visuals` 巢狀重複資產，導致 R8 APK 異常增至約 110.7 MB；已只移除這三個確認為重複的子資料夾，未刪除正式 runtime assets。
- 已在 Android Studio 專案執行 `gradlew clean :app:assembleMinifiedDebug` 成功。最新 R8 APK 位於 `C:\Users\GURESUTA\AndroidStudioProjects\ProductExpiryCyberControl2\app\build\outputs\apk\minifiedDebug\app-minifiedDebug.apk`，package 為 `com.guresuta.productexpirycybercontrol.r8test`、`versionName=2.1.0-r8test`、`versionCode=20100`、v2 debug 簽章有效、無巢狀重複 entries；大小為 67.42 MB，SHA-256 為 `C4E1205AB72FB7C9BBF9E9AB1F5C4AC6A39184DE622B7290B60D7653ECAC4881`。
- 正式 AAB 與 APK 使用同一份 `app/src/main/assets/` 輸入；目前重複資料夾已移除，因此重新產生 AAB 不會再帶入該巢狀重複。正式上架仍需使用者於 Android Studio 以自己的 release keystore 產生 signed AAB。
- 本輪尚待人工驗證：依序選擇 `light-1`、`light-2`、`dark-2` 後完全關閉並重啟 App，確認狀態列在完整 Splash 過程維持黑色，首頁出現後才切換為儲存的主題色。
- 前端 Git repo 本輪尚未提交／推送；目前變更包含 `CHANGELOG.md` 的狀態列與雙 Logo Splash 說明。`pixel7-current.png` 與 `tmp/` 為測試／使用者工作檔，保持未追蹤且不可納入提交。
