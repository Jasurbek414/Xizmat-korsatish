class ServiceInfo {
  final String id;
  final String nameUz;
  final String nameRu;
  final String nameEn;
  final double price;
  final String measurementUnit;

  ServiceInfo({
    required this.id,
    required this.nameUz,
    required this.nameRu,
    required this.nameEn,
    required this.price,
    required this.measurementUnit,
  });

  factory ServiceInfo.fromJson(Map<String, dynamic> json) {
    return ServiceInfo(
      id: json['id'] ?? '',
      nameUz: json['nameUz'] ?? '',
      nameRu: json['nameRu'] ?? '',
      nameEn: json['nameEn'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      measurementUnit: json['measurementUnit'] ?? 'm²',
    );
  }
}

class ClientInfo {
  final String id;
  final String fullName;
  final String phone;
  final String address;

  ClientInfo({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.address,
  });

  factory ClientInfo.fromJson(Map<String, dynamic> json) {
    return ClientInfo(
      id: json['id'] ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'] ?? '',
      address: json['address'] ?? '',
    );
  }
}
