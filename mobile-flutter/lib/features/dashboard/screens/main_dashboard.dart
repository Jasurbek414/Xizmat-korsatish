import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../gps/widgets/shift_toggle_button.dart';
import '../../notifications/services/push_notification_service.dart';
import '../../orders/bloc/orders_cubit.dart';
import '../../orders/screens/create_order_screen.dart';
import '../../orders/screens/driver_orders_screen.dart';
import '../../orders/screens/factory_orders_screen.dart';
import '../../orders/screens/order_history_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../models/dashboard_module.dart';
import '../widgets/adaptive_dashboard_shell.dart';
import 'home_dashboard_screen.dart';

/// Barcha rollar (SUPERADMIN'dan tashqari) uchun YAGONA dashboard.
///
/// Muhim: bo'limlar rol NOMIGA emas, balki backend'dan kelgan ruxsatlarga
/// (permissions) qarab ko'rsatiladi. Shuning uchun admin panelida yangi
/// rol yaratilsa yoki mavjud rolga yangi ruxsat berilsa, mobil ilova kodini
/// o'zgartirmasdan avtomatik moslashadi.
///
/// REAL-VAQT: dashboard OrdersCubit'ni ushlab turadi va uni AVTOMATIK yangilaydi:
///  - davriy poll (har 20s) - FCM sozlanmagan bo'lsa ham ishlaydi;
///  - ilova fondan qaytganda (lifecycle);
///  - push (FCM) kelganda.
/// Shunday qilib webdan yangi buyurtma tayinlanishi bilan haydovchi telefonida
/// avtomatik paydo bo'ladi va ovozli bildirishnoma chalinadi.
class MainDashboard extends StatefulWidget {
  final User user;
  final Permissions permissions;

  const MainDashboard({
    super.key,
    required this.user,
    required this.permissions,
  });

  @override
  State<MainDashboard> createState() => _MainDashboardState();
}

class _MainDashboardState extends State<MainDashboard> with WidgetsBindingObserver {
  late final OrdersCubit _ordersCubit;
  Timer? _pollTimer;

  static const _pollInterval = Duration(seconds: 20);

  bool get _canSeeOrders => widget.permissions.canViewOrders;
  // DRIVER bo'lmagan barcha rollar sex xodimi deb hisoblanadi
  bool get _isFactory => !widget.user.role.contains('DRIVER');

  /// AppBar sarlavhasi - rolга mos: haydovchiga salom + ism, sex hodimiga rol nomi.
  Widget _headerTitle() {
    if (_isFactory) {
      return const Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sex xodimi', style: TextStyle(fontFamily: 'Outfit', fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, height: 1.05)),
          SizedBox(height: 2),
          Text('Bugungi ishlar', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        ],
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Assalomu alaykum 👋', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 2),
        Text(
          widget.user.fullName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontFamily: 'Outfit', fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, height: 1.05),
        ),
      ],
    );
  }

  /// Markaziy "+" tugma - yangi buyurtma yaratish ekranini ochadi.
  void _openCreateOrder() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BlocProvider.value(
          value: _ordersCubit,
          child: CreateOrderScreen(currentUserId: widget.user.id),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _ordersCubit = OrdersCubit()..load();

    if (_canSeeOrders) {
      WidgetsBinding.instance.addObserver(this);
      // Push (FCM) kelganda darhol jimgina yangilaymiz.
      PushNotificationService.onMessageReceived = (_) => _refreshOrders(fromPush: true);
      // Davriy poll (real-vaqt zaxira - FCM bo'lmasa ham ishlaydi).
      _pollTimer = Timer.periodic(_pollInterval, (_) => _refreshOrders());
    }
  }

  /// Buyurtmalarни jimgina yangilaydi; yangi buyurtma bo'lsa ovoz + xabar.
  Future<void> _refreshOrders({bool fromPush = false}) async {
    if (!mounted) return;
    final newCount = await _ordersCubit.refresh();
    if (newCount > 0 && mounted) {
      // FCM push o'zi ovozli bildirishnoma ko'rsatadi - takrorlamaymiz;
      // poll orqali aniqlansa (push kelmagan bo'lsa) - o'zimiz ovoz beramiz.
      if (!fromPush) {
        PushNotificationService.showNewOrderAlert(count: newCount);
      }
      final messenger = ScaffoldMessenger.maybeOf(context);
      messenger?.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(LucideIcons.bellRing, color: Colors.white, size: 18),
              const SizedBox(width: 10),
              Text(
                newCount > 1 ? '$newCount ta yangi buyurtma keldi' : 'Yangi buyurtma keldi',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Ilova fondan qaytganda (ekran ochilganda) darhol yangilaymiz.
    if (state == AppLifecycleState.resumed && _canSeeOrders) {
      _refreshOrders();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    if (_canSeeOrders) {
      WidgetsBinding.instance.removeObserver(this);
      PushNotificationService.onMessageReceived = null;
    }
    _ordersCubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _ordersCubit,
      child: AdaptiveDashboardShell(
        title: widget.user.fullName,
        titleWidget: _headerTitle(),
        permissions: widget.permissions,
        actions: widget.permissions.canTrackGps ? const [ShiftToggleButton()] : null,
        centerIcon: LucideIcons.plus,
        centerLabel: _isFactory ? 'Qabul qilish' : 'Yangi buyurtma',
        onCenterTap: _canSeeOrders ? _openCreateOrder : null,
        // Menyu: rolga qarab farqlanadi
        //   🚗 HAYDOVCHI: Bosh sahifa · Buyurtmalar (pickup/delivery) · [+] · Tarix · Profil
        //   🏭 SEX HODIMI: Bosh sahifa · Sex buyurtmalari (sodda ro'yxat) · [+] · Tarix · Profil
        modules: [
          DashboardModule(
            id: 'home',
            label: 'Bosh sahifa',
            icon: LucideIcons.home,
            builder: (_) => HomeDashboardScreen(user: widget.user, permissions: widget.permissions),
          ),
          // HAYDOVCHI uchun "Uydan olib ketish" / "Sexdan olib ketish" bo'limlari
          if (!_isFactory) ...[
            DashboardModule(
              id: 'orders',
              label: 'Buyurtmalar',
              icon: LucideIcons.clipboardList,
              permissionKey: PermissionKeys.mobileOrders,
              builder: (_) => const DriverOrdersScreen(),
            ),
          ],
          // SEX HODIMI uchun soddalashtirilgan buyurtmalar ro'yxati
          if (_isFactory) ...[
            DashboardModule(
              id: 'factory-orders',
              label: 'Sex buyurtmalari',
              icon: LucideIcons.factory,
              permissionKey: PermissionKeys.mobileOrders,
              builder: (_) => const FactoryOrdersScreen(),
            ),
          ],
          DashboardModule(
            id: 'history',
            label: 'Tarix',
            icon: LucideIcons.history,
            permissionKey: PermissionKeys.mobileOrders,
            builder: (_) => const OrderHistoryScreen(),
          ),
          DashboardModule(
            id: 'profile',
            label: 'Profil',
            icon: LucideIcons.userCircle,
            builder: (_) => ProfileScreen(
              user: widget.user,
              canViewSalary: widget.permissions.canViewSalary,
            ),
          ),
        ],
      ),
    );
  }
}
