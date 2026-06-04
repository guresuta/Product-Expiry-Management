param(
  [ValidateSet("debug")]
  [string]$BuildType = "debug"
)

$ErrorActionPreference = "Stop"

$webRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $webRoot
$androidDir = Join-Path $projectRoot "android"
$buildDir = Join-Path $androidDir "build"
$distDir = Join-Path $androidDir "dist"
$srcDir = Join-Path $androidDir "src"
$manifestPath = Join-Path $androidDir "AndroidManifest.xml"
$assetsDir = Join-Path $androidDir "assets"
$wwwDir = Join-Path $assetsDir "www"
$resDir = Join-Path $androidDir "res"
$versionJsPath = Join-Path $webRoot "version.js"

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

$buildToolsVersion = (Get-ChildItem (Join-Path $sdkRoot "build-tools") -Directory | Sort-Object Name -Descending | Select-Object -First 1).Name
$platformVersion = (Get-ChildItem (Join-Path $sdkRoot "platforms") -Directory | Sort-Object Name -Descending | Select-Object -First 1).Name

$androidJar = Join-Path $sdkRoot "platforms\$platformVersion\android.jar"
$buildToolsDir = Join-Path $sdkRoot "build-tools\$buildToolsVersion"
$javac = Join-Path $javaHome "bin\javac.exe"
$keytool = Join-Path $javaHome "bin\keytool.exe"
$d8 = Join-Path $buildToolsDir "d8.bat"
$aapt = Join-Path $buildToolsDir "aapt.exe"
$zipalign = Join-Path $buildToolsDir "zipalign.exe"
$apksigner = Join-Path $buildToolsDir "apksigner.bat"

$objDir = Join-Path $buildDir "obj"
$dexDir = Join-Path $buildDir "dex"
$unsignedApk = Join-Path $buildDir "keitaihan-unsigned.apk"
$unalignedApk = Join-Path $buildDir "keitaihan-unaligned.apk"
$alignedApk = Join-Path $buildDir "keitaihan-aligned.apk"
$debugKeystore = Join-Path $buildDir "debug.keystore"
$finalApk = Join-Path $distDir "keitaihan-debug.apk"

function Get-AppReleaseVersion {
  if (!(Test-Path $versionJsPath)) {
    throw "Missing version source: $versionJsPath"
  }

  $versionText = Get-Content -LiteralPath $versionJsPath -Raw
  if ($versionText -notmatch "version\s*:\s*[""']v?([0-9]+)\.([0-9]+)\.([0-9]+)(?:[-+][^""']*)?[""']") {
    throw "Unable to find APP_RELEASE.version in $versionJsPath"
  }

  $major = [int]$Matches[1]
  $minor = [int]$Matches[2]
  $patch = [int]$Matches[3]

  if ($minor -gt 99 -or $patch -gt 99) {
    throw "Version minor and patch must be 0-99 for Android versionCode mapping: $major.$minor.$patch"
  }

  [PSCustomObject]@{
    VersionName = "$major.$minor.$patch"
    VersionCode = ($major * 10000) + ($minor * 100) + $patch
  }
}

function Sync-AndroidManifestVersion {
  param(
    [string]$Path,
    [string]$VersionName,
    [int]$VersionCode
  )

  if (!(Test-Path $Path)) {
    throw "Missing Android manifest: $Path"
  }

  $manifestText = Get-Content -LiteralPath $Path -Raw
  $manifestText = $manifestText -replace 'android:versionCode="\d+"', "android:versionCode=`"$VersionCode`""
  $manifestText = $manifestText -replace 'android:versionName="[^"]+"', "android:versionName=`"$VersionName`""
  Set-Content -LiteralPath $Path -Value $manifestText -Encoding UTF8
  Write-Output "Android version synced from version.js: versionName=$VersionName versionCode=$VersionCode"
}

function New-LauncherIconsFromImage {
  param(
    [string]$ImagePath,
    [string]$OutputRoot,
    [double]$ContentScale = 0.78
  )

  Add-Type -AssemblyName System.Drawing
  $source = [System.Drawing.Image]::FromFile($ImagePath)

  $map = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
  }

  foreach ($entry in $map.GetEnumerator()) {
    $folder = Join-Path $OutputRoot $entry.Key
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    $size = [int]$entry.Value

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $drawSize = [int][Math]::Round($size * $ContentScale)
    $offset = [int][Math]::Round(($size - $drawSize) / 2)
    $g.DrawImage($source, $offset, $offset, $drawSize, $drawSize)

    $iconPath = Join-Path $folder "ic_launcher.png"
    $roundPath = Join-Path $folder "ic_launcher_round.png"
    $bmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
  }

  $source.Dispose()
}

