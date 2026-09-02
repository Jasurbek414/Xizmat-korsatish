import '../../../core/network/api_client.dart';

/// Administrator/menejer ko'radigan buyurtma - haydovchi ko'radigan
/// `models/order.dart` dan FARQ QILADI: bu yerda kompaniyaning BARCHA
/// buyurtmalari, mas'ul xodim va status boshqaruvi bilan. Haydovchi modeli
/// o'z ekranlarida ishlatilishda davom etadi, unga tegilmadi.
class AdminOrder {
  final String id;
  final String orderNumber;
  /// MUHIM: mijoz ISM emas, ID orqali aniqlanadi. 2026-08-04 da web panelda
  /// aynan shu sabab jiddiy xato bo'lgan edi - "1" deb nomlangan 15 ta
  /// alohida mijoz bor edi va ism bo'yicha solishtirish ularning
  /// buyurtmalarini bittasiga qo'shib yuborardi. Mijoz tafsilotida buyurtma
  /// tarixi shu maydon orqali filtrlanishi SHART.
  final String clientId;
  final String clientName;
  final String clientPhone;
  final String address;
  final String serviceName;
  final String description;
  final String status;
  final String statusLabel;
  /// Status rangi (#RRGGBB) - ro'yxatda bir qarashda ajratish uchun.
  final String statusColor;
  /// PENDING/COLLECTED/HANDED_OVER - order_history_screen.dart dagi
  /// "_isDone" bilan bir xil mezon: to'lov qabul qilingan bo'lsa ham
  /// buyurtma tugatilgan hisoblanadi (oxirgi statusga yetmagan bo'lsa ham).
  final String paymentStatus;
  final String? workerName;
  final double price;
  final DateTime? createdAt;

  const AdminOrder({
    required this.id,
    required this.orderNumber,
    this.clientId = '',
    required this.clientName,
    required this.clientPhone,
    required this.address,
    this.serviceName = '',
    this.description = '',
    required this.status,
    required this.statusLabel,
    this.statusColor = '',
    this.paymentStatus = 'PENDING',
    required this.price,
    this.workerName,
    this.createdAt,
  });

