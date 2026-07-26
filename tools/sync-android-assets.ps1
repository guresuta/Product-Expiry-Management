[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidAssetsRoot = Join-Path $repositoryRoot "android-app\app\src\main\assets"
$keepFile = Join-Path $androidAssetsRoot ".gitkeep"

$runtimeFiles = @(
  "analytics-history.js",
  "analytics.html",
  "analytics.js",
  "app.js",
  "background-loader.js",
  "CHANGELOG.md",
  "favicon.ico",
  "home-subtitles.js",
  "i18n.js",
  "index.html",
  "inventory-management-app.html",
  "legacy-webview.js",
  "LICENSE",
  "manifest.webmanifest",
  "privacy-policy.html",
  "resource-preload.js",
  "settings.html",
  "settings.js",
  "styles_washi.css",
  "sw.js",
  "THIRD_PARTY_NOTICES.md",
  "version.js"
)
$runtimeDirectories = @("fonts", "icons", "key-visuals")

New-Item -ItemType Directory -Force -Path $androidAssetsRoot | Out-Null
Get-ChildItem -LiteralPath $androidAssetsRoot -Force |
  Where-Object { $_.Name -ne ".gitkeep" } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
if (!(Test-Path -LiteralPath $keepFile)) {
  New-Item -ItemType File -Path $keepFile | Out-Null
}

foreach ($file in $runtimeFiles) {
  $sourcePath = Join-Path $repositoryRoot $file
  if (!(Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Missing frontend runtime file: $sourcePath"
  }
  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $androidAssetsRoot $file) -Force
}

foreach ($directory in $runtimeDirectories) {
  $sourcePath = Join-Path $repositoryRoot $directory
  if (!(Test-Path -LiteralPath $sourcePath -PathType Container)) {
    throw "Missing frontend runtime directory: $sourcePath"
  }
  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $androidAssetsRoot $directory) -Recurse -Force
}

$sourceFiles = @()
foreach ($file in $runtimeFiles) {
  $sourceFiles += [PSCustomObject]@{ RelativePath = $file; SourcePath = Join-Path $repositoryRoot $file }
}
foreach ($directory in $runtimeDirectories) {
  $sourceDirectory = Join-Path $repositoryRoot $directory
  $sourceFiles += Get-ChildItem -LiteralPath $sourceDirectory -File -Recurse | ForEach-Object {
    [PSCustomObject]@{
      RelativePath = $_.FullName.Substring($repositoryRoot.Length + 1)
      SourcePath = $_.FullName
    }
  }
}

foreach ($entry in $sourceFiles) {
  $targetPath = Join-Path $androidAssetsRoot $entry.RelativePath
  if (!(Test-Path -LiteralPath $targetPath -PathType Leaf)) {
    throw "Android asset was not copied: $($entry.RelativePath)"
  }
  if ((Get-FileHash -LiteralPath $entry.SourcePath -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash) {
    throw "Android asset hash mismatch: $($entry.RelativePath)"
  }
}

Write-Output "Android assets synchronized and hash-verified: $($sourceFiles.Count) files"
