import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme.dart';
import 'update_checker.dart';

/// Yangi versiya haqida oyna. `forceUpdate` bo'lsa - yopib bo'lmaydi (orqaga
/// tugmasi ham, tashqariga bosish ham ishlamaydi), foydalanuvchida faqat
/// "Yuklab olish" tugmasi qoladi.
///
/// Bosilganda brauzer APK havolasini ochadi - Android o'zi yuklab olib,
/// o'rnatishni SO'RAYDI (foydalanuvchi tasdiqlaydi). Bu "jim o'rnatish"
/// emas, lekin ishonchli va Android xavfsizlik siyosatiga mos yagona yo'l -
/// jim o'rnatish maxsus ruxsat va sozlamani talab qiladi, ularni faqat
/// haqiqiy qurilmada tekshirish mumkin.
Future<void> showUpdateDialog(BuildContext context, UpdateInfo info) {
  return showDialog<void>(
    context: context,
    barrierDismissible: !info.forceUpdate,
    builder: (ctx) => PopScope(
      canPop: !info.forceUpdate,
      child: AlertDialog(
        icon: const Icon(Icons.system_update, color: AppTheme.primary, size: 32),
        title: Text(info.forceUpdate ? 'Yangilanish majburiy' : 'Yangi versiya mavjud'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Versiya ${info.version}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            if (info.message.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(info.message, style: TextStyle(fontSize: 13, color: AppTheme.textSecondaryOf(ctx))),
            ],
            if (info.forceUpdate) ...[
              const SizedBox(height: 10),
              const Text(
                "Davom etish uchun ilovani yangilash shart.",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.dangerColor),
              ),
            ],
          ],
        ),
        actions: [
          if (!info.forceUpdate)
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Keyinroq'),
            ),
          FilledButton(
            onPressed: () async {
              final uri = Uri.tryParse(info.url);
              if (uri != null && await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: const Text('Yuklab olish'),
          ),
        ],
      ),
    ),
  );
}
