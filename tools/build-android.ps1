[CmdletBinding()]
param(
  [ValidateSet("debug", "minifiedDebug", "release")]
  [string]$Variant = "minifiedDebug",
  [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidRoot = Join-Path $repositoryRoot "android-app"
$gradleWrapper = Join-Path $androidRoot "gradlew.bat"
$defaultAndroidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$defaultJavaHome = "C:\Program Files\Android\Android Studio\jbr"
$androidSdk = if ($env:ANDROID_HOME -and (Test-Path -LiteralPath $env:ANDROID_HOME -PathType Container)) {
  $env:ANDROID_HOME
} elseif (Test-Path -LiteralPath $defaultAndroidSdk -PathType Container) {
  $defaultAndroidSdk
} else {
  throw "Android SDK was not found. Set ANDROID_HOME or install the Android SDK at $defaultAndroidSdk."
}
$javaHome = if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME "bin\java.exe") -PathType Leaf)) {
  $env:JAVA_HOME
} elseif (Test-Path -LiteralPath (Join-Path $defaultJavaHome "bin\java.exe") -PathType Leaf) {
  $defaultJavaHome
} else {
  throw "Java was not found. Set JAVA_HOME or install the Android Studio bundled JBR at $defaultJavaHome."
}

& (Join-Path $PSScriptRoot "sync-android-assets.ps1")
if (!(Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
  throw "Missing Gradle wrapper: $gradleWrapper"
}

$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:JAVA_HOME = $javaHome
$env:Path = "$(Join-Path $javaHome 'bin');$env:Path"
Push-Location $androidRoot
try {
  if ($Clean) {
    & .\gradlew.bat clean
    if ($LASTEXITCODE -ne 0) {
      throw "Gradle clean failed."
    }
  }

  $taskVariant = $Variant.Substring(0, 1).ToUpperInvariant() + $Variant.Substring(1)
  & .\gradlew.bat ":app:assemble$taskVariant"
  if ($LASTEXITCODE -ne 0) {
    throw "Android $Variant build failed."
  }
} finally {
  Pop-Location
}

$artifactMap = @{
  "debug" = @{ Directory = "debug"; File = "app-debug.apk" }
  "minifiedDebug" = @{ Directory = "minifiedDebug"; File = "app-minifiedDebug.apk" }
  "release" = @{ Directory = "release"; File = "app-release.apk" }
}
$artifact = $artifactMap[$Variant]
$apkPath = Join-Path $androidRoot "app\build\outputs\apk\$($artifact.Directory)\$($artifact.File)"
if (Test-Path -LiteralPath $apkPath -PathType Leaf) {
  Write-Output "APK built: $apkPath"
} else {
  Write-Output "Gradle build completed. Check Android output directories for the generated artifact."
}
