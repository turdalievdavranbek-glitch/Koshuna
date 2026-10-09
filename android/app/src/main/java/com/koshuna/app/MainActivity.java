package com.koshuna.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSIONS_REQUEST = 4281;
    private boolean webViewConfigured = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestRuntimePermissions();
        configureWebView();
        configureWebViewDebugging();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        if (webViewConfigured) {
            return;
        }
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        // Constructed only from onCreate (CREATED), never from onResume (STARTED).
        webView.setWebChromeClient(new KoshunaWebChromeClient(getBridge()));
        webViewConfigured = true;
    }

    /** Release builds keep WebView debugging off. Debug builds can still be inspected. */
    private void configureWebViewDebugging() {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
    }

    private void requestRuntimePermissions() {
        ArrayList<String> permissions = new ArrayList<>();
        permissions.add(Manifest.permission.CAMERA);
        permissions.add(Manifest.permission.RECORD_AUDIO);
        permissions.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
        // POST_NOTIFICATIONS is asked from the site after login or when Messages opens.
        ActivityCompat.requestPermissions(
            this,
            permissions.toArray(new String[0]),
            MEDIA_PERMISSIONS_REQUEST
        );
    }

    /**
     * Extends Capacitor's chrome client so file-chooser / activity-result
     * launchers register during onCreate, then auto-grants WebView camera,
     * mic after those Android permissions are requested. Location is asked
     * later, by Capacitor, on the first geolocation prompt.
     */
    private static final class KoshunaWebChromeClient extends BridgeWebChromeClient {
        KoshunaWebChromeClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            request.grant(request.getResources());
        }
    }
}
