import '../../../core/network/api_client.dart';

/// Kompaniya sozlamalari. Backend PUT /company camelCase kutadi.
class CompanyInfo {
  final String name;
  final String phone;
  final String email;
  final String address;
  final int minOrderPrice;
  final int driverKpiPercent;
  final String workStartTime;
  final String workEndTime;
  final bool smsEnabled;
  final String smsCreated;
  final String smsAssigned;
  final String smsCompleted;

  const CompanyInfo({
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
    required this.minOrderPrice,
    required this.driverKpiPercent,
    required this.workStartTime,
    required this.workEndTime,
    this.smsEnabled = false,
    this.smsCreated = '',
    this.smsAssigned = '',
    this.smsCompleted = '',
  });

  factory CompanyInfo.fromJson(Map<String, dynamic> json) => CompanyInfo(
        name: json['name']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        address: json['address']?.toString() ?? '',
        minOrderPrice: (json['minOrderPrice'] as num?)?.toInt() ?? 0,
        driverKpiPercent: (json['driverKpiPercent'] as num?)?.toInt() ?? 0,
        workStartTime: json['workStartTime']?.toString() ?? '',
        workEndTime: json['workEndTime']?.toString() ?? '',
        smsEnabled: json['smsEnabled'] == true,
        smsCreated: json['smsTemplateCreated']?.toString() ?? '',
        smsAssigned: json['smsTemplateAssigned']?.toString() ?? '',
        smsCompleted: json['smsTemplateCompleted']?.toString() ?? '',
      );
}

/// Xizmat katalogi elementi. DIQQAT: o'qishda camelCase (`nameUz`), yozishda
/// esa snake_case (`name_uz`, `measurement_unit`) - ServiceController shunday
/// qurilgan. Ikkisini aralashtirib yubormaslik uchun konvertatsiya shu yerda.
class ServiceCatalogItem {
  final String id;
  final String nameUz;
  final String category;
  final double price;
  final String measurementUnit;

  const ServiceCatalogItem({
    required this.id,
    required this.nameUz,
    required this.category,
    required this.price,
    required this.measurementUnit,
  });

  factory ServiceCatalogItem.fromJson(Map<String, dynamic> json) => ServiceCatalogItem(
        id: json['id']?.toString() ?? '',
        nameUz: json['nameUz']?.toString() ?? '',
        category: json['category']?.toString() ?? '',
        price: (json['price'] as num?)?.toDouble() ?? 0,
        measurementUnit: json['measurementUnit']?.toString() ?? '',
      );
}

class StatusItem {
  final String id;
  final String nameUz;
  final String colorCode;
  final bool isSystem;

  const StatusItem({
    required this.id,
    required this.nameUz,
    required this.colorCode,
    required this.isSystem,
  });

  factory StatusItem.fromJson(Map<String, dynamic> json) => StatusItem(
        id: json['id']?.toString() ?? '',
        nameUz: json['nameUz']?.toString() ?? '',
        colorCode: json['colorCode']?.toString() ?? '#3b82f6',
        isSystem: json['isSystem'] == true || json['system'] == true,
      );
}

class RoleItem {
  final String id;
  final String key;
  final String nameUz;
  final bool isSystem;
  final int grantedCount;
  final String nameRu;
  final String nameEn;
  final Map<String, bool> permissions;

  const RoleItem({
    required this.id,
    required this.key,
    required this.nameUz,
    required this.isSystem,
    required this.grantedCount,
    this.nameRu = '',
    this.nameEn = '',
    this.permissions = const {},
  });

  factory RoleItem.fromJson(Map<String, dynamic> json) {
    final perms = json['permissions'];
    var granted = 0;
    if (perms is Map) {
      granted = perms.values.where((v) => v == true).length;
    }
    return RoleItem(
      id: json['id']?.toString() ?? '',
      key: json['key']?.toString() ?? '',
      nameUz: json['nameUz']?.toString() ?? '',
      isSystem: json['isSystem'] == true || json['system'] == true,
      grantedCount: granted,
      nameRu: json['nameRu']?.toString() ?? '',
      nameEn: json['nameEn']?.toString() ?? '',
      permissions: perms is Map
          ? perms.map((k, v) => MapEntry(k.toString(), v == true))
          : const <String, bool>{},
    );
  }
}

