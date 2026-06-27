(function () {
  "use strict";

  const LANGUAGE_KEY = "appLanguage";
  const DEFAULT_LANGUAGE = "zh-Hant";
  const SUPPORTED_LANGUAGES = new Set(["zh-Hant", "en", "ja"]);
  const textNodeSources = new WeakMap();
  const attrSources = new WeakMap();
  let translating = false;
  let titleSource = "";

  const dictionaries = {
    en: {
      "商品終期電馭監管裝置": "Product Expiry Cyber Control",
      "設定 | 商品終期電馭監管裝置": "Settings | Product Expiry Cyber Control",
      "隱私權與資料安全 | 商品終期電馭監管裝置": "Privacy and Data Safety | Product Expiry Cyber Control",
      "離線可用，支援手動輸入與鏡頭條碼掃描": "Works offline, with manual entry and camera barcode scanning",
      "新 增 商 品": "Add Product",
      "設 定": "Settings",
      "設定": "Settings",
      "返 回": "Back",
      "商品效期月曆區塊": "Product expiry calendar section",
      "商品效期月曆": "Product Expiry Calendar",
      "上個月": "Previous month",
      "下個月": "Next month",
      "日": "Sun",
      "一": "Mon",
      "二": "Tue",
      "三": "Wed",
      "四": "Thu",
      "五": "Fri",
      "六": "Sat",
      "點擊有顏色標記的日期可直接篩選該日商品": "Tap a colored date to filter products for that day",
      "(再點一次取消)": "(tap again to clear)",
      "商品清單": "Product List",
      "已勾選 0 筆": "0 selected",
      "資料健康檢查": "Data health check",
      "無日期": "No date",
      "無條碼": "No barcode",
      "重複條碼": "Duplicate barcode",
      "已過期": "Expired",
      "60天內即期": "Due within 60 days",
      "30天內即期": "Due within 30 days",
      "全選商品": "Select all products",
      "全選": "Select all",
      "排序: 有效日期": "Sort: Expiry date",
      "排序: 分類": "Sort: Category",
      "排序: 狀態": "Sort: Status",
      "搜尋分類、商品名稱、條碼": "Category/name/code",
      "掃碼": "Scan",
      "搜尋": "Search",
      "分類": "Category",
      "商品名稱": "Product Name",
      "條碼": "Barcode",
      "有效日期": "Expiry Date",
      "備註": "Note",
      "狀態": "Status",
      "操作": "Actions",
      "選取": "Select",
      "選取商品": "Select product",
      "尚無資料，請先新增商品。": "No data yet. Add a product first.",
      "條碼掃描": "Barcode Scan",
      "請把條碼對準鏡頭中央。相機影像只在本機辨識，不會上傳。": "Center the barcode in the camera. Camera images are recognized locally and are not uploaded.",
      "請把條碼對準鏡頭中央。": "Center the barcode in the camera.",
      "關閉掃描": "Close Scanner",
      "打開手電筒": "Turn Flashlight On",
      "長亮手電筒": "Keep Flashlight On",
      "關閉手電筒": "Turn Flashlight Off",
      "商品條碼": "Product Barcode",
      "關閉": "Close",
      "新增商品": "Add Product",
      "商品分類": "Product Category",
      "輸入商品名稱": "Enter product name",
      "商品條碼": "Product Barcode",
      "手動輸入條碼": "Enter barcode manually",
      "鏡頭": "Camera",
      "掃描": "Scan",
      "選擇": "Pick",
      "日期": "Date",
      "可輸入商品備註": "Optional product note",
      "清空": "Clear",
      "取消": "Cancel",
      "選擇資料儲存方式": "Choose Data Storage",
      "iPhone / iPad Safari 只能使用IndexedDB將資料儲存在本機瀏覽器資料中；若清除 Safari 網站資料，商品資料會被刪除。建議定期匯出 JSON 備份到「檔案 App」或 iCloud Drive。": "On iPhone and iPad Safari, data can only be stored in this browser with IndexedDB. If Safari website data is cleared, product data will be deleted. Export JSON backups regularly to Files or iCloud Drive.",
      "使用 IndexedDB": "Use IndexedDB",
      "資料儲存在此瀏覽器與裝置中；清除瀏覽器資料會一併清除本專案資料。": "Data is stored in this browser and device. Clearing browser data also clears this project's data.",
      "使用本機檔案位置": "Use Local File",
      "可自行指定本機檔案位置；若瀏覽器支援，之後會從同一個資料檔讀寫。瀏覽器可能會在重新開啟後要求確認檔案編輯權限。": "Choose a local file for the app to read and write, if your browser supports it. After reopening, the browser may ask you to confirm file access again.",
      "更新內容": "Release Notes",
      "知道了": "OK",
      "清除": "Clear",
      "編輯": "Edit",
      "刪除": "Delete",
      "編輯商品": "Edit Product",
      "儲存": "Save",
      "確定要刪除這些資料嗎?": "Delete these records?",
      "確定": "Confirm",
      "建議備份資料": "Backup Recommended",
      "已新增 100 筆商品。建議立即備份 JSON 檔，避免瀏覽器資料被清除時遺失商品資料。": "100 products have been added. Back up a JSON file now to avoid losing product data if browser data is cleared.",
      "備份 JSON": "Back Up JSON",
      "稍後": "Later",
      "條碼已存在": "Barcode Already Exists",
      "覆蓋既有商品": "Overwrite Existing Product",
      "仍然新增": "Add Anyway",
      "仍然儲存": "Save Anyway",
      "發生錯誤": "Error",
      "發生未知錯誤": "An unknown error occurred",
      "再按一次返回鍵關閉 App": "Press Back again to close the app",
      "再按一次返回鍵關閉程式": "Press Back again to close the app",
      "商品已新增": "Product added",
      "已覆蓋既有商品": "Existing product overwritten",
      "商品已更新": "Product updated",
      "商品已刪除": "Product deleted",
      "分類已新增": "Category added",
      "分類已存在": "Category already exists",
      "分類已刪除": "Category deleted",
      "分類排序已更新": "Category order updated",
      "至少需保留一個分類": "Keep at least one category",
      "請輸入分類名稱": "Enter a category name",
      "JSON 備份成功": "JSON backup complete",
      "CSV 匯出成功": "CSV export complete",
      "JSON 備份失敗": "JSON backup failed",
      "CSV 匯出失敗": "CSV export failed",
      "商品效期資料 JSON": "Product expiry data JSON",
      "已取消 JSON 還原": "JSON restore canceled",
      "已取消選擇本機檔案位置": "Local file selection canceled",
      "已改用 IndexedDB": "Switched to IndexedDB",
      "已改用本機檔案位置，並寫入目前資料": "Switched to Local File and saved the current data",
      "已使用 IndexedDB 儲存資料": "Data is now stored in IndexedDB",
      "已使用本機檔案位置儲存資料": "Data is now stored in the local file",
      "尚未連回先前的本機 JSON 檔案，請重新選擇同一個 JSON 檔案": "The previous local JSON file is not connected. Select the same JSON file again.",
      "尚未連回先前的本機 JSON 檔案，已先儲存在 IndexedDB。請到設定重新選擇同一個 JSON 檔案": "The previous local JSON file is not connected. Data was saved to IndexedDB for now. Go to Settings and select the same JSON file again.",
      "尚未連回先前的本機 JSON 檔案，已先使用 IndexedDB。請到設定重新選擇同一個 JSON 檔案": "The previous local JSON file is not connected. IndexedDB is being used for now. Go to Settings and select the same JSON file again.",
      "寫入檔案失敗": "Failed to write the file",
      "本機 JSON 檔案選擇失敗": "Failed to select the local JSON file",
      "裝置不支援選擇本機 JSON 檔案": "This device does not support selecting a local JSON file",
      "裝置不支援原生 CSV 匯出": "This device does not support native CSV export",
      "裝置不支援原生 JSON 備份": "This device does not support native JSON backup",
      "未取得檔案讀寫權限": "File read/write permission was not granted",
      "此瀏覽器不支援指定本機檔案位置，請使用 IndexedDB 並定期備份 JSON": "This browser does not support choosing a local file. Use IndexedDB and back up JSON regularly.",
      "請先選擇 CSV 檔案": "Select a CSV file first",
      "請先選擇 JSON 檔案": "Select a JSON file first",
      "檔案格式錯誤，請上傳 .csv 或 .scv": "Invalid file format. Select a .csv or .scv file.",
      "檔案格式錯誤，請上傳 .json": "Invalid file format. Select a .json file.",
      "檔案讀取失敗": "Failed to read the file",
      "CSV 內容不足，至少需有標題列與一筆資料": "The CSV must contain a header row and at least one data row",
      "CSV 標題需包含 分類、商品名稱、條碼、有效日期": "The CSV header must include Category, Product Name, Barcode, and Expiry Date",
      "CSV 無有效商品資料": "The CSV contains no valid product data",
      "JSON 內容缺少 products 陣列": "The JSON does not contain a products array",
      "JSON 內容格式錯誤": "Invalid JSON content format",
      "JSON 內容無效": "Invalid JSON content",
      "JSON 無有效商品資料": "The JSON contains no valid product data",
      "找不到要編輯的商品": "The product to edit could not be found",
      "日期格式錯誤，請使用 YYYY-MM-DD / YYYY/MM/DD / YYYYMMDD": "Invalid date format. Use YYYY-MM-DD, YYYY/MM/DD, or YYYYMMDD.",
      "有效日期格式錯誤，請使用 YYYY-MM-DD": "Invalid expiry date format. Use YYYY-MM-DD.",
      "程式發生未預期錯誤": "An unexpected application error occurred",
      "程式發生未處理錯誤": "An unhandled application error occurred",
      "有商品有效日期": "Products expire on this date",
      "新增": "Add",
      "匯入": "Import",
      "匯出": "Export",
      "JSON 備份": "JSON backup",
      "讀取檔案資料庫": "Read file database",
      "更新公告狀態儲存": "Save release notice status",
      "儲存設定": "Save settings",
      "本機檔案位置設定": "Configure local file",
      "儲存模式切換": "Switch storage mode",
      "分類排序儲存": "Save category order",
      "初始化": "Initialization",
      "此瀏覽器不支援 BarcodeDetector，請改用手動輸入條碼": "This browser does not support BarcodeDetector. Enter the barcode manually instead.",
      "此裝置或 WebView 不支援鏡頭掃描，請改用手動輸入條碼": "This device or WebView does not support camera scanning. Enter the barcode manually instead.",
      "需要相機權限才能掃描條碼；影像只在本機辨識，不會上傳。": "Camera permission is required to scan barcodes. Images are recognized locally and are not uploaded.",
      "找不到可用的相機，請改用手動輸入條碼": "No available camera was found. Enter the barcode manually instead.",
      "無法啟動相機，請確認沒有其他 App 正在使用相機": "Unable to start the camera. Check that no other app is using it.",
      "瀏覽器封鎖相機權限，請確認網站或 App 已允許相機": "The browser blocked camera permission. Confirm that camera access is allowed for this site or app.",
      "此裝置不支援手電筒控制": "This device does not support flashlight control.",
      "返回頁面頂端": "Back to Top",
      "返回頂端": "Back to Top",
      "系統設定": "Settings",
      "管理分類標籤、匯入匯出與介面主題": "Manage categories, files, theme, and language",
      "新增分類": "Add Category",
      "輸入新分類名稱": "Enter a new category name",
      "資料儲存": "Data Storage",
      "本機檔案位置": "Local File",
      "目前模式：讀取中": "Current mode: Loading...",
      "切換到本機檔案位置時會先把目前資料寫入該檔案。": "Switching to Local File saves the current data to that file first.",
      "改用 IndexedDB": "Use IndexedDB",
      "選擇本機檔案位置": "Choose Local File",
      "檔案功能": "Files",
      "此裝置資料為獨立儲存。": "This device has its own separate data.",
      "匯出 CSV": "Export CSV",
      "備份資料 JSON": "Back Up JSON",
      "匯入試算表資料": "Import Spreadsheet",
      "還原資料 JSON": "Restore JSON Backup",
      "匯入會保留原有商品，並合併上傳檔案中的資料。": "Imported data is merged with existing products.",
      "介面模式": "Appearance",
      "明亮模式": "Light",
      "黑暗模式": "Dark",
      "目前主題：霓虹電馭": "Current theme: Neon Cyber",
      "語言": "Language",
      "中文": "Chinese",
      "日本語": "Japanese",
      "更新紀錄": "Release Notes",
      "目前版本：讀取中": "Current version: Loading...",
      "關於": "About",
      "構想：GURESUTA": "Concept: GURESUTA",
      "策劃：GURESUTA": "Planning: GURESUTA",
      "執行：Codex(GPT-5.3-Codex、GPT-5.5)": "Implementation: Codex (GPT-5.3-Codex, GPT-5.5)",
      "代碼：Codex(GPT-5.3-Codex、GPT-5.5)": "Code: Codex (GPT-5.3-Codex, GPT-5.5)",
      "排版：Codex(GPT-5.3-Codex、GPT-5.5)": "Layout: Codex (GPT-5.3-Codex, GPT-5.5)",
      "色彩：Gemini Web、Codex(GPT-5.5)": "Color: Gemini Web, Codex (GPT-5.5)",
      "字型：GenSekiGothic2TC": "Font: GenSekiGothic2TC",
      "翻譯：Codex(GPT-5.5)": "Translation: Codex (GPT-5.5)",
      "測試：Codex(GPT-5.3-Codex、GPT-5.5)": "Testing: Codex (GPT-5.3-Codex, GPT-5.5)",
      "指示：GURESUTA": "Directed by GURESUTA",
      "發布：GURESUTA": "Release: GURESUTA",
      "隱私權與資料安全說明": "Privacy and Data Safety Notice",
      "免責聲明": "Disclaimer",
      "一.「本專案為開源工具，僅供個人管理商品效期使用。": "1. This open-source tool is intended only for personal product expiry management.",
      "二.使用者自行上傳之商品資訊（包含但不限於菸酒、藥品），應遵守相關法令規範。": "2. Users are responsible for ensuring that any product information they enter, including tobacco, alcohol, and medicines, complies with applicable laws.",
      "三.本程式僅提供管理功能，不具備廣告或促銷意圖。」": "3. This app provides management features only and is not intended for advertising or promotion.",
      "版本": "Version",
      "贊助與自訂標題": "Support and Custom Title",
      "贊助": "Support",
      "贊助狀態：讀取中": "Support status: Loading...",
      "贊助狀態：此功能僅支援 Google Play 安裝的 Android 版": "Support status: Available only in the Android version installed from Google Play",
      "贊助狀態：尚未解鎖": "Support status: Not unlocked",
      "贊助狀態：已解鎖自訂標題": "Support status: Custom title unlocked",
      "贊助新台幣 50 元可解鎖主頁標題自訂。此功能僅支援 Google Play 安裝的 Android 版。": "Support with NT$50 to unlock main title customization. This feature is available only in the Android version installed from Google Play.",
      "贊助新台幣 50 元可解鎖主頁標題自訂。": "Support with NT$50 to unlock main title customization.",
      "贊助 NT$50": "Support NT$50",
      "恢復購買": "Restore Purchase",
      "自訂主頁標題": "Custom Main Title",
      "輸入自訂標題": "Enter a custom title",
      "儲存標題": "Save Title",
      "恢復預設標題": "Restore Default Title",
      "此功能僅支援 Google Play 安裝的 Android 版": "This feature is available only in the Android version installed from Google Play",
      "Google Play Billing 尚未初始化": "Google Play Billing has not initialized yet",
      "無法取得贊助項目，請確認 Play Console 已建立 supporter_title_unlock": "Unable to load the support item. Confirm that supporter_title_unlock has been created in Play Console.",
      "感謝贊助，已解鎖自訂標題": "Thank you for your support. Custom title is unlocked.",
      "贊助流程未完成": "The support flow was not completed",
      "已恢復購買並解鎖自訂標題": "Purchase restored. Custom title is unlocked.",
      "尚未找到已購買的贊助項目": "No purchased support item was found",
      "贊助後才能自訂主頁標題": "Support the app to customize the main title",
      "自訂標題已儲存": "Custom title saved",
      "已恢復預設標題": "Default title restored",
      "贊助失敗": "Support",
      "恢復購買失敗": "Restore purchase",
      "選擇主題": "Choose Theme",
      "選擇黑暗主題": "Choose Dark Theme",
      "選擇明亮主題": "Choose Light Theme",
      "刪除分類": "Delete Category",
      "刪除標籤": "Delete Tag",
      "確定刪除": "Delete",
      "隱私權與資料安全": "Privacy and Data Safety",
      "說明資料儲存、相機權限與備份行為": "How data storage, camera access, and backups work",
      "政策資訊": "Policy Information",
      "本隱私權與資料安全說明適用於「商品終期電馭監管裝置」。": "This privacy and data safety notice applies to Product Expiry Cyber Control.",
      "開發者：GURESUTA。": "Developer: GURESUTA.",
      "聯絡方式：": "Contact:",
      "E-MAIL：": "E-mail:",
      "生效日期：2026-05-20。": "Effective date: 2026-05-20.",
      "本 App 可能由使用者自行建立商品分類、商品名稱、條碼、有效日期、主題設定與備份資料。": "Users may create product categories, product names, barcodes, expiry dates, theme settings, and backup data in this app.",
      "上述資料預設儲存在裝置本機 IndexedDB，不會由本 App 主動上傳到 GitHub Pages 或其他伺服器。": "By default, this data is stored locally in IndexedDB on the device. The app does not upload it to GitHub Pages or any other server.",
      "若使用「本機檔案位置」，資料會寫入使用者選擇的本機 JSON 檔案；使用者可自行保管、備份或刪除該檔案。": "If Local File is used, data is written to the local JSON file selected by the user. Users are responsible for keeping, backing up, or deleting that file.",
      "相機權限": "Camera Permission",
      "相機只用於條碼掃描。Android App 使用裝置內的 ML Kit 辨識條碼；網頁版則使用瀏覽器支援的條碼辨識能力。": "The camera is used only for barcode scanning. The Android app uses on-device ML Kit barcode recognition, while the web version uses the browser's supported barcode recognition.",
      "本專案不會儲存相機影像，不會錄音，也不會把影像傳送到遠端服務。": "This project does not store camera images, record audio, or send images to remote services.",
      "若使用者拒絕相機權限，仍可手動輸入條碼與管理商品資料。": "If camera permission is denied, users can still enter barcodes manually and manage product data.",
      "資料使用與分享": "Data Use and Sharing",
      "本 App 使用商品資料是為了在本機提供新增、編輯、刪除、搜尋、排序、月曆提醒、CSV 匯出、JSON 備份與還原功能。": "The app uses product data locally to support adding, editing, deleting, searching, sorting, calendar reminders, CSV export, and JSON backup and restore.",
      "本 App 不會販售、分享或轉移使用者建立的商品資料給第三方。": "The app does not sell, share, or transfer user-created product data to third parties.",
      "Android 版若使用 Google Play 贊助功能，付款流程由 Google Play 處理，本 App 只接收購買狀態，不會取得信用卡號等付款資料。": "If the Android version uses Google Play support purchases, payment is handled by Google Play. This app receives only the purchase status and does not receive credit card numbers or other payment details.",
      "若使用者自行匯出 CSV 或 JSON 檔案，該檔案由使用者自行保存、傳送或刪除。": "If users export CSV or JSON files, they are responsible for storing, sharing, or deleting those files.",
      "匯入、匯出與備份": "Import, Export, and Backup",
      "CSV 匯出、JSON 備份與 JSON 還原都由使用者手動觸發。": "CSV export, JSON backup, and JSON restore are started manually by the user.",
      "JSON 備份檔包含商品資料與分類設定，請視為個人資料自行保存。": "JSON backup files contain product data and category settings. Treat them as personal data and keep them safely.",
      "匯入檔案只會在本機讀取並合併到目前資料庫，不會上傳。": "Imported files are read locally and merged into the current database. They are not uploaded.",
      "資料保存與刪除": "Data Retention and Deletion",
      "本機資料會保留在使用者裝置中，直到使用者刪除商品、清除網站資料、移除 App，或刪除自行保存的備份檔。": "Local data stays on the user's device until the user deletes products, clears site data, removes the app, or deletes saved backup files.",
      "使用者可在商品清單刪除個別商品，也可清除瀏覽器網站資料或移除 App 來刪除本機資料。": "Users can delete individual products from the product list. They can also delete local data by clearing browser site data or removing the app.",
      "若曾匯出 JSON 或指定本機檔案位置，請另外刪除使用者自行保存的檔案。": "If JSON files were exported or Local File was used, those user-managed files must be deleted separately.",
      "資訊安全": "Information Security",
      "本 App 以本機儲存為主要設計，開發者不會主動接收使用者建立的商品資料。": "This app is designed for local storage. The developer does not receive user-created product data unless the user sends it separately.",
      "請使用者自行保管裝置、瀏覽器資料與匯出的備份檔，避免未授權的人取得資料。": "Users should protect their devices, browser data, and exported backup files from unauthorized access.",
      "霓虹電馭": "Neon Cyber",
      "日光電馭": "Daylight Cyber",
      "活力綠洲": "Vibrant Oasis",
      "深夜綠洲": "Midnight Oasis",
      "目前版本：未設定": "Current version: Not set",
      "v1.8.0更新內容": "v1.8.0 Release Notes",
      "v1.7.0更新內容": "v1.7.0 Release Notes",
      "v1.5.2更新內容": "v1.5.2 Release Notes",
      "v1.5.1更新內容": "v1.5.1 Release Notes",
      "v1.5.0更新內容": "v1.5.0 Release Notes",
      "v1.4.3更新內容": "v1.4.3 Release Notes",
      "v1.4.2更新內容": "v1.4.2 Release Notes",
      "v1.4.1更新內容": "v1.4.1 Release Notes",
      "v1.4.0更新內容": "v1.4.0 Release Notes",
      "v1.3.0更新內容": "v1.3.0 Release Notes",
      "v1.2.0更新內容": "v1.2.0 Release Notes",
      "v1.1.0更新內容": "v1.1.0 Release Notes",
      "提升資訊安全相關項目": "Improved information security items",
      "版面最佳化": "Optimized layout",
      "重新設計條碼掃描介面": "Redesigned the barcode scanning interface",
      "提升裝置相容性": "Improved device compatibility",
      "排版及操作最佳化": "Optimized layout and interaction",
      "修復未套用英/日文翻譯的提示文字": "Fixed hint text that was not applying English or Japanese translations",
      "Android裝置狀態列會根據主題變更顏色": "The Android device status bar now changes color with the active theme",
      "自動記憶新增商品時的分類選擇": "Automatically remembers the category selected when adding products",
      "替換四種主題背景": "Replaced the backgrounds for the four themes",
      "最佳化匯出CSV格式": "Optimized CSV export format",
      "修正 Android 更新安裝後仍可能載入舊版前端的問題，更新時會清除 WebView 靜態資產快取並保留 IndexedDB 商品資料": "Fixed an issue where Android update installs could still load an older frontend; updates now clear WebView static asset caches while preserving IndexedDB product data",
      "IndexedDB 備份提醒改為每新增 100 筆商品提示一次，主頁與設定頁手動備份 JSON 後會重新計算": "IndexedDB backup reminders now appear every 100 added products, and the count restarts after a manual JSON backup from the main or settings page",
      "版面操作最佳化": "Optimized layout and interaction flow",
      "修正 Android 返回鍵行為：設定頁與隱私權頁返回主頁，主頁支援再按一次返回鍵關閉程式": "Fixed Android Back behavior: settings and privacy pages return to the main page, and the main page supports pressing Back again to close the app",
      "新增主頁、設定頁與隱私權頁初始化讀取過場，抵消切換頁面與啟動時的畫面跳動": "Added startup loading transitions on the main, settings, and privacy pages to reduce visual jumps during page changes and app startup",
      "多語系支援依系統語言決定首次介面，並補強中文、英文、日文介面翻譯、更新紀錄與設定頁文字": "Multilingual support now uses the system language for the first-run interface, with improved Chinese, English, and Japanese UI translations, release notes, and settings copy",
      "更新 Android 安裝名稱多語系資源，中文、英文、日文系統會顯示對應 App 名稱": "Updated Android localized app name resources so Chinese, English, and Japanese systems show the matching app name",
      "修正英文與日文介面在輸入框、搜尋欄、掃描按鈕與商品卡片操作列的文字裁切與排版問題": "Fixed text clipping and layout issues in English and Japanese input fields, search fields, scan buttons, and product card action rows",
      "英日翻譯最佳化": "Optimized English and Japanese translations",
      "修復英文介面在文字輸入框的文字裁切問題": "Fixed text clipping in text fields in the English interface",
      "修正英文與日文介面的商品清單搜尋欄提示文字在手機模式可能超出欄位的問題": "Fixed product list search placeholder text that could overflow its field in mobile mode in English and Japanese",
      "修正分類標籤刪除確認視窗的英文與日文翻譯": "Fixed English and Japanese translations for the category tag delete confirmation dialog",
      "修正取消分類標籤刪除確認視窗時可能跳回主頁的問題": "Fixed an issue where canceling the category tag delete confirmation dialog could return to the main page",
      "分類標籤內容維持使用者輸入文字，不再翻譯預設分類名稱": "Category tag text now stays as entered by the user; default category names are no longer translated",
      "潤飾英文與日文翻譯": "Refined English and Japanese translations",
      "增加英文與日文語言選擇": "Added English and Japanese language selection",
      "更改圖示": "Updated icons",
      "變更icon": "Changed icon",
      "移除外部字型請求並改用本機字型，字型使用 GenSekiGothic2TC": "Removed external font requests and switched to local GenSekiGothic2TC fonts",
      "補正式隱私權與資料安全說明頁": "Added a formal privacy and data safety page",
      "新增霓虹電馭、日光電馭、活力綠洲與深夜綠洲主題，並補強月曆、商品卡片、按鈕、框線與提示訊息樣式": "Added Neon Cyber, Daylight Cyber, Vibrant Oasis, and Midnight Oasis themes, with improved calendar, product card, button, border, and hint styles",
      "新增商品與編輯商品表單加入備註欄位，商品清單與卡片模式只在有備註時顯示備註，CSV 匯入匯出同步支援備註": "Added note fields to add/edit forms; product lists and cards show notes only when present, and CSV import/export supports notes",
      "設定頁刪除分類標籤時新增確認視窗，並調整本機檔案位置授權提示文字": "Added a confirmation dialog for deleting category tags and adjusted local file permission guidance",
      "分類選擇清單、排序清單與選擇日期視窗改為符合介面主題的自建樣式": "Rebuilt category selects, sort selects, and date picker dialogs with theme-aware custom styles",
      "移除鏡頭掃描中的曝光補償控制，保留掃描主要流程": "Removed exposure compensation controls from camera scanning while preserving the main scanning flow",
      "網頁版面最佳化": "Optimized web layout",
      "主頁與設定頁頂部標題區塊新增飾條與底部邊框": "Added decorative lines and bottom borders to the top title areas on the main and settings pages",
      "主頁底部新增返回頂端按鈕，商品清單過長時可快速回到頁面頂端": "Added a back-to-top button at the bottom of the main page for long product lists",
      "商品清單、編輯商品視窗與關閉按鈕改為跟隨主題變化的樣式": "Updated product list, edit modal, and close buttons to follow the active theme",
      "設定頁返回按鈕位置同步對齊主頁設定按鈕": "Aligned the settings page back button with the main page settings button",
      "本機檔案位置重新開啟後不再自動跳出檔案編輯授權提示": "Stopped automatically showing file edit permission prompts after reopening a local file location",
      "修正手機 PWA 開啟時本機檔案位置授權造成的錯誤彈窗": "Fixed an error dialog caused by local file permissions when opening the mobile PWA",
      "自動儲存時若尚未取得本機檔案位置授權，會先儲存在 IndexedDB": "When local file permission is unavailable during autosave, data is saved to IndexedDB first",
      "更新【關於】欄位內容": "Updated the About section",
      "新增 version.js 作為單一版本來源，設定頁會顯示目前版本與更新紀錄": "Added version.js as the single release source; the settings page displays the current version and release history",
      "新增商品表單改為彈出式視窗，頂部導覽列新增新增商品與設定按鈕": "Changed the add product form into a modal and added Add Product and Settings buttons to the top navigation",
      "新增商品效期月曆，支援點擊有標示日期篩選商品並再次點擊取消": "Added a product expiry calendar; marked dates can filter products and be tapped again to clear",
      "商品清單新增資料檢查，可篩選無日期、無條碼、重複條碼、已過期、60 天內即期與 30 天內即期商品": "Added data checks for products with no date, no barcode, duplicate barcodes, expired status, due within 60 days, and due within 30 days",
      "鏡頭掃描新增手電筒按鈕，支援打開、長亮與關閉手電筒": "Added flashlight controls for camera scanning: on, keep on, and off",
      "新增重複條碼提醒，可選擇覆蓋既有商品、仍然新增或取消": "Added duplicate barcode warnings with choices to overwrite, add anyway, or cancel",
      "新增 IndexedDB 每新增 30 筆商品的 JSON 備份提醒": "Added a JSON backup reminder for every 30 products added to IndexedDB",
      "新增首次使用儲存方式選擇視窗，可選擇 IndexedDB 或本機檔案位置": "Added a first-use storage choice dialog for IndexedDB or local file location",
      "新增 iPhone / iPad Safari 備份提醒與設定頁資料儲存區塊": "Added iPhone / iPad Safari backup guidance and a data storage section on the settings page",
      "移除排序欄中的無日期與無條碼選項，改由資料檢查篩選": "Removed No Date and No Barcode from sorting and moved them to data check filters",
      "修復一些影響使用體驗的小錯誤": "Fixed minor issues affecting the user experience",
      "未到期": "Not expired",
      "即期": "Expiring soon",
      "正常": "Normal",
      "未分類": "Uncategorized",
      "未命名商品": "Unnamed product",
      "商品": "Product",
      "全部分類": "All Categories",
      "請選擇分類": "Select category",
      "飲料": "Beverages",
      "零食": "Snacks",
      "泡麵": "Instant noodles",
      "糖果": "Candy"
    },
    ja: {
      "商品終期電馭監管裝置": "商品期限サイバー管理装置",
      "設定 | 商品終期電馭監管裝置": "設定 | 商品期限サイバー管理装置",
      "隱私權與資料安全 | 商品終期電馭監管裝置": "プライバシーとデータ安全性 | 商品期限サイバー管理装置",
      "離線可用，支援手動輸入與鏡頭條碼掃描": "オフライン対応、手入力とカメラバーコードスキャンに対応",
      "新 增 商 品": "商品追加",
      "設 定": "設定",
      "返 回": "戻る",
      "商品效期月曆區塊": "商品期限カレンダー領域",
      "商品效期月曆": "商品期限カレンダー",
      "上個月": "前の月",
      "下個月": "次の月",
      "日": "日",
      "一": "月",
      "二": "火",
      "三": "水",
      "四": "木",
      "五": "金",
      "六": "土",
      "點擊有顏色標記的日期可直接篩選該日商品": "日付けをタップして商品を絞り込む",
      "(再點一次取消)": "（もう一度タップで解除）",
      "商品清單": "商品リスト",
      "已勾選 0 筆": "0件選択中",
      "資料健康檢查": "データチェック",
      "無日期": "日付なし",
      "無條碼": "バーコードなし",
      "重複條碼": "重複バーコード",
      "已過期": "期限切れ",
      "60天內即期": "60日以内",
      "30天內即期": "30日以内",
      "全選商品": "すべての商品を選択",
      "全選": "すべて選択",
      "排序: 有效日期": "並び替え: 期限日",
      "排序: 分類": "並び替え: 分類",
      "排序: 狀態": "並び替え: 状態",
      "搜尋分類、商品名稱、條碼": "分類、商品名、バーコードを検索",
      "掃碼": "コード",
      "搜尋": "検索",
      "分類": "分類",
      "商品名稱": "商品名",
      "條碼": "バーコード",
      "有效日期": "期限日",
      "備註": "メモ",
      "狀態": "状態",
      "操作": "操作",
      "選取": "選択",
      "選取商品": "商品を選択",
      "尚無資料，請先新增商品。": "データがありません。先に商品を追加してください。",
      "條碼掃描": "バーコードスキャン",
      "請把條碼對準鏡頭中央。相機影像只在本機辨識，不會上傳。": "バーコードをカメラ中央に合わせてください。カメラ画像は端末内で認識され、アップロードされません。",
      "請把條碼對準鏡頭中央。": "バーコードをカメラ中央に合わせてください。",
      "關閉掃描": "スキャンを閉じる",
      "打開手電筒": "ライトをオン",
      "長亮手電筒": "ライトを常時オン",
      "關閉手電筒": "ライトをオフ",
      "商品條碼": "商品バーコード",
      "關閉": "閉じる",
      "新增商品": "商品を追加",
      "商品分類": "商品分類",
      "輸入商品名稱": "商品名を入力",
      "手動輸入條碼": "バーコードを手入力",
      "鏡頭": "カメラ",
      "掃描": "スキャン",
      "選擇": "選択",
      "日期": "日付",
      "可輸入商品備註": "商品メモを入力できます",
      "清空": "クリア",
      "取消": "キャンセル",
      "選擇資料儲存方式": "データ保存方式を選択",
      "iPhone / iPad Safari 只能使用IndexedDB將資料儲存在本機瀏覽器資料中；若清除 Safari 網站資料，商品資料會被刪除。建議定期匯出 JSON 備份到「檔案 App」或 iCloud Drive。": "iPhone / iPad の Safari では、IndexedDB を使ってこのブラウザ内にのみデータを保存できます。Safari のWebサイトデータを削除すると、商品データも削除されます。JSONバックアップを定期的に「ファイル」アプリまたは iCloud Drive へ書き出してください。",
      "使用 IndexedDB": "IndexedDBを使用",
      "資料儲存在此瀏覽器與裝置中；清除瀏覽器資料會一併清除本專案資料。": "データはこのブラウザと端末に保存されます。ブラウザデータを削除すると本プロジェクトのデータも削除されます。",
      "使用本機檔案位置": "ローカルファイルを使用",
      "可自行指定本機檔案位置；若瀏覽器支援，之後會從同一個資料檔讀寫。瀏覽器可能會在重新開啟後要求確認檔案編輯權限。": "ブラウザが対応している場合、読み書きに使うローカルファイルを選択できます。再度開いたときに、ブラウザからファイルへのアクセス確認を求められる場合があります。",
      "更新內容": "更新内容",
      "知道了": "OK",
      "清除": "クリア",
      "編輯": "編集",
      "刪除": "削除",
      "編輯商品": "商品を編集",
      "儲存": "保存",
      "確定要刪除這些資料嗎?": "これらのデータを削除しますか？",
      "確定": "確定",
      "建議備份資料": "バックアップ推奨",
      "已新增 100 筆商品。建議立即備份 JSON 檔，避免瀏覽器資料被清除時遺失商品資料。": "商品が100件追加されました。ブラウザデータ削除時の紛失を防ぐため、JSONファイルを今すぐバックアップすることをおすすめします。",
      "備份 JSON": "JSONをバックアップ",
      "稍後": "後で",
      "條碼已存在": "バーコードは既に存在します",
      "覆蓋既有商品": "既存商品を上書き",
      "仍然新增": "そのまま追加",
      "仍然儲存": "そのまま保存",
      "發生錯誤": "エラー",
      "發生未知錯誤": "不明なエラーが発生しました",
      "再按一次返回鍵關閉 App": "もう一度戻るキーを押すとアプリを終了します",
      "再按一次返回鍵關閉程式": "もう一度戻るキーを押すとアプリを終了します",
      "商品已新增": "商品を追加しました",
      "已覆蓋既有商品": "既存の商品を上書きしました",
      "商品已更新": "商品を更新しました",
      "商品已刪除": "商品を削除しました",
      "分類已新增": "分類を追加しました",
      "分類已存在": "分類は既に存在します",
      "分類已刪除": "分類を削除しました",
      "分類排序已更新": "分類の並び順を更新しました",
      "至少需保留一個分類": "分類を少なくとも1つ残してください",
      "請輸入分類名稱": "分類名を入力してください",
      "JSON 備份成功": "JSONバックアップが完了しました",
      "CSV 匯出成功": "CSVの書き出しが完了しました",
      "JSON 備份失敗": "JSONバックアップに失敗しました",
      "CSV 匯出失敗": "CSVの書き出しに失敗しました",
      "商品效期資料 JSON": "商品期限データJSON",
      "已取消 JSON 還原": "JSON復元をキャンセルしました",
      "已取消選擇本機檔案位置": "ローカルファイルの選択をキャンセルしました",
      "已改用 IndexedDB": "IndexedDBに切り替えました",
      "已改用本機檔案位置，並寫入目前資料": "ローカルファイルに切り替え、現在のデータを書き込みました",
      "已使用 IndexedDB 儲存資料": "データの保存先をIndexedDBに設定しました",
      "已使用本機檔案位置儲存資料": "データの保存先をローカルファイルに設定しました",
      "尚未連回先前的本機 JSON 檔案，請重新選擇同一個 JSON 檔案": "以前のローカルJSONファイルに接続されていません。同じJSONファイルをもう一度選択してください。",
      "尚未連回先前的本機 JSON 檔案，已先儲存在 IndexedDB。請到設定重新選擇同一個 JSON 檔案": "以前のローカルJSONファイルに接続されていないため、データを一時的にIndexedDBへ保存しました。設定で同じJSONファイルをもう一度選択してください。",
      "尚未連回先前的本機 JSON 檔案，已先使用 IndexedDB。請到設定重新選擇同一個 JSON 檔案": "以前のローカルJSONファイルに接続されていないため、一時的にIndexedDBを使用します。設定で同じJSONファイルをもう一度選択してください。",
      "寫入檔案失敗": "ファイルへの書き込みに失敗しました",
      "本機 JSON 檔案選擇失敗": "ローカルJSONファイルの選択に失敗しました",
      "裝置不支援選擇本機 JSON 檔案": "この端末はローカルJSONファイルの選択に対応していません",
      "裝置不支援原生 CSV 匯出": "この端末はネイティブCSV書き出しに対応していません",
      "裝置不支援原生 JSON 備份": "この端末はネイティブJSONバックアップに対応していません",
      "未取得檔案讀寫權限": "ファイルの読み書き権限が許可されていません",
      "此瀏覽器不支援指定本機檔案位置，請使用 IndexedDB 並定期備份 JSON": "このブラウザはローカルファイルの指定に対応していません。IndexedDBを使用し、定期的にJSONをバックアップしてください。",
      "請先選擇 CSV 檔案": "先にCSVファイルを選択してください",
      "請先選擇 JSON 檔案": "先にJSONファイルを選択してください",
      "檔案格式錯誤，請上傳 .csv 或 .scv": "ファイル形式が正しくありません。.csvまたは.scvファイルを選択してください。",
      "檔案格式錯誤，請上傳 .json": "ファイル形式が正しくありません。.jsonファイルを選択してください。",
      "檔案讀取失敗": "ファイルの読み込みに失敗しました",
      "CSV 內容不足，至少需有標題列與一筆資料": "CSVには見出し行と1件以上のデータが必要です",
      "CSV 標題需包含 分類、商品名稱、條碼、有效日期": "CSVの見出しには分類、商品名、バーコード、有効期限が必要です",
      "CSV 無有效商品資料": "CSVに有効な商品データがありません",
      "JSON 內容缺少 products 陣列": "JSONにproducts配列がありません",
      "JSON 內容格式錯誤": "JSONの内容形式が正しくありません",
      "JSON 內容無效": "JSONの内容が無効です",
      "JSON 無有效商品資料": "JSONに有効な商品データがありません",
      "找不到要編輯的商品": "編集する商品が見つかりません",
      "日期格式錯誤，請使用 YYYY-MM-DD / YYYY/MM/DD / YYYYMMDD": "日付形式が正しくありません。YYYY-MM-DD、YYYY/MM/DD、またはYYYYMMDDを使用してください。",
      "有效日期格式錯誤，請使用 YYYY-MM-DD": "有効期限の形式が正しくありません。YYYY-MM-DDを使用してください。",
      "程式發生未預期錯誤": "アプリで予期しないエラーが発生しました",
      "程式發生未處理錯誤": "アプリで未処理のエラーが発生しました",
      "有商品有效日期": "この日に期限を迎える商品があります",
      "新增": "追加",
      "匯入": "インポート",
      "匯出": "書き出し",
      "JSON 備份": "JSONバックアップ",
      "讀取檔案資料庫": "ファイルデータベースの読み込み",
      "更新公告狀態儲存": "更新通知状態の保存",
      "儲存設定": "設定の保存",
      "本機檔案位置設定": "ローカルファイルの設定",
      "儲存模式切換": "保存モードの切り替え",
      "分類排序儲存": "分類順の保存",
      "初始化": "初期化",
      "此瀏覽器不支援 BarcodeDetector，請改用手動輸入條碼": "このブラウザは BarcodeDetector に対応していません。バーコードを手入力してください。",
      "此裝置或 WebView 不支援鏡頭掃描，請改用手動輸入條碼": "この端末または WebView はカメラスキャンに対応していません。バーコードを手入力してください。",
      "需要相機權限才能掃描條碼；影像只在本機辨識，不會上傳。": "バーコードをスキャンするにはカメラ権限が必要です。画像は端末内で認識され、アップロードされません。",
      "找不到可用的相機，請改用手動輸入條碼": "利用できるカメラが見つかりません。バーコードを手入力してください。",
      "無法啟動相機，請確認沒有其他 App 正在使用相機": "カメラを起動できません。他のアプリがカメラを使用していないか確認してください。",
      "瀏覽器封鎖相機權限，請確認網站或 App 已允許相機": "ブラウザがカメラ権限をブロックしました。このサイトまたはアプリでカメラが許可されているか確認してください。",
      "此裝置不支援手電筒控制": "この端末はライト制御に対応していません。",
      "返回頁面頂端": "ページ上部へ戻る",
      "返回頂端": "上へ戻る",
      "系統設定": "設定",
      "管理分類標籤、匯入匯出與介面主題": "分類、ファイル、テーマ、言語を管理",
      "新增分類": "分類を追加",
      "輸入新分類名稱": "新しい分類名を入力",
      "資料儲存": "データ保存",
      "本機檔案位置": "ローカルファイル",
      "目前模式：讀取中": "現在のモード: 読み込み中...",
      "切換到本機檔案位置時會先把目前資料寫入該檔案。": "ローカルファイルへ切り替えると、現在のデータを先にそのファイルへ書き込みます。",
      "改用 IndexedDB": "IndexedDB に切り替え",
      "選擇本機檔案位置": "ローカルファイルを選択",
      "檔案功能": "ファイル",
      "此裝置資料為獨立儲存。": "この端末のデータは個別に保存されます。",
      "匯出 CSV": "CSV を書き出し",
      "備份資料 JSON": "JSON バックアップ",
      "匯入試算表資料": "表計算データをインポート",
      "還原資料 JSON": "JSON バックアップを復元",
      "匯入會保留原有商品，並合併上傳檔案中的資料。": "インポートしたデータは、既存の商品に統合されます。",
      "介面模式": "表示設定",
      "明亮模式": "ライト",
      "黑暗模式": "ダーク",
      "目前主題：霓虹電馭": "現在のテーマ: ネオンサイバー",
      "語言": "言語",
      "中文": "中国語",
      "日本語": "日本語",
      "更新紀錄": "更新内容",
      "目前版本：讀取中": "現在のバージョン: 読み込み中...",
      "關於": "このアプリについて",
      "構想：GURESUTA": "構想: GURESUTA",
      "策劃：GURESUTA": "企画: GURESUTA",
      "執行：Codex(GPT-5.3-Codex、GPT-5.5)": "制作: Codex (GPT-5.3-Codex、GPT-5.5)",
      "代碼：Codex(GPT-5.3-Codex、GPT-5.5)": "コード: Codex (GPT-5.3-Codex、GPT-5.5)",
      "排版：Codex(GPT-5.3-Codex、GPT-5.5)": "レイアウト: Codex (GPT-5.3-Codex、GPT-5.5)",
      "色彩：Gemini Web、Codex(GPT-5.5)": "色彩: Gemini Web、Codex (GPT-5.5)",
      "字型：GenSekiGothic2TC": "フォント: GenSekiGothic2TC",
      "翻譯：Codex(GPT-5.5)": "翻訳: Codex (GPT-5.5)",
      "測試：Codex(GPT-5.3-Codex、GPT-5.5)": "テスト: Codex (GPT-5.3-Codex、GPT-5.5)",
      "指示：GURESUTA": "ディレクション: GURESUTA",
      "發布：GURESUTA": "公開: GURESUTA",
      "隱私權與資料安全說明": "プライバシーとデータ安全性について",
      "免責聲明": "免責事項",
      "一.「本專案為開源工具，僅供個人管理商品效期使用。": "1. 本プロジェクトは、個人の商品期限管理を目的としたオープンソースツールです。",
      "二.使用者自行上傳之商品資訊（包含但不限於菸酒、藥品），應遵守相關法令規範。": "2. 入力する商品情報（たばこ、酒類、医薬品などを含む）は、ユーザー自身の責任で関連法令を遵守してください。",
      "三.本程式僅提供管理功能，不具備廣告或促銷意圖。」": "3. 本アプリは管理機能のみを提供するもので、広告または販売促進を目的としていません。",
      "版本": "バージョン",
      "贊助與自訂標題": "支援とタイトルカスタマイズ",
      "贊助": "支援",
      "贊助狀態：讀取中": "支援状態: 読み込み中...",
      "贊助狀態：此功能僅支援 Google Play 安裝的 Android 版": "支援状態: Google Play からインストールした Android 版のみ対応",
      "贊助狀態：尚未解鎖": "支援状態: 未解放",
      "贊助狀態：已解鎖自訂標題": "支援状態: タイトルカスタマイズ解放済み",
      "贊助新台幣 50 元可解鎖主頁標題自訂。此功能僅支援 Google Play 安裝的 Android 版。": "NT$50 の支援でメインタイトルのカスタマイズを解放できます。この機能は Google Play からインストールした Android 版のみ対応します。",
      "贊助新台幣 50 元可解鎖主頁標題自訂。": "NT$50 の支援でメインタイトルのカスタマイズを解放できます。",
      "贊助 NT$50": "NT$50 で支援",
      "恢復購買": "購入を復元",
      "自訂主頁標題": "メインタイトルをカスタマイズ",
      "輸入自訂標題": "カスタムタイトルを入力",
      "儲存標題": "タイトルを保存",
      "恢復預設標題": "標準タイトルに戻す",
      "此功能僅支援 Google Play 安裝的 Android 版": "この機能は Google Play からインストールした Android 版のみ対応します",
      "Google Play Billing 尚未初始化": "Google Play Billing がまだ初期化されていません",
      "無法取得贊助項目，請確認 Play Console 已建立 supporter_title_unlock": "支援項目を取得できません。Play Console で supporter_title_unlock が作成されているか確認してください。",
      "感謝贊助，已解鎖自訂標題": "ご支援ありがとうございます。タイトルカスタマイズを解放しました。",
      "贊助流程未完成": "支援手続きは完了していません",
      "已恢復購買並解鎖自訂標題": "購入を復元し、タイトルカスタマイズを解放しました",
      "尚未找到已購買的贊助項目": "購入済みの支援項目は見つかりませんでした",
      "贊助後才能自訂主頁標題": "支援後にメインタイトルをカスタマイズできます",
      "自訂標題已儲存": "カスタムタイトルを保存しました",
      "已恢復預設標題": "標準タイトルに戻しました",
      "贊助失敗": "支援",
      "恢復購買失敗": "購入の復元",
      "選擇主題": "テーマを選択",
      "選擇黑暗主題": "ダークテーマを選択",
      "選擇明亮主題": "ライトテーマを選択",
      "刪除分類": "分類を削除",
      "刪除標籤": "タグを削除",
      "確定刪除": "削除する",
      "隱私權與資料安全": "プライバシーとデータ安全性",
      "說明資料儲存、相機權限與備份行為": "データ保存、カメラ権限、バックアップについて",
      "政策資訊": "ポリシー情報",
      "本隱私權與資料安全說明適用於「商品終期電馭監管裝置」。": "本説明は「商品期限サイバー管理装置」に適用されます。",
      "開發者：GURESUTA。": "開発者: GURESUTA。",
      "聯絡方式：": "連絡先:",
      "E-MAIL：": "E-mail:",
      "生效日期：2026-05-20。": "発効日: 2026-05-20。",
      "本 App 可能由使用者自行建立商品分類、商品名稱、條碼、有效日期、主題設定與備份資料。": "本アプリでは、ユーザーが商品分類、商品名、バーコード、期限日、テーマ設定、バックアップデータを作成できます。",
      "上述資料預設儲存在裝置本機 IndexedDB，不會由本 App 主動上傳到 GitHub Pages 或其他伺服器。": "これらのデータは、標準では端末内の IndexedDB に保存されます。本アプリが GitHub Pages やその他のサーバーへアップロードすることはありません。",
      "若使用「本機檔案位置」，資料會寫入使用者選擇的本機 JSON 檔案；使用者可自行保管、備份或刪除該檔案。": "「ローカルファイル」を使用する場合、データはユーザーが選択したローカル JSON ファイルに書き込まれます。そのファイルの保管、バックアップ、削除はユーザー自身で行ってください。",
      "相機權限": "カメラ権限",
      "相機只用於條碼掃描。Android App 使用裝置內的 ML Kit 辨識條碼；網頁版則使用瀏覽器支援的條碼辨識能力。": "カメラはバーコードスキャンのみに使用します。Android アプリでは端末内の ML Kit でバーコードを認識し、Web 版ではブラウザが対応するバーコード認識機能を使用します。",
      "本專案不會儲存相機影像，不會錄音，也不會把影像傳送到遠端服務。": "本プロジェクトはカメラ画像を保存せず、音声を録音せず、画像を外部サービスへ送信しません。",
      "若使用者拒絕相機權限，仍可手動輸入條碼與管理商品資料。": "カメラ権限を許可しない場合でも、バーコードを手入力して商品データを管理できます。",
      "資料使用與分享": "データの使用と共有",
      "本 App 使用商品資料是為了在本機提供新增、編輯、刪除、搜尋、排序、月曆提醒、CSV 匯出、JSON 備份與還原功能。": "本アプリは、追加、編集、削除、検索、並び替え、カレンダー通知、CSV 書き出し、JSON バックアップと復元を端末内で行うために商品データを使用します。",
      "本 App 不會販售、分享或轉移使用者建立的商品資料給第三方。": "本アプリは、ユーザーが作成した商品データを第三者に販売、共有、提供しません。",
      "Android 版若使用 Google Play 贊助功能，付款流程由 Google Play 處理，本 App 只接收購買狀態，不會取得信用卡號等付款資料。": "Android 版で Google Play の支援機能を使用する場合、決済処理は Google Play が行います。本アプリは購入状態のみを受け取り、クレジットカード番号などの決済情報は取得しません。",
      "若使用者自行匯出 CSV 或 JSON 檔案，該檔案由使用者自行保存、傳送或刪除。": "CSV または JSON ファイルを書き出した場合、そのファイルの保存、送信、削除はユーザー自身で行ってください。",
      "匯入、匯出與備份": "インポート、エクスポート、バックアップ",
      "CSV 匯出、JSON 備份與 JSON 還原都由使用者手動觸發。": "CSV エクスポート、JSON バックアップ、JSON 復元はいずれもユーザーが手動で実行します。",
      "JSON 備份檔包含商品資料與分類設定，請視為個人資料自行保存。": "JSON バックアップファイルには商品データと分類設定が含まれます。個人データとして安全に保管してください。",
      "匯入檔案只會在本機讀取並合併到目前資料庫，不會上傳。": "インポートしたファイルは端末内で読み取られ、現在のデータベースに統合されます。アップロードされません。",
      "資料保存與刪除": "データの保存と削除",
      "本機資料會保留在使用者裝置中，直到使用者刪除商品、清除網站資料、移除 App，或刪除自行保存的備份檔。": "ローカルデータは、商品を削除する、サイトデータを消去する、アプリを削除する、または保存済みのバックアップファイルを削除するまで端末内に残ります。",
      "使用者可在商品清單刪除個別商品，也可清除瀏覽器網站資料或移除 App 來刪除本機資料。": "商品リストから個別の商品を削除できます。また、ブラウザのサイトデータを消去するかアプリを削除することで、ローカルデータを削除できます。",
      "若曾匯出 JSON 或指定本機檔案位置，請另外刪除使用者自行保存的檔案。": "JSON ファイルを書き出した場合、または「ローカルファイル」を使用した場合は、ユーザーが管理しているファイルも別途削除してください。",
      "資訊安全": "情報セキュリティ",
      "本 App 以本機儲存為主要設計，開發者不會主動接收使用者建立的商品資料。": "本アプリはローカル保存を前提として設計されています。ユーザーが別途送信しない限り、開発者が商品データを受け取ることはありません。",
      "請使用者自行保管裝置、瀏覽器資料與匯出的備份檔，避免未授權的人取得資料。": "端末、ブラウザデータ、書き出したバックアップファイルは、第三者に取得されないようユーザー自身で管理してください。",
      "霓虹電馭": "ネオンサイバー",
      "日光電馭": "ライトサイバー",
      "活力綠洲": "活力オアシス",
      "深夜綠洲": "深夜オアシス",
      "目前版本：未設定": "現在のバージョン: 未設定",
      "v1.8.0更新內容": "v1.8.0 更新内容",
      "v1.7.0更新內容": "v1.7.0 更新内容",
      "v1.5.2更新內容": "v1.5.2 更新内容",
      "v1.5.1更新內容": "v1.5.1 更新内容",
      "v1.5.0更新內容": "v1.5.0 更新内容",
      "v1.4.3更新內容": "v1.4.3 更新内容",
      "v1.4.2更新內容": "v1.4.2 更新内容",
      "v1.4.1更新內容": "v1.4.1 更新内容",
      "v1.4.0更新內容": "v1.4.0 更新内容",
      "v1.3.0更新內容": "v1.3.0 更新内容",
      "v1.2.0更新內容": "v1.2.0 更新内容",
      "v1.1.0更新內容": "v1.1.0 更新内容",
      "提升資訊安全相關項目": "情報セキュリティ関連項目を強化しました",
      "版面最佳化": "レイアウトを最適化しました",
      "重新設計條碼掃描介面": "バーコードスキャン画面を再設計しました",
      "提升裝置相容性": "端末互換性を向上しました",
      "排版及操作最佳化": "レイアウトと操作性を最適化しました",
      "修復未套用英/日文翻譯的提示文字": "英語・日本語翻訳が適用されていなかったヒント文言を修正しました",
      "Android裝置狀態列會根據主題變更顏色": "Android 端末のステータスバーがテーマに合わせて色を変更するようになりました",
      "自動記憶新增商品時的分類選擇": "商品追加時に選択した分類を自動で記憶します",
      "替換四種主題背景": "4種類のテーマ背景を差し替えました",
      "最佳化匯出CSV格式": "CSV 書き出し形式を最適化しました",
      "修正 Android 更新安裝後仍可能載入舊版前端的問題，更新時會清除 WebView 靜態資產快取並保留 IndexedDB 商品資料": "Android の更新インストール後も古いフロントエンドが読み込まれる場合がある問題を修正。更新時に WebView の静的アセットキャッシュを消去し、IndexedDB の商品データは保持します",
      "IndexedDB 備份提醒改為每新增 100 筆商品提示一次，主頁與設定頁手動備份 JSON 後會重新計算": "IndexedDB のバックアップ通知を商品100件追加ごとに変更し、メインページまたは設定ページで JSON を手動バックアップすると件数を再計算します",
      "版面操作最佳化": "レイアウトと操作性を最適化",
      "修正 Android 返回鍵行為：設定頁與隱私權頁返回主頁，主頁支援再按一次返回鍵關閉程式": "Android の戻るキー動作を修正し、設定ページとプライバシーページはメインページへ戻り、メインページではもう一度戻るキーを押すとアプリを閉じるよう対応",
      "新增主頁、設定頁與隱私權頁初始化讀取過場，抵消切換頁面與啟動時的畫面跳動": "メイン、設定、プライバシーページに起動時の読み込みトランジションを追加し、ページ切り替え時と起動時の表示揺れを軽減",
      "多語系支援依系統語言決定首次介面，並補強中文、英文、日文介面翻譯、更新紀錄與設定頁文字": "多言語対応で初回表示言語をシステム言語から決定し、中国語、英語、日本語の画面翻訳、更新履歴、設定ページ文言を改善",
      "更新 Android 安裝名稱多語系資源，中文、英文、日文系統會顯示對應 App 名稱": "Android のアプリ名多言語リソースを更新し、中国語、英語、日本語のシステムで対応するアプリ名を表示",
      "修正英文與日文介面在輸入框、搜尋欄、掃描按鈕與商品卡片操作列的文字裁切與排版問題": "英語・日本語表示の入力欄、検索欄、スキャンボタン、商品カード操作列で文字が切れる問題とレイアウト問題を修正",
      "英日翻譯最佳化": "英語・日本語翻訳を最適化",
      "修復英文介面在文字輸入框的文字裁切問題": "英語表示で文字入力欄の文字が切れる問題を修正",
      "修正英文與日文介面的商品清單搜尋欄提示文字在手機模式可能超出欄位的問題": "英語・日本語表示でモバイル表示時に商品リスト検索欄のプレースホルダーが欄外にはみ出す場合がある問題を修正",
      "修正分類標籤刪除確認視窗的英文與日文翻譯": "分類タグ削除確認ダイアログの英語・日本語翻訳を修正",
      "修正取消分類標籤刪除確認視窗時可能跳回主頁的問題": "分類タグ削除確認ダイアログをキャンセルしたときにメインページへ戻る場合がある問題を修正",
      "分類標籤內容維持使用者輸入文字，不再翻譯預設分類名稱": "分類タグの内容はユーザーが入力した文字のまま表示し、標準分類名も翻訳しないよう変更",
      "潤飾英文與日文翻譯": "英語と日本語の翻訳を調整",
      "增加英文與日文語言選擇": "英語と日本語の言語選択を追加",
      "更改圖示": "アイコンを更新",
      "變更icon": "アイコンを変更",
      "移除外部字型請求並改用本機字型，字型使用 GenSekiGothic2TC": "外部フォント要求を削除し、ローカルの GenSekiGothic2TC フォントへ変更",
      "補正式隱私權與資料安全說明頁": "正式なプライバシーとデータ安全性ページを追加",
      "新增霓虹電馭、日光電馭、活力綠洲與深夜綠洲主題，並補強月曆、商品卡片、按鈕、框線與提示訊息樣式": "ネオンサイバー、デイライトサイバー、活力オアシス、深夜オアシスのテーマを追加し、カレンダー、商品カード、ボタン、枠線、ヒント表示を改善",
      "新增商品與編輯商品表單加入備註欄位，商品清單與卡片模式只在有備註時顯示備註，CSV 匯入匯出同步支援備註": "商品追加・編集フォームにメモ欄を追加し、一覧とカードではメモがある場合のみ表示、CSV読み込み/書き出しもメモに対応",
      "設定頁刪除分類標籤時新增確認視窗，並調整本機檔案位置授權提示文字": "設定ページで分類タグ削除時の確認ダイアログを追加し、ローカルファイル権限の案内文を調整",
      "分類選擇清單、排序清單與選擇日期視窗改為符合介面主題的自建樣式": "分類選択、並び替え、日付選択ダイアログをテーマ対応のカスタムスタイルに変更",
      "移除鏡頭掃描中的曝光補償控制，保留掃描主要流程": "カメラスキャンの露出補正コントロールを削除し、主要なスキャンフローは維持",
      "網頁版面最佳化": "Webレイアウトを最適化",
      "主頁與設定頁頂部標題區塊新增飾條與底部邊框": "メインページと設定ページの上部タイトル領域に装飾線と下枠を追加",
      "主頁底部新增返回頂端按鈕，商品清單過長時可快速回到頁面頂端": "長い商品リストでページ上部へ素早く戻れるボタンをメインページ下部に追加",
      "商品清單、編輯商品視窗與關閉按鈕改為跟隨主題變化的樣式": "商品リスト、編集ダイアログ、閉じるボタンをテーマに追従するスタイルへ変更",
      "設定頁返回按鈕位置同步對齊主頁設定按鈕": "設定ページの戻るボタン位置をメインページの設定ボタンに合わせて調整",
      "本機檔案位置重新開啟後不再自動跳出檔案編輯授權提示": "ローカルファイルを再度開いた後にファイル編集権限の確認を自動表示しないよう変更",
      "修正手機 PWA 開啟時本機檔案位置授權造成的錯誤彈窗": "モバイルPWA起動時のローカルファイル権限によるエラーダイアログを修正",
      "自動儲存時若尚未取得本機檔案位置授權，會先儲存在 IndexedDB": "自動保存時にローカルファイル権限が未取得の場合、先に IndexedDB へ保存",
      "更新【關於】欄位內容": "「このアプリについて」欄を更新",
      "新增 version.js 作為單一版本來源，設定頁會顯示目前版本與更新紀錄": "version.js を単一のバージョン情報源として追加し、設定ページに現在のバージョンと更新履歴を表示",
      "新增商品表單改為彈出式視窗，頂部導覽列新增新增商品與設定按鈕": "商品追加フォームをモーダル化し、上部ナビに商品追加と設定ボタンを追加",
      "新增商品效期月曆，支援點擊有標示日期篩選商品並再次點擊取消": "商品期限カレンダーを追加し、マークされた日付のタップで絞り込み、再タップで解除に対応",
      "商品清單新增資料檢查，可篩選無日期、無條碼、重複條碼、已過期、60 天內即期與 30 天內即期商品": "商品リストにデータチェックを追加し、日付なし、バーコードなし、重複バーコード、期限切れ、60日以内、30日以内の商品を絞り込み可能に",
      "鏡頭掃描新增手電筒按鈕，支援打開、長亮與關閉手電筒": "カメラスキャンにライトボタンを追加し、オン、常時オン、オフに対応",
      "新增重複條碼提醒，可選擇覆蓋既有商品、仍然新增或取消": "重複バーコード警告を追加し、既存商品の上書き、そのまま追加、キャンセルを選択可能に",
      "新增 IndexedDB 每新增 30 筆商品的 JSON 備份提醒": "IndexedDBで商品を30件追加するごとにJSONバックアップ通知を追加",
      "新增首次使用儲存方式選擇視窗，可選擇 IndexedDB 或本機檔案位置": "初回利用時の保存方式選択ダイアログを追加し、IndexedDBまたはローカルファイルを選択可能に",
      "新增 iPhone / iPad Safari 備份提醒與設定頁資料儲存區塊": "iPhone / iPad Safari のバックアップ案内と設定ページのデータ保存セクションを追加",
      "移除排序欄中的無日期與無條碼選項，改由資料檢查篩選": "並び替え欄から日付なし・バーコードなしを削除し、データチェック絞り込みへ移動",
      "修復一些影響使用體驗的小錯誤": "使い勝手に影響する小さな不具合を修正",
      "未到期": "期限内",
      "即期": "期限間近",
      "正常": "正常",
      "未分類": "未分類",
      "未命名商品": "無名の商品",
      "商品": "商品",
      "全部分類": "すべての分類",
      "請選擇分類": "分類を選択",
      "飲料": "飲料",
      "零食": "お菓子",
      "泡麵": "インスタント食品",
      "糖果": "キャンディ"
    }
  };

  const patterns = [
    [/^已勾選 (\d+) 筆$/, { en: "$1 selected", ja: "$1件選択中" }],
    [/^目前主題：(.+)$/, { en: "Current theme: $1", ja: "現在のテーマ: $1" }],
    [/^目前模式：(.+)$/, { en: "Current mode: $1", ja: "現在のモード: $1" }],
    [/^目前版本：(.+)$/, { en: "Current version: $1", ja: "現在のバージョン: $1" }],
    [/^已套用 (.+)$/, { en: "Applied $1", ja: "$1を適用しました" }],
    [/^(\d{4})年(\d{1,2})月$/, { en: "$2/$1", ja: "$1年$2月" }],
    [/^(\d{4}) 年 (\d{1,2}) 月$/, { en: "$2/$1", ja: "$1年$2月" }],
    [/^匯入成功，新增 (\d+) 筆，目前共 (\d+) 筆$/, { en: "Import complete: $1 added, $2 total", ja: "読み込み完了: $1件追加、合計$2件" }],
    [/^JSON 還原成功，新增 (\d+) 筆、更新 (\d+) 筆，目前共 (\d+) 筆商品；本機檔案位置未同步，請重新選擇本機檔案位置或匯出 JSON 備份$/, { en: "JSON restore complete: $1 added, $2 updated, $3 total products. The local file was not synced; choose it again or export a JSON backup.", ja: "JSON復元完了: $1件追加、$2件更新、合計$3件の商品。ローカルファイルは同期されていません。もう一度選択するか、JSONバックアップを書き出してください。" }],
    [/^JSON 還原成功，新增 (\d+) 筆、更新 (\d+) 筆，目前共 (\d+) 筆商品$/, { en: "JSON restore complete: $1 added, $2 updated, $3 total products", ja: "JSON復元完了: $1件追加、$2件更新、合計$3件の商品" }],
    [/^已同步更新 (\d+) 筆商品分類$/, { en: "Updated categories for $1 products", ja: "$1件の商品分類を更新しました" }],
    [/^確定要刪除「(.+)」標籤嗎？既有商品資料不會被刪除。$/, { en: "Delete the \"$1\" tag? Existing product data will not be deleted.", ja: "「$1」タグを削除しますか？既存の商品データは削除されません。" }],
    [/^將新增 (\d+) 筆、更新 (\d+) 筆商品資料，是否繼續還原？$/, { en: "This will add $1 and update $2 products. Continue restoring?", ja: "$1件追加し、$2件の商品データを更新します。復元を続行しますか？" }],
    [/^條碼 (.+) 已存在於「(.+)」。請選擇要覆蓋既有商品、仍然(.+)，或取消。$/, { en: "Barcode $1 already exists in \"$2\". Choose whether to overwrite the existing product, still $3, or cancel.", ja: "バーコード $1 は「$2」に既に存在します。既存商品を上書きするか、そのまま$3するか、キャンセルしてください。" }],
    [/^(.+)失敗: (.+)$/, { en: "$1 failed: $2", ja: "$1に失敗しました: $2" }],
    [/^初始化失敗: (.+)$/, { en: "Initialization failed: $1", ja: "初期化に失敗しました: $1" }]
  ];

  function inferLanguageFromSystem() {
    const candidates = [];
    if (Array.isArray(navigator.languages)) {
      candidates.push.apply(candidates, navigator.languages);
    }
    candidates.push(navigator.language || navigator.userLanguage || "");
    const normalized = candidates.map((item) => String(item || "").toLowerCase()).filter(Boolean);
    if (normalized.some((item) => item.startsWith("zh"))) {
      return "zh-Hant";
    }
    if (normalized.some((item) => item.startsWith("ja"))) {
      return "ja";
    }
    return "en";
  }

  function getLanguage() {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (!saved) {
      return inferLanguageFromSystem();
    }
    return SUPPORTED_LANGUAGES.has(saved) ? saved : DEFAULT_LANGUAGE;
  }

  function setLanguage(language) {
    const next = SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
    localStorage.setItem(LANGUAGE_KEY, next);
    document.documentElement.lang = next;
    translateDocument();
    window.dispatchEvent(new CustomEvent("app-language-change", { detail: { language: next } }));
  }

  function translateText(source, language = getLanguage()) {
    const text = String(source || "");
    if (language === DEFAULT_LANGUAGE || !text.trim()) {
      return text;
    }
    const dict = dictionaries[language] || {};
    if (Object.prototype.hasOwnProperty.call(dict, text)) {
      return dict[text];
    }
    const currentTheme = text.match(/^目前主題：(.+)$/);
    if (currentTheme) {
      return language === "en"
        ? `Current theme: ${translateThemeName(currentTheme[1], language)}`
        : `現在のテーマ: ${translateThemeName(currentTheme[1], language)}`;
    }
    const appliedTheme = text.match(/^已套用 (.+)$/);
    if (appliedTheme) {
      return language === "en"
        ? `Applied ${translateThemeName(appliedTheme[1], language)}`
        : `${translateThemeName(appliedTheme[1], language)}を適用しました`;
    }
    const currentMode = text.match(/^目前模式：(.+)$/);
    if (currentMode) {
      return language === "en"
        ? `Current mode: ${translateText(currentMode[1], language)}`
        : `現在のモード: ${translateText(currentMode[1], language)}`;
    }
    const scanned = text.match(/^掃描成功: (.+)$/);
    if (scanned) {
      return language === "en"
        ? `Scan complete: ${scanned[1]}`
        : `スキャン完了: ${scanned[1]}`;
    }
    const failed = text.match(/^(.+)失敗: (.+)$/);
    if (failed) {
      return language === "en"
        ? `${translateText(failed[1], language)} failed: ${translateText(failed[2], language)}`
        : `${translateText(failed[1], language)}に失敗しました: ${translateText(failed[2], language)}`;
    }
    for (const [regex, replacements] of patterns) {
      if (regex.test(text)) {
        regex.lastIndex = 0;
        return text.replace(regex, replacements[language] || text);
      }
    }
    return text;
  }

  function isKnownTranslation(source, value) {
    return Array.from(SUPPORTED_LANGUAGES).some((language) => value === translateText(source.trim(), language));
  }

  function translateThemeName(name, language = getLanguage()) {
    return translateText(name, language);
  }

  function preserveWhitespace(original, translated) {
    const leading = original.match(/^\s*/)[0];
    const trailing = original.match(/\s*$/)[0];
    return `${leading}${translated}${trailing}`;
  }

  function shouldSkipI18n(node) {
    if (!node) {
      return false;
    }
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!(element && element.closest && element.closest("[data-i18n-skip='true']"));
  }

  function translateTextNode(node, language) {
    const current = node.nodeValue || "";
    if (!current.trim() || shouldSkipI18n(node)) {
      return;
    }
    let source = textNodeSources.get(node);
    if (!source || !isKnownTranslation(source, current.trim())) {
      source = current;
      textNodeSources.set(node, source);
    }
    const translated = preserveWhitespace(source, translateText(source.trim(), language));
    if (current !== translated) {
      node.nodeValue = translated;
    }
  }

  function getAttrMap(element) {
    let map = attrSources.get(element);
    if (!map) {
      map = new Map();
      attrSources.set(element, map);
    }
    return map;
  }

  function translateAttribute(element, attr, language) {
    if (!element.hasAttribute(attr)) {
      return;
    }
    const current = element.getAttribute(attr);
    if (!current || !current.trim()) {
      return;
    }
    const map = getAttrMap(element);
    let source = map.get(attr);
    if (!source || !isKnownTranslation(source, current)) {
      source = current;
      map.set(attr, source);
    }
    const translated = translateText(source, language);
    if (current !== translated) {
      element.setAttribute(attr, translated);
    }
  }

  function translateElement(element, language) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) {
      return;
    }
    if (element.id === "languageSelect" || shouldSkipI18n(element)) {
      element.value = language;
      return;
    }
    ["placeholder", "aria-label", "title", "data-label"].forEach((attr) => translateAttribute(element, attr, language));
    element.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        translateTextNode(child, language);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        translateElement(child, language);
      }
    });
  }

  function translateDocument() {
    const language = getLanguage();
    translating = true;
    try {
      document.documentElement.lang = language;
      if (document.title) {
        if (!titleSource || !isKnownTranslation(titleSource, document.title)) {
          titleSource = document.title;
        }
        document.title = translateText(titleSource, language);
      }
      translateElement(document.body, language);
      const select = document.getElementById("languageSelect");
      if (select) {
        select.value = language;
      }
    } finally {
      translating = false;
    }
  }

  function bindLanguageSelect() {
    const select = document.getElementById("languageSelect");
    if (!select || select.dataset.i18nBound === "true") {
      return;
    }
    select.dataset.i18nBound = "true";
    select.value = getLanguage();
    select.addEventListener("change", () => setLanguage(select.value));
  }

  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      if (translating) {
        return;
      }
      const language = getLanguage();
      translating = true;
      try {
        mutations.forEach((mutation) => {
          if (mutation.type === "characterData") {
            translateTextNode(mutation.target, language);
          } else if (mutation.type === "attributes") {
            translateAttribute(mutation.target, mutation.attributeName, language);
          } else {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                translateTextNode(node, language);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                translateElement(node, language);
              }
            });
          }
        });
        bindLanguageSelect();
      } finally {
        translating = false;
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title", "data-label"]
    });
  }

  window.AppI18n = {
    getLanguage,
    inferLanguageFromSystem,
    setLanguage,
    translateText,
    translateThemeName,
    translateDocument
  };

  observeMutations();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      translateDocument();
      bindLanguageSelect();
    });
  } else {
    translateDocument();
    bindLanguageSelect();
  }
})();
