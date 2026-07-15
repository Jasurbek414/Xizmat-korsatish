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
        isForegroundMode: true,
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

  static Future<void> start() async {
    final service = FlutterBackgroundService();
    if (!await service.isRunning()) {
      await service.startService();
    }
  }

  static Future<void> stop() async {
    final service = FlutterBackgroundService();
    if (await service.isRunning()) {
      service.invoke('stop');
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
  await Hive.initFlutter();

  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: 'ServiceCore',
      content: 'GPS kuzatuv faol - joylashuv yuborilmoqda',
    );
  }

  service.on('stop').listen((event) {
    service.stopSelf();
  });

  final storage = SecureStorageService();
  final queue = GpsOfflineQueue();

  Timer.periodic(BackgroundGpsService.interval, (timer) async {
    final token = await storage.readToken();
    if (token == null) {
      // Sessiya tugagan - fon xizmati o'zini to'xtatadi.
      timer.cancel();
      service.stopSelf();
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
