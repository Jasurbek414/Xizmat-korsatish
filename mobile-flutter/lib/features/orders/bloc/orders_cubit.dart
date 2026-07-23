import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../models/order.dart';
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

  /// Haydovchi bo'sh (yoki boshqa) buyurtmani O'ZIGA qabul qiladi.
  /// Qabul qilgandan so'ng statusni workshop (sex) zonasiga o'tkazadi,
  /// shunda buyurtma sex xodimiga ko'rinadi.
  Future<void> acceptOrder(Order order) async {
    try {
      await _repository.acceptOrder(order.id);
      
      // Accept qilgandan keyin statusni workshop zonasiga (o'rta 1/3) o'tkazamiz
      final currentState = this.state;
      if (currentState is OrdersLoaded) {
        final sorted = [...currentState.statuses]
          ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
        if (sorted.length >= 3) {
          final lower = sorted[(sorted.length * 1) ~/ 3].sortOrder;
          final workshopStatus = sorted.firstWhere(
            (s) => s.sortOrder >= lower,
            orElse: () => sorted.first,
          );
          await _repository.updateStatus(order.id, workshopStatus.id);
        }
      }
      
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
      await refresh();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
      rethrow;
    }
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
