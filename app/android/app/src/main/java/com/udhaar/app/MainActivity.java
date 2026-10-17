package com.udhaar.app;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.evaluateJavascript(
                "(window.__backPressed ? window.__backPressed() : '0')",
                value -> {
                    // value comes back quoted, e.g. "1" or "0"
                    if (value == null || !value.contains("1")) {
                        // let the system handle it (exit / background the app)
                        runOnUiThread(() -> MainActivity.super.onBackPressed());
                    }
                }
            );
        } else {
            super.onBackPressed();
        }
    }
}
