package com.koshuna.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.Manifest;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private static final String PREFS = "koshuna";
    private boolean webViewConfigured = false;
    /** Registered in onCreate. Registering later (onResume) crashes the activity. */
    private ActivityResultLauncher<String[]> runtimePermissions;
    private PermissionRequest pendingWebRequest;
    private boolean pendingJsMic;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        runtimePermissions = registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(),
            this::onRuntimePermissions
        );
        // No permission prompts at launch. Camera and microphone are asked when the page uses them.
        configureWebView();
        configureWebViewDebugging();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        if (webViewConfigured) return;
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        // Capacitor's client still owns the file picker and alerts. Audio/camera prompts are handled
        // here so RECORD_AUDIO is requested with the launcher created in onCreate.
        webView.setWebChromeClient(new KoshunaChrome(webView.getWebChromeClient()));
        webView.addJavascriptInterface(new MicBridge(), "KoshunaNative");
        webViewConfigured = true;
    }

    /** Release builds keep WebView debugging off. Debug builds can still be inspected. */
    private void configureWebViewDebugging() {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
    }

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean permanentlyDenied(String permission) {
        if (granted(permission)) return false;
        boolean asked = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("asked_" + permission, false);
        return asked && !ActivityCompat.shouldShowRequestPermissionRationale(this, permission);
    }

    private void markAsked(List<String> permissions) {
        android.content.SharedPreferences.Editor edit = getSharedPreferences(PREFS, MODE_PRIVATE).edit();
        for (String permission : permissions) edit.putBoolean("asked_" + permission, true);
        edit.apply();
    }

    private void handleWebPermission(PermissionRequest request) {
        List<String> resources = Arrays.asList(request.getResources());
        List<String> needed = new ArrayList<>();
        if (resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) && !granted(Manifest.permission.RECORD_AUDIO)) {
            needed.add(Manifest.permission.RECORD_AUDIO);
        }
        if (resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) && !granted(Manifest.permission.CAMERA)) {
            needed.add(Manifest.permission.CAMERA);
        }
        if (needed.isEmpty()) {
            request.grant(request.getResources());
            return;
        }
        boolean blocked = false;
        for (String permission : needed) {
            if (permanentlyDenied(permission)) blocked = true;
        }
        if (blocked || runtimePermissions == null) {
            request.deny();
            return;
        }
        pendingWebRequest = request;
        markAsked(needed);
        runtimePermissions.launch(needed.toArray(new String[0]));
    }

    private void onRuntimePermissions(Map<String, Boolean> result) {
        boolean mic = granted(Manifest.permission.RECORD_AUDIO);
        PermissionRequest web = pendingWebRequest;
        pendingWebRequest = null;
        if (web != null) {
            List<String> resources = Arrays.asList(web.getResources());
            boolean audioOk = !resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) || mic;
            boolean videoOk = !resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) || granted(Manifest.permission.CAMERA);
            if (audioOk && videoOk) web.grant(web.getResources());
            else web.deny();
        }
        if (pendingJsMic) {
            pendingJsMic = false;
            if (mic) resolveMic("granted");
            else if (permanentlyDenied(Manifest.permission.RECORD_AUDIO)) resolveMic("settings");
            else resolveMic("denied");
        }
    }

    private void resolveMic(String status) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        webView.post(() -> webView.evaluateJavascript(
            "window.__koshunaMic&&window.__koshunaMic('" + status + "')",
            null
        ));
    }

    private void requestMicFromJs() {
        if (granted(Manifest.permission.RECORD_AUDIO)) {
            resolveMic("granted");
            return;
        }
        if (permanentlyDenied(Manifest.permission.RECORD_AUDIO) || runtimePermissions == null) {
            resolveMic("settings");
            return;
        }
        pendingJsMic = true;
        markAsked(Arrays.asList(Manifest.permission.RECORD_AUDIO));
        runtimePermissions.launch(new String[] { Manifest.permission.RECORD_AUDIO });
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getPackageName(), null));
        startActivity(intent);
    }

    private final class MicBridge {
        @JavascriptInterface
        public void requestMic() {
            runOnUiThread(MainActivity.this::requestMicFromJs);
        }

        @JavascriptInterface
        public void openSettings() {
            runOnUiThread(MainActivity.this::openAppSettings);
        }
    }

    /** Delegates file picking and dialogs to Capacitor, and asks for the microphone itself. */
    private final class KoshunaChrome extends WebChromeClient {
        private final WebChromeClient delegate;

        private KoshunaChrome(WebChromeClient delegate) {
            this.delegate = delegate;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> handleWebPermission(request));
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest request) {
            if (pendingWebRequest == request) pendingWebRequest = null;
            if (delegate != null) delegate.onPermissionRequestCanceled(request);
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            return delegate != null && delegate.onShowFileChooser(webView, filePathCallback, fileChooserParams);
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (delegate != null) delegate.onGeolocationPermissionsShowPrompt(origin, callback);
            else super.onGeolocationPermissionsShowPrompt(origin, callback);
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
            return delegate != null && delegate.onJsAlert(view, url, message, result);
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            return delegate != null && delegate.onJsConfirm(view, url, message, result);
        }

        @Override
        public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
            return delegate != null && delegate.onJsPrompt(view, url, message, defaultValue, result);
        }
    }
}
