import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants.dart';

/// JWT tokeni va joriy sessiya ma'lumotlarini xavfsiz (shifrlangan) saqlash uchun.
/// SharedPreferences/Hive'dan farqli o'laroq, bu ma'lumotlar qurilma xotirasida
/// oddiy matn holida saqlanmaydi.
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveSession({
    required String token,
    required String tenantId,
    required String subdomain,
    required Map<String, dynamic> user,
    required Map<String, dynamic> permissions,
  }) async {
    await Future.wait([
      _storage.write(key: AppConstants.keyToken, value: token),
      _storage.write(key: AppConstants.keyTenantId, value: tenantId),
      _storage.write(key: AppConstants.keySubdomain, value: subdomain),
      _storage.write(key: AppConstants.keyUser, value: jsonEncode(user)),
      _storage.write(
        key: AppConstants.keyPermissions,
        value: jsonEncode(permissions),
      ),
    ]);
  }

  Future<String?> readToken() => _storage.read(key: AppConstants.keyToken);

  Future<String?> readSubdomain() =>
      _storage.read(key: AppConstants.keySubdomain);

  Future<Map<String, dynamic>?> readUser() async {
    final raw = await _storage.read(key: AppConstants.keyUser);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> readPermissions() async {
    final raw = await _storage.read(key: AppConstants.keyPermissions);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: AppConstants.keyToken),
      _storage.delete(key: AppConstants.keyTenantId),
      _storage.delete(key: AppConstants.keyUser),
      _storage.delete(key: AppConstants.keyPermissions),
    ]);
  }

  /// Dark/light mode holatini saqlash va o'qish
  Future<void> saveThemeMode(bool isDark) async {
    await _storage.write(
      key: AppConstants.keyDarkMode,
      value: isDark.toString(),
    );
  }

  Future<bool?> readThemeMode() async {
    final raw = await _storage.read(key: AppConstants.keyDarkMode);
    if (raw == null) return null;
    return raw == 'true';
  }
}
