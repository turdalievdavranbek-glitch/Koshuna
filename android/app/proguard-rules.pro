# Коңшу release: R8 shrink + optimize + obfuscate (proguard-android-optimize.txt).
# Stack traces stay readable through the mapping uploaded to Crashlytics.

-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-renamesourcefileattribute SourceFile
-keep public class * extends java.lang.Exception

# --- Capacitor core: the bridge finds plugins, @PluginMethod methods and annotations by reflection.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.NativePlugin class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }

# --- WebView JavaScript interfaces (CapacitorHttp / CapacitorCookies / bridge).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * extends android.webkit.WebViewClient { public *; }
-keepclassmembers class * extends android.webkit.WebChromeClient { public *; }

# --- Capacitor plugins we ship. Each package is named so R8 cannot drop one of them.
# App: hardware back and app links. Share + Filesystem: the share sheet. Push: FCM.
# Splash: launch screen. Crashlytics / Google / Apple sign-in: Capawesome plugins.
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.capacitorjs.plugins.app.** { *; }
-keep class com.capacitorjs.plugins.share.** { *; }
-keep class com.capacitorjs.plugins.filesystem.** { *; }
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
-keep class com.capacitorjs.plugins.splashscreen.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keep class io.capawesome.capacitorjs.plugins.firebase.crashlytics.** { *; }
-keep class io.capawesome.capacitorjs.plugins.googlesignin.** { *; }
-keep class io.capawesome.capacitorjs.plugins.applesignin.** { *; }

# --- AndroidX WebKit. Capacitor uses WebViewCompat / document-start script injection.
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**

# --- Our activity and the mic bridge (KoshunaNative.requestMic / openSettings), plus KoshunaApp.
-keep class com.koshuna.app.** { *; }
-keep class com.koshuna.app.MainActivity { *; }
-keep class com.koshuna.app.MainActivity$* { *; }
-keepclassmembers class com.koshuna.app.MainActivity$MicBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Firebase / FCM / Crashlytics (libraries ship consumer rules; these are belt-and-braces).
-keep class com.google.firebase.crashlytics.** { *; }
-dontwarn com.google.firebase.crashlytics.**
-keep class * extends com.google.firebase.messaging.FirebaseMessagingService { *; }
-keep class com.google.firebase.components.ComponentRegistrar { *; }
-keep class * implements com.google.firebase.components.ComponentRegistrar { <init>(); }

# --- Google sign-in through Credential Manager (per androidx.credentials docs).
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn com.google.android.libraries.identity.googleid.**
