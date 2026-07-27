package com.guresuta.productexpirycybercontrol

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatImageButton
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.TorchState
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.ViewCompat
import androidx.core.view.updateLayoutParams
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class BarcodeScannerActivity : AppCompatActivity() {
    private lateinit var previewView: PreviewView
    private lateinit var torchButton: ImageButton
    private lateinit var scanner: BarcodeScanner
    private lateinit var cameraExecutor: ExecutorService
    private var camera: Camera? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var imageAnalysis: ImageAnalysis? = null
    private var isCameraSessionActive = false
    private val cameraBinding = AtomicBoolean(false)
    private val processing = AtomicBoolean(false)
    private val completed = AtomicBoolean(false)
    private val scannerCloseRequested = AtomicBoolean(false)
    private val scannerClosed = AtomicBoolean(false)
    private val target by lazy { intent.getStringExtra(EXTRA_TARGET).orEmpty() }
    private val language by lazy { intent.getStringExtra(EXTRA_LANGUAGE).orEmpty() }
    private val theme by lazy { intent.getStringExtra(EXTRA_THEME).orEmpty() }
    private val strings by lazy { ScannerStrings.forLanguage(language) }
    private val palette by lazy { ScannerPalette.forTheme(theme) }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (isActivityClosing()) {
                return@registerForActivityResult
            }
            if (granted) {
                startCamera()
            } else {
                finishWithError(strings.permissionDenied)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemBars()
        cameraExecutor = Executors.newSingleThreadExecutor()
        scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(
                    Barcode.FORMAT_EAN_13,
                    Barcode.FORMAT_EAN_8,
                    Barcode.FORMAT_UPC_A,
                    Barcode.FORMAT_UPC_E,
                    Barcode.FORMAT_CODE_128,
                    Barcode.FORMAT_CODE_39,
                    Barcode.FORMAT_ITF,
                    Barcode.FORMAT_QR_CODE
                )
                .build()
        )
        setContentView(createScannerView())

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() = finishCancelled()
            }
        )

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun createScannerView(): FrameLayout {
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        previewView = PreviewView(this).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
        root.addView(
            previewView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        val overlay = ScannerOverlayView(this).apply {
            setAccentColor(palette.accent)
            setShadeColor(palette.shade)
        }
        root.addView(
            overlay,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        torchButton = createTorchButton().apply {
            isEnabled = false
            alpha = 0.55f
            setOnClickListener { toggleTorch() }
        }
        root.addView(
            torchButton,
            FrameLayout.LayoutParams(dp(48), dp(48), Gravity.BOTTOM or Gravity.END).apply {
                setMargins(0, 0, dp(20), dp(112))
            }
        )

        val hint = TextView(this).apply {
            text = strings.hint
            setTextColor(Color.WHITE)
            textSize = strings.hintTextSizeSp
            gravity = Gravity.CENTER
            setPadding(dp(20), dp(12), dp(20), dp(12))
            background = solidBackground(Color.argb(153, 128, 128, 128))
        }
        val hintParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        ).apply {
            setMargins(dp(20), 0, dp(20), dp(36))
        }
        root.addView(hint, hintParams)

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val safeInsets = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                        WindowInsetsCompat.Type.displayCutout()
            )
            torchButton.updateLayoutParams<FrameLayout.LayoutParams> {
                setMargins(0, 0, dp(20) + safeInsets.right, dp(112) + safeInsets.bottom)
            }
            hint.updateLayoutParams<FrameLayout.LayoutParams> {
                setMargins(
                    dp(20) + safeInsets.left,
                    0,
                    dp(20) + safeInsets.right,
                    dp(36) + safeInsets.bottom
                )
            }
            insets
        }
        ViewCompat.requestApplyInsets(root)
        return root
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.statusBars())
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemBars()
        }
    }

    override fun onResume() {
        super.onResume()
        isCameraSessionActive = true
        hideSystemBars()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        }
    }

    override fun onPause() {
        isCameraSessionActive = false
        stopCamera()
        super.onPause()
    }

    private fun isActivityClosing(): Boolean = isFinishing || isDestroyed || completed.get()

    private fun startCamera() {
        if (isActivityClosing() || !isCameraSessionActive || !cameraBinding.compareAndSet(false, true)) {
            return
        }
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            if (isActivityClosing() || !isCameraSessionActive) {
                cameraBinding.set(false)
                return@addListener
            }
            try {
                val provider = providerFuture.get()
                cameraProvider = provider
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .also { it.setAnalyzer(cameraExecutor, ::analyzeImage) }

                provider.unbindAll()
                imageAnalysis = analysis
                camera = provider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
                val hasFlash = camera?.cameraInfo?.hasFlashUnit() == true
                torchButton.isEnabled = hasFlash
                torchButton.alpha = if (hasFlash) 1f else 0.55f
            } catch (error: Exception) {
                cameraBinding.set(false)
                finishWithError(error.message ?: strings.cameraUnavailable)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun stopCamera() {
        imageAnalysis?.clearAnalyzer()
        imageAnalysis = null
        camera = null
        cameraProvider?.unbindAll()
        cameraBinding.set(false)
        if (::torchButton.isInitialized) {
            torchButton.isEnabled = false
            torchButton.alpha = 0.55f
            updateTorchIcon(false)
        }
    }

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    private fun analyzeImage(imageProxy: androidx.camera.core.ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || isActivityClosing() || !isCameraSessionActive ||
            !processing.compareAndSet(false, true)
        ) {
            imageProxy.close()
            return
        }
        try {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    val barcode = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }
                    if (!isActivityClosing() && barcode != null && completed.compareAndSet(false, true)) {
                        finishWithResult(barcode.rawValue.orEmpty(), barcodeFormatName(barcode.format))
                    }
                }
                .addOnCompleteListener {
                    processing.set(false)
                    imageProxy.close()
                    closeScannerIfRequested()
                }
        } catch (error: Exception) {
            processing.set(false)
            imageProxy.close()
            if (!isActivityClosing()) {
                finishWithError(error.message ?: strings.cameraUnavailable)
            }
            closeScannerIfRequested()
        }
    }

    private fun toggleTorch() {
        if (isActivityClosing()) return
        val activeCamera = camera ?: return
        val enabled = activeCamera.cameraInfo.torchState.value == TorchState.ON
        activeCamera.cameraControl.enableTorch(!enabled)
        updateTorchIcon(!enabled)
    }

    private fun finishWithResult(value: String, format: String) {
        runOnUiThread {
            stopCamera()
            setResult(
                RESULT_OK,
                Intent().apply {
                    putExtra(EXTRA_TARGET, target)
                    putExtra(EXTRA_VALUE, value)
                    putExtra(EXTRA_FORMAT, format)
                }
            )
            finish()
        }
    }

    private fun finishCancelled() {
        if (!completed.compareAndSet(false, true)) return
        stopCamera()
        setResult(RESULT_CANCELED, Intent().putExtra(EXTRA_TARGET, target))
        finish()
    }

    private fun finishWithError(error: String) {
        if (!completed.compareAndSet(false, true)) return
        runOnUiThread {
            stopCamera()
            setResult(
                RESULT_SCAN_ERROR,
                Intent().apply {
                    putExtra(EXTRA_TARGET, target)
                    putExtra(EXTRA_ERROR, error)
                }
            )
            finish()
        }
    }

    private fun requestScannerClose() {
        scannerCloseRequested.set(true)
        closeScannerIfRequested()
    }

    private fun closeScannerIfRequested() {
        if (scannerCloseRequested.get() && !processing.get() &&
            scannerClosed.compareAndSet(false, true) && ::scanner.isInitialized
        ) {
            scanner.close()
        }
    }

    override fun onDestroy() {
        isCameraSessionActive = false
        stopCamera()
        if (::cameraExecutor.isInitialized) {
            cameraExecutor.shutdown()
        }
        requestScannerClose()
        super.onDestroy()
    }

    private fun createTorchButton(): ImageButton =
        AppCompatImageButton(this).apply {
            setImageResource(R.drawable.ic_flashlight_off)
            scaleType = ImageView.ScaleType.CENTER
            background = ovalBackground(Color.argb(153, 128, 128, 128))
            contentDescription = strings.torchOn
            setPadding(dp(12), dp(12), dp(12), dp(12))
        }

    private fun updateTorchIcon(on: Boolean) {
        torchButton.setImageResource(
            if (on) R.drawable.ic_flashlight_on else R.drawable.ic_flashlight_off
        )
        torchButton.contentDescription = if (on) strings.torchOff else strings.torchOn
    }

    private fun solidBackground(fill: Int) =
        GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 0f
            setColor(fill)
        }

    private fun ovalBackground(fill: Int) =
        GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(fill)
        }

    private fun barcodeFormatName(format: Int): String = when (format) {
        Barcode.FORMAT_EAN_13 -> "ean_13"
        Barcode.FORMAT_EAN_8 -> "ean_8"
        Barcode.FORMAT_UPC_A -> "upc_a"
        Barcode.FORMAT_UPC_E -> "upc_e"
        Barcode.FORMAT_CODE_128 -> "code_128"
        Barcode.FORMAT_CODE_39 -> "code_39"
        Barcode.FORMAT_ITF -> "itf"
        Barcode.FORMAT_QR_CODE -> "qr_code"
        else -> "unknown"
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val RESULT_SCAN_ERROR = RESULT_FIRST_USER + 1
        const val EXTRA_TARGET = "barcode_target"
        const val EXTRA_LANGUAGE = "barcode_language"
        const val EXTRA_THEME = "barcode_theme"
        const val EXTRA_VALUE = "barcode_value"
        const val EXTRA_FORMAT = "barcode_format"
        const val EXTRA_ERROR = "barcode_error"
    }
}

