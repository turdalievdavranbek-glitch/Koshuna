package com.koshuna.app;

import android.annotation.SuppressLint;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean webViewConfigured = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // No permission prompts at launch: camera / microphone are asked by Capacitor's BridgeWebChromeClient
        // only when the page actually opens the camera or recorder (getUserMedia or a capture file input).
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
        webViewConfigured = true;
    }

    /** Release builds keep WebView debugging off. Debug builds can still be inspected. */
    private void configureWebViewDebugging() {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
    }
}
