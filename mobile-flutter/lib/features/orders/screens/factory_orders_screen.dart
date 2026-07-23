import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../ui/app_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/order_card.dart';

/// Sexdagi buyurtmaning ichki bosqichi - gilamlarning (order item) status
/// yig'indisidan hisoblanadi, alohida saqlanmaydi.
enum _WorkshopStage { keldi, bajarilmoqda, tugatilmoqda }

/// SEX HODIMI uchun buyurtmalar ekrani.
///
/// Faqat **workshop (sex) zonasidagi** buyurtmalarni ko'rsatadi —
/// ya'ni haydovchi "Olib ketish" tugmasini bosgan (uydan olganini
/// tasdiqlagan) buyurtmalar. Pickup va delivery statuslari yashirinadi.
///
/// Ichida esa gilamlarning ishlov bosqichiga (ACCEPTED/WASHED/DRIED/READY)
/// qarab 3 ta bo'limga bo'linadi: Keldi / Bajarilmoqda / Tugatilmoqda.
/// "Tugatilmoqda" bo'limidagi buyurtmani tasdiqlash (barcha gilamlar
/// "Tayyor" bo'lgach) uni haydovchiga topshirish uchun navbatga chiqaradi
/// (bu FactoryOrderDetailScreen'dagi "...ga yuborish" tugmasi orqali amalga
/// oshadi).
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
  _WorkshopStage? _stageFilter;

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

  /// Gilamlar (order item) statuslaridan buyurtmaning sexdagi bosqichini aniqlaydi.
  /// Item kiritilmagan bo'lsa (hali o'lchov/gilam qo'shilmagan) - "Keldi".
  _WorkshopStage _stageOf(Order o) {
    if (o.items.isEmpty) return _WorkshopStage.keldi;
    final allReady = o.items.every((i) => i.status == 'READY');
    if (allReady) return _WorkshopStage.tugatilmoqda;
    final anyStarted = o.items.any((i) => i.status != 'ACCEPTED');
    return anyStarted ? _WorkshopStage.bajarilmoqda : _WorkshopStage.keldi;
  }

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

        final keldi = filtered.where((o) => _stageOf(o) == _WorkshopStage.keldi).toList();
        final bajarilmoqda = filtered.where((o) => _stageOf(o) == _WorkshopStage.bajarilmoqda).toList();
        final tugatilmoqda = filtered.where((o) => _stageOf(o) == _WorkshopStage.tugatilmoqda).toList();

        final showKeldi = _stageFilter == null || _stageFilter == _WorkshopStage.keldi;
        final showBajarilmoqda = _stageFilter == null || _stageFilter == _WorkshopStage.bajarilmoqda;
        final showTugatilmoqda = _stageFilter == null || _stageFilter == _WorkshopStage.tugatilmoqda;

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
              // 3 bosqich tablari
              SliverToBoxAdapter(
                child: _stageTabs(keldi.length, bajarilmoqda.length, tugatilmoqda.length),
              ),
              // Bo'limlar
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
              else ...[
                if (showKeldi && keldi.isNotEmpty) ...[
                  SliverToBoxAdapter(child: _sectionHeader('🆕  Keldi', keldi.length, AppTheme.amber)),
                  _orderList(keldi, statuses, currentUserId),
                ],
                if (showBajarilmoqda && bajarilmoqda.isNotEmpty) ...[
                  SliverToBoxAdapter(child: _sectionHeader('🧺  Bajarilmoqda', bajarilmoqda.length, AppTheme.blue)),
                  _orderList(bajarilmoqda, statuses, currentUserId),
                ],
                if (showTugatilmoqda && tugatilmoqda.isNotEmpty) ...[
                  SliverToBoxAdapter(child: _sectionHeader('✅  Tugatilmoqda', tugatilmoqda.length, AppTheme.teal)),
                  _orderList(tugatilmoqda, statuses, currentUserId),
                ],
                const SliverToBoxAdapter(child: SizedBox(height: 80)),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _orderList(List<Order> list, List<OrderStatusInfo> statuses, String currentUserId) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, i) => OrderCard(
            order: list[i],
            statuses: statuses,
            currentUserId: currentUserId,
            index: i,
          ),
          childCount: list.length,
        ),
      ),
    );
  }

  /// 3 bosqich o'rtasida almashish uchun tablar (bittasiga bosilsa shu
  /// bo'lim yagona ko'rinadi, yana bosilsa hammasi qaytadi).
  Widget _stageTabs(int keldiCount, int bajarilmoqdaCount, int tugatilmoqdaCount) {
    Widget tab(String label, int count, _WorkshopStage stage, Color color) {
      final active = _stageFilter == stage;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _stageFilter = active ? null : stage),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 3),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: active ? color.withOpacity(0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: active ? color : AppTheme.borderColor,
                width: active ? 1.5 : 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: AppTheme.text(11.5, weight: FontWeight.w700, color: active ? color : AppTheme.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 3),
                Text(
                  '$count',
                  style: AppTheme.text(13, weight: FontWeight.w800, color: active ? color : AppTheme.textMuted),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 2, 16, 4),
      child: Row(
        children: [
          tab('Keldi', keldiCount, _WorkshopStage.keldi, AppTheme.amber),
          tab('Bajarilmoqda', bajarilmoqdaCount, _WorkshopStage.bajarilmoqda, AppTheme.blue),
          tab('Tugatilmoqda', tugatilmoqdaCount, _WorkshopStage.tugatilmoqda, AppTheme.teal),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          Container(width: 4, height: 18, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 10),
          Text(title, style: AppTheme.display(15, weight: FontWeight.w800, spacing: -0.3)),
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
}
