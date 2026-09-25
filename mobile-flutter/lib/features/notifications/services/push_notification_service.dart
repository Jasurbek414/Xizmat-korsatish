import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart' show Color, WidgetsFlutterBinding;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../repository/notification_repository.dart';

/// AppColors.primary (core/theme.dart) bilan bir xil - bildirishnoma ikonkasi
/// aksenti ilovaning asosiy rangida ko'rinishi uchun.
const _brandColor = Color(0xFF0B6B4F);

const _ordersChannel = AndroidNotificationChannel(
  'orders_channel',
  'Buyurtmalar',
  description: 'Yangi buyurtma tayinlanganda ovozli bildirishnoma',
  importance: Importance.high,
  playSound: true,
);

const _updatesChannel = AndroidNotificationChannel(
  'app_updates_channel',
  'Yangilanishlar',
  description: 'Ilovaning yangi versiyasi chiqqanda bildirishnoma',
  importance: Importance.high,
  playSound: true,
);

/// Background/o'chirilgan holatda kelgan xabarlarni qayta ishlaydi. "APP_UPDATE"
/// ma'lumot (data-only) turida yuboriladi - shuning uchun OS uni O'ZI ko'rsata
/// olmaydi (oddiy "notification" bloki yo'q). Bu yerda alohida isolate ishga
/// tushgani uchun pluginni qaytadan ishga tushirish SHART.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (message.data['type'] != 'APP_UPDATE') return;

  WidgetsFlutterBinding.ensureInitialized();
  final plugin = FlutterLocalNotificationsPlugin();
  const androidInit = AndroidInitializationSettings('@drawable/ic_stat_notify');
  await plugin.initialize(const InitializationSettings(android: androidInit));
  await plugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(_updatesChannel);

  final version = message.data['version'] ?? '';
  final body = message.data['message'] ?? "Ilovaning yangi versiyasi mavjud.";
  await plugin.show(
    DateTime.now().millisecondsSinceEpoch ~/ 1000,
    version.isEmpty ? 'Yangilanish mavjud' : 'Yangilanish mavjud — $version',
    body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        _updatesChannel.id,
        _updatesChannel.name,
        channelDescription: _updatesChannel.description,
        importance: Importance.high,
        priority: Priority.high,
        playSound: true,
        color: _brandColor,
        styleInformation: BigTextStyleInformation(body),
      ),
    ),
  );
}

/// Yangi buyurtma tayinlanganda ovozli push bildirishnoma ko'rsatish uchun
/// Firebase Cloud Messaging integratsiyasi. Agar `google-services.json`
/// sozlanmagan bo'lsa (Firebase loyihasi hali yaratilmagan), bu xizmat
/// jimgina o'chirilgan holda qoladi - ilovaning qolgan qismi ishlashda davom etadi.
class PushNotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;
  static bool _available = false;

  /// Foreground'da push kelganda chaqiriladi - ilova (dashboard) buni
  /// buyurtmalar ro'yxatini DARHOL jimgina yangilash uchun ishlatadi (webdan
  /// yangi buyurtma tayinlanishi bilan haydovchi telefonida paydo bo'lishi uchun).
  static void Function(RemoteMessage message)? onMessageReceived;

  /// "app_updates" mavzusi (topic) orqali "APP_UPDATE" turidagi xabar
  /// kelganda chaqiriladi - `main.dart` bunga ulanib, yangilanish
  /// tekshiruvini darhol qayta ishga tushiradi.
  static void Function()? onAppUpdateReceived;

  static Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    try {
      await Firebase.initializeApp();
    } catch (_) {
      // Firebase sozlanmagan - push funksiyasi o'chirilgan holda qoladi.
      _available = false;
      return;
    }

    const androidInit = AndroidInitializationSettings('@drawable/ic_stat_notify');
    await _localNotifications.initialize(
      const InitializationSettings(android: androidInit),
    );
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(_ordersChannel);
    await androidPlugin?.createNotificationChannel(_updatesChannel);

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);

    // "app_updates" mavzusiga OBUNA - ALOHIDA token kerak emas, superadmin
    // bitta xabarni shu mavzuga yuborsa, u OBUNA BO'LGAN barcha qurilmalarga
    // (kompaniyadan qat'i nazar) yetadi. Tarmoq bo'lmasa jimgina o'tkaziladi -
    // ilova ishga tushishiga to'sqinlik qilmasligi kerak.
    try {
      await FirebaseMessaging.instance.subscribeToTopic('app_updates');
    } catch (_) {}

    _available = true;
  }

  static void _showForegroundNotification(RemoteMessage message) {
    // "APP_UPDATE" - data-only xabar, oddiy "notification" bloki bo'lmasligi
    // mumkin, shuning uchun ALOHIDA tekshiriladi va ilovaga darhol xabar
    // beriladi (yangilanish tekshiruvini qayta ishga tushirish uchun).
    if (message.data['type'] == 'APP_UPDATE') {
      try {
        onAppUpdateReceived?.call();
      } catch (_) {}
    }

    // Ilovaga xabar beramiz - buyurtmalar ro'yxati darhol yangilanadi.
    try {
      onMessageReceived?.call(message);
    } catch (_) {}

    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _ordersChannel.id,
          _ordersChannel.name,
          channelDescription: _ordersChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          playSound: true,
          color: _brandColor,
          styleInformation: BigTextStyleInformation(
            notification.body ?? '',
            contentTitle: notification.title,
          ),
        ),
      ),
    );
  }

  /// Yangi buyurtma aniqlanganda (masalan davriy poll orqali, FCM sozlanmagan
  /// bo'lsa ham) ovozli lokal bildirishnoma ko'rsatadi - haydovchi ekranga
  /// qaramayotgan bo'lsa ham eshitadi.
  static Future<void> showNewOrderAlert({int count = 1}) async {
    if (!_available) return;
    try {
      await _localNotifications.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        count > 1 ? '$count ta yangi buyurtma' : 'Yangi buyurtma',
        'Sizga yangi buyurtma tayinlandi',
        NotificationDetails(
          android: AndroidNotificationDetails(
            _ordersChannel.id,
            _ordersChannel.name,
            channelDescription: _ordersChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            color: _brandColor,
          ),
        ),
      );
    } catch (_) {}
  }

  /// Login'dan so'ng chaqiriladi - FCM tokenini olib, backend'ga saqlaydi
  /// (shu token orqali server ushbu qurilmaga push yubora oladi).
  static Future<void> registerTokenWithBackend() async {
    if (!_available) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await NotificationRepository().registerToken(token);
      }
    } catch (_) {
      // Tarmoq xatosi yoki Firebase mavjud emas - jimgina o'tkazib yuboriladi.
    }
  }
}
