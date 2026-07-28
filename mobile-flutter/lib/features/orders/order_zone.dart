import '../../models/order.dart';

/// Buyurtmaning qaysi "zona"da ekanini bildiradi:
///  - pickup: haydovchi mijoz uyidan olib kelmoqda (eng birinchi status)
///  - workshop: sex ichki ishi - haydovchidan YASHIRIN (oradagi HAMMASI)
///  - delivery: haydovchi mijozga yetkazmoqda (eng oxirgi status)
enum OrderZone { pickup, workshop, delivery }

/// Statuslar ro'yxatidan zona chegaralarini hisoblaydi va har bir buyurtma
/// qaysi zonaga tegishli ekanini aniqlaydi.
///
/// MUHIM (audit'da topilgan xato, tuzatildi): bu mantiq avval UCH XIL joyda
/// (DriverOrdersScreen, FactoryOrdersScreen, OrdersCubit.acceptOrder)
/// alohida-alohida, bir-biridan mustaqil nusxalangan edi - va TO'RTINCHI
/// joy (HomeDashboardScreen) bu mantiqni UMUMAN qo'llamasdi, shu sabab bosh
/// sahifada haydovchidan o'tib ketgan (sex ichida bo'lishi kerak) buyurtmalar
/// ham ko'rinib, ularga ta'sir o'tkazish imkoni qolardi. Endi BITTA manba -
/// barcha ekranlar shu klassni ishlatadi, kelajakda ham mos kelmaslik
/// xavfi yo'q.
///
/// Qoida: FAQAT eng birinchi status - pickup, FAQAT eng oxirgi status -
/// delivery, ORADAGI HAMMASI (nechta bo'lishidan qat'i nazar) - workshop.
class OrderZoneBoundary {
  final int? _lower; // workshop boshlanish nuqtasi (bundan past = pickup)
  final int? _upper; // workshop tugash nuqtasi (bundan yuqori/teng = delivery)

  const OrderZoneBoundary._(this._lower, this._upper);

  factory OrderZoneBoundary.fromStatuses(List<OrderStatusInfo> statuses) {
    if (statuses.length < 2) return const OrderZoneBoundary._(null, null);
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return OrderZoneBoundary._(sorted[1].sortOrder, sorted.last.sortOrder);
  }

  /// Sex ichki ishi sifatida hisoblanadigan (haydovchidan yashirin bo'lishi
  /// kerak bo'lgan) eng birinchi statusning sortOrder qiymati.
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
  /// Kompaniya nechta oraliq status sozlaganiga qarab 1 ta yoki undan ko'p
  /// bo'lishi mumkin.
  List<OrderStatusInfo> workshopStatuses(List<OrderStatusInfo> statuses) {
    if (_lower == null || _upper == null) return const [];
    return ([...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)))
        .where((s) => s.sortOrder >= _lower && s.sortOrder < _upper)
        .toList();
  }

  /// Sex ishini tugatgach buyurtma o'tkaziladigan status - ya'ni haydovchi
  /// yana ko'radigan "yetkazish" zonasining BIRINCHI statusi.
  ///
  /// MUHIM (audit'da topilgan xato, tuzatildi): avval sex hodimi "keyingi
  /// status"ga (sorted[idx+1]) o'tkazardi. Kompaniyada sex zonasida ikkita
  /// status bo'lgani uchun (Yuvilmoqda, Bajarilmoqda) bu bitta tugmani IKKI
  /// MARTA bosishni talab qilardi: birinchi bosishda buyurtma hali sexda
  /// qolar, ro'yxatdagi o'rni ham o'zgarmasdi (chunki tablar gilam
  /// statuslaridan hisoblanadi) - xodim nima bo'lganini tushunmasdi. Endi
  /// bitta bosishda to'g'ridan-to'g'ri haydovchiga o'tadi.
  OrderStatusInfo? handoverStatus(List<OrderStatusInfo> statuses) {
    if (_upper == null) return null;
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    for (final s in sorted) {
      if (s.sortOrder >= _upper) return s;
    }
    return null;
  }
}
