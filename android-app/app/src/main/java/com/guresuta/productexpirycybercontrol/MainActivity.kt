@file:Suppress("SpellCheckingInspection")

package com.guresuta.productexpirycybercontrol

import android.Manifest
import android.animation.ValueAnimator
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.SweepGradient
import android.graphics.Shader
import android.graphics.Color
import android.os.SystemClock
import android.view.Gravity
import android.view.PixelCopy
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.webkit.WebViewAssetLoader
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.EXTRA_ERROR
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.EXTRA_FORMAT
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.EXTRA_LANGUAGE
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.EXTRA_TARGET
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.EXTRA_THEME
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.EXTRA_VALUE
import com.guresuta.productexpirycybercontrol.BarcodeScannerActivity.Companion.RESULT_SCAN_ERROR
import org.json.JSONObject
import java.util.Locale

class MainActivity : AppCompatActivity() {
    companion object {
        private const val APP_ASSETS_HOST = "appassets.androidplatform.net"
        private const val APP_HOME_URL = "https://$APP_ASSETS_HOST/assets/inventory-management-app.html"
        private const val RECENTS_SNAPSHOT_LOG_TAG = "RecentsSnapshot"
        private const val APP_BACKGROUND_COLOR = 0xFF050505.toInt()
        private const val STARTUP_SPLASH_LOGO_FADE_IN_MS = 600L
        private const val STARTUP_SPLASH_LOGO_VISIBLE_MS = 2_300L
        private const val STARTUP_SPLASH_LOGO_FADE_OUT_MS = 500L
        private const val STARTUP_SPLASH_HOME_ZOOM_DURATION_MS = 583L
        private const val STARTUP_SPLASH_HOME_INITIAL_SCALE = 1.5f
        private const val STARTUP_SPLASH_CUSTOM_LOGO_SIZE_DP = 288
        private const val STARTUP_SPLASH_APP_ICON_SIZE_DP = 144
        private const val TRANSITION_MIN_VISIBLE_MS = 900L
        private const val TRANSITION_FADE_DURATION_MS = 180L
        private const val RESUME_SNAPSHOT_INITIAL_SCALE = 1.02f
        private const val RESUME_SNAPSHOT_SETTLE_DURATION_MS = 60L
        private const val RESUME_SNAPSHOT_FADE_DURATION_MS = 100L
        private const val WEBVIEW_STATE_KEY = "webview_state"
        private const val ACTIVITY_RESULT_OK = RESULT_OK
    }

    enum class DocumentAction {
        EXPORT_CSV,
        EXPORT_JSON
    }

    private val preferences by lazy {
        getSharedPreferences("keitaihan_native", MODE_PRIVATE)
    }

    private lateinit var webView: WebView
    private lateinit var rootView: FrameLayout
    private lateinit var resumeSnapshot: ImageView
    private lateinit var transitionCover: FrameLayout
    private lateinit var transitionCoverBackground: ImageView
    private lateinit var transitionCoverGlow: BootGlowView
    private lateinit var transitionCoverSpinner: ThemeLoadingIndicator
    private lateinit var startupSplash: FrameLayout
    private lateinit var startupSplashLogo: ImageView
    private lateinit var startupSplashAppIcon: ImageView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var pendingDocumentAction: DocumentAction? = null
    private var pendingDocumentContent = ""
    private var clearHistoryAfterHomeLoad = false
    private var safeAreaTopInsetPx = 0
    private var safeAreaBottomInsetPx = 0
    private var imeBottomInsetPx = 0
    private var maximumImeBottomInsetPx = 0
    private var transitionBackgroundBitmap: Bitmap? = null
    private var transitionBackgroundAsset = ""
    private var transitionBackgroundRequestedAsset = ""
    private var transitionBackgroundLoadToken = 0L
    private var hasCompletedFirstPage = false
    private var pageBootReady = false
    private var initialSplashDeadlineMs = 0L
    private var systemSplashHandoffReady = false
    private var startupSplashSequenceComplete = false
    private var startupSplashHomeRevealStarted = false
    private var pendingStartupStatusBarColor: String? = null
    private var visualStateRequestId = 0L
    private var transitionGeneration = 0L
    private var transitionShownAtMs = 0L
    private var transitionMinimumVisibleMs = TRANSITION_MIN_VISIBLE_MS
    private var appWasBackgrounded = false
    private var resumeEventAwaitingWindowFocus = false
    private var resumeSnapshotBitmap: Bitmap? = null
    private var resumeSnapshotCaptureGeneration = 0L
    private var resumeSnapshotReleaseGeneration = -1L
    private val createDocumentLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val action = pendingDocumentAction
            val content = pendingDocumentContent
            pendingDocumentAction = null
            pendingDocumentContent = ""

            if (action == null) return@registerForActivityResult

            val uri = result.data?.data
            if (result.resultCode != ACTIVITY_RESULT_OK || uri == null) {
                dispatchDocumentResult(action, false, "已取消選擇檔案")
                return@registerForActivityResult
            }

