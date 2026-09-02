import 'dart:async';
import 'dart:math';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants.dart';
import '../../../core/storage/secure_storage_service.dart';
import 'gps_offline_queue.dart';

/// MUHIM (real qurilmada topilgan, JIDDIY xato): Android 8+ da har bir
/// foreground-xizmat bildirishnomasi OLDINDAN yaratilgan kanalga tegishli
/// bo'lishi SHART - `AndroidConfiguration.notificationChannelId` shunchaki
/// ID satrini beradi, lekin `isForegroundMode: false` bilan sozlanganda
/// `flutter_background_service` plagini kanalni O'ZI YARATMAYDI. Natijada
/// ONLINE bosilib xizmat `setAsForegroundService()`ga o'tganda, Android
/// "invalid channel" deb hisoblab `startForeground()`ni rad etadi va bu
/// SERVISNI EMAS, BUTUN ILOVANI (native darajada, RemoteServiceException:
/// "Bad notification for startForeground") yiqitardi - GPS shu sabab
/// birorta ham marta ishlamagan edi. Shu sabab kanalni bu yerda ANIQ,
/// qo'lda (flutter_local_notifications orqali - u allaqachon shu ishni
/// push bildirishnomalar uchun qiladi) yaratamiz.
const _gpsChannel = AndroidNotificationChannel(
  'gps_tracking_channel',
  'GPS kuzatuv',
  description: 'Ish smenasida joylashuvni kuzatish uchun doimiy bildirishnoma',
  importance: Importance.low,
  playSound: false,
);

Future<void> _ensureGpsNotificationChannel() async {
  final plugin = FlutterLocalNotificationsPlugin();
  const androidInit = AndroidInitializationSettings('@drawable/ic_stat_notify');
  await plugin.initialize(const InitializationSettings(android: androidInit));
  await plugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(_gpsChannel);
}

/// Haydovchi/ishchi ilovani yopib qo'ysa ham GPS koordinatalarini har 15
/// soniyada backend'ga yuboradigan fon xizmati (Android foreground service).
/// Internet yo'q bo'lsa, nuqtalar `GpsOfflineQueue` orqali navbatga qo'yiladi
/// va tarmoq tiklanganda navbat bilan yuboriladi.
class BackgroundGpsService {
  static const Duration interval = Duration(seconds: 15);

  /// Joriy ONLINE/OFFLINE holati - `ShiftToggleButton`ning BARCHA nusxalari
  /// (AppBar'da ham, Bosh sahifa sarlavhasida ham) shu BITTA notifier'ni
  /// tinglaydi, shu sabab ikkalasi doim bir xil holatni ko'rsatadi va bir-biri
  /// bilan sinxron ishlaydi.
  static final ValueNotifier<bool> isOnline = ValueNotifier<bool>(false);

  static Future<void> initialize() async {
    // Xizmat konfiguratsiyasidan OLDIN - kanal mavjud bo'lmasa, keyinroq
    // ONLINE bosilganda startForeground() butun ilovani yiqitadi.
    await _ensureGpsNotificationChannel();

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
    // MUHIM: bu chaqiruv vaqtini ATAYLAB o'zgartirmaymiz (kechiktirmaymiz) -
    // Android'da foreground xizmatga o'tish o'z vaqti-vaqti bilan chambarchas
    // bog'liq va bu yerdagi kechikish avvalgi versiyada ilovaning yiqilishiga
    // (native darajada) sabab bo'lgan edi.
    service.invoke('resume');
    // Zaxira (xavfsiz, ikkilamchi): agar servis ENDI ishga tushayotgan bo'lsa,
    // `_onStart` ichidagi `on('resume')` tinglovchisi hali ro'yxatdan
    // o'tmagan bo'lishi mumkin - shu holda yuqoridagi signal yo'qolib ketadi va
    // UI "ONLINE" ko'rsatsa ham haqiqiy kuzatuv boshlanmaydi. Buni asl
    // vaqtlashga TEGMASDAN tuzatish uchun, bir oz keyin (tinglovchi allaqachon
    // tayyor bo'lgach) ZARARSIZ (idempotent) qayta yuboramiz - agar birinchisi
    // yetib borgan bo'lsa, bu shunchaki hech narsani o'zgartirmaydi.
    Future.delayed(const Duration(milliseconds: 2000), () => service.invoke('resume'));
    isOnline.value = true;
    await SecureStorageService().saveShiftStatus(true);
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
    isOnline.value = false;
    await SecureStorageService().saveShiftStatus(false);
  }
}

