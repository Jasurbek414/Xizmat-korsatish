import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/order_card.dart';

/// Haydovchi/ishchi/sex hodimiga tayinlangan buyurtmalar ro'yxati.
/// Har bir buyurtmani keyingi bosqichga o'tkazish yoki rad etish mumkin.
///
/// Diqqat: bu vidjet `OrdersCubit`ni ota vidjet (dashboard qobig'i) orqali
/// oladi - shu bitta cubit orders va xarita bo'limlari o'rtasida
/// ulashiladi, shunda ikkalasi ham bitta faol buyurtmani ko'radi.
class DriverOrdersScreen extends StatelessWidget {
  const DriverOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OrdersCubit, OrdersState>(
      listener: (context, state) {
        if (state is OrdersError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.dangerColor,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is OrdersLoading || state is OrdersInitial) {
          return const Center(child: CircularProgressIndicator());
        }

        final orders = state is OrdersLoaded ? state.orders : const [];

        return RefreshIndicator(
          onRefresh: () => context.read<OrdersCubit>().load(),
          child: orders.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 120),
                    Center(
                      child: Text(
                        "Hozircha sizga tayinlangan buyurtma yo'q",
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ),
                  ],
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    return OrderCard(
                      order: order,
                      onReject: () => _confirmReject(context, order),
                    );
                  },
                ),
        );
      },
    );
  }

  void _confirmReject(BuildContext context, Order order) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Buyurtmani rad etish'),
        content: const Text(
          "Haqiqatan ham bu buyurtmani rad etmoqchimisiz? U dispetcherga qaytariladi.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Bekor qilish'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<OrdersCubit>().reject(order);
            },
            child: const Text('Rad etish', style: TextStyle(color: AppTheme.dangerColor)),
          ),
        ],
      ),
    );
  }
}
