package com.guresuta.productexpirycybercontrol

import android.webkit.JavascriptInterface
import android.view.WindowManager

class AndroidBridge(private val activity: MainActivity) {

    private companion object {
        const val MAX_BRIDGE_TEXT_LENGTH = 10 * 1024 * 1024
        const val MAX_FILENAME_LENGTH = 80
        val SAFE_FILENAME_CHARS = Regex("[^A-Za-z0-9._()\\-\\u4e00-\\u9fff\\u3040-\\u30ff ]")
        val SAFE_COLOR = Regex("^#[0-9A-Fa-f]{6}$")
        val ALLOWED_SCAN_TARGETS = setOf("add", "edit", "search")
        val ALLOWED_LANGUAGES = setOf("zh-Hant", "en", "ja")
        val ALLOWED_THEMES = setOf("dark-1", "light-1", "light-2", "dark-2")
    }

    private fun safeText(text: String): String {
        return text.take(MAX_BRIDGE_TEXT_LENGTH)
    }

    private fun safeFilename(filename: String, fallback: String): String {
        val normalized = filename
            .replace(SAFE_FILENAME_CHARS, "_")
            .trim()
            .take(MAX_FILENAME_LENGTH)
        return normalized.ifEmpty { fallback }
    }

    @JavascriptInterface
    fun consumeLegacyDatabaseFile(): String {
        return activity.consumeLegacyDatabaseFile()
    }
    @JavascriptInterface
    fun requestExportCsvFile(filename: String, content: String) {
        activity.launchCreateDocument(
            MainActivity.DocumentAction.EXPORT_CSV,
            safeFilename(filename, "expiry-products.csv"),
            "text/csv",
            safeText(content)
        )
    }

    @JavascriptInterface
    fun requestExportJsonFile(filename: String, content: String) {
        activity.launchCreateDocument(
            MainActivity.DocumentAction.EXPORT_JSON,
            safeFilename(filename, "expiry-backup.json"),
            "application/json",
            safeText(content)
        )
    }    @JavascriptInterface
    fun openAppInfo() {
        activity.openAppInfoSettings()
    }

    @JavascriptInterface
    fun requestBarcodeScan(target: String, language: String, theme: String) {
        val safeTarget = target.takeIf { ALLOWED_SCAN_TARGETS.contains(it) } ?: "add"
        val safeLanguage = language.takeIf { ALLOWED_LANGUAGES.contains(it) } ?: "zh-Hant"
        val safeTheme = theme.takeIf { ALLOWED_THEMES.contains(it) } ?: "dark-1"
        activity.launchBarcodeScanner(safeTarget, safeLanguage, safeTheme)
    }


    @JavascriptInterface
    fun prepareTransitionCover() {
        activity.prepareTransitionCover()
    }

    @JavascriptInterface
    fun notifyPageBootReady() {
        activity.notifyPageBootReady()
    }

    @JavascriptInterface
    fun setStatusBarColor(color: String) {
        if (!SAFE_COLOR.matches(color)) {
            return
        }
        activity.runOnUiThread {
            activity.updateStatusBarTheme(color)
        }
    }

    @JavascriptInterface
    fun setScreenBrightnessMax() {
        activity.runOnUiThread {
            activity.window.attributes = activity.window.attributes.apply {
                screenBrightness = 1f
            }
        }
    }

    @JavascriptInterface
    fun resetScreenBrightness() {
        activity.runOnUiThread {
            activity.window.attributes = activity.window.attributes.apply {
                screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            }
        }
    }
}