@pragma('vm:entry-point')
bool _onIosBackground(ServiceInstance service) {
  return true;
}

@pragma('vm:entry-point')
void _onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  // Zaxira (ikkilamchi): asosiy isolate'da initialize() orqali allaqachon
  // yaratilgan bo'lishi kerak, lekin bu ALOHIDA isolate - kanal OS darajasida
  // saqlansa ham, xavfsizlik uchun shu yerda ham (arzon, idempotent) qayta
  // ta'minlaymiz.
  try {
    await _ensureGpsNotificationChannel();
  } catch (_) {}

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

  // MUHIM (audit'da topilgan, jiddiy xato): avval bu yerda qayta kirishdan
  // himoya YO'Q edi. Agar bitta tsikl (GPS o'qish + tarmoq so'rovi) 15
  // soniyalik intervaldan uzoqroq davom etsa (yomon signal, sekin
  // internet), Timer.periodic keyingi tsiklni PARALLEL ishga tushiradi.
  // Ikkalasi ham 401 olsa, ikkalasi ham BIR XIL saqlangan refresh-tokenni
  // ishlatib /auth/refresh'ga murojaat qilishi mumkin edi - refresh token
  // BIR MARTA ishlatilgani uchun (rotatsiya) server buni o'g'irlik alomati
  // deb qabul qilib, BUTUN sessiya oilasini (`revokeFamily`) bekor qilardi
  // - haydovchi smena o'rtasida kutilmaganda chiqarib yuborilardi. ApiClient
  // xuddi shu muammoni `_refreshFuture` bilan hal qiladi, lekin bu fon
  // xizmati ALOHIDA isolate'da ishlaydi va o'sha himoyaga ega emas edi.
  var tickInFlight = false;

  Timer.periodic(BackgroundGpsService.interval, (timer) async {
    if (isPaused || tickInFlight) return;
    tickInFlight = true;
    try {
      final sessionGone = await _tick(storage, queue);
      if (sessionGone) {
        // Sessiya tugagan (logout) - kuzatuvni pauza qilamiz (servisni
        // to'xtatmaymiz, keyingi login+ONLINE'da xavfsiz davom etadi).
        isPaused = true;
        if (service is AndroidServiceInstance) {
          await service.setAsBackgroundService();
        }
      }
    } finally {
      tickInFlight = false;
    }
  });
}

/// Bitta GPS tsikli: joriy joylashuvni o'qiydi, navbatdagi eski nuqtalarni
/// va yangisini yuboradi. `true` qaytarsa - sessiya tugagan, chaqiruvchi
/// kuzatuvni pauza qilishi kerak.
Future<bool> _tick(SecureStorageService storage, GpsOfflineQueue queue) async {
  final token = await storage.readToken();
  if (token == null) return true;

  try {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );

    // Avval navbatda qolgan eski nuqtalarni yuborishga urinib ko'ramiz.
    // MUHIM: har bir nuqtaning O'ZI yozilgan payt (timestamp) ham yuboriladi -
    // aks holda backend soatlab oldin yig'ilib qolgan nuqtalarni "hozirgi
    // joylashuv" deb noto'g'ri qabul qilib olardi.
    final pending = await queue.readAll();
    for (final entry in pending) {
      final recordedAt = DateTime.tryParse(entry.value['timestamp'] as String? ?? '') ??
          DateTime.now();
      final sent = await _sendPosition(
        storage,
        entry.value['latitude'] as double,
        entry.value['longitude'] as double,
        recordedAt,
      );
      if (sent) {
        await queue.remove(entry.key);
      } else {
        break; // Hali ham oflayn - qolganlarini keyingi tsiklga qoldiramiz.
      }
    }

    final sent = await _sendPosition(
      storage,
      position.latitude,
      position.longitude,
      position.timestamp,
    );
    if (!sent) {
      await queue.enqueue(position.latitude, position.longitude);
    }
  } catch (_) {
    // Joylashuvni olishning imkoni bo'lmadi - keyingi tsiklda qayta urinamiz.
  }
  return false;
}

