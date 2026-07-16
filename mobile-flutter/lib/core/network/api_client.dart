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
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            ApiClient.onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
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
    String message = "Server bilan aloqa o'rnatib bo'lmadi";

    if (data is Map && data['message'] is String) {
      message = data['message'] as String;
    } else if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      message = 'Server javob bermadi. Internet aloqasini tekshiring.';
    } else if (e.type == DioExceptionType.connectionError) {
      message = "Serverga ulanib bo'lmadi. Internetni tekshiring.";
    }

    return ApiException(message, statusCode: statusCode);
  }
}
