class Order {
  final String id; // UUID
  final String code; // sequential human-readable ID (e.g. ORD-2026-00001)
  final String clientName;
  final String clientPhone;
  final String serviceName;
  final double price;
  final String address;
  final String statusId;
  final String statusName;
  final String statusColor;
  final String workerName;
  final String description;
  final double quantity;
  final String measurementUnit;
  final double? latitude;
  final double? longitude;
  final String createdAt;

  Order({
    required this.id,
    required this.code,
    required this.clientName,
    required this.clientPhone,
    required this.serviceName,
    required this.price,
    required this.address,
    required this.statusId,
    required this.statusName,
    required this.statusColor,
    required this.workerName,
    required this.description,
    required this.quantity,
    required this.measurementUnit,
    this.latitude,
    this.longitude,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      code: json['code'] ?? 'ORD-00000',
      clientName: json['client_name'] ?? '',
      clientPhone: json['client_phone'] ?? '',
      serviceName: json['service_name'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      address: json['address'] ?? '',
      statusId: json['status_id'] ?? '1',
      statusName: json['status_name'] ?? 'Qabul qilindi',
      statusColor: json['status_color'] ?? '#3b82f6',
      workerName: json['worker_name'] ?? '',
      description: json['description'] ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,
      measurementUnit: json['measurement_unit'] ?? 'dona',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'client_name': clientName,
      'client_phone': clientPhone,
      'service_name': serviceName,
      'price': price,
      'address': address,
      'status_id': statusId,
      'status_name': statusName,
      'status_color': statusColor,
      'worker_name': workerName,
      'description': description,
      'quantity': quantity,
      'measurement_unit': measurementUnit,
      'latitude': latitude,
      'longitude': longitude,
      'created_at': createdAt,
    };
  }
}