/// MUHIM (audit'da topilgan xato, tuzatildi): bu funksiya avval `token`ni
/// TO'G'RIDAN-TO'G'RI parametr sifatida olar va 401 kelsa shunchaki
/// muvaffaqiyatsiz deb hisoblab, nuqtani navbatga qo'yardi - `ApiClient`dagi
/// kabi avtomatik token-yangilash logikasi bu yerda YO'Q edi. Natijada
/// sessiya (masalan admin tomonidan majburiy chiqarilish yoki refresh-token
/// aylanishi tufayli) ilova FONDA ishlab turganda bekor qilinsa, GPS
/// jo'natish butunlay va JIMGINA to'xtar edi - haydovchi xaritada
/// "aloqasiz" ko'rinardi, lekin buni hech kim bilmasdi. Endi 401 kelsa
/// saqlangan refresh-token bilan bir marta yangilashga urinadi va shu bilan
/// qayta yuboradi - xuddi ApiClient qiladigan ishning bir xili, faqat bu
/// yerda ALOHIDA (interceptor'siz) chaqirilgani uchun qo'lda takrorlangan.
Future<bool> _sendPosition(
  SecureStorageService storage,
  double latitude,
  double longitude,
  DateTime recordedAt,
) async {
  final token = await storage.readToken();
  if (token == null) return false;

  Future<bool> attempt(String withToken) async {
    // MUHIM (audit'da topilgan): avval bu Dio'da timeout YO'Q edi - GPS
    // fon tsikli har 15 soniyada ishga tushadi, tarmoq osilib qolsa
    // so'rov cheksiz kutishi mumkin edi (yuqoridagi tickInFlight himoyasi
    // ham shu holatda navbatdagi tsiklni cheksiz bloklardi).
    final dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseApiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));
    await dio.post(
      '/gps/log',
      data: {
        'latitude': latitude,
        'longitude': longitude,
        'timestamp': recordedAt.toIso8601String(),
      },
      options: Options(headers: {'Authorization': 'Bearer $withToken'}),
    );
    return true;
  }

  try {
    return await attempt(token);
  } on DioException catch (e) {
    if (e.response?.statusCode != 401) return false;
    final refreshed = await _refreshToken(storage, token);
    if (refreshed == null) return false;
    try {
      return await attempt(refreshed);
    } catch (_) {
      return false;
    }
  } catch (_) {
    return false;
  }
}

/// `failedToken` - 401 qaytargan eski token. Refresh so'rovini yuborishdan
/// oldin kichik tasodifiy pauza berib qayta tekshiramiz: agar shu oraliqda
/// asosiy ilova (`ApiClient`, boshqa isolate'da) ALLAQACHON yangilagan
/// bo'lsa, saqlangan token allaqachon o'zgargan bo'ladi - shu holda O'ZIMIZ
/// /auth/refresh'ga murojaat qilmasdan, xuddi shu YANGI tokenni ishlatamiz.
/// SABABI: refresh-token BIR MARTA ishlatiladi (rotatsiya) - agar ikkala
/// isolate deyarli bir vaqtda o'zining nusxasini yuborsa, ikkinchisi
/// "qayta ishlatilgan token" (o'g'irlik alomati) deb qabul qilinib, BUTUN
/// sessiya oilasi bekor qilinishi mumkin edi (qarang: RefreshTokenService.
/// rotate). Bu to'liq kafolat emas (haqiqiy tor oyna hali qoladi), lekin
/// eng ehtimoliy to'qnashuv holatini kamaytiradi.
Future<String?> _refreshToken(SecureStorageService storage, String failedToken) async {
  await Future.delayed(Duration(milliseconds: 150 + Random.secure().nextInt(350)));
  final maybeAlreadyRefreshed = await storage.readToken();
  if (maybeAlreadyRefreshed != null && maybeAlreadyRefreshed != failedToken) {
    return maybeAlreadyRefreshed;
  }

  final refreshToken = await storage.readRefreshToken();
  if (refreshToken == null || refreshToken.isEmpty) return null;
  try {
    // MUHIM (audit'da topilgan): avval bu Dio'da timeout YO'Q edi - GPS
    // fon tsikli har 15 soniyada ishga tushadi, tarmoq osilib qolsa
    // so'rov cheksiz kutishi mumkin edi (yuqoridagi tickInFlight himoyasi
    // ham shu holatda navbatdagi tsiklni cheksiz bloklardi).
    final dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseApiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));
    final res = await dio.post(
      '/auth/refresh',
      data: {
        'refresh_token': refreshToken,
        'device_id': await storage.deviceId(),
      },
    );
    final data = res.data;
    if (data is Map && data['token'] is String) {
      final newToken = data['token'] as String;
      await storage.saveTokens(
        token: newToken,
        refreshToken: data['refreshToken'] as String?,
      );
      return newToken;
    }
    return null;
  } catch (_) {
    return null;
  }
}
