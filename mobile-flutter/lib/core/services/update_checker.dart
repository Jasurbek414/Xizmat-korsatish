import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// `downloads/version.json` faylidan kelgan yangilanish ma'lumoti.
/// Fayl APK bilan bir joyda saqlanadi (`proxy-nginx.conf`dagi `/downloads/`
/// location) - alohida server yoki endpoint SHART emas.
class UpdateInfo {
  final String version;
  final int versionCode;
  final String url;
  final bool forceUpdate;
  final String message;

  const UpdateInfo({
    required this.version,
    required this.versionCode,
    required this.url,
    required this.forceUpdate,
    required this.message,
  });

  factory UpdateInfo.fromJson(Map<String, dynamic> json) => UpdateInfo(
        version: json['version']?.toString() ?? '',
        versionCode: (json['versionCode'] as num?)?.toInt() ?? 0,
        url: json['url']?.toString() ?? '',
        forceUpdate: json['forceUpdate'] == true,
        message: json['message']?.toString() ?? '',
      );
}

/// Ilova ochilganda (yoki push orqali "APP_UPDATE" xabari kelganda) yangi
/// versiya bor-yo'qligini tekshiradi.
///
/// MUHIM: to'liq JIM (silent) o'rnatish ATAYIN qilinmagan - Android'da bu
/// `REQUEST_INSTALL_PACKAGES` ruxsati va `FileProvider` sozlamasini talab
/// qiladi, ularni faqat HAQIQIY qurilmada tekshirish mumkin (statik tahlil
/// buni ko'rmaydi - shu loyihada aynan shunga o'xshash "faqat qurilmada
/// chiqadigan" xato bir marta butun ilovani ishlamay qo'ygan edi). Shuning
/// uchun xavfsizroq, operatsion tizimning O'ZI tasdiqlaydigan yo'l
/// tanlangan: brauzer orqali yuklab olish, keyin oddiy o'rnatish.
class UpdateChecker {
  // 2026-09-09: eski namifor.ecos.uz o'lik (2026-08-10 dan servicecore.ecos.uz
  // ga ko'chirilgan), shuning uchun bu tekshiruv doim muvaffaqiyatsiz bo'lib
  // kelgan edi (check() natijasi null qaytib, foydalanuvchi hech qachon
  // yangilanish haqida bildirishnoma olmagan).
  ///
  /// 2026-09-26: manzil endi build vaqtida almashtiriladigan qilindi. Avval u
  /// QATTIQ kodlangan edi va `API_HOST` dan farqli almashtirib bo'lmasdi —
  /// natijada TEST qurilishi ham production `version.json`ni tekshirar va
  /// `forceUpdate` oynasi chiqib, sinovchini production APK'ga yo'naltirib
  /// yuborishi mumkin edi. Standart qiymat o'zgarmadi, ya'ni production
  /// xulqi aynan avvalgidek.
  ///
  /// Test qurilishi: `--dart-define=UPDATE_URL=` (bo'sh) — tekshiruv o'chadi.
  static const _versionUrl = String.fromEnvironment(
    'UPDATE_URL',
    defaultValue: 'https://servicecore.ecos.uz/downloads/version.json',
  );

  /// Yangi versiya bo'lsa uni qaytaradi, bo'lmasa yoki so'rov muvaffaqiyatsiz
  /// bo'lsa `null` - tarmoq yo'qligi yoki server javob bermasligi ilovani
  /// ishga tushirishga TO'SQINLIK QILMASLIGI kerak.
  static Future<UpdateInfo?> check() async {
    // Bo'sh manzil — tekshiruv ataylab o'chirilgan (test qurilishi).
    if (_versionUrl.isEmpty) return null;
    try {
      // ATAYIN alohida, oddiy Dio (ApiClient EMAS): u autentifikatsiya
      // talab qiladigan /api/v1 bazasiga ulangan, login qilinmagan holatda
      // (masalan login ekranida) bu tekshiruv umuman ishlamay qolardi -
      // shu bilan birga yangilanish tekshiruvi HAMMA uchun, hisobga
      // kirmasdan oldin ham ishlashi kerak.
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
      ));
      final res = await dio.get(_versionUrl);
      final data = res.data;
      if (data is! Map) return null;

      final info = UpdateInfo.fromJson(Map<String, dynamic>.from(data));
      if (info.versionCode <= 0) return null;

      final pkg = await PackageInfo.fromPlatform();
      final installed = int.tryParse(pkg.buildNumber) ?? 0;
      if (info.versionCode <= installed) return null;

      return info;
    } catch (_) {
      return null;
    }
  }
}
