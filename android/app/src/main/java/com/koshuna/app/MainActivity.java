package com.koshuna.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSIONS_REQUEST = 4281;
    private boolean webViewConfigured = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestRuntimePermissions();
        configureWebView();
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

    private void requestRuntimePermissions() {
        ActivityCompat.requestPermissions(
            this,
            new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.MODIFY_AUDIO_SETTINGS,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            },
            MEDIA_PERMISSIONS_REQUEST
        );
    }

    /**
     * Extends Capacitor's chrome client so file-chooser / activity-result
     * launchers register during onCreate, then auto-grants WebView camera,
     * mic, and geolocation after those Android permissions are requested.
     */
    private static final class KoshunaWebChromeClient extends BridgeWebChromeClient {
        KoshunaWebChromeClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            request.grant(request.getResources());
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(
            String origin,
            GeolocationPermissions.Callback callback
        ) {
            callback.invoke(origin, true, false);
        }
    }
}
