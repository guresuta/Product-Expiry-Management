# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
# The WebView discovers these APIs through reflection after addJavascriptInterface().
# Preserve their names, implementations, and runtime annotation metadata for R8 builds.
-keepattributes RuntimeVisibleAnnotations
-keepclassmembers class com.guresuta.productexpirycybercontrol.AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
# ML Kit discovers these registrars from manifest metadata at runtime.
# R8 must retain their class names and no-argument constructors for barcode scanning.
-keep class com.google.mlkit.common.internal.CommonComponentRegistrar { <init>(); }
-keep class com.google.mlkit.vision.barcode.internal.BarcodeRegistrar { <init>(); }
-keep class com.google.mlkit.vision.common.internal.VisionCommonRegistrar { <init>(); }