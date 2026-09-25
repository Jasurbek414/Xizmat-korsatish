import '../../../core/network/api_client.dart';
import '../../team/repository/team_repository.dart';

/// Xodimlar boshqaruvi (ADMIN/MENEJER).
///
/// Model sifatida mavjud [TeamMember] qayta ishlatiladi - u allaqachon
/// `/employees` javobidagi maydonlarni (fullName, phone, role, status,
/// joylashuv) o'qiydi, takrorlashning hojati yo'q.
///
/// DIQQAT: backend YOZISHDA snake_case kutadi (`full_name`, `salary_type`),
/// O'QISHDA esa camelCase qaytaradi. Shu nomuvofiqlik shu yerda bir joyda
/// hal qilinadi.
class EmployeesRepository {
  final ApiClient _api;

  EmployeesRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<List<TeamMember>> fetchAll() async {
    final data = await _api.get('/employees') as List;
    final list = data.cast<Map<String, dynamic>>().map(TeamMember.fromJson).toList();
    list.sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
    return list;
  }

  /// Rollar ro'yxati - xodim yaratishda tanlash uchun.
  /// `key` kod ichida ishlatiladigan o'zgarmas identifikator, `nameUz` esa
  /// administratorga ko'rsatiladigan nom.
  Future<List<({String key, String nameUz})>> fetchRoles() async {
    final data = await _api.get('/roles') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map((r) => (
              key: r['key']?.toString() ?? '',
              nameUz: r['nameUz']?.toString() ?? r['key']?.toString() ?? '',
            ))
        .where((r) => r.key.isNotEmpty)
        .toList();
  }

  Future<void> create({
    required String fullName,
    required String username,
    required String password,
    required String phone,
    required String role,
    double salary = 0,
  }) {
    return _api.post('/employees', data: {
      'full_name': fullName.trim(),
      'username': username.trim(),
      'password': password,
      'phone': phone.trim(),
      'role': role,
      'salary': salary,
    });
  }

  /// `username` ixtiyoriy: berilsa login o'zgartiriladi. Backend uni band
  /// emasligini tekshiradi va band bo'lsa xato qaytaradi (username butun
  /// baza bo'ylab yagona).
  Future<void> update({
    required String id,
    required String fullName,
    required String phone,
    required String role,
    String? username,
    double? salary,
  }) {
    return _api.put('/employees/$id', data: {
      'full_name': fullName.trim(),
      'phone': phone.trim(),
      'role': role,
      if (username != null && username.trim().isNotEmpty) 'username': username.trim(),
      if (salary != null) 'salary': salary,
    });
  }

  /// Bloklash / blokdan chiqarish. Backend `status` maydonini kutadi va uni
  /// o'zi katta harfga o'giradi (`ACTIVE` / `BLOCKED`).
  ///
  /// MUHIM: bloklangan xodimning mavjud tokeni ham darhol kuchsizlanadi -
  /// `JwtAuthenticationFilter` har so'rovda statusni tekshiradi (2026-08-03 da
  /// qo'shilgan). Ya'ni bu tugma haqiqatan darhol ta'sir qiladi.
  Future<void> setStatus({required String id, required bool active}) {
    return _api.put('/employees/$id', data: {'status': active ? 'ACTIVE' : 'BLOCKED'});
  }

  Future<void> resetPassword({required String id, required String password}) {
    return _api.put('/employees/$id/password', data: {'password': password});
  }

  Future<void> delete(String id) => _api.delete('/employees/$id');
}
