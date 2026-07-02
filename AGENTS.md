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
- 目前 `version.js` 版本為 `v1.8.9`；目前 `sw.js` 快取版本為 `expiry-manager-cache-v314`。

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
