$ErrorActionPreference = "Stop"

$port = 8080
$hostName = "localhost"
$appPath = "inventory-management-app.html"

Set-Location -LiteralPath $PSScriptRoot

Write-Host "WebHAN 本機伺服器啟動中..."
Write-Host "工作目錄: $PSScriptRoot"
Write-Host "網址: http://$hostName`:$port/$appPath"
Write-Host ""

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
  & python -m http.server $port
  exit $LASTEXITCODE
}

$pyCmd = Get-Command py -ErrorAction SilentlyContinue
if ($pyCmd) {
  & py -m http.server $port
  exit $LASTEXITCODE
}

Write-Error "找不到 Python。請先安裝 Python 3，或手動啟動任何 HTTP 伺服器。"
