import 'dart:convert';
import 'dart:math';
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
    String? refreshToken,
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
      if (refreshToken != null)
        _storage.write(key: AppConstants.keyRefreshToken, value: refreshToken),
    ]);
  }

  Future<String?> readToken() => _storage.read(key: AppConstants.keyToken);

  Future<String?> readRefreshToken() =>
      _storage.read(key: AppConstants.keyRefreshToken);

  /// Faqat tokenlarni almashtiradi (refresh oqimi uchun) - qolgan sessiya
  /// ma'lumotlari (user, permissions) o'z joyida qoladi.
  Future<void> saveTokens({required String token, String? refreshToken}) async {
    await _storage.write(key: AppConstants.keyToken, value: token);
    if (refreshToken != null) {
      await _storage.write(
        key: AppConstants.keyRefreshToken,
        value: refreshToken,
      );
    }
  }

  /// Qurilma identifikatori - refresh token AYNAN shu qurilmaga bog'lanadi.
  /// Bir marta yaratiladi va qurilmada doimiy qoladi; sessiya tozalanganda
  /// ham o'chirilmaydi (bu qurilmaning o'ziga tegishli, sessiyaga emas).
  Future<String> deviceId() async {
    final existing = await _storage.read(key: AppConstants.keyDeviceId);
    if (existing != null && existing.isNotEmpty) return existing;

    final rnd = Random.secure().nextInt(0x7fffffff);
    final generated = '${DateTime.now().microsecondsSinceEpoch}-$rnd';
    await _storage.write(key: AppConstants.keyDeviceId, value: generated);
    return generated;
  }

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

  /// Faqat ruxsatlar keshini yangilaydi (sessiya tiklanganda serverdan
  /// qayta so'ralgan yangi qiymat bilan) - qolgan sessiya ma'lumotlariga
  /// tegmaydi.
  Future<void> savePermissions(Map<String, dynamic> permissions) async {
    await _storage.write(
      key: AppConstants.keyPermissions,
      value: jsonEncode(permissions),
    );
  }

  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: AppConstants.keyToken),
      _storage.delete(key: AppConstants.keyTenantId),
      _storage.delete(key: AppConstants.keyUser),
      _storage.delete(key: AppConstants.keyPermissions),
      _storage.delete(key: AppConstants.keyRefreshToken),
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

  /// Haydovchi/ishchi ONLINE (GPS kuzatuv yoqilgan) holatda ekanini saqlaydi.
  /// MUHIM: bu holat ilova ochilganda AVTOMATIK tiklanmaydi (bunday avtomatik
  /// tiklash ilovani har safar ochilishda yiqilib qolishiga sabab bo'lgani
  /// uchun ataylab o'chirilgan) - hozircha faqat UI'ning o'zi (ValueNotifier)
  /// uchun yordamchi sifatida saqlanadi.
  Future<void> saveShiftStatus(bool isOnline) async {
    await _storage.write(
      key: AppConstants.keyShiftStatus,
      value: isOnline ? 'ONLINE' : 'OFFLINE',
    );
  }
}
