# 商品終期電馭監管裝置

一個可離線使用的網頁式商品效期管理工具，適合在手機或電腦快速建立、查詢、編輯商品資料，並支援條碼掃描與 CSV/JSON 匯入匯出。

## 功能

- 新增、編輯、刪除商品
- 商品欄位：分類、名稱、條碼、有效日期
- 條碼掃描（相機）
- 商品清單搜尋與排序（有效日期 / 分類 / 狀態）
- 清單勾選、全選、批次刪除
- 卡片模式（手機）與表格模式（桌機）自適應
- 匯出 CSV、備份/還原 JSON
- 多主題切換（明亮/黑暗）
- 分類標籤管理（新增、刪除、長按拖曳排序）
- PWA 可安裝（Android/iOS 支援度依瀏覽器）

## 資料儲存方式

- 選擇使用裝置本機 `IndexedDB`或是裝置本機檔案位置。
- 資料不會自動上傳到 GitHub Pages。
- 不同裝置資料彼此獨立。

## 專案結構

```text
KEITAIHAN/
├─ index.html                             # 入口頁（導向主頁）
├─ inventory-management-app.html          # 主功能頁（商品清單 / 新增 / 編輯 / 掃碼）
├─ settings.html                          # 設定頁（主題、分類管理、匯入匯出）
├─ privacy-policy.html                    # 隱私權與資料安全說明頁
├─ app.js                                 # 主頁邏輯（資料操作、掃碼、清單渲染）
├─ settings.js                            # 設定頁邏輯（主題、分類拖曳、匯入匯出）
├─ i18n.js                                # 中文、英文與日文介面翻譯
├─ legacy-webview.js                      # 舊版 WebView 偵測與 JavaScript API 相容層
├─ version.js                             # App 版本與更新紀錄資料
├─ styles_washi.css                       # 全站版面、主題色票與背景樣式
├─ sw.js                                  # Service Worker（快取與離線支援）
├─ manifest.webmanifest                   # PWA 安裝、圖示與直式顯示設定
├─ favicon.ico                            # 瀏覽器分頁圖示
├─ icons/                                 # PWA / App 一般與 maskable 圖示
│  ├─ icon-app-192.png
│  ├─ icon-app-512.png
│  ├─ icon-app-maskable-192.png
│  └─ icon-app-maskable-512.png
├─ fonts/                                 # 介面使用的本機字型
│  ├─ GenSekiGothic2TC-H.woff2
│  └─ GenSekiGothic2TC-R.woff2
├─ key-visuals/                           # 四種主題背景與視覺參考圖
│  ├─ background-neon-cyber.png
│  ├─ background-daylight-cyber.png
│  ├─ background-vibrant-oasis.png
│  ├─ background-midnight-oasis.png
│  ├─ key-visual-hybrid-neon-dashboard-a.jpg
│  └─ key-visual-hybrid-neon-dashboard-c.jpg
├─ background.png                         # 主題背景來源／預覽圖
├─ build-keitaihan-debug-apk.ps1          # 相容入口，轉交至目前 Android Gradle 建置流程
├─ android-app/                           # 受 Git 追蹤的 Android 原生 wrapper（assets 由前端生成）
├─ tools/                                 # Android assets 同步與建置腳本
├─ ANDROID_DEVELOPMENT.md                 # Android wrapper 開發與建置流程
├─ start-webhan.ps1                       # Windows 一鍵啟動本機伺服器
├─ start-webhan-android.sh                # Android（Termux）啟動腳本
├─ start-webhan-ios.sh                    # iOS（iSH／類 Unix 環境）啟動腳本
├─ AGENTS.md                              # 專案操作規則與重要防回歸說明
├─ CHANGELOG.md                           # 專案變更紀錄
├─ CONTRIBUTING.md                        # 專案修改與貢獻說明
├─ README.md                              # 專案介紹與使用說明
├─ DEPLOY_GITHUB_PAGES.md                 # GitHub Pages 部署說明
├─ DEPLOY_CROSS_DEVICE.md                 # 跨裝置使用與部署說明
├─ .editorconfig                          # 編輯器格式設定
├─ .gitignore                             # Git 忽略規則
└─ .github/workflows/deploy-pages.yml     # GitHub Pages 自動部署工作流
```

## 本機執行

不要直接用 `file://` 開啟，請使用 HTTP 伺服器。

### 方法一：Python

```powershell
cd "D:\AI Code\WebHAN"
python -m http.server 8080
```

開啟：

- `http://localhost:8080/inventory-management-app.html`

### 方法二：GitHub Pages

將本專案推送到 GitHub Repo，啟用 Pages 後可直接以 HTTPS 網址使用。

### Android wrapper

Android 原生程式位於 `android-app/`。前端 assets 與 R8 測試 APK 的建置流程請參閱 [ANDROID_DEVELOPMENT.md](ANDROID_DEVELOPMENT.md)。

## 匯入 / 匯出

- 匯出 CSV：可在試算表開啟
- 備份 JSON：保存完整資料快照
- 還原 JSON：將資料合併回目前裝置資料庫

## 相容性建議

- Android：建議 Chrome
- iOS：建議 Safari
- 條碼掃描需允許相機權限

## 注意事項

- 清除瀏覽器網站資料、重裝瀏覽器或更換裝置會影響本機資料可見性。
- 若更新版本後畫面未變，請重整或清除快取（Service Worker 可能仍使用舊快取）。

## 免責聲明 (Disclaimer)

- 「本專案為開源工具，僅供個人管理商品效期使用。開發者不提供任何菸酒、藥品之內建資料。使用者若利用本程式紀錄或展示受管制商品（如菸、酒、藥品），請務必遵守當地法律規範並自行承擔法律責任。」

## 素材來源與授權

- **字型**：介面使用 [GenSekiGothic2TC（源石黑體丹）](https://github.com/ButTaiwan/genseki-font)，設定頁的「關於」區塊亦有標示。字型依其上游專案採用 [SIL Open Font License 1.1](fonts/SIL_Open_Font_License_1.1.txt) 授權；完整來源、著作權與再散布說明請見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- **圖示**：`icons/` 及 `favicon.ico` 中的專案圖示由 AI 模型生成；在本專案作者可授權的權利範圍內，隨本專案以 MIT License 提供。
- **圖片**：`key-visuals/`、`background.png` 與其他專案視覺圖片由 AI 模型生成；在本專案作者可授權的權利範圍內，隨本專案以 MIT License 提供。

## 授權

本項目採用 MIT 許可證，詳情請參閱 [LICENSE]文件。

Copyright (c) 2026 GURESUTA
