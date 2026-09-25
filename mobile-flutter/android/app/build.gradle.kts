import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// MUHIM: avval release build DEBUG kalit bilan imzolanardi - Docker orqali
// har qurishda konteyner ICHIDA yangi ephemeral debug.keystore yaratilgani
// uchun har APK BOSHQA kalit bilan imzolanib chiqardi. Android imzo mos
// kelmagan APK'ni ustidan o'rnatishni RAD ETADI ("package conflicts"), shu
// sabab foydalanuvchi har yangilanishda avval eski ilovani o'chirishga
// majbur bo'lardi. Endi loyiha papkasida (host'da, konteynerdan tashqarida)
// SAQLANADIGAN doimiy kalit ishlatiladi - u har build'da bir xil qoladi.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.service.core.mobile_flutter"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications talab qiladi (push bildirishnoma uchun).
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.service.core.mobile_flutter"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // key.properties topilmasa (masalan boshqa mashinada, kalitsiz) debug
            // kalitga qaytadi - build sinmaydi, faqat imzolash izchil bo'lmaydi.
            signingConfig = if (keystorePropertiesFile.exists()) signingConfigs.getByName("release")
                             else signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

// Push bildirishnoma (Firebase) faqat google-services.json fayli mavjud bo'lsa yoqiladi -
// fayl bo'lmasa ilova Firebase'siz ham to'liq build bo'lishda davom etadi.
// O'rnatish: Firebase Console'da loyiha yarating, Android ilovasini qo'shing
// (applicationId: com.service.core.mobile_flutter) va google-services.json'ni
// shu papkaga (android/app/) joylashtiring.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}