class SettingsRepository {
  final ApiClient _api;

  SettingsRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<CompanyInfo> fetchCompany() async {
    final data = await _api.get('/company');
    return CompanyInfo.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> updateCompany(Map<String, dynamic> changes) => _api.put('/company', data: changes);

  Future<List<ServiceCatalogItem>> fetchServices() async {
    final data = await _api.get('/services') as List;
    return data.cast<Map<String, dynamic>>().map(ServiceCatalogItem.fromJson).toList();
  }

  Future<void> saveService({
    String? id,
    required String nameUz,
    required double price,
    required String measurementUnit,
    String category = 'GENERAL',
  }) {
    final body = {
      'name_uz': nameUz,
      // Backend uchala til nomini ham kutadi; mobil ilovada bitta maydon
      // yetarli bo'lgani uchun qolganlari shu qiymat bilan to'ldiriladi -
      // administrator kerak bo'lsa webdan aniqlashtiradi.
      'name_ru': nameUz,
      'name_en': nameUz,
      'price': price,
      'measurement_unit': measurementUnit,
      'category': category,
    };
    return id == null ? _api.post('/services', data: body) : _api.put('/services/$id', data: body);
  }

  Future<void> deleteService(String id) => _api.delete('/services/$id');

  Future<List<StatusItem>> fetchStatuses() async {
    final data = await _api.get('/order-statuses') as List;
    return data.cast<Map<String, dynamic>>().map(StatusItem.fromJson).toList();
  }

  /// Status qo'shish/tahrirlash. Backend uchala til nomini ham kutadi;
  /// mobil ilovada bitta maydon yetarli bo'lgani uchun qolganlari shu qiymat
  /// bilan to'ldiriladi (administrator kerak bo'lsa webdan aniqlashtiradi).
  Future<void> saveStatus({
    String? id,
    required String nameUz,
    required String colorCode,
  }) {
    final body = {
      'name_uz': nameUz.trim(),
      'name_ru': nameUz.trim(),
      'name_en': nameUz.trim(),
      'color_code': colorCode,
    };
    return id == null
        ? _api.post('/order-statuses', data: body)
        : _api.put('/order-statuses/$id', data: body);
  }

  Future<void> deleteStatus(String id) => _api.delete('/order-statuses/$id');

  /// Tartibni saqlash. Backend TARTIBLANGAN id massivini oladi (obyekt emas)
  /// va `sortOrder` ni shu ketma-ketlik bo'yicha qayta yozadi.
  Future<void> reorderStatuses(List<String> orderedIds) =>
      _api.put('/order-statuses/reorder', data: orderedIds);

  Future<List<RoleItem>> fetchRoles() async {
    final data = await _api.get('/roles') as List;
    return data.cast<Map<String, dynamic>>().map(RoleItem.fromJson).toList();
  }

  /// Mavjud huquq kalitlari - backend `PermissionKeys.ALL` dan keladi.
  /// Qattiq yozilgan ro'yxat ATAYIN ishlatilmaydi: backendga yangi kalit
  /// qo'shilsa, mobil ilova kod o'zgarishisiz uni ko'rsatadi.
  Future<List<String>> fetchPermissionKeys() async {
    final data = await _api.get('/roles/permission-keys') as List;
    return data.map((e) => e.toString()).toList();
  }

  /// Rol huquqlarini saqlash. Backend nomlarni ham talab qiladi, shuning
  /// uchun ular o'zgarmasa ham qayta yuboriladi.
  Future<void> saveRolePermissions({
    required String id,
    required String nameUz,
    required String nameRu,
    required String nameEn,
    required Map<String, bool> permissions,
  }) {
    return _api.put('/roles/$id', data: {
      'name_uz': nameUz,
      'name_ru': nameRu,
      'name_en': nameEn,
      'permissions': permissions,
    });
  }
}
