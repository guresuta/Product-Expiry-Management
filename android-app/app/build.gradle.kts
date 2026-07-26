plugins {
    alias(libs.plugins.android.application)
}

val webVersionSource = rootProject.file("../version.js")
val webVersionMatch = Regex("""version\s*:\s*[\"']v?(\d+)\.(\d+)\.(\d+)[\"']""")
    .find(webVersionSource.readText())
    ?: error("Unable to read an x.y.z version from ${webVersionSource.path}")
val webVersionName = webVersionMatch.groupValues.drop(1).joinToString(".")
val webVersionParts = webVersionMatch.groupValues.drop(1).map(String::toInt)
require(webVersionParts[1] <= 99 && webVersionParts[2] <= 99) {
    "version.js minor and patch versions must be at most 99 for Android versionCode mapping"
}
val webVersionCode = (webVersionParts[0] * 10000) + (webVersionParts[1] * 100) + webVersionParts[2]

android {


    namespace = "com.guresuta.productexpirycybercontrol"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }
	
	buildFeatures {
    buildConfig = true
}

    defaultConfig {
        applicationId = "com.guresuta.productexpirycybercontrol"
        minSdk = 26
        targetSdk = 36
        versionCode = webVersionCode
        versionName = webVersionName

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            ndk {
                debugSymbolLevel = "SYMBOL_TABLE"
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }

        create("minifiedDebug") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".r8test"
            versionNameSuffix = "-r8test"
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    lint {
        disable += setOf("OldTargetApi", "GradleDependency")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.material)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}
