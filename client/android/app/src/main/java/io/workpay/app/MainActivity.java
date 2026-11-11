package io.workpay.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebSettings settings = getBridge().getWebView().getSettings();
                settings.setTextZoom(100);
                getBridge().getWebView().setVerticalScrollBarEnabled(true);
                getBridge().getWebView().setHorizontalScrollBarEnabled(false);
            }
        } catch (Exception ignored) {}
    }
}
