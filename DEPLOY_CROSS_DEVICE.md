# WebHAN 跨裝置部署說明

本版本可在 Android / iOS / Windows / macOS / Linux 的現代瀏覽器使用，並盡量保留既有介面與功能。

## 1) 直接複製檔案

請完整複製以下檔案與資料夾（保持原路徑）：

- `inventory-management-app.html`
- `settings.html`
- `app.js`
- `settings.js`
- `styles_washi.css`
- `manifest.webmanifest`
- `sw.js`
- `icons/`（整個資料夾）

## 2) 啟動方式（重要）

不要直接用 `file://` 開啟，請用本機 HTTP 伺服器：

```powershell
cd "D:\AI Code\WebHAN"
python -m http.server 8080
```

然後瀏覽器開啟：

- `http://localhost:8080/inventory-management-app.html`

## 3) 功能相容性

- 資料儲存：預設使用 `IndexedDB`（內建資料庫模式）。
- 條碼掃描：使用瀏覽器相機 + `BarcodeDetector`。

## 4) 裝置端注意事項

- 請允許相機權限，否則條碼掃描無法使用。
- iOS 上建議使用 Safari；Android 建議使用 Chrome。

## 5) PWA 安裝

- 支援瀏覽器可從選單安裝到主畫面（Add to Home Screen / Install app）。
- 若未出現安裝選項，通常是因為未使用 HTTP/HTTPS 或快取尚未建立完成。
