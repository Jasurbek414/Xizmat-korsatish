import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../models/order.dart';
import '../order_zone.dart';
import '../repository/orders_repository.dart';

abstract class OrdersState {
  const OrdersState();
}

class OrdersInitial extends OrdersState {}

class OrdersLoading extends OrdersState {}

class OrdersLoaded extends OrdersState {
  final List<Order> orders;
  final List<OrderStatusInfo> statuses;

  /// So'nggi (jimgina) yangilanishda YANGI paydo bo'lgan buyurtmalar id'lari -
  /// UI'da ularni "YANGI" belgisi bilan ajratib ko'rsatish uchun. Haydovchi
  /// ko'rgach `markSeen()` bilan tozalanadi.
  final Set<String> newOrderIds;

  OrdersLoaded({
    required this.orders,
    required this.statuses,
    this.newOrderIds = const {},
  });

  OrdersLoaded copyWith({
    List<Order>? orders,
    List<OrderStatusInfo>? statuses,
    Set<String>? newOrderIds,
  }) {
    return OrdersLoaded(
      orders: orders ?? this.orders,
      statuses: statuses ?? this.statuses,
      newOrderIds: newOrderIds ?? this.newOrderIds,
    );
  }
}

class OrdersError extends OrdersState {
  final String message;
  OrdersError(this.message);
}

/// Haydovchi/ishchi/sex hodimiga tayinlangan buyurtmalar ro'yxati va ularning
/// holatini (qabul qilingandan keyingi bosqichlar) boshqarish.
///
/// Real-vaqt: `refresh()` jimgina (spinner'siz) qayta yuklaydi - push kelganda,
/// ilova fondan qaytganda va davriy poll orqali chaqiriladi. Shunda webdan yangi
/// buyurtma tayinlanishi bilan haydovchi telefonida avtomatik paydo bo'ladi.
class OrdersCubit extends Cubit<OrdersState> {
  final OrdersRepository _repository;

  OrdersCubit({OrdersRepository? repository})
    : _repository = repository ?? OrdersRepository(),
      super(OrdersInitial());

  Future<List<List<Object>>> _fetch() async {
    // DISPATCH POOL: barcha buyurtmalar (har bir haydovchi ko'radi va bo'shini
    // qabul qila oladi) - faqat o'ziniki emas.
    // Tarix: to'lov qabul qilingan buyurtmalar alohida endpoint orqali olinadi
    // va dispatch pool bilan birlashtiriladi. Shunday qilib "Tarix" bo'limida
    // bajarib bo'lingan buyurtmalar ko'rinadi.
    //
    // MUHIM: completed orders alohida try/catch bilan o'ralgan - backend hali
    // deploy qilinmagan bo'lsa yoki xato qaytarsa, asosiy (available) va
    // statuses ma'lumotlari baribir yuklanadi.
    final results = await Future.wait([
      _repository.fetchAvailableOrders(),
      _repository.fetchOrderStatuses(),
    ]);

    final available = results[0] as List<Order>;
    final statuses = results[1] as List<OrderStatusInfo>;

    // Completed orders - agar xato bo'lsa, bo'sh ro'yxat bilan davom etamiz
    List<Order> completed = [];
    try {
      completed = await _repository.fetchCompletedOrders();
    } catch (_) {
      // Completed endpoint ishlamasa - mavjud data bilan davom etamiz
    }

    // Dispatch pool + completed = barcha buyurtmalar (dublikatlarsiz)
    final seenIds = available.map((o) => o.id).toSet();
    final allOrders = [...available];
    for (final o in completed) {
      if (!seenIds.contains(o.id)) {
        allOrders.add(o);
        seenIds.add(o.id);
      }
    }

    return [allOrders, statuses];
  }

