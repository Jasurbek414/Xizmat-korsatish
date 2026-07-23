import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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

        // So'nggi (yangi tepada, keyin eng yangi sanalar) 5 ta
        final recent = [...orders]..sort((a, b) {
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
              _statsRow(orders, statuses).animate().fadeIn(delay: 80.ms, duration: 350.ms).slideY(begin: 0.08),
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
