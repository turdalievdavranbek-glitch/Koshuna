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

# --- Capacitor plugins we ship (@capacitor/app, push-notifications, capawesome sign-in, firebase crashlytics).
-keep class com.capacitorjs.plugins.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }

# --- Our app classes (manifest entries, reflection-free but cheap to keep readable).
-keep class com.koshuna.app.** { *; }

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
