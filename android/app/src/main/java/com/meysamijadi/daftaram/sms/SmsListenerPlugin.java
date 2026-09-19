package com.meysamijadi.daftaram.sms;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.telephony.SmsMessage;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * پلاگین شنود پیامک بانکی — v2.6.0
 *
 * در پس‌زمینه (بدون هیچ سرویس دائمی؛ فقط گیرندهٔ سیستم‌عامل) پیامک‌ها را
 * می‌گیرد. اگر پیامک بانکی تشخیص داده شد (الگوهای برداشت/واریز با مبلغ و
 * واحد ریال/تومان)، یک رویداد به جاوااسکریپت می‌فرستد تا برنامه یک
 * «پیش‌نویس تأیید» نشان دهد — ذخیره فقط با تأیید کاربر انجام می‌شود.
 *
 * مجوز RECEIVE_SMS خطرناک است و درخواست آن در زمان اجرا از رابط برنامه
 * انجام می‌شود (requestPermissions) — نه در نصب.
 */
@CapacitorPlugin(name = "SmsListener", permissions = {
    @Permission(alias = "sms", strings = {
        android.Manifest.permission.RECEIVE_SMS,
        android.Manifest.permission.READ_SMS
    })
})
public class SmsListenerPlugin extends Plugin {

  static final String EVENT_SMS = "smsBankEvent";
  private static final String CHANNEL_ID = "daftaram-bank-sms";
  private static final int NOTIFICATION_ID_BASE = 74000;
  private static final String TAG = "SmsListenerPlugin";

  private static SmsListenerPlugin instance;

  @Override
  public void load() {
    super.load();
    instance = this;
    createChannel();
    // پیامک‌هایی که هنگام بسته‌بودن برنامه رسیده‌اند را از intent بازیابی کن
    deliverPendingFromIntent(getActivity().getIntent());
  }

  /** مجوز در زمان اجرا — از رابط برنامه صدا زده می‌شود */
  @PluginMethod
  public void requestPermissions(PluginCall call) {
    if (hasRequiredPermissions()) {
      JSObject res = new JSObject();
      res.put("granted", true);
      call.resolve(res);
      return;
    }
    requestAllPermissions(call, "smsPermCallback");
  }

  @PermissionCallback
  private void smsPermCallback(PluginCall call) {
    JSObject res = new JSObject();
    res.put("granted", hasRequiredPermissions());
    call.resolve(res);
  }

  /** وضعیت مجوز برای نمایش شرطی بخش تنظیمات */
  @PluginMethod
  public void checkPermissions(PluginCall call) {
    JSObject res = new JSObject();
    res.put("granted", hasRequiredPermissions());
    call.resolve(res);
  }

  static void onSmsReceived(Context context, String originatingAddress, String body) {
    SmsListenerPlugin plugin = instance;
    BankSms parsed = parseBankSms(body);
    if (parsed == null) return; // پیامک بانکی نیست — بی‌صدا رد شود (کمترین بار)

    if (plugin != null && plugin.bridge != null && plugin.bridge.getWebView() != null) {
      // برنامه زنده است: رویداد به JS
      plugin.notifyListeners(EVENT_SMS, parsed.toJS(), true);
    } else {
      // برنامه بسته است: اعلان محلی با پیوستِ داده در intent
      showNotification(context, parsed);
    }
  }

  // -------------------------------------------------------------------------
  // تجزیهٔ پیامک بانکی — ریال و تومان هر دو پشتیبانی می‌شوند
  // -------------------------------------------------------------------------

  static final class BankSms {
    String kind;    // "expense" | "income"
    long amount;    // به تومان
    String rawUnit; // "تومان" | "ریال"
    String body;
    String sender;

    JSObject toJS() {
      JSObject o = new JSObject();
      o.put("kind", kind);
      o.put("amount", amount);
      o.put("unit", rawUnit);
      o.put("body", body);
      o.put("sender", sender);
      return o;
    }
  }

  // واژگان برداشت/واریز در پیامک‌های بانک‌های ایرانی
  private static final Pattern EXPENSE_PAT = Pattern.compile(
      "برداشت|خرید|پرداخت|کسر|انتقال از|حساب شما بدهکار|بدهکار شد|خرج|case");
  private static final Pattern INCOME_PAT = Pattern.compile(
      "واریز|دریافت|شارژ|افزایش موجودی|حساب شما بستانکار|بستانکار شد|انتقال به");
  private static final Pattern AMOUNT_PAT = Pattern.compile(
      "مبلغ\\s*[:؛=\\s]*([0-9۰-۹,،.]+)\\s*(ریال|تومان|تومن)?");

