import '../../../core/network/api_client.dart';

/// Mijoz kartochkasi. Backend `Client` entity'si (id/fullName/phone/address/
/// createdAt) camelCase qaytaradi, lekin YOZISHDA snake_case kutadi
/// (`full_name`) - ClientController'dagi `request.get("full_name")`. Shu
/// nomuvofiqlik `toCreateJson()` ichida bir joyda hal qilinadi, aks holda
/// har bir ekran o'zicha xato yozishi mumkin edi.
class ClientRecord {
  final String id;
  final String fullName;
  final String phone;
  final String address;
  final DateTime? createdAt;

  const ClientRecord({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.address,
    this.createdAt,
  });

  factory ClientRecord.fromJson(Map<String, dynamic> json) {
    return ClientRecord(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'] ?? '',
      address: json['address'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }

  static Map<String, dynamic> toCreateJson({
    required String fullName,
    required String phone,
    required String address,
  }) => {
    'full_name': fullName.trim(),
    'phone': phone.trim(),
    'address': address.trim(),
  };

  /// Ro'yxatda avatar harfi uchun.
  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
}

class ClientsRepository {
  final ApiClient _api;

  ClientsRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<List<ClientRecord>> fetchAll() async {
    final data = await _api.get('/clients') as List;
    return data.cast<Map<String, dynamic>>().map(ClientRecord.fromJson).toList();
  }

  Future<ClientRecord> create({
    required String fullName,
    required String phone,
    required String address,
  }) async {
    final data = await _api.post(
      '/clients',
      data: ClientRecord.toCreateJson(fullName: fullName, phone: phone, address: address),
    );
    return ClientRecord.fromJson(data as Map<String, dynamic>);
  }

  Future<ClientRecord> update({
    required String id,
    required String fullName,
    required String phone,
    required String address,
  }) async {
    final data = await _api.put(
      '/clients/$id',
      data: ClientRecord.toCreateJson(fullName: fullName, phone: phone, address: address),
    );
    return ClientRecord.fromJson(data as Map<String, dynamic>);
  }

  Future<void> delete(String id) => _api.delete('/clients/$id');
}
