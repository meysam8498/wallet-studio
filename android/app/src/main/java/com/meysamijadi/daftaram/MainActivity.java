package com.meysamijadi.daftaram;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import com.meysamijadi.daftaram.sms.SmsListenerPlugin;

/**
 * MainActivity — پوستهٔ اندروید «دفتر من».
 *
 * تنظیم ویوپورت: Android WebView به‌جای وسعت پنجره از گسترش متن (text
 * zoom) استفاده می‌کند؛ اگر کاربر اندازهٔ فونت سیستم را بزرگ کرده باشد،
 * چیدمان ۳۶۰px به‌هم می‌ریزد. با setUseWideViewPort(false) و
 * setLoadWithOverviewMode(false) عرض صفحه با عرض پنجره یکی می‌شود و
 * چیدمان واکنش‌گرای برنامه (کف طراحی ۳۶۰px) همیشه درست می‌ماند.
 *
 * پلاگین پیامک بانکی (v2.6.0) همین‌جا ثبت می‌شود تا در پس‌زمینه — بدون
 * هیچ سرویس دائمی — پیامک‌های بانکی را بگیرد و پیش‌نویس تراکنش بسازد.
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

    // ثبت پلاگین شنود پیامک بانکی
    registerPlugin(SmsListenerPlugin.class);
  }
}
