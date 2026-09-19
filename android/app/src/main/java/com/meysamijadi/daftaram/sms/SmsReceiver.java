package com.meysamijadi.daftaram.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

/**
 * گیرندهٔ پیامک — v2.6.0
 *
 * با رسیدن هر SMS توسط سیستم‌عامل بیدار می‌شود (بدون سرویس دائمی — کمترین
 * بار ممکن). پیامک را به پلاگین می‌دهد تا در صورت بانکی‌بودن، رویداد به
 * جاوااسکریپت یا اعلان محلی صادر شود. روی اندروید ۱۰+ وقتی برنامه در
 * پیش‌زمینه است، خودِ پلاگین نیز پیامک را از طریق پورت SMS می‌گیرد؛ این
 * گیرنده پوششِ «برنامه بسته» را کامل می‌کند.
 */
public class SmsReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || intent.getAction() == null) return;
    if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) return;

    Bundle extras = intent.getExtras();
    if (extras == null) return;

    try {
      Object[] pdus = (Object[]) extras.get("pdus");
      if (pdus == null) return;
      String format = extras.getString("format");
      StringBuilder full = new StringBuilder();
      String sender = "";
      for (Object pdu : pdus) {
        byte[] bytes = (byte[]) pdu;
        SmsMessage msg = SmsMessage.createFromPdu(bytes, format);
        if (msg == null) continue;
        sender = msg.getOriginatingAddress() != null ? msg.getOriginatingAddress() : sender;
        String body = msg.getMessageBody();
        if (body != null) full.append(body);
      }
      if (full.length() > 0) {
        SmsListenerPlugin.onSmsReceived(context, sender, full.toString());
      }
    } catch (Exception e) {
      Log.w("SmsReceiver", "SMS parse failed", e);
    }
  }
}
