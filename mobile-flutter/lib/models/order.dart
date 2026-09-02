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
  /// Mijozning saqlangan GPS lokatsiyasi (avvalgi buyurtmada haydovchi
  /// "Joylashuvni belgilash"ni bosgan bo'lsa) - buyurtmaning O'ZIDA hali
  /// koordinata yo'q bo'lsa (masalan bu funksiya qo'shilishidan OLDIN
  /// yaratilgan eski buyurtma) navigatsiya uchun zaxira sifatida ishlatiladi.
  final double? latitude;
  final double? longitude;

  OrderClientInfo({
    required this.fullName,
    required this.phone,
    required this.address,
    this.latitude,
    this.longitude,
  });

  factory OrderClientInfo.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return OrderClientInfo(fullName: "Noma'lum", phone: '', address: '');
    }
    return OrderClientInfo(
      fullName: json['fullName'] ?? "Noma'lum",
      phone: json['phone'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
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
  // Shu gilamga sex xodimi tomonidan ALOHIDA belgilangan narx (bo'lmasa null -
  // buyurtma narxini hisoblashda xizmat narxi x o'lchov bo'yicha avtomatik olinadi).
  final double? price;

  OrderItemInfo({
    required this.id,
    required this.name,
    required this.length,
    required this.width,
    required this.quantity,
    required this.status,
    this.price,
  });

  factory OrderItemInfo.fromJson(Map<String, dynamic> json) {
    return OrderItemInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Gilam',
      length: (json['length'] as num?)?.toDouble() ?? 0.0,
      width: (json['width'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      status: json['status'] ?? 'ACCEPTED',
      price: (json['price'] as num?)?.toDouble(),
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
  // MUHIM (jonli xato: "mas'ul hodim noto'g'ri ko'rsatilyapti"): eski
  // `workerName` ham haydovchini, ham sex hodimini bir xil joyga yozardi -
  // shu sabab sex ekranida "Haydovchi" deb doim shu ism ko'rsatilardi,
  // garchi u aslida sex hodimining o'zi bo'lsa ham. Backend endi ikkalasini
  // alohida (`driver`/`sexWorker`) qaytaradi - shu ikkisi ishlatilishi kerak.
  final String? driverId;
  final String? driverName;
  final String? sexWorkerName;
  final String createdAt;
  final double collectedPrice;
  final String paymentStatus;
  // To'lov qanday olinganini bildiradi (CASH/CARD/MIXED) - to'lov hali
  // qabul qilinmagan bo'lsa null.
  final String? paymentMethod;
  final double cashAmount;
  final double cardAmount;
  final List<OrderItemInfo> items;
  final String measurementUnit;
  final double servicePrice;
  // Buyurtma statusi birinchi marta "sex zonasi"ga o'tgan payt (backend
  // birinchi safar o'zi qayd etadi) - sexdagi navbatni HAQIQIY jismoniy
  // kelish tartibi bo'yicha saralash uchun (createdAt - buyurtma yaratilgan
  // payt, sexga kelgan payt bilan bir xil emas).
  final DateTime? workshopEnteredAt;

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
    this.driverId,
    this.driverName,
    this.sexWorkerName,
    required this.createdAt,
    required this.collectedPrice,
    required this.paymentStatus,
    this.paymentMethod,
    this.cashAmount = 0.0,
    this.cardAmount = 0.0,
    required this.items,
    required this.measurementUnit,
    required this.servicePrice,
    this.workshopEnteredAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final service = json['service'] as Map<String, dynamic>?;
    final worker = json['worker'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final sexWorker = json['sexWorker'] as Map<String, dynamic>?;
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
      driverId: driver?['id'],
      driverName: driver?['fullName'],
      sexWorkerName: sexWorker?['fullName'],
      createdAt: json['createdAt'] ?? '',
      collectedPrice: (json['collectedPrice'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      paymentMethod: json['paymentMethod'] as String?,
      cashAmount: (json['cashAmount'] as num?)?.toDouble() ?? 0.0,
      cardAmount: (json['cardAmount'] as num?)?.toDouble() ?? 0.0,
      items: (json['items'] as List?)
              ?.map((i) => OrderItemInfo.fromJson(i as Map<String, dynamic>))
              .toList() ??
          [],
      measurementUnit: service?['measurementUnit'] ?? 'm²',
      servicePrice: (service?['price'] as num?)?.toDouble() ?? 0.0,
      workshopEnteredAt: json['workshopEnteredAt'] != null
          ? DateTime.tryParse(json['workshopEnteredAt'] as String)
          : null,
    );
  }

  /// Sex navbatida saralash uchun HAQIQIY kelish vaqti - agar backend hali
  /// workshopEnteredAt'ni qayd etmagan bo'lsa (masalan eski, bu maydon
  /// qo'shilishidan oldin sexga kirgan buyurtmalar) createdAt'ga tushadi.
  DateTime get workshopArrivalTime =>
      workshopEnteredAt ?? DateTime.tryParse(createdAt) ?? DateTime.now();
}
