import '../../models/order.dart';

/// Buyurtmaning qaysi "zona"da ekanini bildiradi:
///  - pickup: haydovchi mijoz uyidan olib kelmoqda (eng birinchi status)
///  - workshop: sex ichki ishi - haydovchidan YASHIRIN (oradagi statuslar)
///  - delivery: haydovchi mijozga yetkazmoqda (eng oxirgi status)
enum OrderZone { pickup, workshop, delivery }

/// Statuslar ro'yxatidan zona chegaralarini hisoblaydi va har bir buyurtma
/// qaysi zonaga tegishli ekanini aniqlaydi.
class OrderZoneBoundary {
  final int? _lower; // workshop boshlanish nuqtasi (bundan past = pickup)
  final int? _upper; // workshop tugash nuqtasi (bundan yuqori/teng = delivery)

  const OrderZoneBoundary._(this._lower, this._upper);

  factory OrderZoneBoundary.fromStatuses(List<OrderStatusInfo> statuses) {
    if (statuses.isEmpty) return const OrderZoneBoundary._(null, null);
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final distinctOrders = sorted.map((s) => s.sortOrder).toSet().toList()..sort();
    if (distinctOrders.length < 2) return const OrderZoneBoundary._(null, null);

    final lower = distinctOrders.length >= 3 ? distinctOrders[1] : distinctOrders.last;
    final upper = distinctOrders.last;
    return OrderZoneBoundary._(lower, upper);
  }

  /// Sex ichki ishi sifatida hisoblanadigan eng birinchi statusning sortOrder qiymati.
  int? get lower => _lower;

  /// Faqat eng oxirgi (delivery) statusning sortOrder qiymati.
  int? get upper => _upper;

  OrderZone zoneOf(Order order) {
    if (_lower == null || _upper == null || order.status == null) {
      return OrderZone.pickup;
    }
    final s = order.status!.sortOrder;
    if (s < _lower) return OrderZone.pickup;
    if (s >= _upper) return OrderZone.delivery;
    return OrderZone.workshop;
  }

  bool isPickup(Order order) => zoneOf(order) == OrderZone.pickup;
  bool isAtWorkshop(Order order) => zoneOf(order) == OrderZone.workshop;
  bool isDelivery(Order order) => zoneOf(order) == OrderZone.delivery;

  /// Sex zonasiga tegishli statuslar (sortOrder bo'yicha tartiblangan).
  List<OrderStatusInfo> workshopStatuses(List<OrderStatusInfo> statuses) {
    if (_lower == null || _upper == null) return const [];
    return ([...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)))
        .where((s) => s.sortOrder >= _lower && s.sortOrder < _upper)
        .toList();
  }

  /// Sex ishini tugatgach buyurtma o'tkaziladigan status (delivery boshlanishi).
  OrderStatusInfo? handoverStatus(List<OrderStatusInfo> statuses) {
    if (_upper == null) return null;
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    for (final s in sorted) {
      if (s.sortOrder >= _upper) return s;
    }
    return null;
  }
}
