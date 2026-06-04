# 一鍵部署到 GitHub Pages

## 你只要做一次的設定

1. 建立 GitHub Repo，並把本專案 push 到 `main` 分支。  
2. 到 GitHub Repo 的 `Settings` -> `Pages`。  
3. `Build and deployment` 選 `Source: GitHub Actions`。  

完成後，每次 push 到 `main` 都會自動部署。

## 已內建的一鍵部署檔案

- Workflow: `.github/workflows/deploy-pages.yml`
- 入口頁: `index.html`（會自動導向 `inventory-management-app.html`）

## 上線網址

部署成功後網址通常是：

- `https://<你的帳號>.github.io/<repo名稱>/`

## 注意事項

1. 各裝置資料是獨立儲存在各自瀏覽器（IndexedDB）。  
2. 首次部署後若舊快取造成畫面未更新，請重新整理或清除網站快取。  
3. 若 repo 預設分支不是 `main`，請改 workflow 的 branch 設定。  