  factory AdminOrder.fromJson(Map<String, dynamic> json) {
    final client = json['client'];
    final worker = json['worker'];
    final service = json['service'];
    // MUHIM: backend maydoni `status` va u OBYEKT (OrderStatus), satr emas.
    // Avval bu yerda `orderStatus` o'qilardi - bunday maydon umuman yo'q,
    // shuning uchun u doim null bo'lib, zaxira yo'l `Map`ni toString() qilardi
    // va ekranda status o'rniga "{id: ..., nameUz: ...}" ko'rinardi.
    final statusObj = json['status'];
    return AdminOrder(
      id: json['id']?.toString() ?? '',
      // Buyurtma raqami loyihada turli nomlar bilan kelishi mumkin.
      orderNumber: (json['orderNumber'] ?? json['number'] ?? json['id'] ?? '').toString(),
      clientId: client is Map ? (client['id']?.toString() ?? '') : '',
      clientName: client is Map ? (client['fullName']?.toString() ?? '') : '',
      clientPhone: client is Map ? (client['phone']?.toString() ?? '') : '',
      address: json['address']?.toString() ?? (client is Map ? (client['address']?.toString() ?? '') : ''),
      serviceName: service is Map ? (service['nameUz']?.toString() ?? '') : '',
      description: json['description']?.toString() ?? '',
      status: statusObj is Map ? (statusObj['id']?.toString() ?? '') : '',
      statusLabel: statusObj is Map ? (statusObj['nameUz']?.toString() ?? '') : '',
      statusColor: statusObj is Map ? (statusObj['colorCode']?.toString() ?? '') : '',
      paymentStatus: json['paymentStatus']?.toString() ?? 'PENDING',
      workerName: worker is Map ? worker['fullName']?.toString() : null,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}

class OrderStatusOption {
  final String id;
  final String nameUz;
  final String colorCode;
  /// Statuslar ro'yxatidagi tartib - eng yuqori qiymatga ega status
  /// "tugatilgan" (terminal) hisoblanadi (order_zone.dart dagi qoida bilan
  /// bir xil: FAQAT eng oxirgi status - yakuniy).
  final int sortOrder;

  const OrderStatusOption({
    required this.id,
    required this.nameUz,
    required this.colorCode,
    this.sortOrder = 0,
  });

  factory OrderStatusOption.fromJson(Map<String, dynamic> json) => OrderStatusOption(
        id: json['id']?.toString() ?? '',
        nameUz: json['nameUz']?.toString() ?? '',
        colorCode: json['colorCode']?.toString() ?? '#3b82f6',
        sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      );
}

class OrdersAdminRepository {
  final ApiClient _api;

  OrdersAdminRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<List<AdminOrder>> fetchAll() async {
    final data = await _api.get('/orders') as List;
    final list = data.cast<Map<String, dynamic>>().map(AdminOrder.fromJson).toList();
    list.sort((a, b) {
      final ad = a.createdAt, bd = b.createdAt;
      if (ad == null && bd == null) return 0;
      if (ad == null) return 1;
      if (bd == null) return -1;
      return bd.compareTo(ad);
    });
    return list;
  }

  Future<List<OrderStatusOption>> fetchStatuses() async {
    final data = await _api.get('/order-statuses') as List;
    return data.cast<Map<String, dynamic>>().map(OrderStatusOption.fromJson).toList();
  }

  /// Yangi buyurtma. Backend snake_case kutadi (OrderController).
  ///
  /// `backdate` berilsa buyurtma o'sha SANAGA yoziladi - ro'yxatdan tushib
  /// qolgan eski buyurtmani kiritish uchun (backend 2026-08-04 da qo'llab
  /// quvvatlaydigan qilindi). Berilmasa joriy vaqt qo'yiladi.
  Future<void> create({
    required String clientId,
    required String serviceId,
    String? workerId,
    required double price,
    String address = '',
    String description = '',
    DateTime? backdate,
  }) {
    String two(int v) => v.toString().padLeft(2, '0');
    return _api.post('/orders', data: {
      'client_id': clientId,
      'service_id': serviceId,
      if (workerId != null && workerId.isNotEmpty) 'worker_id': workerId,
      'price': price,
      'address': address.trim(),
      'description': description.trim(),
      if (backdate != null)
        'created_at':
            '${backdate.year}-${two(backdate.month)}-${two(backdate.day)}',
    });
  }

  /// Xizmatlar katalogi - narx avtomatik to'ldirilishi uchun.
  Future<List<({String id, String name, double price})>> fetchServices() async {
    final data = await _api.get('/services') as List;
    return data.cast<Map<String, dynamic>>().map((s) => (
          id: s['id']?.toString() ?? '',
          name: s['nameUz']?.toString() ?? '',
          price: (s['price'] as num?)?.toDouble() ?? 0,
        )).toList();
  }

  /// Buyurtma biriktirish mumkin bo'lgan xodimlar.
  Future<List<({String id, String name})>> fetchWorkers() async {
    final data = await _api.get('/employees/drivers') as List;
    return data.cast<Map<String, dynamic>>().map((w) => (
          id: w['id']?.toString() ?? '',
          name: w['fullName']?.toString() ?? '',
        )).toList();
  }

  /// Mijozlar - telefon bo'yicha qidirish va yangisini yaratish uchun.
  Future<List<({String id, String name, String phone, String address})>> fetchClients() async {
    final data = await _api.get('/clients') as List;
    return data.cast<Map<String, dynamic>>().map((c) => (
          id: c['id']?.toString() ?? '',
          name: c['fullName']?.toString() ?? '',
          phone: c['phone']?.toString() ?? '',
          address: c['address']?.toString() ?? '',
        )).toList();
  }

  Future<String> createClient({
    required String fullName,
    required String phone,
    String address = '',
  }) async {
    final data = await _api.post('/clients', data: {
      'full_name': fullName.trim(),
      'phone': phone.trim(),
      'address': address.trim(),
    });
    return (data as Map)['id']?.toString() ?? '';
  }

  Future<void> changeStatus(String orderId, String statusId) =>
      _api.put('/orders/$orderId/status', data: {'status_id': statusId});

  Future<void> setPrice(String orderId, double price) =>
      _api.put('/orders/$orderId/price', data: {'price': price});

  /// Buyurtmaga xodim (haydovchi) biriktirish/almashtirish. MUHIM (audit'da
  /// topilgan xato, tuzatildi): telefondan yaratilgan buyurtmada "Mas'ul
  /// xodim" ixtiyoriy edi va biriktirilmasa, buni KEYINROQ tuzatishning
  /// HECH QANDAY yo'li yo'q edi - bu yerda shu bo'shliq to'ldirilmoqda.
  Future<void> assignWorker(String orderId, String workerId) =>
      _api.put('/orders/$orderId/worker', data: {'worker_id': workerId});
}
