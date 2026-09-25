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

  // 2026-09-09: "ulashiladigan Dio" optimallashtirishi (TCP ulanishni qayta
  // ishlatish uchun) HAQIQIY, hali sababi to'liq aniqlanmagan xatoga olib
  // keldi - ba'zi holatlarda /roles so'roviga Authorization header UMUMAN
  // qo'shilmay qoldi (interceptor chaqirilmadi), natijada foydalanuvchi
  // ruxsatlari bo'sh qaytib, mobil menyular yo'qolib qolardi. Xavfsizlik
  // ustunroq, shuning uchun HAR BIR ApiClient() yana o'zining alohida Dio'si
  // va interceptor'iga ega bo'ladi - bu avval isbotlangan holicha ishlaydi.
  ApiClient({SecureStorageService? storage, Dio? dio})
    : _storage = storage ?? SecureStorageService(),
      _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConstants.baseApiUrl,
              connectTimeout: const Duration(seconds: 12),
              receiveTimeout: const Duration(seconds: 12),
              sendTimeout: const Duration(seconds: 20),
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
          if (status == 401 && !path.contains('/auth/')) {
            final refreshed = await _tryRefresh();
            if (refreshed) {
              try {
                final opts = error.requestOptions;
                final token = await _storage.readToken();
                opts.headers['Authorization'] = 'Bearer $token';
                final retry = await _dio.fetch(opts);
                return handler.resolve(retry);
              } catch (_) {
                // qayta urinish ham muvaffaqiyatsiz - pastdagi logout ishlaydi
              }
            }
            ApiClient.onUnauthorized?.call();
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
  static Future<bool>? _refreshFuture;

  Future<bool> _tryRefresh() {
    return _refreshFuture ??= _performRefresh().whenComplete(() {
      _refreshFuture = null;
    });
  }

  Future<bool> _performRefresh() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      // ATAYIN alohida Dio: joriy nusxaning interceptor'i bu so'rovga ham
      // qo'shilib, 401 da o'zini qayta chaqirishi mumkin edi.
      final plain = Dio(BaseOptions(baseUrl: AppConstants.baseApiUrl));
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
    } catch (_) {
      return false;
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
