package com.meysamijadi.daftaram;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity — پوستهٔ اندروید «دفتر من».
 *
 * تنظیم ویوپورت: Android WebView به‌جای وسعت پنجره از گسترش متن (text
 * zoom) استفاده می‌کند؛ اگر کاربر اندازهٔ فونت سیستم را بزرگ کرده باشد،
 * چیدمان ۳۶۰px به‌هم می‌ریزد. با setUseWideViewPort(false) و
 * setLoadWithOverviewMode(false) عرض صفحه با عرض پنجره یکی می‌شود و
 * چیدمان واکنش‌گرای برنامه (کف طراحی ۳۶۰px) همیشه درست می‌ماند.
 */
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();
    WebSettings settings = webView.getSettings();
    settings.setUseWideViewPort(false);
    settings.setLoadWithOverviewMode(false);
    // متن انتخابی با بزرگ‌نمایی سیستم به‌هم نمی‌ریزد؛ چیدمان ثابت می‌ماند
    settings.setTextZoom(100);
  }
}
