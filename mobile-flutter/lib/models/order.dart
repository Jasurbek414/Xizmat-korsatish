/// Backend `Order` entity'sining JSON ko'rinishiga mos model (camelCase,
/// ichma-ich obyektlar). Faqat mobil ilova uchun kerakli maydonlar o'qiladi.
class OrderStatusInfo {
  final String id;
  final String nameUz;
  final String nameRu;
  final String nameEn;
  final String colorCode;
  final int sortOrder;

  OrderStatusInfo({
    required this.id,
    required this.nameUz,
    required this.nameRu,
    required this.nameEn,
    required this.colorCode,
    required this.sortOrder,
  });

  factory OrderStatusInfo.fromJson(Map<String, dynamic> json) {
    return OrderStatusInfo(
      id: json['id'] ?? '',
      nameUz: json['nameUz'] ?? '',
      nameRu: json['nameRu'] ?? '',
      nameEn: json['nameEn'] ?? '',
      colorCode: json['colorCode'] ?? '#3b82f6',
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

class OrderClientInfo {
  final String fullName;
  final String phone;
  final String address;

  OrderClientInfo({
    required this.fullName,
    required this.phone,
    required this.address,
  });

  factory OrderClientInfo.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return OrderClientInfo(fullName: "Noma'lum", phone: '', address: '');
    }
    return OrderClientInfo(
      fullName: json['fullName'] ?? "Noma'lum",
      phone: json['phone'] ?? '',
      address: json['address'] ?? '',
    );
  }
}

class OrderItemInfo {
  final String id;
  final String name;
  final double length;
  final double width;
  final int quantity;
  final String status; // ACCEPTED, WASHED, DRIED, READY

  OrderItemInfo({
    required this.id,
    required this.name,
    required this.length,
    required this.width,
    required this.quantity,
    required this.status,
  });

  factory OrderItemInfo.fromJson(Map<String, dynamic> json) {
    return OrderItemInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Gilam',
      length: (json['length'] as num?)?.toDouble() ?? 0.0,
      width: (json['width'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      status: json['status'] ?? 'ACCEPTED',
    );
  }
}

class Order {
  final String id;
  final OrderClientInfo client;
  final String serviceName;
  final double price;
  final String description;
  final String address;
  final double? latitude;
  final double? longitude;
  final OrderStatusInfo? status;
  final String? workerId;
  final String? workerName;
  final String createdAt;
  final double collectedPrice;
  final String paymentStatus;
  final List<OrderItemInfo> items;

  Order({
    required this.id,
    required this.client,
    required this.serviceName,
    required this.price,
    required this.description,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.workerId,
    required this.workerName,
    required this.createdAt,
    required this.collectedPrice,
    required this.paymentStatus,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final service = json['service'] as Map<String, dynamic>?;
    final worker = json['worker'] as Map<String, dynamic>?;
    final statusJson = json['status'] as Map<String, dynamic>?;

    return Order(
      id: json['id'] ?? '',
      client: OrderClientInfo.fromJson(json['client'] as Map<String, dynamic>?),
      serviceName: service?['nameUz'] ?? "Noma'lum xizmat",
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      status: statusJson != null ? OrderStatusInfo.fromJson(statusJson) : null,
      workerId: worker?['id'],
      workerName: worker?['fullName'],
      createdAt: json['createdAt'] ?? '',
      collectedPrice: (json['collectedPrice'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      items: (json['items'] as List?)
              ?.map((i) => OrderItemInfo.fromJson(i as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
