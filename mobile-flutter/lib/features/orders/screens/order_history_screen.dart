import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../ui/app_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/order_card.dart';

/// Tarix - yakunlangan buyurtmalar (oxirgi bosqichga yetgan yoki to'langan).
class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _q = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool _isDone(Order o, List<OrderStatusInfo> sorted) {
    final lastId = sorted.isNotEmpty ? sorted.last.id : null;
    final atLast = lastId != null && o.status?.id == lastId;
    final paid = o.paymentStatus.isNotEmpty && o.paymentStatus != 'PENDING';
    return atLast || paid;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        if (state is OrdersLoading || state is OrdersInitial) {
          return const OrderListSkeleton();
        }
        final loaded = state is OrdersLoaded ? state : null;
        final orders = loaded?.orders ?? const <Order>[];
        final statuses = (loaded?.statuses ?? const <OrderStatusInfo>[]).toList()
          ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
        final authState = context.read<AuthBloc>().state;
        final currentUserId = authState is Authenticated ? authState.user.id : '';

        final q = _q.toLowerCase();
        final done = orders.where((o) => _isDone(o, statuses)).where((o) {
          return q.isEmpty ||
              o.client.fullName.toLowerCase().contains(q) ||
              o.client.phone.toLowerCase().contains(q) ||
              o.address.toLowerCase().contains(q);
        }).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

        return RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: () => context.read<OrdersCubit>().load(),
          child: CustomScrollView(slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                child: Row(children: [
                  Text('Yakunlangan', style: AppTheme.display(17, weight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  StatusPill('${done.length}', AppTheme.teal),
                ]),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: AppField(
                  controller: _searchController,
                  hint: 'Tarixdan qidirish...',
                  icon: LucideIcons.search,
                  onChanged: (v) => setState(() => _q = v),
                ),
              ),
            ),
            if (done.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(icon: LucideIcons.history, message: 'Hozircha yakunlangan buyurtma yo\'q'),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 96),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, i) => OrderCard(order: done[i], statuses: statuses, currentUserId: currentUserId, index: i),
                    childCount: done.length,
                  ),
                ),
              ),
          ]),
        );
      },
    );
  }
}