function New-AdaptiveLauncherIcon {
  param(
    [string]$ImagePath,
    [string]$OutputRoot,
    [double]$ContentScale = 0.66
  )

  Add-Type -AssemblyName System.Drawing

  $valuesDir = Join-Path $OutputRoot "values"
  $drawableDir = Join-Path $OutputRoot "drawable"
  $adaptiveDir = Join-Path $OutputRoot "mipmap-anydpi-v26"
  New-Item -ItemType Directory -Force -Path $valuesDir, $drawableDir, $adaptiveDir | Out-Null

  @'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000824</color>
</resources>
'@ | Set-Content -LiteralPath (Join-Path $valuesDir "colors.xml") -Encoding UTF8

  $source = [System.Drawing.Image]::FromFile($ImagePath)
  $size = 432
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 8, 36))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $drawSize = [int][Math]::Round($size * $ContentScale)
  $offset = [int][Math]::Round(($size - $drawSize) / 2)
  $g.DrawImage($source, $offset, $offset, $drawSize, $drawSize)
  $foregroundPath = Join-Path $drawableDir "ic_launcher_foreground.png"
  $bmp.Save($foregroundPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $source.Dispose()

  $adaptiveXml = @'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
'@
  $adaptiveXml | Set-Content -LiteralPath (Join-Path $adaptiveDir "ic_launcher.xml") -Encoding UTF8
  $adaptiveXml | Set-Content -LiteralPath (Join-Path $adaptiveDir "ic_launcher_round.xml") -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $objDir, $dexDir, $distDir, $assetsDir, $resDir | Out-Null

$appReleaseVersion = Get-AppReleaseVersion
Sync-AndroidManifestVersion -Path $manifestPath -VersionName $appReleaseVersion.VersionName -VersionCode $appReleaseVersion.VersionCode

if (Test-Path $wwwDir) {
  Remove-Item -LiteralPath $wwwDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $wwwDir | Out-Null

$webFiles = @(
  "inventory-management-app.html",
  "settings.html",
  "privacy-policy.html",
  "app.js",
  "settings.js",
  "i18n.js",
  "version.js",
  "styles_washi.css",
  "sw.js",
  "manifest.webmanifest",
  "favicon.ico"
)

foreach ($file in $webFiles) {
  $source = Join-Path $webRoot $file
  if (Test-Path $source) {
    Copy-Item -Force -LiteralPath $source -Destination (Join-Path $wwwDir $file)
  }
}

foreach ($folderName in @("icons", "fonts", "key-visuals")) {
  $sourceFolder = Join-Path $webRoot $folderName
  if (Test-Path $sourceFolder) {
    Copy-Item -Force -Recurse -LiteralPath $sourceFolder -Destination (Join-Path $wwwDir $folderName)
  }
}

$launcherIcon = Join-Path $webRoot "icons\icon-app-512.png"
if (!(Test-Path $launcherIcon)) {
  throw "Missing launcher icon: $launcherIcon"
}
New-LauncherIconsFromImage -ImagePath $launcherIcon -OutputRoot $resDir
New-AdaptiveLauncherIcon -ImagePath $launcherIcon -OutputRoot $resDir

Get-ChildItem -Recurse -Filter "*.class" $objDir -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Recurse -Filter "*.dex" $dexDir -ErrorAction SilentlyContinue | Remove-Item -Force
Remove-Item -Force $unsignedApk, $unalignedApk, $alignedApk, $finalApk -ErrorAction SilentlyContinue

$javaFiles = Get-ChildItem -Recurse -Path $srcDir -Filter "*.java" | ForEach-Object { $_.FullName }
if ($javaFiles.Count -eq 0) {
  throw "No Java source files found under $srcDir"
}

& $javac -source 8 -target 8 -bootclasspath $androidJar -classpath $androidJar -d $objDir $javaFiles

$classFiles = Get-ChildItem -Recurse -Path $objDir -Filter "*.class" | ForEach-Object { $_.FullName }
if ($classFiles.Count -eq 0) {
  throw "No .class files generated under $objDir"
}

$d8ArgsFile = Join-Path $buildDir "keitaihan-d8-args.txt"
$d8ArgLines = @(
  "--lib"
  $androidJar
  "--min-api"
  "24"
  "--output"
  $dexDir
)
$d8ArgLines += $classFiles
Set-Content -LiteralPath $d8ArgsFile -Value $d8ArgLines -Encoding UTF8
& $d8 "@$d8ArgsFile"

& $aapt package -f -M $manifestPath -A $assetsDir -S $resDir -I $androidJar -F $unsignedApk

$classesDex = Join-Path $dexDir "classes.dex"
if (!(Test-Path $classesDex)) {
  throw "classes.dex was not generated."
}

Copy-Item -Force $unsignedApk $unalignedApk
Push-Location $dexDir
& $aapt add $unalignedApk classes.dex
Pop-Location

& $zipalign -f 4 $unalignedApk $alignedApk

if (!(Test-Path $debugKeystore)) {
  & $keytool -genkeypair -v `
    -keystore $debugKeystore `
    -storepass android `
    -alias androiddebugkey `
    -keypass android `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -dname "CN=Android Debug,O=Android,C=US"
}

& $apksigner sign `
  --ks $debugKeystore `
  --ks-pass pass:android `
  --ks-key-alias androiddebugkey `
  --key-pass pass:android `
  --out $finalApk `
  $alignedApk

& $apksigner verify --verbose --print-certs $finalApk

Write-Output "APK built: $finalApk"
