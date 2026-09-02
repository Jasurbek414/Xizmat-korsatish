import 'dart:math';

import 'package:dio/dio.dart';
import '../constants.dart';
import '../storage/secure_storage_service.dart';
import 'api_exception.dart';

/// Backend REST API bilan barcha aloqalar shu klass orqali o'tadi.
/// Tenant endi client tomonidan yuborilmaydi (X-TenantID ishlatilmaydi) -
/// server JWT ichidagi companyId'ga qarab tenant'ni o'zi aniqlaydi.
class ApiClient {
  final Dio _dio;
  final SecureStorageService _storage;

  /// Har bir repository o'zining ApiClient nusxasini yaratadi, shuning uchun
  /// bu callback instance emas, static: main.dart'da bir marta ulansa,
  /// barcha nusxalarning 401 xatoligida ishga tushadi.
  static void Function()? onUnauthorized;

  ApiClient({SecureStorageService? storage, Dio? dio})
    : _storage = storage ?? SecureStorageService(),
      _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConstants.baseApiUrl,
              connectTimeout: const Duration(seconds: 12),
              receiveTimeout: const Duration(seconds: 12),
            ),
          ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          final path = error.requestOptions.path;

          // 401 kelganda avval JIMGINA yangilashga urinamiz. Avval bu yerda
          // darhol logout chaqirilardi - ya'ni token eskirishi bilan haydovchi
          // ish o'rtasida login ekraniga otib yuborilardi.
          //
          // /auth/ endpointlari ISTISNO: login parolining xatosi ham 401
          // qaytaradi va uni yangilashga urinish ma'nosiz (hamda cheksiz
          // halqaga olib kelardi).
          // MUHIM (audit'da topilgan): "retried" belgisi YO'Q edi - agar
          // qayta yuborilgan so'rov ham 401 qaytarsa, bu interceptor UNGA
          // HAM ishga tushib, yana refresh'ga urinardi. Odatda refresh o'zi
          // muvaffaqiyatsiz bo'lib zanjirni to'xtatardi, lekin nazariy
          // jihatdan cheksiz aylanish (va har safar yangi /auth/refresh
          // so'rovi) xavfi bor edi. Endi har bir asl so'rov FAQAT bir marta
          // qayta urinadi.
          final alreadyRetried = error.requestOptions.extra['retried'] == true;
          if (status == 401 && !path.contains('/auth/') && !alreadyRetried) {
            final failedAuthHeader = error.requestOptions.headers['Authorization'];
            final failedToken = failedAuthHeader is String
                ? failedAuthHeader.replaceFirst('Bearer ', '')
                : null;
            final refreshed = await _tryRefresh(failedToken);
            if (refreshed == true) {
              try {
                final opts = error.requestOptions;
                opts.extra['retried'] = true;
                final token = await _storage.readToken();
                opts.headers['Authorization'] = 'Bearer $token';
                final retry = await _dio.fetch(opts);
                return handler.resolve(retry);
              } on DioException catch (retryError) {
                // MUHIM (audit'da topilgan, jiddiy xato): avval BU YERDAGI
                // har qanday xato (tarmoq uzilishi, 500, timeout - refresh
                // MUVAFFAQIYATLI bo'lgandan keyin ham) jimgina yutilib,
                // pastga o'tib ketardi va SO'ZSIZ onUnauthorized() chaqirardi
                // - ya'ni yangilangan, aslida ishlaydigan sessiya bitta
                // vaqtinchalik tarmoq xatosidan o'chirilardi (haydovchining
                // GPS smenasi shu bilan birga to'xtardi). Endi FAQAT qayta
                // urinish ham ANIQ 401/403 qaytarsa (sessiya haqiqatan ham
                // yaroqsiz) logout ishga tushadi - boshqa har qanday xato
                // (masalan vaqtincha 502/tarmoq) so'rovning o'ziga xato
                // sifatida qaytariladi, sessiya tegilmaydi.
                final retryStatus = retryError.response?.statusCode;
                if (retryStatus == 401 || retryStatus == 403) {
                  ApiClient.onUnauthorized?.call();
                }
                return handler.next(retryError);
              }
            }
            // MUHIM: refresh o'zi ANIQ rad etilgan bo'lsagina (server
            // "false" qaytardi - masalan refresh token yaroqsiz/bekor
            // qilingan) logout qilamiz. _performRefresh endi tarmoq
            // xatosini bundan ALOHIDA (istisno sifatida) qaytaradi - shu
            // holatda ham sessiyani o'chirmaymiz, chunki sabab server bilan
            // vaqtinchalik aloqa emas, balki sessiyaning o'zi.
            if (refreshed == false) {
              ApiClient.onUnauthorized?.call();
            }
            return handler.next(error);
          }
          handler.next(error);
        },
      ),
    );
  }

  /// Bir vaqtda bir nechta so'rov 401 olsa, HAR BIRI refresh yubormasligi
  /// kerak: birinchisi so'rov yuboradi, qolganlari SHU Future'ga ulanadi.
  /// Aks holda rotatsiya tufayli ikkinchisi allaqachon ishlatilgan tokenni
  /// yuborib, server buni o'g'irlik deb hisoblab butun sessiyani yopardi -
  /// ya'ni "tuzatish"ning o'zi foydalanuvchini chiqarib yuborardi.
  static Future<bool?>? _refreshFuture;

  /// Qaytarilgan qiymat UCH holatni bildiradi (audit'da topilgan xato,
  /// tuzatildi - avval faqat bool bo'lib, tarmoq xatosi bilan ANIQ rad
  /// etilgan sessiyani farqlab bo'lmasdi):
  ///  - `true`  - yangilandi, qayta urinish mumkin
  ///  - `false` - server ANIQ rad etdi (refresh token yaroqsiz/bekor
  ///              qilingan/o'g'irlik aniqlandi) - sessiya haqiqatan o'lgan
  ///  - `null`  - refresh o'ziga YETIB BORMADI yoki javobni tushunib
  ///              bo'lmadi (tarmoq uzilishi, timeout, 5xx) - sessiya haqida
  ///              hech narsa isbotlanmagan, logout QILMASLIK kerak
  Future<bool?> _tryRefresh(String? failedToken) {
    return _refreshFuture ??= _performRefresh(failedToken).whenComplete(() {
      _refreshFuture = null;
    });
  }

  /// `failedToken` - 401 qaytargan eski token. MUHIM: `background_gps_
  /// service.dart` fon xizmati ham (ALOHIDA isolate'da, shu yerdagi
  /// `_refreshFuture` dedup himoyasi YETMAYDIGAN joyda) xuddi shu refresh-
  /// token bilan yangilashga urinishi mumkin. Refresh-token BIR MARTA
  /// ishlatiladi (rotatsiya) - ikkalasi deyarli bir vaqtda yuborsa,
  /// ikkinchisi "qayta ishlatilgan token" (o'g'irlik alomati) deb qabul
  /// qilinib, BUTUN sessiya oilasi bekor qilinishi mumkin edi. Shu sabab
  /// kichik pauzadan keyin saqlangan tokenni qayta tekshiramiz - agar fon
  /// xizmati ALLAQACHON yangilagan bo'lsa, o'zimiz /auth/refresh'ga
  /// murojaat qilmasdan o'sha yangi tokenni ishlatamiz.
  Future<bool?> _performRefresh(String? failedToken) async {
    if (failedToken != null) {
      await Future.delayed(Duration(milliseconds: 150 + Random.secure().nextInt(350)));
      final maybeAlreadyRefreshed = await _storage.readToken();
      if (maybeAlreadyRefreshed != null && maybeAlreadyRefreshed != failedToken) {
        return true;
      }
    }

    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      // ATAYIN alohida Dio: joriy nusxaning interceptor'i bu so'rovga ham
      // qo'shilib, 401 da o'zini qayta chaqirishi mumkin edi. MUHIM
      // (audit'da topilgan): avval bu Dio'da HECH QANDAY timeout yo'q edi -
      // `_refreshFuture` butun ilova bo'ylab umumiy (static) bo'lgani uchun
      // bitta osilib qolgan so'rov barcha 401 kutayotgan so'rovlarni OS
      // socket-timeout'gacha (odatda daqiqalab) muzlatib qo'yardi.
      final plain = Dio(BaseOptions(
        baseUrl: AppConstants.baseApiUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));
      final res = await plain.post(
        '/auth/refresh',
        data: {
          'refresh_token': refreshToken,
          'device_id': await _storage.deviceId(),
        },
      );

      final data = res.data;
      if (data is Map && data['token'] is String) {
        await _storage.saveTokens(
          token: data['token'] as String,
          refreshToken: data['refreshToken'] as String?,
        );
        return true;
      }
      return false;
    } on DioException catch (e) {
      // MUHIM (audit'da topilgan, jiddiy xato): avval BARCHA xatolar
      // (tarmoq uzilishi, timeout, server 502 - deploy paytida sodir
      // bo'lishi mumkin) bir xil "false" (= sessiya o'lgan) deb qaytarilardi.
      // Faqat serverning O'ZI aniq rad etgani (401/403 javob bilan) haqiqiy
      // "sessiya yaroqsiz" degani - qolgan barchasi "bilmayapman", shu
      // holatda logout QILMASLIK kerak (aks holda vaqtinchalik tarmoq
      // uzilishi yoki backend qayta ishga tushishi butun kompaniyani
      // chiqarib yuborardi).
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        return false;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _request(() => _dio.get(path, queryParameters: query));

  Future<dynamic> post(String path, {Object? data}) =>
      _request(() => _dio.post(path, data: data));

  Future<dynamic> put(String path, {Object? data}) =>
      _request(() => _dio.put(path, data: data));

  Future<dynamic> delete(String path) => _request(() => _dio.delete(path));

  Future<dynamic> _request(Future<Response> Function() call) async {
    try {
      final response = await call();
      return response.data;
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  ApiException _mapError(DioException e) {
    final statusCode = e.response?.statusCode;
    final data = e.response?.data;
    final statusMessage = e.response?.statusMessage;

    // 1. Agar server 'message' fieldi bilan JSON qaytargan bo'lsa - shuni ishlat
    if (data is Map && data['message'] is String) {
      return ApiException(data['message'] as String, statusCode: statusCode);
    }

    // 2. Turiga qarab aniq xabarlar
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          "Server juda sekin javob bermoqda. Internet aloqasini tekshiring.",
          statusCode: statusCode,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          "Internet aloqasi yo'q. Wi-Fi yoki mobil internetni tekshiring.",
          statusCode: statusCode,
        );
      case DioExceptionType.badCertificate:
        return ApiException(
          "Server xavfsizlik sertifikati bilan bog'liq muammo. "
          "Telefoningiz sanasini tekshiring yoki ilovani yangilang.",
          statusCode: statusCode,
        );
      case DioExceptionType.badResponse:
        // Server javob qaytargan, lekin 'message' fieldisiz
        final kodStr = statusCode?.toString() ?? "noma'lum";
        final detail = statusMessage != null ? ' - $statusMessage' : '';
        return ApiException(
          "Server xatolik qaytardi (kod: $kodStr$detail). "
          "Iltimos, administrator bilan bog'laning.",
          statusCode: statusCode,
        );
      case DioExceptionType.cancel:
        return ApiException("So'rov bekor qilindi.", statusCode: statusCode);
      case DioExceptionType.sendTimeout:
        return ApiException(
          "Ma'lumot yubolmayapti. Internetni tekshiring.",
          statusCode: statusCode,
        );
      case DioExceptionType.unknown:
      default:
        // Agar sertifikat xatosi bo'lsa (Android'da keng tarqalgan)
        final socketMsg = e.message?.toString() ?? '';
        if (socketMsg.contains('CERTIFICATE') ||
            socketMsg.contains('certificate') ||
            socketMsg.contains('SSL') ||
            socketMsg.contains('ssl')) {
          return ApiException(
            "Server sertifikatini tekshirib bo'lmadi. "
            "Telefoningiz sanasi va vaqtini tekshiring.",
            statusCode: statusCode,
          );
        }
        return ApiException(
          "Server bilan aloqa o'rnatib bo'lmadi. Internetni tekshirib, "
          "qaytadan urinib ko'ring.",
          statusCode: statusCode,
        );
    }
  }
}