  /// Haydovchi bo'sh (yoki boshqa) buyurtmani O'ZIGA biriktiradi.
  ///
  /// MUHIM (audit'da topilgan xato, tuzatildi): avval bu metod biriktirish
  /// bilan BIR VAQTDA statusni ham sex zonasiga o'tkazib yuborardi. Natijada
  /// haydovchi "Olib ketish" tugmasini bosishi bilanoq buyurtma uning
  /// ro'yxatidan YO'QOLARDI - garchi u hali mijoz uyiga yo'lga ham chiqmagan,
  /// gilamni qo'liga olmagan bo'lsa ham. Sex hodimi esa hali yetib kelmagan
  /// gilamni o'z ro'yxatida ko'rib turardi.
  ///
  /// Aslida bu IKKI BOSHQA hodisa edi:
  ///   1) "bu buyurtmani men olaman" (biriktirish - shu metod);
  ///   2) "gilamni sexga topshirdim" (jismoniy topshirish - haydovchi
  ///      tafsilot ekranidagi alohida "Sexga topshirish" tugmasi).
  /// Endi biriktirish statusni O'ZGARTIRMAYDI: buyurtma haydovchida
  /// (pickup zonasida) qoladi, u mijoznikiga boradi, gilamni oladi, sexga
  /// keltiradi va SHUNDAGINA "Sexga topshirish"ni bosadi.
  ///
  /// Yon foyda: avval ikkita ketma-ket API chaqiruvi orasida orqaga qaytarish
  /// yo'q edi - ikkinchisi yiqilsa buyurtma biriktirilgan-u, statusi eski
  /// holatda qolib, holat yarim o'zgargan bo'lardi. Endi bitta chaqiruv.
  Future<void> acceptOrder(Order order) async {
    try {
      await _repository.acceptOrder(order.id);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  /// Birinchi/to'liq yuklash (spinner ko'rsatiladi).
  Future<void> load() async {
    emit(OrdersLoading());
    try {
      final data = await _fetch();
      emit(OrdersLoaded(
        orders: data[0] as List<Order>,
        statuses: data[1] as List<OrderStatusInfo>,
      ));
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    } catch (_) {
      emit(OrdersError("Buyurtmalarni yuklashda xatolik yuz berdi"));
    }
  }

  /// Jimgina qayta yuklash (spinner YO'Q) - real-vaqt uchun. Oldingi ro'yxatga
  /// nisbatan YANGI paydo bo'lgan buyurtmalar aniqlanib, `newOrderIds`ga
  /// yoziladi (UI'da ajratib ko'rsatish + ovoz uchun). Yangi buyurtmalar sonini
  /// qaytaradi (0 = yangi yo'q) - chaqiruvchi ovoz/bildirishnoma qilishi mumkin.
  Future<int> refresh() async {
    final current = state;
    // Faqat allaqachon yuklangan holatda jimgina yangilaymiz.
    if (current is! OrdersLoaded) {
      if (current is! OrdersLoading) await load();
      return 0;
    }
    try {
      final data = await _fetch();
      final newOrders = data[0] as List<Order>;
      final oldIds = current.orders.map((o) => o.id).toSet();
      final freshIds =
          newOrders.where((o) => !oldIds.contains(o.id)).map((o) => o.id).toSet();

      emit(OrdersLoaded(
        orders: newOrders,
        statuses: data[1] as List<OrderStatusInfo>,
        // Oldingi ko'rilmagan "yangi"larni ham saqlaymiz (haydovchi hali ko'rmagan bo'lsa).
        newOrderIds: {...current.newOrderIds, ...freshIds},
      ));
      return freshIds.length;
    } on ApiException catch (_) {
      // Jimgina yangilanish xatosi - joriy ro'yxatni saqlaymiz (spinner/xato yo'q).
      return 0;
    } catch (_) {
      return 0;
    }
  }

  /// Haydovchi buyurtmalarni ko'rdi - "YANGI" belgilarini tozalaymiz.
  void markSeen() {
    final current = state;
    if (current is OrdersLoaded && current.newOrderIds.isNotEmpty) {
      emit(current.copyWith(newOrderIds: {}));
    }
  }

  Future<void> advanceToNextStatus(Order order) async {
    final current = state;
    if (current is! OrdersLoaded) return;

    final sorted = [...current.statuses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final currentIndex = sorted.indexWhere((s) => s.id == order.status?.id);
    if (currentIndex == -1 || currentIndex >= sorted.length - 1) return;

    final nextStatus = sorted[currentIndex + 1];
    try {
      await _repository.updateStatus(order.id, nextStatus.id);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  /// Buyurtmani aniq bir bosqichga (statusга) o'tkazadi - haydovchi
  /// tafsilotidagi bosqich tugmalari uchun (Yo'lga chiqdim / Yetib keldim ...).
  Future<void> setOrderStatus(Order order, String statusId) async {
    try {
      await _repository.updateStatus(order.id, statusId);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  Future<void> collectOrderPayment(Order order, double amount) async {
    try {
      await _repository.collectPayment(order.id, amount);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  Future<void> changeOrderItemStatus(Order order, OrderItemInfo item, String newStatus) async {
    try {
      await _repository.updateOrderItemStatus(order.id, item.id, newStatus);
      await _syncWorkshopStatus(order, item, newStatus);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
      rethrow;
    }
  }

  /// Buyurtma statusini gilamlarning haqiqiy ishlov holatiga moslaydi -
  /// FAQAT sex zonasi ICHIDA (buyurtmani hech qachon zonadan chiqarmaydi).
  ///
  /// MUHIM (audit'da topilgan xato, tuzatildi): buyurtma statusi (Yuvilmoqda/
  /// Bajarilmoqda) va gilam statuslari (ACCEPTED/WASHED/DRIED/READY) butunlay
  /// mustaqil ikki tizim edi - o'rtasida hech qanday bog'liqlik yo'q edi.
  /// Shu sabab buyurtma "Bajarilmoqda"da tursa ham gilamlar hammasi hali
  /// ACCEPTED bo'lishi mumkin edi (yoki aksincha), va veb-admin panelida
  /// ko'rinadigan status haqiqiy ish holatini aks ettirmasdi. Endi sex
  /// xodimi gilam bosqichini o'zgartirishi bilan buyurtma statusi ham
  /// avtomatik moslashadi:
  ///   - barcha gilamlar hali ACCEPTED  -> sex zonasining 1-statusi
  ///   - kamida bittasi ishlovga kirgan -> sex zonasining 2-statusi (bo'lsa)
  /// Shunday qilib "Bajarilmoqda" haqiqatan "ish boshlandi" degani bo'ladi.
  Future<void> _syncWorkshopStatus(Order order, OrderItemInfo changed, String newStatus) async {
    final current = state;
    if (current is! OrdersLoaded) return;

    final zone = OrderZoneBoundary.fromStatuses(current.statuses);
    // Buyurtma sex zonasida bo'lmasa - aralashmaymiz.
    if (!zone.isAtWorkshop(order)) return;

    final workshopStatuses = zone.workshopStatuses(current.statuses);
    if (workshopStatuses.length < 2) return; // sinxronlash uchun joy yo'q

    // Serverdagi yangi holatni mahalliy hisoblaymiz (refresh hali bo'lmagan).
    final anyStarted = order.items.any((i) =>
        i.id == changed.id ? newStatus != 'ACCEPTED' : i.status != 'ACCEPTED');

    final target = anyStarted ? workshopStatuses[1] : workshopStatuses.first;
    if (order.status?.id == target.id) return;

    await _repository.updateStatus(order.id, target.id);
  }

  Future<void> createOrderItem(Order order, String name, double length, double width, int quantity) async {
    try {
      await _repository.addOrderItem(order.id, name, length, width, quantity);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  /// Gilamni tahrirlash (nomi, eni, bo'yi, soni)
  Future<void> updateOrderItem(Order order, OrderItemInfo item, {String? name, double? length, double? width, int? quantity}) async {
    try {
      await _repository.updateOrderItem(order.id, item.id, name: name, length: length, width: width, quantity: quantity);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  /// Gilamni o'chirish
  Future<void> deleteOrderItem(Order order, OrderItemInfo item) async {
    try {
      await _repository.deleteOrderItem(order.id, item.id);
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
      rethrow;
    }
  }

  Future<void> createOrder({
    required String clientId,
    required String serviceId,
    required String workerId,
    required String address,
    required double price,
    required String description,
  }) async {
    try {
      await _repository.createOrder(
        clientId: clientId,
        serviceId: serviceId,
        workerId: workerId,
        address: address,
        price: price,
        description: description,
      );
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }
}
