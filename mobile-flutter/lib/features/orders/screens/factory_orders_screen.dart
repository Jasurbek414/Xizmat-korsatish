import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../ui/app_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/order_card.dart';

/// SEX HODIMI uchun buyurtmalar ekrani.
///
/// Faqat **workshop (sex) zonasidagi** buyurtmalarni ko'rsatadi —
/// ya'ni haydovchi "Olib ketish" tugmasini bosgan (uydan olganini
/// tasdiqlagan) buyurtmalar. Pickup va delivery statuslari yashirinadi.
///
/// Pastki menubar (Bosh sahifa · Buyurtmalar · Tarix · Profil)
/// `AdaptiveDashboardShell` tomonidan boshqariladi.
class FactoryOrdersScreen extends StatefulWidget {
  const FactoryOrdersScreen({super.key});

  @override
  State<FactoryOrdersScreen> createState() => _FactoryOrdersScreenState();
}

class _FactoryOrdersScreenState extends State<FactoryOrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  int _lowerBound(List<OrderStatusInfo> statuses) {
    if (statuses.isEmpty) return 0;
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return sorted[(sorted.length * 1) ~/ 3].sortOrder;
  }

  int _upperBound(List<OrderStatusInfo> statuses) {
    if (statuses.isEmpty) return 0;
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return sorted[(sorted.length * 2) ~/ 3].sortOrder;
  }

  bool _isAtWorkshop(Order o, int lower, int upper) =>
      o.status != null && o.status!.sortOrder >= lower && o.status!.sortOrder < upper;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OrdersCubit, OrdersState>(
      listener: (context, state) {
        if (state is OrdersError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.dangerColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is OrdersLoading || state is OrdersInitial) {
          return const OrderListSkeleton();
        }

        final loaded = state is OrdersLoaded ? state : null;
        final orders = loaded?.orders ?? const <Order>[];
        final statuses = (loaded?.statuses ?? const <OrderStatusInfo>[]).toList()
          ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
        final lower = _lowerBound(statuses);
        final upper = _upperBound(statuses);
        final authState = context.read<AuthBloc>().state;
        final currentUserId = authState is Authenticated ? authState.user.id : '';

        // Faqat workshop zonasi — haydovchi "Olib ketish"ni bosgan buyurtmalar
        final workshopOrders = orders.where((o) => _isAtWorkshop(o, lower, upper)).toList();

        // Qidiruv filtri
        final q = _searchQuery.toLowerCase();
        final filtered = workshopOrders.where((o) {
          return q.isEmpty ||
              o.client.fullName.toLowerCase().contains(q) ||
              o.client.phone.toLowerCase().contains(q) ||
              o.address.toLowerCase().contains(q) ||
              o.serviceName.toLowerCase().contains(q);
        }).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

        return RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: () => context.read<OrdersCubit>().load(),
          child: CustomScrollView(
            slivers: [
              // Sarlavha
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                  child: Row(
                    children: [
                      Container(
                        width: 4,
                        height: 20,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Sex buyurtmalari',
                        style: AppTheme.display(17, weight: FontWeight.w800, spacing: -0.3),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          '${filtered.length} ta',
                          style: AppTheme.text(11, weight: FontWeight.w700, color: AppTheme.primary),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Qidiruv
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: AppField(
                    controller: _searchController,
                    hint: 'Mijoz, telefon yoki manzil...',
                    icon: LucideIcons.search,
                    onChanged: (v) => setState(() => _searchQuery = v),
                  ),
                ),
              ),
              // Buyurtmalar ro'yxati
              if (filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyState(
                    icon: LucideIcons.packageOpen,
                    message: _searchQuery.isNotEmpty
                        ? 'Ushbu qidiruv bo\'yicha buyurtma topilmadi'
                        : 'Hozircha buyurtma yo\'q',
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => OrderCard(
                        order: filtered[i],
                        statuses: statuses,
                        currentUserId: currentUserId,
                        index: i,
                      ),
                      childCount: filtered.length,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
