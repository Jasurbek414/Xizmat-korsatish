import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../models/user.dart';
import '../../../ui/app_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../finance/screens/finance_summary_screen.dart';
import '../../gps/widgets/shift_toggle_button.dart';
import '../../map/screens/driver_map_screen.dart';
import '../../orders/bloc/orders_cubit.dart';
import '../../orders/order_zone.dart';
import '../../orders/widgets/order_card.dart';
import '../../team/screens/team_screen.dart';

/// Bosh sahifa - umumiy ko'rinish: statistika, tez amallar (Xarita/Moliya/
/// Jamoa) va so'nggi buyurtmalar. Buyurtmalarning to'liq ro'yxati alohida
/// "Buyurtmalar" tabida.
class HomeDashboardScreen extends StatelessWidget {
  final User user;
  final Permissions permissions;
  const HomeDashboardScreen({super.key, required this.user, required this.permissions});

  static const _statPalette = [
    [AppTheme.amber, AppTheme.amberSoft],
    [AppTheme.purple, AppTheme.purpleSoft],
    [AppTheme.teal, AppTheme.tealSoft],
    [AppTheme.orange, AppTheme.orangeSoft],
    [AppTheme.blue, AppTheme.blueSoft],
  ];

  void _open(BuildContext context, String title, Widget screen) {
    final cubit = context.read<OrdersCubit>();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BlocProvider.value(
          value: cubit,
          child: Scaffold(appBar: AppBar(title: Text(title)), body: screen),
        ),
      ),
    );
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
        final newIds = loaded?.newOrderIds ?? const <String>{};
        final authState = context.read<AuthBloc>().state;
        final currentUserId = authState is Authenticated ? authState.user.id : '';
        final role = authState is Authenticated ? authState.user.role : '';

        // MUHIM (audit'da topilgan xato, tuzatildi): bu ekran avval HECH
        // QANDAY zona filtri qo'llamasdi - "so'nggi buyurtmalar" xom
        // (dispatch pool) ro'yxatidan olinardi. Shu sabab haydovchining bosh
        // sahifasida sex ichida bo'lishi kerak bo'lgan (undan yashirin
        // bo'lishi kerak) buyurtmalar ham ko'rinib, ularga ta'sir o'tkazish
        // (status o'zgartirish) imkoni qolardi - va aksincha, sex hodimining
        // bosh sahifasida haydovchining pickup/delivery bosqichidagi
        // buyurtmalari ko'rinib, ularga aralashish imkoni bor edi.
        // DriverOrdersScreen/FactoryOrdersScreen'da ishlatiladigan BIR XIL
        // (OrderZoneBoundary) qoida shu yerda ham qo'llaniladi - haydovchi
        // sex ichidagi buyurtmalarni, sex hodimi esa haydovchining pickup/
        // delivery bosqichidagi buyurtmalarini bosh sahifada ko'rmaydi.
        final zoneBoundary = OrderZoneBoundary.fromStatuses(statuses);
        final isDriver = role.contains('DRIVER');
        final isWorkshopStaff = role.contains('SEH') || role.contains('FACTORY') || role == 'WORKER';
        final visibleOrders = orders.where((o) {
          if (isDriver) return !zoneBoundary.isAtWorkshop(o);
          if (isWorkshopStaff) return zoneBoundary.isAtWorkshop(o);
          return true; // ADMIN/MENEJER/DISPETCHER - hammasini ko'radi
        }).toList();

        // MUHIM (audit'da topilgan kamchilik, to'ldirildi): haydovchi
        // mijozdan naqd pulni qabul qilgach buyurtma darhol "Tarix"ga
        // o'tardi va u qo'lida qancha pul yig'ilganini, kassaga qancha
        // topshirishi kerakligini ilovadan BILA OLMASDI - bu ma'lumot
        // faqat veb-admin panelida ko'rinardi. Bu yerda "COLLECTED"
        // (pul olingan, lekin hali kassaga topshirilmagan) buyurtmalar
        // yig'indisi ko'rsatiladi. Backend o'zgarishi shart emas -
        // bunday buyurtmalar allaqachon /orders/completed orqali keladi.
        final unsettled = isDriver
            ? orders
                .where((o) => o.workerId == currentUserId && o.paymentStatus == 'COLLECTED')
                .toList()
            : const <Order>[];
        final unsettledTotal =
            unsettled.fold<double>(0, (sum, o) => sum + o.collectedPrice);

        // So'nggi (yangi tepada, keyin eng yangi sanalar) 5 ta
        final recent = [...visibleOrders]..sort((a, b) {
            final an = newIds.contains(a.id) ? 0 : 1;
            final bn = newIds.contains(b.id) ? 0 : 1;
            if (an != bn) return an - bn;
            return b.createdAt.compareTo(a.createdAt);
          });
        final top = recent.take(5).toList();

        return RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: () => context.read<OrdersCubit>().load(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(0, 4, 0, 96),
            children: [
              _greetingHeader(),
              if (unsettled.isNotEmpty)
                _unsettledCashCard(unsettled.length, unsettledTotal)
                    .animate()
                    .fadeIn(delay: 60.ms, duration: 350.ms)
                    .slideY(begin: 0.08),
              _statsRow(visibleOrders, statuses).animate().fadeIn(delay: 80.ms, duration: 350.ms).slideY(begin: 0.08),
              _quickActions(context).animate().fadeIn(delay: 160.ms, duration: 350.ms).slideY(begin: 0.08),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
                child: Row(children: [
                  Text('So\'nggi buyurtmalar', style: AppTheme.display(16, weight: FontWeight.w700)),
                  const Spacer(),
                  if (newIds.isNotEmpty) StatusPill('${newIds.length} yangi', AppTheme.primary, dot: true),
                ]),
              ),
              if (top.isEmpty)
                const EmptyState(icon: LucideIcons.packageOpen, message: 'Hozircha buyurtma yo\'q')
              else
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      for (var i = 0; i < top.length; i++)
                        OrderCard(order: top[i], statuses: statuses, isNew: newIds.contains(top[i].id), currentUserId: currentUserId, index: i),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  /// Rolga qarab bosh sahifa gradientini tanlaydi - haydovchi (ko'k), sex
  /// xodimi (feruza) va boshqalar (asosiy yashil) vizual jihatdan farqlansin.
  List<Color> get _roleGradient {
    if (user.role.contains('DRIVER')) return const [AppTheme.blue, Color(0xFF1B4CC4)];
    if (user.role.contains('SEH') || user.role.contains('FACTORY') || user.role == 'WORKER') {
      return const [AppTheme.teal, Color(0xFF0A6F65)];
    }
    return const [AppTheme.primary, AppTheme.primaryDark];
  }

  String get _roleLabel {
    final r = user.role;
    if (r.contains('DRIVER')) return 'Haydovchi';
    if (r.contains('SEH') || r.contains('FACTORY')) return 'Sex xodimi';
    if (r.contains('DISPATCH')) return 'Dispetcher';
    if (r.contains('MANAGER')) return 'Menejer';
    if (r.contains('ADMIN')) return 'Admin';
    return 'Xodim';
  }

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 6) return 'Xayrli tun';
    if (hour < 12) return 'Xayrli tong';
    if (hour < 17) return 'Xayrli kun';
    return 'Xayrli kech';
  }

  Widget _greetingHeader() {
    final gradient = _roleGradient;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(color: gradient[0].withOpacity(0.35), blurRadius: 24, offset: const Offset(0, 10)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.18),
              border: Border.all(color: Colors.white.withOpacity(0.5), width: 1.5),
            ),
            child: Text(
              user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$_greeting,',
                    style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  user.fullName.isNotEmpty ? user.fullName : user.username,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(_roleLabel,
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          if (permissions.has(PermissionKeys.mobileGps)) const ShiftToggleButton(),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.08, curve: Curves.easeOutCubic);
  }

  /// Haydovchi mijozlardan yig'gan, lekin hali kassaga topshirmagan naqd pul.
  /// Kassaga topshirilgach (veb-admin "Topshirishni tasdiqlash"ni bosgach)
  /// buyurtma HANDED_OVER holatiga o'tadi va bu kartadan yo'qoladi.
  Widget _unsettledCashCard(int count, double total) {
    final formatter = NumberFormat.decimalPattern('uz');
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.amberSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.amber.withOpacity(0.35)),
      ),
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppTheme.amber.withOpacity(0.18),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(LucideIcons.wallet, size: 20, color: AppTheme.amber),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Kassaga topshirilmagan',
                style: AppTheme.text(12, weight: FontWeight.w600, color: AppTheme.textSecondary)),
            const SizedBox(height: 2),
            Text("${formatter.format(total)} so'm",
                style: AppTheme.display(18, weight: FontWeight.w800, spacing: -0.3)),
          ]),
        ),
        StatusPill('$count ta', AppTheme.amber),
      ]),
    );
  }

  Widget _statsRow(List<Order> orders, List<OrderStatusInfo> statuses) {
    final tiles = <Widget>[
      StatTile(icon: LucideIcons.clipboardList, value: '${orders.length}', label: 'Jami', color: AppTheme.blue, soft: AppTheme.blueSoft),
    ];
    for (var i = 0; i < statuses.length; i++) {
      final s = statuses[i];
      final count = orders.where((o) => o.status?.id == s.id).length;
      final pair = _statPalette[i % _statPalette.length];
      tiles.add(StatTile(icon: LucideIcons.circleDot, value: '$count', label: s.nameUz, color: pair[0], soft: pair[1]));
    }
    return SizedBox(
      height: 116,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        itemCount: tiles.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, i) => tiles[i],
      ),
    );
  }

  Widget _quickActions(BuildContext context) {
    final actions = <Widget>[];
    if (permissions.has(PermissionKeys.mobileGps)) {
      actions.add(_actionCard(LucideIcons.map, 'Xarita', AppTheme.blue, AppTheme.blueSoft,
          () => _open(context, 'Xarita', const DriverMapScreen())));
    }
    if (permissions.has(PermissionKeys.mobileFinanceView)) {
      actions.add(_actionCard(LucideIcons.wallet, 'Moliya', AppTheme.teal, AppTheme.tealSoft,
          () => _open(context, 'Moliya', const FinanceSummaryScreen())));
    }
    if (permissions.has(PermissionKeys.mobileTeamView)) {
      actions.add(_actionCard(LucideIcons.users, 'Jamoa', AppTheme.purple, AppTheme.purpleSoft,
          () => _open(context, 'Jamoa', const TeamScreen())));
    }
    if (actions.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      child: Row(children: [
        for (var i = 0; i < actions.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(child: actions[i]),
        ],
      ]),
    );
  }

  Widget _actionCard(IconData icon, String label, Color color, Color soft, VoidCallback onTap) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      child: Column(children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(13)),
          child: Icon(icon, size: 21, color: color),
        ),
        const SizedBox(height: 9),
        Text(label, style: AppTheme.text(12.5, weight: FontWeight.w700)),
      ]),
    );
  }
}
