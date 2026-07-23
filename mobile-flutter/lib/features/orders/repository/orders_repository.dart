import '../../../core/network/api_client.dart';
import '../../../models/order.dart';
import '../../../models/service_and_client.dart';

class OrdersRepository {
  final ApiClient _api;

  OrdersRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<List<Order>> fetchMyOrders() async {
    final data = await _api.get('/orders/my') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(Order.fromJson)
        .toList();
  }

  /// Dispatch pool: kompaniyaning BARCHA buyurtmalari - har bir haydovchi
  /// ko'radi (bittasiga biriktirilgan bo'lsa ham) va bo'shini qabul qila oladi.
  Future<List<Order>> fetchAvailableOrders() async {
    final data = await _api.get('/orders/available') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(Order.fromJson)
        .toList();
  }

  /// Tarix bo'limi uchun: to'lov qabul qilingan (COLLECTED/HANDED_OVER)
  /// buyurtmalar - haydovchi bajarib bo'lgan ishlari tarixini ko'rish uchun.
  Future<List<Order>> fetchCompletedOrders() async {
    final data = await _api.get('/orders/completed') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(Order.fromJson)
        .toList();
  }

  /// Haydovchi buyurtmani O'ZIGA qabul qiladi (self-assign).
  Future<void> acceptOrder(String orderId) {
    return _api.put('/orders/$orderId/accept');
  }

  /// Gilam o'lchovini (eni×bo'yi) yangilash - sex xodimi o'lchagach.
  Future<void> updateItemMeasurements(String orderId, String itemId, double length, double width) {
    return _api.put('/orders/$orderId/items/$itemId', data: {'length': length, 'width': width});
  }

  /// Gilam yozuvini yangilash - nom, o'lcham, va/yoki soni.
  Future<void> updateOrderItem(String orderId, String itemId, {String? name, double? length, double? width, int? quantity}) {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (length != null) data['length'] = length;
    if (width != null) data['width'] = width;
    if (quantity != null) data['quantity'] = quantity;
    return _api.put('/orders/$orderId/items/$itemId', data: data);
  }

  /// Narx (va ixtiyoriy izoh)ni yangilash.
  Future<void> updateOrderPrice(String orderId, double price, {String? description}) {
    final data = <String, dynamic>{'price': price};
    if (description != null) data['description'] = description;
    return _api.put('/orders/$orderId/price', data: data);
  }

  Future<void> updateStatus(String orderId, String statusId) {
    return _api.put('/orders/$orderId/status', data: {'status_id': statusId});
  }

  Future<void> collectPayment(String orderId, double amount) {
    return _api.put('/orders/$orderId/collect-payment', data: {'amount': amount});
  }

  Future<void> updateOrderItemStatus(String orderId, String itemId, String status) {
    return _api.put('/orders/$orderId/items/$itemId', data: {'status': status});
  }

  Future<void> addOrderItem(String orderId, String name, double length, double width, int quantity) {
    return _api.post('/orders/$orderId/items', data: {
      'name': name,
      'length': length,
      'width': width,
      'quantity': quantity,
      'status': 'ACCEPTED'
    });
  }

  /// Gilamni o'chirish (DELETE)
  Future<void> deleteOrderItem(String orderId, String itemId) {
    return _api.delete('/orders/$orderId/items/$itemId');
  }

  Future<List<OrderStatusInfo>> fetchOrderStatuses() async {
    final data = await _api.get('/order-statuses') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(OrderStatusInfo.fromJson)
        .toList();
  }

  Future<void> logGpsPosition(double latitude, double longitude) {
    return _api.post(
      '/gps/log',
      data: {'latitude': latitude, 'longitude': longitude},
    );
  }

  Future<List<ServiceInfo>> fetchServices() async {
    final data = await _api.get('/services') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(ServiceInfo.fromJson)
        .toList();
  }

  Future<List<ClientInfo>> fetchClients() async {
    final data = await _api.get('/clients') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(ClientInfo.fromJson)
        .toList();
  }

  Future<ClientInfo> createClient(String fullName, String phone, String address) async {
    final data = await _api.post('/clients', data: {
      'full_name': fullName,
      'phone': phone,
      'address': address,
    }) as Map<String, dynamic>;
    return ClientInfo.fromJson(data);
  }

  Future<void> createOrder({
    required String clientId,
    required String serviceId,
    required String workerId,
    required String address,
    required double price,
    required String description,
  }) {
    return _api.post('/orders', data: {
      'client_id': clientId,
      'service_id': serviceId,
      'worker_id': workerId,
      'address': address,
      'price': price,
      'description': description,
    });
  }
}
