package online.endemion.life;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final int SHELL_BACKGROUND = Color.rgb(6, 6, 8);
    private static final long FIRST_PAGE_TIMEOUT_MS = 15_000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean firstPageLoaded = false;
    private boolean firstPageListenerAttached = false;
    private FrameLayout startupOverlay;
    private TextView startupMessage;
    private final Runnable firstPageTimeout = new Runnable() {
        @Override
        public void run() {
            if (!firstPageLoaded && bridge != null && bridge.getWebView() != null) {
                showNativeFailure();
                String errorUrl = bridge.getErrorUrl();
                if (errorUrl != null) {
                    bridge.getWebView().loadUrl(errorUrl);
                }
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(SHELL_BACKGROUND);
        window.setNavigationBarColor(SHELL_BACKGROUND);
        window.getDecorView().setSystemUiVisibility(0);

        createStartupOverlay();
        attachFirstPageListener();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = bridge == null ? null : bridge.getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                // Delegate the root back action to the Activity. Temporarily disabling
                // this callback avoids recursively dispatching the same callback.
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
        mainHandler.postDelayed(firstPageTimeout, FIRST_PAGE_TIMEOUT_MS);
    }

    @Override
    public void onStart() {
        super.onStart();
        attachFirstPageListener();
    }

    private void attachFirstPageListener() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        if (firstPageListenerAttached) {
            return;
        }

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                if (view.getUrl() != null && view.getUrl().endsWith("offline.html")) {
                    showNativeFailure();
                    return;
                }

                firstPageLoaded = true;
                mainHandler.removeCallbacks(firstPageTimeout);
                hideStartupOverlay();
            }
        });
        firstPageListenerAttached = true;
    }

    private void createStartupOverlay() {
        View content = findViewById(android.R.id.content);
        if (!(content instanceof ViewGroup)) {
            return;
        }

        startupOverlay = new FrameLayout(this);
        startupOverlay.setBackgroundColor(SHELL_BACKGROUND);
        startupOverlay.setClickable(true);

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER_HORIZONTAL);
        panel.setPadding(40, 32, 40, 32);

        TextView title = new TextView(this);
        title.setText("Endemion Life");
        title.setTextColor(Color.rgb(224, 192, 122));
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        panel.addView(title, new LinearLayout.LayoutParams(-1, -2));

        startupMessage = new TextView(this);
        startupMessage.setText("Загрузка…");
        startupMessage.setTextColor(Color.rgb(184, 177, 164));
        startupMessage.setTextSize(16);
        startupMessage.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(-1, -2);
        messageParams.topMargin = 16;
        panel.addView(startupMessage, messageParams);

        startupOverlay.addView(panel, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));
        ((ViewGroup) content).addView(startupOverlay, new ViewGroup.LayoutParams(-1, -1));
    }

    private void showNativeFailure() {
        if (startupOverlay == null || startupMessage == null) {
            return;
        }

        firstPageLoaded = false;
        mainHandler.removeCallbacks(firstPageTimeout);
        startupMessage.setText("Нет связи\nПроверьте интернет и повторите.");

        ViewGroup panel = (ViewGroup) startupMessage.getParent();
        if (panel.findViewWithTag("retry") == null) {
            Button retry = new Button(this);
            retry.setTag("retry");
            retry.setText("Повторить");
            retry.setTextColor(Color.rgb(247, 235, 203));
            retry.setTextSize(16);
            GradientDrawable background = new GradientDrawable();
            background.setColor(Color.TRANSPARENT);
            background.setStroke(1, Color.rgb(201, 162, 90));
            retry.setBackground(background);
            retry.setOnClickListener(view -> retryInitialLoad());
            LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(-2, -2);
            retryParams.topMargin = 20;
            panel.addView(retry, retryParams);
        }

        startupOverlay.setVisibility(View.VISIBLE);
    }

    private void retryInitialLoad() {
        if (bridge == null || bridge.getWebView() == null || startupMessage == null) {
            return;
        }

        firstPageLoaded = false;
        startupMessage.setText("Загрузка…");
        ViewGroup panel = (ViewGroup) startupMessage.getParent();
        View retry = panel.findViewWithTag("retry");
        if (retry != null) {
            panel.removeView(retry);
        }
        mainHandler.removeCallbacks(firstPageTimeout);
        mainHandler.postDelayed(firstPageTimeout, FIRST_PAGE_TIMEOUT_MS);
        bridge.getWebView().loadUrl(bridge.getServerUrl());
    }

    private void hideStartupOverlay() {
        if (startupOverlay != null) {
            startupOverlay.setVisibility(View.GONE);
        }
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(firstPageTimeout);
        super.onDestroy();
    }
}
