import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../ui/app_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/order_card.dart';

/// Haydovchi buyurtmalari - 3 zonaga bo'lingan statuslar orqali filtrlanadi:
///
/// 1. 🏠 **Uydan olib ketish** — mijoz uyidan gilamni olib, sexga olib kelish
///     (sortOrder < lowerBound bo'lgan statuslar)
/// 2. 🔒 **Sexda (yashirin)** — buyurtma sexda ishlanayotganda haydovchi
///     ro'yxatidan yo'qoladi (lowerBound <= sortOrder < upperBound)
/// 3. 🏭 **Sexdan olib ketish** — sexda yuvilgan gilamni olib, mijoz uyiga yetkazish
///     (sortOrder >= upperBound bo'lgan statuslar)
class DriverOrdersScreen extends StatefulWidget {
  const DriverOrdersScreen({super.key});

  @override
  State<DriverOrdersScreen> createState() => _DriverOrdersScreenState();
}

class _DriverOrdersScreenState extends State<DriverOrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String? _sectionFilter; // 'pickup' yoki 'delivery' yoki null (hammasi)
  Timer? _seenTimer;

  @override
  void dispose() {
    _seenTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  /// Statuslar sortOrder'ining pastki chegarasi (1/3) - shundan past = pickup.
  int _lowerBound(List<OrderStatusInfo> statuses) {
    if (statuses.isEmpty) return 0;
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return sorted[(sorted.length * 1) ~/ 3].sortOrder;
  }

  /// Statuslar sortOrder'ining yuqori chegarasi (2/3) - shundan yuqori = delivery.
  int _upperBound(List<OrderStatusInfo> statuses) {
    if (statuses.isEmpty) return 0;
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return sorted[(sorted.length * 2) ~/ 3].sortOrder;
  }

  /// Uydan olib ketish (haydovchi ko'radi) - birinchi 1/3 statuslar.
  bool _isPickup(Order o, int lower) => o.status == null || o.status!.sortOrder < lower;

  /// Sexda ishlanmoqda (HAYDOVCHI KO'RMAYDI) - o'rta 1/3 statuslar.
  bool _isAtWorkshop(Order o, int lower, int upper) =>
      o.status != null && o.status!.sortOrder >= lower && o.status!.sortOrder < upper;

  /// Sexdan olib ketish (haydovchi ko'radi) - oxirgi 1/3 statuslar.
  /// To'lov qabul qilingan buyurtmalar ro'yxatda ko'rinmaydi (tugallangan).
  bool _isDelivery(Order o, int upper) =>
      o.status != null &&
      o.status!.sortOrder >= upper &&
      o.paymentStatus == 'PENDING';

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OrdersCubit, OrdersState>(
      listener: (context, state) {
        if (state is OrdersError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppTheme.dangerColor, behavior: SnackBarBehavior.floating),
          );
        }
        if (state is OrdersLoaded && state.newOrderIds.isNotEmpty && _seenTimer == null) {
          _seenTimer = Timer(const Duration(seconds: 6), () {
            _seenTimer = null;
            if (mounted) context.read<OrdersCubit>().markSeen();
          });
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
        final newIds = loaded?.newOrderIds ?? const <String>{};
        final lower = _lowerBound(statuses);
        final upper = _upperBound(statuses);

        final authState = context.read<AuthBloc>().state;
        final currentUserId = authState is Authenticated ? authState.user.id : '';

        // Qidiruv filtri
        final q = _searchQuery.toLowerCase();
        final searched = orders.where((o) {
          return q.isEmpty ||
              o.client.fullName.toLowerCase().contains(q) ||
              o.client.phone.toLowerCase().contains(q) ||
              o.address.toLowerCase().contains(q) ||
              o.serviceName.toLowerCase().contains(q);
        }).toList();

        // Guruhlarga ajratish:
        //   🏠 Uydan olib ketish (1/3) → haydovchi ko'radi
        //   🔒 Sexda (1/3) → haydovchi KO'RMAYDI (faqat sex xodimi)
        //   🏭 Sexdan olib ketish (1/3) → haydovchi ko'radi
        final pickupOrders = searched.where((o) => _isPickup(o, lower)).toList();
        final deliveryOrders = searched.where((o) => _isDelivery(o, upper)).toList();

        // Statusi o'rta 1/3 (sexda) bo'lgan buyurtmalar haydovchi ro'yxatida
        // ko'rinmaydi - faqat sex xodimi ko'radi (FactoryOrdersScreen orqali)

        // Yangi buyurtmalarni tepaga chiqarish
        void sortByNew(List<Order> list) {
          list.sort((a, b) {
            final an = newIds.contains(a.id) ? 0 : 1;
            final bn = newIds.contains(b.id) ? 0 : 1;
            if (an != bn) return an - bn;
            return b.createdAt.compareTo(a.createdAt);
          });
        }
        sortByNew(pickupOrders);
        sortByNew(deliveryOrders);

        // Tanlangan seksiya bo'yicha filtr
        final showPickup = _sectionFilter == null || _sectionFilter == 'pickup';
        final showDelivery = _sectionFilter == null || _sectionFilter == 'delivery';

        return Scaffold(
          backgroundColor: Colors.transparent,
          body: RefreshIndicator(
            color: AppTheme.primary,
            onRefresh: () => context.read<OrdersCubit>().load(),
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _sectionTabs(pickupOrders.length, deliveryOrders.length)),
                SliverToBoxAdapter(child: _search()),
                if (newIds.isNotEmpty) SliverToBoxAdapter(child: _newBanner(newIds.length)),

                // 🏠 Uydan olib ketish
                if (showPickup) ...[
                  if (pickupOrders.isEmpty && !showDelivery)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: EmptyState(
                        icon: LucideIcons.packageOpen,
                        message: _searchQuery.isNotEmpty
                            ? 'Ushbu qidiruv bo\'yicha buyurtma topilmadi'
                            : 'Uydan olib ketish uchun buyurtma yo\'q',
                      ),
                    )
                  else if (pickupOrders.isNotEmpty) ...[
                    SliverToBoxAdapter(child: _sectionHeader('🏠  Uydan olib ketish', pickupOrders.length, AppTheme.amber)),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) => OrderCard(
                            order: pickupOrders[i],
                            statuses: statuses,
                            isNew: newIds.contains(pickupOrders[i].id),
                            currentUserId: currentUserId,
                            index: i,
                          ),
                          childCount: pickupOrders.length,
                        ),
                      ),
                    ),
                  ],
                ],

                // 🏭 Sexdan olib ketish
                if (showDelivery) ...[
                  if (deliveryOrders.isEmpty && !showPickup)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: EmptyState(
                        icon: LucideIcons.packageOpen,
                        message: _searchQuery.isNotEmpty
                            ? 'Ushbu qidiruv bo\'yicha buyurtma topilmadi'
                            : 'Sexdan olib ketish uchun buyurtma yo\'q',
                      ),
                    )
                  else if (deliveryOrders.isNotEmpty) ...[
                    SliverToBoxAdapter(child: _sectionHeader('🏭  Sexdan olib ketish', deliveryOrders.length, AppTheme.blue)),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) => OrderCard(
                            order: deliveryOrders[i],
                            statuses: statuses,
                            isNew: newIds.contains(deliveryOrders[i].id),
                            currentUserId: currentUserId,
                            index: i + pickupOrders.length,
                          ),
                          childCount: deliveryOrders.length,
                        ),
                      ),
                    ),
                  ],
                ],

                // Agar ikkala seksiya ham tanlangan bo'lsa-yu, hech qanday buyurtma bo'lmasa
                if (showPickup && showDelivery && pickupOrders.isEmpty && deliveryOrders.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: LucideIcons.packageOpen,
                      message: _searchQuery.isNotEmpty ? 'Ushbu qidiruv bo\'yicha buyurtma topilmadi' : 'Hozircha buyurtma yo\'q',
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Ikki seksiya o'rtasida almashish uchun tablar
  Widget _sectionTabs(int pickupCount, int deliveryCount) {
    Widget tab(String label, IconData icon, int count, String? id, Color color) {
      final active = _sectionFilter == id;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _sectionFilter = active ? null : id),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: active ? color.withOpacity(0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: active ? color : AppTheme.borderColor,
                width: active ? 1.5 : 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: active ? color : AppTheme.textSecondary),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: AppTheme.text(12, weight: FontWeight.w700, color: active ? color : AppTheme.textSecondary),
                ),
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: active ? color : AppTheme.bg,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    '$count',
                    style: AppTheme.text(10, weight: FontWeight.w800, color: active ? Colors.white : AppTheme.textMuted),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      child: Row(
        children: [
          tab('Uydan olib ketish', LucideIcons.home, pickupCount, 'pickup', AppTheme.amber),
          tab('Sexdan olib ketish', LucideIcons.factory, deliveryCount, 'delivery', AppTheme.blue),
        ],
      ),
    );
  }

  /// Seksiya sarlavhasi
  Widget _sectionHeader(String title, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          Container(width: 4, height: 18, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 10),
          Text(title, style: AppTheme.display(16, weight: FontWeight.w800, spacing: -0.3)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(99)),
            child: Text('$count ta', style: AppTheme.text(11, weight: FontWeight.w700, color: color)),
          ),
        ],
      ),
    );
  }

  Widget _search() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: AppField(
        controller: _searchController,
        hint: 'Mijoz, telefon yoki manzil...',
        icon: LucideIcons.search,
        onChanged: (v) => setState(() => _searchQuery = v),
      ),
    );
  }

  Widget _newBanner(int count) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: AppTheme.greenSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
      ),
      child: Row(children: [
        const Icon(LucideIcons.bellRing, size: 16, color: AppTheme.primary)
            .animate(onPlay: (c) => c.repeat(reverse: true))
            .scaleXY(end: 1.18, duration: 700.ms, curve: Curves.easeInOut),
        const SizedBox(width: 8),
        Text(count > 1 ? '$count ta yangi buyurtma keldi' : 'Yangi buyurtma keldi',
            style: AppTheme.text(12, weight: FontWeight.w700, color: AppTheme.primaryDark)),
      ]),
    );
  }
}