            try {
                writeTextToUri(uri, content)
                dispatchDocumentResult(action, true, "")
            } catch (error: Exception) {
                dispatchDocumentResult(action, false, error.message ?: "檔案寫入失敗")
            }
        }

    private val barcodeScannerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val data = result.data
            val target = data?.getStringExtra(EXTRA_TARGET).orEmpty()
            when (result.resultCode) {
                ACTIVITY_RESULT_OK -> dispatchBarcodeResult(
                    ok = true,
                    cancelled = false,
                    value = data?.getStringExtra(EXTRA_VALUE).orEmpty(),
                    format = data?.getStringExtra(EXTRA_FORMAT).orEmpty(),
                    target = target,
                    error = ""
                )
                RESULT_SCAN_ERROR -> dispatchBarcodeResult(
                    ok = false,
                    cancelled = false,
                    value = "",
                    format = "",
                    target = target,
                    error = data?.getStringExtra(EXTRA_ERROR) ?: "原生條碼掃描失敗"
                )
                else -> dispatchBarcodeResult(
                    ok = false,
                    cancelled = true,
                    value = "",
                    format = "",
                    target = target,
                    error = ""
                )
            }
        }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileChooserCallback
            fileChooserCallback = null
            if (result.resultCode == ACTIVITY_RESULT_OK) {
                callback?.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
                )
            } else {
                callback?.onReceiveValue(null)
            }
        }

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingWebPermissionRequest
            pendingWebPermissionRequest = null
            if (granted && request != null) {
                request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
            } else {
                request?.deny()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        initialSplashDeadlineMs = SystemClock.elapsedRealtime() + 8_000L
        installSplashScreen().setKeepOnScreenCondition {
            !systemSplashHandoffReady && SystemClock.elapsedRealtime() < initialSplashDeadlineMs && !isFinishing
        }
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        applyStatusBarColor(APP_BACKGROUND_COLOR)

        window.decorView.setBackgroundColor(APP_BACKGROUND_COLOR)



        webView = WebView(this).apply {
            setBackgroundColor(APP_BACKGROUND_COLOR)
        }
        rootView = FrameLayout(this).apply {
            setBackgroundColor(APP_BACKGROUND_COLOR)
            addView(
                webView,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )
        }
        resumeSnapshot = ImageView(this).apply {
            visibility = View.GONE
            scaleType = ImageView.ScaleType.FIT_XY
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        rootView.addView(
            resumeSnapshot,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        transitionCover = FrameLayout(this).apply {
            visibility = View.GONE
            setBackgroundColor(APP_BACKGROUND_COLOR)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        transitionCoverBackground = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            setBackgroundColor(APP_BACKGROUND_COLOR)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        transitionCover.addView(
            transitionCoverBackground,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        transitionCoverGlow = BootGlowView(this).apply {
            setGlowColor(Color.argb(36, 0, 210, 255))
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        transitionCover.addView(
            transitionCoverGlow,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        transitionCoverSpinner = ThemeLoadingIndicator(this).apply {
            setThemeColors(
                Color.argb(51, 120, 220, 255),
                Color.rgb(56, 213, 255),
                Color.rgb(217, 77, 255)
            )
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        val spinnerSize = (42 * resources.displayMetrics.density).toInt()
        transitionCover.addView(
            transitionCoverSpinner,
            FrameLayout.LayoutParams(spinnerSize, spinnerSize, Gravity.CENTER)
        )
        rootView.addView(
            transitionCover,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        startupSplash = FrameLayout(this).apply {
            setBackgroundColor(APP_BACKGROUND_COLOR)
            isClickable = true
            isFocusable = true
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        startupSplashLogo = ImageView(this).apply {
            setImageResource(R.drawable.splash_keitaihan_logo)
            alpha = 0f
            scaleType = ImageView.ScaleType.FIT_CENTER
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        val splashLogoSize = (STARTUP_SPLASH_CUSTOM_LOGO_SIZE_DP * resources.displayMetrics.density).toInt()
        startupSplash.addView(
            startupSplashLogo,
            FrameLayout.LayoutParams(splashLogoSize, splashLogoSize, Gravity.CENTER)
        )
        startupSplashAppIcon = ImageView(this).apply {
            setImageResource(R.drawable.splash_app_icon)
            alpha = 0f
            scaleType = ImageView.ScaleType.FIT_CENTER
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        val splashAppIconSize = (STARTUP_SPLASH_APP_ICON_SIZE_DP * resources.displayMetrics.density).toInt()
        startupSplash.addView(
            startupSplashAppIcon,
            FrameLayout.LayoutParams(splashAppIconSize, splashAppIconSize, Gravity.CENTER)
        )
        rootView.addView(
            startupSplash,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(rootView)
        rootView.post {
            systemSplashHandoffReady = true
            startStartupSplashSequence()
        }
        configureInsets()
        configureWebView()

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() = handleNativeBack()
            }
        )

        val restoredWebView = savedInstanceState
            ?.getBundle(WEBVIEW_STATE_KEY)
            ?.let { state -> webView.restoreState(state) != null }
            ?: false
        if (!restoredWebView) {
            webView.loadUrl(APP_HOME_URL)
        } else {
            hasCompletedFirstPage = true
            pageBootReady = true
            webView.post {
                injectSafeAreaInsets()
                revealStartupHomeWhenReady()
            }
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (!::webView.isInitialized) return
        webView.post {
            webView.requestLayout()
            ViewCompat.requestApplyInsets(webView)
            injectSafeAreaInsets()
        }
    }

    private fun configureInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val safeInsets = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            safeAreaTopInsetPx = safeInsets.top
            safeAreaBottomInsetPx = safeInsets.bottom
            imeBottomInsetPx = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            if (imeBottomInsetPx > maximumImeBottomInsetPx) {
                maximumImeBottomInsetPx = imeBottomInsetPx
            }
            view.updatePadding(
                left = safeInsets.left,
                top = 0,
                right = safeInsets.right,
                bottom = safeInsets.bottom
            )
            injectSafeAreaInsets()
            insets
        }
        ViewCompat.requestApplyInsets(webView)
    }

    private fun configureWebView() {
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain(APP_ASSETS_HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            blockNetworkLoads = true
            safeBrowsingEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            setGeolocationEnabled(false)
        }
        webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                pageBootReady = false
                if (hasCompletedFirstPage) {
                    Log.d(RECENTS_SNAPSHOT_LOG_TAG, "WebView page start: discard any resume snapshot; url=$url")
                    discardResumeSnapshot()
                    showTransitionCover()
                }
            }

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val uri = request.url
                if (uri.scheme == "https" && uri.host == APP_ASSETS_HOST) {
                    return false
                }
                return openExternalUri(uri)
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                injectSafeAreaInsets()
                if (clearHistoryAfterHomeLoad && url == APP_HOME_URL) {
                    clearHistoryAfterHomeLoad = false
                    view.clearHistory()
                }
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val trustedOrigin = request.origin?.host == APP_ASSETS_HOST
                val requestsCamera = request.resources.any {
                    it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                }
                if (!trustedOrigin || !requestsCamera) {
                    request.deny()
                    return
                }
                if (ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                } else {
                    pendingWebPermissionRequest = request
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                }
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(
                        Intent.EXTRA_MIME_TYPES,
                        arrayOf(
                            "application/json",
                            "text/csv",
                            "text/comma-separated-values",
                            "application/csv",
                            "application/vnd.ms-excel",
                            "text/plain"
                        )
                    )
                }
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    fileChooserCallback = null
                    filePathCallback.onReceiveValue(null)
                    false
                }
            }
        }
    }

    private fun openExternalUri(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (_: ActivityNotFoundException) {
            true
        }
    }


    /** Shows a deterministic native loading scene before WebView navigation can clear its surface. */
    fun prepareTransitionCover() {
        runOnUiThread { showTransitionCover() }
    }

    fun updateTransitionTheme(statusBarColor: String) {
        runOnUiThread {
            if (!::transitionCover.isInitialized) return@runOnUiThread
            val normalizedColor = statusBarColor.lowercase(Locale.US)
            val assetPath = when (normalizedColor) {
                "#fafafa" -> "key-visuals/background-daylight-cyber.png"
                "#f4f7f5" -> "key-visuals/background-vibrant-oasis.png"
                "#101814" -> "key-visuals/background-midnight-oasis.png"
                else -> "key-visuals/background-neon-cyber.png"
            }
            val fallbackColor = try {
                Color.parseColor(statusBarColor)
            } catch (_: IllegalArgumentException) {
                APP_BACKGROUND_COLOR
            }
            val spinnerColors = when (normalizedColor) {
                "#fafafa" -> intArrayOf(
                    Color.argb(56, 255, 176, 0),
                    Color.rgb(255, 176, 0),
                    Color.rgb(0, 212, 41)
                )
                "#f4f7f5" -> intArrayOf(
                    Color.argb(56, 47, 194, 116),
                    Color.rgb(47, 194, 116),
                    Color.rgb(22, 138, 74)
                )
                "#101814" -> intArrayOf(
                    Color.argb(56, 47, 194, 116),
                    Color.rgb(47, 194, 116),
                    Color.rgb(150, 170, 158)
                )
                else -> intArrayOf(
                    Color.argb(51, 120, 220, 255),
                    Color.rgb(56, 213, 255),
                    Color.rgb(217, 77, 255)
                )
            }
            val bootGlowColor = when (normalizedColor) {
                "#fafafa" -> Color.argb(46, 255, 176, 0)
                "#f4f7f5" -> Color.argb(46, 47, 194, 116)
                "#101814" -> Color.argb(41, 47, 194, 116)
                else -> Color.argb(36, 0, 210, 255)
            }
            transitionCover.setBackgroundColor(fallbackColor)
            transitionCoverBackground.setBackgroundColor(fallbackColor)
            transitionCoverGlow.setGlowColor(bootGlowColor)
            transitionCoverSpinner.setThemeColors(spinnerColors[0], spinnerColors[1], spinnerColors[2])
            if (transitionBackgroundAsset == assetPath || transitionBackgroundRequestedAsset == assetPath) return@runOnUiThread
            transitionBackgroundRequestedAsset = assetPath
            val loadToken = ++transitionBackgroundLoadToken
            Thread {
                val bitmap = try {
                    assets.open(assetPath).use { stream ->
                        BitmapFactory.decodeStream(stream, null, BitmapFactory.Options().apply {
                            inPreferredConfig = Bitmap.Config.RGB_565
                            inSampleSize = 2
                        })
                    }
                } catch (_: Exception) {
                    null
                }
                runOnUiThread {
                    if (loadToken != transitionBackgroundLoadToken || transitionBackgroundRequestedAsset != assetPath) {
                        bitmap?.takeIf { !it.isRecycled }?.recycle()
                        return@runOnUiThread
                    }
                    val previousBitmap = transitionBackgroundBitmap
                    transitionBackgroundBitmap = bitmap
                    transitionBackgroundAsset = assetPath
                    transitionCoverBackground.setImageBitmap(bitmap)
                    if (previousBitmap != null && previousBitmap !== bitmap && !previousBitmap.isRecycled) {
                        previousBitmap.recycle()
                    }
                }
            }.start()
        }
    }

    /** Keeps the native system bar black until the startup scene has fully faded away. */
    fun updateStatusBarTheme(statusBarColor: String) {
        val parsedColor = try {
            Color.parseColor(statusBarColor)
        } catch (_: IllegalArgumentException) {
            return
        }
        updateTransitionTheme(statusBarColor)
        if (::startupSplash.isInitialized && startupSplash.visibility == View.VISIBLE) {
            pendingStartupStatusBarColor = statusBarColor
            return
        }
        applyStatusBarColor(parsedColor)
    }

    private fun applyPendingStartupStatusBarTheme() {
        val pendingColor = pendingStartupStatusBarColor ?: return
        pendingStartupStatusBarColor = null
        updateStatusBarTheme(pendingColor)
    }

    private fun applyStatusBarColor(color: Int) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            @Suppress("DEPRECATION")
            window.statusBarColor = color
        }
        WindowInsetsControllerCompat(window, window.decorView)
            .isAppearanceLightStatusBars = shouldUseDarkStatusBarIcons(color)
    }

    private fun shouldUseDarkStatusBarIcons(color: Int): Boolean {
        val red = Color.red(color) / 255.0
        val green = Color.green(color) / 255.0
        val blue = Color.blue(color) / 255.0
        val luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        return luminance > 0.72
    }

    /** Called only after the destination page has finished its own visual boot sequence. */
    fun notifyPageBootReady() {
        runOnUiThread {
            hasCompletedFirstPage = true
            pageBootReady = true
            revealStartupHomeWhenReady()
            releaseTransitionCoverAfterVisualState()
        }
    }

    /** Runs the two-logo startup scene while the WebView prepares its first visible frame. */
    private fun startStartupSplashSequence() {
        if (!::startupSplash.isInitialized || startupSplash.visibility != View.VISIBLE) return
        startupSplashLogo.animate().cancel()
        startupSplashAppIcon.animate().cancel()
        startupSplashLogo.alpha = 0f
        startupSplashAppIcon.alpha = 0f
        startupSplashLogo.animate()
            .alpha(1f)
            .setDuration(STARTUP_SPLASH_LOGO_FADE_IN_MS)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                startupSplash.postDelayed({
                    startupSplashLogo.animate()
                        .alpha(0f)
                        .setDuration(STARTUP_SPLASH_LOGO_FADE_OUT_MS)
                        .setInterpolator(DecelerateInterpolator())
                        .withEndAction { showStartupSplashAppIcon() }
                        .start()
                }, STARTUP_SPLASH_LOGO_VISIBLE_MS)
            }
            .start()
    }

    private fun showStartupSplashAppIcon() {
        if (!::startupSplash.isInitialized || startupSplash.visibility != View.VISIBLE) return
        startupSplashAppIcon.animate()
            .alpha(1f)
            .setDuration(STARTUP_SPLASH_LOGO_FADE_IN_MS)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                startupSplash.postDelayed({
                    startupSplashAppIcon.animate()
                        .alpha(0f)
                        .setDuration(STARTUP_SPLASH_LOGO_FADE_OUT_MS)
                        .setInterpolator(DecelerateInterpolator())
                        .withEndAction {
                            startupSplashSequenceComplete = true
                            revealStartupHomeWhenReady()
                        }
                        .start()
                }, STARTUP_SPLASH_LOGO_VISIBLE_MS)
            }
            .start()
    }

    private fun revealStartupHomeWhenReady() {
        if (!::startupSplash.isInitialized || startupSplash.visibility != View.VISIBLE) return
        if (!pageBootReady || !startupSplashSequenceComplete || startupSplashHomeRevealStarted) return
        startupSplashHomeRevealStarted = true
        val requestId = ++visualStateRequestId
        webView.postVisualStateCallback(
            requestId,
            object : WebView.VisualStateCallback() {
                override fun onComplete(requestId: Long) {
                    if (!pageBootReady || !startupSplashSequenceComplete || isFinishing) return
                    webView.animate().cancel()
                    webView.alpha = 1f
                    webView.scaleX = STARTUP_SPLASH_HOME_INITIAL_SCALE
                    webView.scaleY = STARTUP_SPLASH_HOME_INITIAL_SCALE
                    webView.animate()
                        .scaleX(1f)
                        .scaleY(1f)
                        .setDuration(STARTUP_SPLASH_HOME_ZOOM_DURATION_MS)
                        .setInterpolator(DecelerateInterpolator())
                        .start()
                    startupSplash.animate()
                        .alpha(0f)
                        .setDuration(STARTUP_SPLASH_HOME_ZOOM_DURATION_MS)
                        .setInterpolator(DecelerateInterpolator())
                        .withEndAction {
                            startupSplash.visibility = View.GONE
                            startupSplash.alpha = 1f
                            applyPendingStartupStatusBarTheme()
                        }
                        .start()
                }
            }
        )
    }

    private fun showTransitionCover(
        minimumVisibleMs: Long = TRANSITION_MIN_VISIBLE_MS,
        fadeIn: Boolean = false
    ) {
        if (!::transitionCover.isInitialized) return
        transitionGeneration += 1
        transitionMinimumVisibleMs = minimumVisibleMs
        transitionShownAtMs = SystemClock.elapsedRealtime()
        transitionCover.animate().cancel()
        transitionCover.visibility = View.VISIBLE
        transitionCoverSpinner.start()
        transitionCover.bringToFront()
        if (fadeIn) {
            transitionCover.alpha = 0f
            transitionCover.animate()
                .alpha(1f)
            .setDuration(120L)
                .start()
        } else {
            transitionCover.alpha = 1f
        }
    }

    private fun releaseTransitionCoverAfterVisualState() {
        if (!pageBootReady || !::transitionCover.isInitialized || transitionCover.visibility != View.VISIBLE) {
            return
        }
        val requestId = ++visualStateRequestId
        val generation = transitionGeneration
        webView.postVisualStateCallback(
            requestId,
            object : WebView.VisualStateCallback() {
                override fun onComplete(requestId: Long) {
                    if (!pageBootReady || generation != transitionGeneration) return
                    val remainingDelay = (transitionMinimumVisibleMs - (SystemClock.elapsedRealtime() - transitionShownAtMs))
                        .coerceAtLeast(0L)
                    transitionCover.postDelayed({
                        if (pageBootReady && generation == transitionGeneration) {
                            hideTransitionCover()
                        }
                    }, remainingDelay)
                }
            }
        )
    }

    private fun hideTransitionCover(onHidden: (() -> Unit)? = null) {
        if (transitionCover.visibility != View.VISIBLE) return
        transitionCover.animate()
            .alpha(0f)
            .setDuration(TRANSITION_FADE_DURATION_MS)
            .withEndAction {
                transitionCover.visibility = View.GONE
                transitionCover.alpha = 1f
                transitionCoverSpinner.stop()
                onHidden?.invoke()
            }
            .start()
    }

    /**
     * Captures the currently composed task surface while it is still available.  The bitmap is
     * kept only in memory and becomes the first app-owned frame when the task returns from Recents.
     */
    private fun captureResumeSnapshot() {
        val captureBlocked = !hasCompletedFirstPage || !::resumeSnapshot.isInitialized ||
            !::transitionCover.isInitialized || transitionCover.visibility == View.VISIBLE ||
            rootView.width <= 0 || rootView.height <= 0 || isFinishing || !appWasBackgrounded
        if (captureBlocked) {
            Log.d(
                RECENTS_SNAPSHOT_LOG_TAG,
                    "capture skipped: completed=$hasCompletedFirstPage focus=${window.decorView.hasFocus()} " +
                    "backgrounded=$appWasBackgrounded " +
                    "transition=${if (::transitionCover.isInitialized) transitionCover.visibility else -1} " +
                    "size=${rootView.width}x${rootView.height} finishing=$isFinishing"
            )
            return
        }
        val captureGeneration = ++resumeSnapshotCaptureGeneration
        resumeSnapshotReleaseGeneration = -1L
        Log.d(
            RECENTS_SNAPSHOT_LOG_TAG,
            "capture requested: generation=$captureGeneration focus=${window.decorView.hasFocus()} size=${rootView.width}x${rootView.height}"
        )
        val bitmap = try {
            Bitmap.createBitmap(rootView.width, rootView.height, Bitmap.Config.ARGB_8888)
        } catch (_: OutOfMemoryError) {
            Log.w(RECENTS_SNAPSHOT_LOG_TAG, "capture allocation failed: generation=$captureGeneration")
            return
        }
        try {
            PixelCopy.request(window, bitmap, { result ->
                val hasFocus = window.decorView.hasFocus()
                val backgroundCaptureStillActive = appWasBackgrounded
                val canUseSnapshot = result == PixelCopy.SUCCESS &&
                    captureGeneration == resumeSnapshotCaptureGeneration && backgroundCaptureStillActive && !isFinishing
                Log.d(
                    RECENTS_SNAPSHOT_LOG_TAG,
                    "PixelCopy callback: generation=$captureGeneration result=$result current=$resumeSnapshotCaptureGeneration " +
                        "focus=$hasFocus backgrounded=$backgroundCaptureStillActive finishing=$isFinishing use=$canUseSnapshot"
                )
                if (!canUseSnapshot) {
                    if (!bitmap.isRecycled) bitmap.recycle()
                } else {
                    resumeSnapshotBitmap?.takeIf { !it.isRecycled }?.recycle()
                    resumeSnapshotBitmap = bitmap
                    resumeSnapshot.animate().cancel()
                    resumeSnapshot.setImageBitmap(bitmap)
                    resumeSnapshot.alpha = 1f
                    resumeSnapshot.scaleX = RESUME_SNAPSHOT_INITIAL_SCALE
                    resumeSnapshot.scaleY = RESUME_SNAPSHOT_INITIAL_SCALE
                    resumeSnapshot.visibility = View.VISIBLE
                    Log.d(RECENTS_SNAPSHOT_LOG_TAG, "snapshot visible: generation=$captureGeneration")
                }
            }, Handler(Looper.getMainLooper()))
        } catch (error: IllegalArgumentException) {
            if (!bitmap.isRecycled) bitmap.recycle()
            Log.w(RECENTS_SNAPSHOT_LOG_TAG, "PixelCopy request rejected: generation=$captureGeneration", error)
        }
    }

    private fun releaseResumeSnapshotAfterVisualState(onReleased: (() -> Unit)? = null) {
        if (!::resumeSnapshot.isInitialized || resumeSnapshot.visibility != View.VISIBLE) {
            Log.d(RECENTS_SNAPSHOT_LOG_TAG, "release skipped: snapshot not visible")
            onReleased?.invoke()
            return
        }
        val captureGeneration = resumeSnapshotCaptureGeneration
        if (resumeSnapshotReleaseGeneration == captureGeneration) {
            Log.d(
                RECENTS_SNAPSHOT_LOG_TAG,
                "release ignored: handoff already pending for generation=$captureGeneration"
            )
            return
        }
        resumeSnapshotReleaseGeneration = captureGeneration
        val requestId = ++visualStateRequestId
        Log.d(RECENTS_SNAPSHOT_LOG_TAG, "release requested: generation=$captureGeneration request=$requestId")
        webView.postVisualStateCallback(
            requestId,
            object : WebView.VisualStateCallback() {
                override fun onComplete(requestId: Long) {
                    Log.d(
                        RECENTS_SNAPSHOT_LOG_TAG,
                        "visual callback: generation=$captureGeneration current=$resumeSnapshotCaptureGeneration " +
                            "request=$requestId finishing=$isFinishing"
                    )
                    if (captureGeneration != resumeSnapshotCaptureGeneration || isFinishing) {
                        if (resumeSnapshotReleaseGeneration == captureGeneration) {
                            resumeSnapshotReleaseGeneration = -1L
                        }
                        return
                    }
                    beginResumeSnapshotHandoffAfterPresentation(captureGeneration, onReleased)
                }
            }
        )
    }

    /** Keeps the v424 opaque settle phase before revealing the live WebView surface. */
    private fun beginResumeSnapshotHandoffAfterPresentation(
        captureGeneration: Long,
        onReleased: (() -> Unit)?
    ) {
        if (captureGeneration != resumeSnapshotCaptureGeneration || isFinishing ||
            resumeSnapshot.visibility != View.VISIBLE
        ) {
            Log.d(
                RECENTS_SNAPSHOT_LOG_TAG,
                "handoff skipped: generation=$captureGeneration current=$resumeSnapshotCaptureGeneration " +
                    "focus=${window.decorView.hasFocus()} visible=${resumeSnapshot.visibility} finishing=$isFinishing"
            )
            return
        }
        Log.d(RECENTS_SNAPSHOT_LOG_TAG, "handoff scale start: generation=$captureGeneration")
        resumeSnapshot.animate().cancel()
        resumeSnapshot.animate()
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(RESUME_SNAPSHOT_SETTLE_DURATION_MS)
            .setInterpolator(DecelerateInterpolator(1.25f))
            .withEndAction {
                if (captureGeneration != resumeSnapshotCaptureGeneration || isFinishing ||
                    resumeSnapshot.visibility != View.VISIBLE
                ) {
                    return@withEndAction
                }
                resumeSnapshot.animate()
                    .alpha(0f)
                    .setDuration(RESUME_SNAPSHOT_FADE_DURATION_MS)
                    .setInterpolator(DecelerateInterpolator(1.25f))
                    .withEndAction {
                        if (captureGeneration != resumeSnapshotCaptureGeneration || isFinishing) return@withEndAction
                        resumeSnapshot.visibility = View.GONE
                        resumeSnapshot.alpha = 1f
                        resumeSnapshot.scaleX = 1f
                        resumeSnapshot.scaleY = 1f
                        resumeSnapshot.setImageDrawable(null)
                        resumeSnapshotBitmap?.takeIf { !it.isRecycled }?.recycle()
                        resumeSnapshotBitmap = null
                        if (resumeSnapshotReleaseGeneration == captureGeneration) {
                            resumeSnapshotReleaseGeneration = -1L
                        }
                        Log.d(RECENTS_SNAPSHOT_LOG_TAG, "handoff complete: generation=$captureGeneration")
                        onReleased?.invoke()
                    }
                    .also { Log.d(RECENTS_SNAPSHOT_LOG_TAG, "handoff fade start: generation=$captureGeneration") }
                    .start()
            }
            .start()
    }

    private fun discardResumeSnapshot() {
        resumeSnapshotCaptureGeneration += 1
        resumeSnapshotReleaseGeneration = -1L
        if (!::resumeSnapshot.isInitialized) return
        Log.d(RECENTS_SNAPSHOT_LOG_TAG, "snapshot discarded: generation=$resumeSnapshotCaptureGeneration")
        resumeSnapshot.animate().cancel()
        resumeSnapshot.visibility = View.GONE
        resumeSnapshot.alpha = 1f
        resumeSnapshot.setImageDrawable(null)
        resumeSnapshotBitmap?.takeIf { !it.isRecycled }?.recycle()
        resumeSnapshotBitmap = null
    }

    override fun onPause() {
        if (hasCompletedFirstPage) {
            appWasBackgrounded = true
            resumeEventAwaitingWindowFocus = false
            discardResumeSnapshot()
            Log.d(RECENTS_SNAPSHOT_LOG_TAG, "onPause: marked backgrounded")
        }
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        if (appWasBackgrounded && hasCompletedFirstPage) {
            appWasBackgrounded = false
            resumeEventAwaitingWindowFocus = true
            Log.d(RECENTS_SNAPSHOT_LOG_TAG, "onResume: awaiting focus for resume event; focus=${window.decorView.hasFocus()}")
            if (window.decorView.hasFocus()) {
                resumeEventAwaitingWindowFocus = false
                dispatchAndroidAppResumed()
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        Log.d(
            RECENTS_SNAPSHOT_LOG_TAG,
            "focus changed: hasFocus=$hasFocus completed=$hasCompletedFirstPage backgrounded=$appWasBackgrounded " +
                "awaiting=$resumeEventAwaitingWindowFocus snapshot=${if (::resumeSnapshot.isInitialized) resumeSnapshot.visibility else -1}"
        )
        if (!hasFocus && hasCompletedFirstPage) return
        if (hasFocus && hasCompletedFirstPage) {
            if (resumeEventAwaitingWindowFocus) {
                resumeEventAwaitingWindowFocus = false
                Log.d(RECENTS_SNAPSHOT_LOG_TAG, "focus resume: dispatching resume event without cover")
                dispatchAndroidAppResumed()
            } else if (::resumeSnapshot.isInitialized && resumeSnapshot.visibility == View.VISIBLE) {
                Log.d(RECENTS_SNAPSHOT_LOG_TAG, "focus resume: discarding stale snapshot")
                discardResumeSnapshot()
            } else if (transitionCover.visibility == View.VISIBLE) {
                releaseTransitionCoverAfterVisualState()
            }
        }
    }

    private fun dispatchAndroidAppResumed() {
        webView.evaluateJavascript(
            "window.dispatchEvent(new Event('android-app-resumed'));",
            null
        )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::webView.isInitialized) {
            val webViewState = Bundle()
            if (webView.saveState(webViewState) != null) {
                outState.putBundle(WEBVIEW_STATE_KEY, webViewState)
            }
        }
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        if (::transitionCoverSpinner.isInitialized) {
            transitionCoverSpinner.stop()
        }
        discardResumeSnapshot()
        transitionBackgroundBitmap?.takeIf { !it.isRecycled }?.recycle()
        transitionBackgroundBitmap = null
        super.onDestroy()
    }
    private fun handleNativeBack() {
        val script = """
            (() => {
                try {
                    if (window.AppNativeBack && typeof window.AppNativeBack.handleBack === 'function') {
                        return window.AppNativeBack.handleBack();
                    }
                } catch (_error) {}
                return false;
            })();
        """.trimIndent()
        webView.evaluateJavascript(script) { result ->
            when (result) {
                "true" -> Unit
                "\"exit\"" -> finish()
                "\"home\"" -> navigateHomeAndClearHistory()
                else -> fallbackBack()
            }
        }
    }

    private fun fallbackBack() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            finish()
        }
    }

    private fun navigateHomeAndClearHistory() {
        pageBootReady = false
        showTransitionCover()
        val history = webView.copyBackForwardList()
        val currentIndex = history.currentIndex
        for (index in currentIndex - 1 downTo 0) {
            if (history.getItemAtIndex(index).url == APP_HOME_URL) {
                clearHistoryAfterHomeLoad = true
                webView.goBackOrForward(index - currentIndex)
                return
            }
        }
        clearHistoryAfterHomeLoad = true
        webView.loadUrl(APP_HOME_URL)
    }

    private fun injectSafeAreaInsets() {
        if (!::webView.isInitialized) return
        val density = resources.displayMetrics.density
        val safeAreaTopCssPx = safeAreaTopInsetPx / density
        val safeAreaBottomCssPx = safeAreaBottomInsetPx / density
        val imeBottomCssPx = imeBottomInsetPx / density
        val fallbackEditorScrollReservePx = resources.displayMetrics.heightPixels * 2 / 5
        val editorScrollReservePx = if (maximumImeBottomInsetPx > fallbackEditorScrollReservePx) {
            maximumImeBottomInsetPx
        } else {
            fallbackEditorScrollReservePx
        }
        val editorScrollReserveCssPx = editorScrollReservePx / density
        val activeEditorScrollReserveCssPx =
            (editorScrollReservePx - imeBottomInsetPx).coerceAtLeast(0) / density
        val script = String.format(
            Locale.US,
            "var root = document.documentElement; if (root) { root.style.setProperty('--safe-area-top', '%.2fpx'); root.style.setProperty('--safe-area-bottom', '%.2fpx'); root.style.setProperty('--android-ime-height', '%.2fpx'); root.style.setProperty('--product-editor-scroll-reserve', '%.2fpx'); root.style.setProperty('--product-editor-active-scroll-reserve', '%.2fpx'); }",
            safeAreaTopCssPx,
            safeAreaBottomCssPx,
            imeBottomCssPx,
            editorScrollReserveCssPx,
            activeEditorScrollReserveCssPx
        )
        webView.evaluateJavascript(script, null)
    }

    fun consumeLegacyDatabaseFile(): String {
        val uri = preferences.getString("selected_db_uri", null)?.toUri() ?: return ""
        preferences.edit { remove("selected_db_uri") }
        return try {
            contentResolver.openInputStream(uri)
                ?.bufferedReader(Charsets.UTF_8)
                ?.use { it.readText() }
                .orEmpty()
        } catch (_: Exception) {
            ""
        }
    }
    fun launchCreateDocument(
        action: DocumentAction,
        filename: String,
        mimeType: String,
        content: String
    ) {
        pendingDocumentAction = action
        pendingDocumentContent = content
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = mimeType
            putExtra(Intent.EXTRA_TITLE, filename)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
        try {
            createDocumentLauncher.launch(intent)
        } catch (error: ActivityNotFoundException) {
            pendingDocumentAction = null
            pendingDocumentContent = ""
            dispatchDocumentResult(action, false, error.message ?: "無法開啟檔案選擇器")
        } catch (error: IllegalStateException) {
            pendingDocumentAction = null
            pendingDocumentContent = ""
            dispatchDocumentResult(action, false, error.message ?: "檔案選擇器尚未就緒")
        }
    }

    private fun writeTextToUri(uri: Uri, content: String) {
        contentResolver.openOutputStream(uri, "wt")
            ?.bufferedWriter(Charsets.UTF_8)
            ?.use { it.write(content) }
            ?: throw IllegalStateException("無法開啟檔案")
    }

    private fun dispatchDocumentResult(action: DocumentAction, ok: Boolean, error: String) {
        val eventName = when (action) {
DocumentAction.EXPORT_CSV -> "android-csv-exported"
            DocumentAction.EXPORT_JSON -> "android-json-exported"
        }
        val script = """
            window.dispatchEvent(
                new CustomEvent(${JSONObject.quote(eventName)}, {
                    detail: {
                        ok: $ok,
                        error: ${JSONObject.quote(error)}
                    }
                })
            );
        """.trimIndent()
        runOnUiThread { webView.evaluateJavascript(script, null) }
    }

    fun openAppInfoSettings() {
        runOnUiThread {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
            try {
                startActivity(intent)
            } catch (_: ActivityNotFoundException) {
            }
        }
    }

    fun launchBarcodeScanner(target: String, language: String, theme: String) {
        runOnUiThread {
            val intent = Intent(this, BarcodeScannerActivity::class.java).apply {
                putExtra(EXTRA_TARGET, target)
                putExtra(EXTRA_LANGUAGE, language)
                putExtra(EXTRA_THEME, theme)
            }
            try {
                barcodeScannerLauncher.launch(intent)
            } catch (error: ActivityNotFoundException) {
                dispatchBarcodeResult(
                    ok = false,
                    cancelled = false,
                    value = "",
                    format = "",
                    target = target,
                    error = error.message ?: "原生條碼掃描無法啟動"
                )
            } catch (error: IllegalStateException) {
                dispatchBarcodeResult(
                    ok = false,
                    cancelled = false,
                    value = "",
                    format = "",
                    target = target,
                    error = error.message ?: "原生條碼掃描尚未就緒"
                )
            }
        }
    }

    private fun dispatchBarcodeResult(
        ok: Boolean,
        cancelled: Boolean,
        value: String,
        format: String,
        target: String,
        error: String
    ) {
        val script = """
            window.dispatchEvent(
                new CustomEvent("android-barcode-scanned", {
                    detail: {
                        ok: $ok,
                        cancelled: $cancelled,
                        value: ${JSONObject.quote(value)},
                        format: ${JSONObject.quote(format)},
                        target: ${JSONObject.quote(target)},
                        error: ${JSONObject.quote(error)}
                    }
                })
            );
        """.trimIndent()
        runOnUiThread { webView.evaluateJavascript(script, null) }
    }
}
private class ThemeLoadingIndicator(context: Context) : View(context) {
    private val mutedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.BUTT
    }
    private val activePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.BUTT
    }
    private val ringBounds = RectF()
    private var mutedColor = Color.argb(51, 120, 220, 255)
    private var firstColor = Color.rgb(56, 213, 255)
    private var secondColor = Color.rgb(217, 77, 255)
    private var rotationDegrees = 0f
    private val rotationAnimator = ValueAnimator.ofFloat(0f, 360f).apply {
        duration = 780L
        repeatCount = ValueAnimator.INFINITE
        interpolator = LinearInterpolator()
        addUpdateListener {
            rotationDegrees = it.animatedValue as Float
            invalidate()
        }
    }

    fun setThemeColors(muted: Int, first: Int, second: Int) {
        mutedColor = muted
        firstColor = first
        secondColor = second
        invalidate()
    }

    fun start() {
        if (!rotationAnimator.isStarted) rotationAnimator.start()
    }

    fun stop() {
        if (rotationAnimator.isStarted) rotationAnimator.cancel()
    }

    override fun onDetachedFromWindow() {
        stop()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val density = resources.displayMetrics.density
        val strokeWidth = 3f * density
        val inset = strokeWidth / 2f
        ringBounds.set(inset, inset, width.toFloat() - inset, height.toFloat() - inset)
        val centerX = width / 2f
        val centerY = height / 2f
        mutedPaint.color = mutedColor
        mutedPaint.strokeWidth = strokeWidth
        activePaint.strokeWidth = strokeWidth
        activePaint.shader = SweepGradient(
            centerX,
            centerY,
            intArrayOf(secondColor, firstColor, secondColor),
            floatArrayOf(0f, 0.75f, 1f)
        )

        canvas.save()
        canvas.rotate(rotationDegrees, centerX, centerY)
        canvas.drawOval(ringBounds, mutedPaint)
        canvas.drawArc(ringBounds, -90f, 180f, false, activePaint)
        canvas.restore()
        activePaint.shader = null
    }
}

private class BootGlowView(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var glowColor = Color.argb(36, 0, 210, 255)

    fun setGlowColor(color: Int) {
        glowColor = color
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (width == 0 || height == 0) return
        val radius = maxOf(width, height) * 0.34f
        paint.shader = RadialGradient(
            width / 2f,
            height / 2f,
            radius,
            intArrayOf(glowColor, Color.TRANSPARENT),
            floatArrayOf(0f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.shader = null
    }
}