  /** تجزیهٔ پیامک؛ اگر بانکی نبود null برمی‌گرداند */
  static BankSms parseBankSms(String body) {
    if (body == null) return null;
    String b = body.replace('\u200c', ' ').replace('\u066B', '.').replace('\u066C', ',');
    boolean hasAmount = AMOUNT_PAT.matcher(b).find();
    boolean bankWord = b.contains("بانک") || b.contains("حساب") || b.contains("کارت")
        || b.contains("شماره حساب") || b.contains("موجودی");
    if (!hasAmount) return null; // بدون مبلغ — تراکنش نیست
    if (!bankWord) return null;  // بدون واژگان بانکی — پیامک معمولی

    BankSms s = new BankSms();
    s.body = body;
    s.sender = "";

    Matcher m = AMOUNT_PAT.matcher(b);
    if (m.find()) {
      String digits = m.group(1) == null ? "0" : m.group(1).replaceAll("[^0-9]", "");
      long value = 0;
      try { value = Long.parseLong(digits); } catch (NumberFormatException ignored) { }
      String unit = m.group(2);
      s.rawUnit = unit == null ? "ریال" : unit; // بانک‌ها پیش‌فرض ریال می‌نویسند
      // ریال → تومان (قاعدهٔ معروف ÷۱۰)؛ تومان همان‌طور که هست
      s.amount = "تومان".equals(s.rawUnit) || "تومن".equals(s.rawUnit) ? value : value / 10;
    } else {
      return null;
    }

    boolean income = INCOME_PAT.matcher(b).find();
    boolean expense = EXPENSE_PAT.matcher(b).find();
    // هر دو بود؟ (نادر — مثلاً انتقال داخلی) واریز ارجح است تا دست از دست نرود
    s.kind = income ? "income" : expense ? "expense" : null;
    if (s.kind == null) return null;
    return s;
  }

  // -------------------------------------------------------------------------
  // اعلان محلی برای وقتی برنامه بسته است
  // -------------------------------------------------------------------------

  private static void showNotification(Context context, BankSms s) {
    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    NotificationManager sir = nm; // کوتاه‌نویسی
    android.app.Notification.Builder builder;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder = new android.app.Notification.Builder(context, CHANNEL_ID);
    } else {
      builder = new android.app.Notification.Builder(context);
    }
    Intent launch = context.getPackageManager() == null ? null
        : context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    PendingIntent pi = launch == null ? null : PendingIntent.getActivity(
        context, 0, launch,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    String title = "expense".equals(s.kind) ? "برداشت بانکی ثبت نشده" : "واریز بانکی ثبت نشده";
    String text = String.format("%s تومان — برای ثبت در دفتر لمس کنید", formatFa(s.amount));
    builder.setSmallIcon(android.R.drawable.stat_notify_more)
        .setContentTitle(title)
        .setContentText(text)
        .setAutoCancel(true)
        .setContentIntent(pi);
    try {
      sir.notify(NOTIFICATION_ID_BASE + (int) (s.amount % 1000), builder.build());
    } catch (SecurityException ignored) {
    }
  }

  private static String formatFa(long n) {
    return String.format("%,d", n).replace(',', '٬');
  }

  private void createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = (NotificationManager) getContext()
        .getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    NotificationChannel ch = new NotificationChannel(
        CHANNEL_ID, "پیامک‌های بانکی", NotificationManager.IMPORTANCE_DEFAULT);
    ch.setDescription("برداشت و واریزهای تشخیص‌داده‌شده از پیامک بانک");
    nm.createNotificationChannel(ch);
  }

  /** پیامک‌های هنگام بسته‌بودن برنامه — از extras گیرنده */
  private void deliverPendingFromIntent(Intent intent) {
    if (intent == null || intent.getExtras() == null) return;
    if (!"com.meysamijadi.daftaram.SMS_EVENT".equals(intent.getAction())) return;
    String body = intent.getStringExtra("body");
    String sender = intent.getStringExtra("sender");
    if (body != null) {
      BankSms parsed = parseBankSms(body);
      if (parsed != null) {
        parsed.sender = sender == null ? "" : sender;
        notifyListeners(EVENT_SMS, parsed.toJS(), true);
      }
    }
  }
}
