import '../../../core/network/api_client.dart';
import '../../../models/order.dart';

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

  Future<void> updateStatus(String orderId, String statusId) {
    return _api.put('/orders/$orderId/status', data: {'status_id': statusId});
  }

  Future<void> rejectOrder(String orderId) {
    return _api.put('/orders/$orderId/reject');
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
}