private data class ScannerStrings(
    val close: String,
    val hint: String,
    val hintTextSizeSp: Float,
    val torchOn: String,
    val torchOff: String,
    val permissionDenied: String,
    val cameraUnavailable: String
) {
    companion object {
        fun forLanguage(language: String): ScannerStrings = when {
            language.startsWith("ja") -> ScannerStrings(
                "閉じる", "バーコードを枠内に合わせてください", 14f,
                "ライト", "ライトを消す", "バーコードスキャンにはカメラ権限が必要です",
                "利用できるカメラが見つかりません"
            )
            language.startsWith("en") -> ScannerStrings(
                "Close", "Place the barcode inside the frame", 16f,
                "Torch", "Torch Off", "Camera permission is required to scan barcodes",
                "No available camera was found"
            )
            else -> ScannerStrings(
                "關閉", "請將條碼置於框內", 17f,
                "手電筒", "關閉手電筒", "需要相機權限才能掃描條碼",
                "找不到可用的相機"
            )
        }
    }
}

private data class ScannerPalette(
    val background: Int,
    val topBar: Int,
    val topBarEnd: Int,
    val panel: Int,
    val accent: Int,
    val accentAlt: Int,
    val shade: Int,
    val text: Int
) {
    companion object {
        fun forTheme(theme: String): ScannerPalette = when (theme) {
            "light-1" -> ScannerPalette(
                Color.rgb(250, 250, 250), Color.rgb(255, 241, 204),
                Color.rgb(238, 255, 232), Color.rgb(255, 255, 255), Color.rgb(255, 176, 0),
                Color.rgb(0, 212, 41), Color.argb(156, 0, 0, 0), Color.rgb(5, 5, 5)
            )
            "light-2" -> ScannerPalette(
                Color.rgb(244, 247, 245), Color.rgb(232, 240, 235),
                Color.rgb(217, 240, 226), Color.rgb(255, 255, 255), Color.rgb(22, 138, 74),
                Color.rgb(201, 47, 47), Color.argb(156, 0, 0, 0), Color.rgb(31, 51, 40)
            )
            "dark-2" -> ScannerPalette(
                Color.rgb(16, 24, 20), Color.rgb(23, 35, 29),
                Color.rgb(42, 112, 72), Color.rgb(20, 31, 25), Color.rgb(47, 194, 116),
                Color.rgb(224, 90, 90), Color.argb(156, 0, 0, 0), Color.rgb(232, 244, 237)
            )
            else -> ScannerPalette(
                Color.rgb(5, 5, 5), Color.rgb(17, 20, 26),
                Color.rgb(33, 0, 38), Color.rgb(17, 20, 26), Color.rgb(0, 240, 255),
                Color.rgb(255, 43, 214), Color.argb(156, 0, 0, 0), Color.WHITE
            )
        }
    }
}
