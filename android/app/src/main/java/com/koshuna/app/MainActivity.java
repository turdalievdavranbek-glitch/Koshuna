package com.koshuna.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSIONS_REQUEST = 4281;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestMediaPermissions();
        configureWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebView();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        // Capacitor already installs BridgeWebChromeClient (file pickers + getUserMedia).
        // Re-bind a grant-all chrome client only if the WebView lost it after a process restore.
        if (!(webView.getWebChromeClient() instanceof BridgeWebChromeClient) && getBridge() != null) {
            webView.setWebChromeClient(
                new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(PermissionRequest request) {
                        request.grant(request.getResources());
                    }
                }
            );
        }
    }

    private void requestMediaPermissions() {
        ActivityCompat.requestPermissions(
            this,
            new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            },
            MEDIA_PERMISSIONS_REQUEST
        );
    }
}
