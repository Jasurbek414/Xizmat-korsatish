import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../models/user.dart';
import '../../finance/screens/finance_summary_screen.dart';
import '../../gps/widgets/shift_toggle_button.dart';
import '../../map/screens/driver_map_screen.dart';
import '../../orders/bloc/orders_cubit.dart';
import '../../orders/screens/driver_orders_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../../team/screens/team_screen.dart';
import '../models/dashboard_module.dart';
import '../widgets/adaptive_dashboard_shell.dart';

/// Barcha rollar (SUPERADMIN'dan tashqari) uchun YAGONA dashboard.
///
/// Muhim: bo'limlar rol NOMIGA emas, balki backend'dan kelgan ruxsatlarga
/// (permissions) qarab ko'rsatiladi. Shuning uchun admin panelida yangi
/// (butunlay maxsus) rol yaratilsa yoki mavjud rolga yangi ruxsat berilsa,
/// mobil ilova kodini o'zgartirmasdan avtomatik moslashadi - masalan, admin
/// "Sifat nazoratchisi" degan yangi rol yaratib, unga faqat "Buyurtmalar"
/// va "Moliya" ruxsatlarini bersa, o'sha rolga tayinlangan xodim mobil
/// ilovada aynan shu ikki bo'limni ko'radi, boshqasini emas.
class MainDashboard extends StatelessWidget {
  final User user;
  final Permissions permissions;

  const MainDashboard({
    super.key,
    required this.user,
    required this.permissions,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => OrdersCubit()..load()),
      ],
      child: AdaptiveDashboardShell(
        title: user.fullName,
        permissions: permissions,
        actions: permissions.canTrackGps ? const [ShiftToggleButton()] : null,
        modules: [
          DashboardModule(
            id: 'orders',
            label: 'Buyurtmalar',
            icon: LucideIcons.packageCheck,
            permissionKey: PermissionKeys.mobileOrders,
            builder: (_) => const DriverOrdersScreen(),
          ),
          DashboardModule(
            id: 'map',
            label: 'Xarita',
            icon: LucideIcons.map,
            permissionKey: PermissionKeys.mobileGps,
            builder: (_) => const DriverMapScreen(),
          ),
          DashboardModule(
            id: 'finance',
            label: 'Moliya',
            icon: LucideIcons.wallet,
            permissionKey: PermissionKeys.mobileFinanceView,
            builder: (_) => const FinanceSummaryScreen(),
          ),
          DashboardModule(
            id: 'team',
            label: 'Jamoa',
            icon: LucideIcons.users,
            permissionKey: PermissionKeys.mobileTeamView,
            builder: (_) => const TeamScreen(),
          ),
          DashboardModule(
            id: 'profile',
            label: 'Profil',
            icon: LucideIcons.userCircle,
            builder: (_) => ProfileScreen(
              user: user,
              canViewSalary: permissions.canViewSalary,
            ),
          ),
        ],
      ),
    );
  }
}
