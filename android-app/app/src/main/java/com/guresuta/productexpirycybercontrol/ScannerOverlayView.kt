package com.guresuta.productexpirycybercontrol

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

class ScannerOverlayView(context: Context) : View(context) {
    private val shadePaint = Paint().apply {
        color = Color.argb(145, 0, 0, 0)
        style = Paint.Style.FILL
    }
    private val framePaint = Paint().apply {
        color = Color.rgb(0, 229, 255)
        style = Paint.Style.STROKE
        strokeWidth = dp(3f)
        isAntiAlias = true
    }
    private val frame = RectF()

    fun setAccentColor(color: Int) {
        framePaint.color = color
        invalidate()
    }

    fun setShadeColor(color: Int) {
        shadePaint.color = color
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val frameWidth = width * 0.82f
        val frameHeight = frameWidth * 0.48f
        val left = (width - frameWidth) / 2f
        val top = (height - frameHeight) / 2f
        val right = left + frameWidth
        val bottom = top + frameHeight
        frame.set(left, top, right, bottom)

        canvas.drawRect(0f, 0f, width.toFloat(), top, shadePaint)
        canvas.drawRect(0f, bottom, width.toFloat(), height.toFloat(), shadePaint)
        canvas.drawRect(0f, top, left, bottom, shadePaint)
        canvas.drawRect(right, top, width.toFloat(), bottom, shadePaint)
        canvas.drawRect(frame, framePaint)
    }

    private fun dp(value: Float): Float = value * resources.displayMetrics.density
}
