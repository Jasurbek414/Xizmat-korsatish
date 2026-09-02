import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../models/user.dart';
import '../../gps/services/background_gps_service.dart';

class SubdomainInfo {
  final String companyId;
  final String companyName;
  final String subdomain;
  final String status;

  SubdomainInfo({
    required this.companyId,
    required this.companyName,
    required this.subdomain,
    required this.status,
  });
}

class LoginResult {
  final String token;
  final User user;
  final Permissions permissions;

  LoginResult({
    required this.token,
    required this.user,
    required this.permissions,
  });
}

/// Auth bilan bog'liq barcha backend chaqiruvlarini birlashtiradi va
/// sessiyani (token, foydalanuvchi, ruxsatlar) xavfsiz saqlashni boshqaradi.
class AuthRepository {
  final ApiClient _api;
  final SecureStorageService _storage;

  AuthRepository({ApiClient? api, SecureStorageService? storage})
    : _api = api ?? ApiClient(),
      _storage = storage ?? SecureStorageService();

  Future<SubdomainInfo> checkSubdomain(String subdomain) async {
    final data = await _api.get('/auth/subdomain/$subdomain');
    return SubdomainInfo(
      companyId: data['id'] as String,
      companyName: data['name'] as String,
      subdomain: data['subDomain'] as String,
      status: data['status'] as String,
    );
  }

  Future<LoginResult> login({
    required String username,
    required String password,
    required String subdomain,
    required String companyId,
  }) async {
    // MUHIM (2026-08-04 da topilgan): `subdomain` (kompaniya kodi) parametr
    // sifatida olinardi-yu, so'rovga QO'SHILMASDI. Natijada bir kompaniya
    // kodini kiritib, boshqa kompaniya xodimining login-paroli bilan kirib
    // ketish mumkin edi - kod maydoni amalda bezak bo'lib qolgandi.
    // Endi server uni tekshiradi va mos kelmasa 401 qaytaradi.
    final data = await _api.post(
      '/auth/login',
      data: {
        'username': username,
        'password': password,
        'company_code': subdomain,
        'client_type': 'MOBILE',
        // Refresh token AYNAN shu qurilmaga bog'lanadi - boshqa telefonga
        // ko'chirilsa server sessiyani yopadi.
        'device_id': await _storage.deviceId(),
      },
    );

    final token = data['token'] as String;
    final refreshToken = data['refreshToken'] as String?;
    final userJson = Map<String, dynamic>.from(data['user'] as Map);
    final user = User.fromApiJson(userJson, companyId: companyId);

    // Token endi so'rov interceptor'i orqali avtomatik yuboriladi, shu sabab
    // ruxsatlarni olishdan oldin uni birinchi saqlab qo'yamiz.
    await _storage.saveSession(
      token: token,
      tenantId: companyId,
      subdomain: subdomain,
      user: userJson,
      permissions: const {},
      refreshToken: refreshToken,
    );

    final permissions = await _fetchPermissionsForRole(user.role);

    await _storage.saveSession(
      token: token,
      tenantId: companyId,
      subdomain: subdomain,
      user: userJson,
      permissions: permissions.toJson(),
      refreshToken: refreshToken,
    );

    return LoginResult(token: token, user: user, permissions: permissions);
  }

  Future<Permissions> _fetchPermissionsForRole(String roleKey) async {
    try {
      final rolesRaw = await _api.get('/roles') as List;
      final match = rolesRaw.cast<Map<String, dynamic>>().firstWhere(
        (r) => r['key'] == roleKey,
        orElse: () => const {},
      );
      return Permissions.fromJson(
        match['permissions'] as Map<String, dynamic>?,
      );
    } on ApiException {
      // Ruxsatlarni olishning imkoni bo'lmasa ham, foydalanuvchi tizimga kira
      // olishi kerak - shunchaki hech qanday mobil modul ko'rsatilmaydi.
      return const Permissions({});
    }
  }

  /// Ilova qayta ochilganda avval saqlangan sessiyani tiklaydi.
  Future<LoginResult?> restoreSession() async {
    final token = await _storage.readToken();
    final userJson = await _storage.readUser();
    final permissionsJson = await _storage.readPermissions();
    if (token == null || userJson == null) return null;

    final companyId = userJson['companyId'] as String? ?? '';
    return LoginResult(
      token: token,
      user: User.fromApiJson(userJson, companyId: companyId),
      permissions: Permissions.fromJson(permissionsJson),
    );
  }

  /// Chiqish. Refresh tokenni SERVERDA ham bekor qiladi - aks holda u
  /// qurilmadan o'chirilsa ham 30 kun yaroqli qolardi va nusxasi bo'lgan
  /// odam undan foydalanaverardi.
  ///
  /// Tarmoq xatosi chiqishni to'smasligi kerak: server javob bermasa ham
  /// mahalliy sessiya baribir tozalanadi.
  Future<void> logout() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await _api.post('/auth/logout', data: {'refresh_token': refreshToken});
      } catch (_) {
        // jimgina o'tkazamiz
      }
    }
    await _storage.clearSession();

    // MUHIM (audit'da topilgan xato, tuzatildi): bu yerda avval GPS fon
    // xizmatining ONLINE holati tozalanmasdi. 401 orqali MAJBURIY chiqishdan
    // keyin (masalan sessiya boshqa joyda bekor qilingan bo'lsa) haydovchi
    // qayta kirganda `ShiftToggleButton` hamon "ONLINE" ko'rsatardi - garchi
    // fon xizmati (token yo'qligi sababli) allaqachon jimgina pauzaga
    // o'tgan bo'lsa ham. Tugmani bosish esa "ONLINE"dan "OFFLINE"ga
    // o'tkazishga urinardi (chunki UI ONLINE deb hisoblardi), ya'ni
    // haydovchi kuzatuvni HAQIQATAN yoqish uchun tugmani IKKI marta bosishi
    // kerak bo'lib qolardi. Endi chiqishda holat aniq OFFLINE'ga qaytariladi.
    await BackgroundGpsService.stop();
  }

  Future<String?> readSavedSubdomain() => _storage.readSubdomain();
}
