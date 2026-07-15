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
  OrdersLoaded({required this.orders, required this.statuses});
}

class OrdersError extends OrdersState {
  final String message;
  OrdersError(this.message);
}

/// Haydovchi/ishchi/sex hodimiga tayinlangan buyurtmalar ro'yxati va ularning
/// holatini boshqarish (qabul qilingandan keyingi bosqichlar, rad etish).
class OrdersCubit extends Cubit<OrdersState> {
  final OrdersRepository _repository;

  OrdersCubit({OrdersRepository? repository})
    : _repository = repository ?? OrdersRepository(),
      super(OrdersInitial());

  Future<void> load() async {
    emit(OrdersLoading());
    try {
      final results = await Future.wait([
        _repository.fetchMyOrders(),
        _repository.fetchOrderStatuses(),
      ]);
      emit(
        OrdersLoaded(
          orders: results[0] as List<Order>,
          statuses: results[1] as List<OrderStatusInfo>,
        ),
      );
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    } catch (_) {
      emit(OrdersError("Buyurtmalarni yuklashda xatolik yuz berdi"));
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
      await load();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  Future<void> reject(Order order) async {
    try {
      await _repository.rejectOrder(order.id);
      await load();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  Future<void> collectOrderPayment(Order order, double amount) async {
    try {
      await _repository.collectPayment(order.id, amount);
      await load();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  Future<void> changeOrderItemStatus(Order order, OrderItemInfo item, String newStatus) async {
    try {
      await _repository.updateOrderItemStatus(order.id, item.id, newStatus);
      await load();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }

  Future<void> createOrderItem(Order order, String name, double length, double width, int quantity) async {
    try {
      await _repository.addOrderItem(order.id, name, length, width, quantity);
      await load();
    } on ApiException catch (e) {
      emit(OrdersError(e.message));
    }
  }
}
