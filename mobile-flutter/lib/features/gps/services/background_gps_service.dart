import 'dart:async';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants.dart';
import '../../../core/storage/secure_storage_service.dart';
import 'gps_offline_queue.dart';

/// Haydovchi/ishchi ilovani yopib qo'ysa ham GPS koordinatalarini har 15
/// soniyada backend'ga yuboradigan fon xizmati (Android foreground service).
/// Internet yo'q bo'lsa, nuqtalar `GpsOfflineQueue` orqali navbatga qo'yiladi
/// va tarmoq tiklanganda navbat bilan yuboriladi.
class BackgroundGpsService {
  static const Duration interval = Duration(seconds: 15);

  static Future<void> initialize() async {
    final service = FlutterBackgroundService();
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        // false: ilova ishga tushganda servis "ko'rinmas" (bildirishnomasiz,
        // pauza) holatda isitiladi - foreground promotsiyasi faqat ONLINE
        // bosilganda, warmUp() allaqachon tugallangandan keyin sodir bo'ladi.
        isForegroundMode: false,
        autoStart: false,
        notificationChannelId: 'gps_tracking_channel',
        initialNotificationTitle: 'ServiceCore',
        initialNotificationContent: 'GPS kuzatuv faol',
        foregroundServiceNotificationId: 911,
        foregroundServiceTypes: [AndroidForegroundType.location],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onStart,
        onBackground: _onIosBackground,
      ),
    );
  }

  /// Ilova ishga tushishi bilan (main() ichida) chaqiriladi - fon xizmatini
  /// "ko'rinmas" (pauza, bildirishnomasiz) holatda OLDINDAN isitib qo'yadi.
  /// SABABI: yangi/alohida FlutterEngine yaratish (servis ichida) og'ir va
  /// asosiy oqimni bir necha soniyaga band qilib qo'yishi mumkin - agar bu
  /// aynan ONLINE tugmasi bosilgan zahoti sodir bo'lsa, Android "ilova javob
  /// bermayapti" (ANR) oynasini ko'rsatadi. Shu og'ir ishni ilova ochilishi
  /// bilan (foydalanuvchi hali ONLINE bosmasdan) oldindan bajarib qo'yish
  /// orqali, ONLINE bosilganda faqat tezkor "resume" chaqiruvi qoladi.
  static Future<void> warmUp() async {
    final service = FlutterBackgroundService();
    if (!await service.isRunning()) {
      await service.startService();
    }
  }

  static Future<void> start() async {
    final service = FlutterBackgroundService();
    if (!await service.isRunning()) {
      // warmUp() ishlamagan yoki servis keyinchalik tizim tomonidan
      // o'chirilgan bo'lishi mumkin - shu holatda (kamdan-kam) sekinroq
      // bo'lsa ham qayta ishga tushiramiz.
      await service.startService();
    }
    // Servis allaqachon jonli (warmUp orqali isitilgan yoki hozir ishga
    // tushirilgan) - foreground holatga o'tkazib, kuzatuvni boshlaymiz.
    service.invoke('resume');
  }

  /// MUHIM: servisni butunlay o'chirish uchun (Android'da) `stopSelf()` chaqirish
  /// KERAK EMAS - flutter_background_service paketining ma'lum xatosi tufayli bu
  /// ba'zan butun ilovani ham yopib qo'yadi (nativ FlutterEngine noto'g'ri
  /// tozalanishi sabab bo'ladi - taniqli xato, qarang: github.com/ekasetiawans/
  /// flutter_background_service issues #163 va #490). Shu sabab servisni hech
  /// qachon to'xtatmaymiz - faqat "pauza" holatiga o'tkazamiz: kuzatuv to'xtaydi
  /// va doimiy bildirishnoma olib tashlanadi (setAsBackgroundService orqali),
  /// lekin fon jarayoni/FlutterEngine tirik qoladi va keyin xavfsiz davom etadi.
  static Future<void> stop() async {
    final service = FlutterBackgroundService();
    if (await service.isRunning()) {
      service.invoke('pause');
    }
  }
}

@pragma('vm:entry-point')
bool _onIosBackground(ServiceInstance service) {
  return true;
}

@pragma('vm:entry-point')
void _onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  // Hive allaqachon main() da ishga tushirilgan - init xatolik bersa ham davom etamiz
  try {
    await Hive.initFlutter();
  } catch (_) {
    // Hive allaqachon init qilingan - bu xatolik emas
  }

  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: 'ServiceCore',
      content: 'GPS kuzatuv faol - joylashuv yuborilmoqda',
    );
  }

  // Pauza holati - ONLINE/OFFLINE almashtirilganda shu flag orqali
  // boshqariladi (stopSelf() ATAYLAB ishlatilmaydi, yuqoridagi izohga qarang).
  // Boshlang'ich holat TRUE: servis warmUp() orqali "ko'rinmas" isitilgan
  // bo'lishi mumkin - haqiqiy kuzatuv faqat ONLINE bosilib 'resume' kelganda
  // boshlanadi.
  var isPaused = true;

  service.on('pause').listen((event) async {
    isPaused = true;
    if (service is AndroidServiceInstance) {
      // Doimiy bildirishnomani olib tashlaydi, lekin servisni/FlutterEngine'ni
      // ISHGA TUSHGAN holda qoldiradi - shu sabab bu xavfsiz.
      await service.setAsBackgroundService();
    }
  });

  service.on('resume').listen((event) async {
    isPaused = false;
    if (service is AndroidServiceInstance) {
      await service.setAsForegroundService();
    }
  });

  final storage = SecureStorageService();
  final queue = GpsOfflineQueue();

  Timer.periodic(BackgroundGpsService.interval, (timer) async {
    if (isPaused) return;

    final token = await storage.readToken();
    if (token == null) {
      // Sessiya tugagan (logout) - kuzatuvni pauza qilamiz (servisni
      // to'xtatmaymiz, keyingi login+ONLINE'da xavfsiz davom etadi).
      isPaused = true;
      if (service is AndroidServiceInstance) {
        await service.setAsBackgroundService();
      }
      return;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      // Avval navbatda qolgan eski nuqtalarni yuborishga urinib ko'ramiz.
      final pending = await queue.readAll();
      for (final entry in pending) {
        final sent = await _sendPosition(
          token,
          entry.value['latitude'] as double,
          entry.value['longitude'] as double,
        );
        if (sent) {
          await queue.remove(entry.key);
        } else {
          break; // Hali ham oflayn - qolganlarini keyingi tsiklga qoldiramiz.
        }
      }

      final sent = await _sendPosition(
        token,
        position.latitude,
        position.longitude,
      );
      if (!sent) {
        await queue.enqueue(position.latitude, position.longitude);
      }
    } catch (_) {
      // Joylashuvni olishning imkoni bo'lmadi - keyingi tsiklda qayta urinamiz.
    }
  });
}

Future<bool> _sendPosition(String token, double latitude, double longitude) async {
  try {
    final dio = Dio(BaseOptions(baseUrl: AppConstants.baseApiUrl));
    await dio.post(
      '/gps/log',
      data: {'latitude': latitude, 'longitude': longitude},
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return true;
  } catch (_) {
    return false;
  }
}
