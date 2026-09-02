import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../core/permissions/permission_keys.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../dashboard/models/dashboard_module.dart';
import '../dashboard/widgets/adaptive_dashboard_shell.dart';
import '../notifications/widgets/notification_bell.dart';
import '../profile/screens/profile_screen.dart';
import 'clients/clients_screen.dart';
import 'home/management_home_screen.dart';
import 'orders/orders_admin_screen.dart';
import 'more/more_menu_screen.dart';

/// ADMIN va MENEJER rollari uchun BOSHQARUV interfeysi.
///
/// NEGA ALOHIDA EKRAN: mavjud [MainDashboard] haydovchi/sex xodimi uchun
/// mo'ljallangan va u rolni `role.contains('DRIVER')` bilan ikkiga bo'ladi -
/// ya'ni haydovchi BO'LMAGAN har kim (shu jumladan ADMIN va MENEJER ham)
/// "Sex xodimi" interfeysini olardi. U ekranga TEGILMADI: haydovchi, ishchi va
/// sex xodimi uchun hamma narsa avvalgidek qoladi. Boshqaruv rollari endi shu
/// yerga yo'naltiriladi.
///
/// ADMIN va MENEJER uchun bitta qobiq ishlatiladi, chunki farq faqat
/// RUXSATLARDA: menejerda `settings` kaliti yo'q, shuning uchun "Sozlamalar"
/// bo'limi unga ko'rinmaydi. Bu loyihaning mavjud falsafasi - bo'lim rol
/// NOMIGA emas, backend'dan kelgan ruxsatga qarab ochiladi, shuning uchun
/// admin panelida yangi rol yaratilsa ham kod o'zgartirish shart emas.
class ManagementDashboard extends StatelessWidget {
  final User user;
  final Permissions permissions;

  const ManagementDashboard({
    super.key,
    required this.user,
    required this.permissions,
  });

  /// Rolga mos sarlavha. Rol nomi backend'dan kelgan `role` kalitiga qarab
  /// aniqlanadi (nomi admin panelida o'zgartirilishi mumkin, lekin kalit -
  /// RoleSeedService'dagi o'zgarmas qiymat).
  String get _roleLabel {
    switch (user.role) {
      case 'ADMIN':
        return 'Administrator';
      case 'MANAGER':
        return 'Menejer';
      default:
        return 'Boshqaruv';
    }
  }

  Widget _headerTitle(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _roleLabel,
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppTheme.textPrimaryOf(context),
            height: 1.05,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          user.fullName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondaryOf(context),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveDashboardShell(
      title: user.fullName,
      titleWidget: _headerTitle(context),
      permissions: permissions,
      actions: const [Padding(padding: EdgeInsets.only(right: 12), child: NotificationBell())],
      // Pastki navigatsiyada 5 tadan ortiq bo'lim sig'maydi, boshqaruv rollarida
      // esa 8 tagacha modul bor. Shuning uchun eng ko'p ishlatiladigan 4 tasi
      // pastda, qolganlari "Ko'proq" ekranidagi katakchalarda.
      modules: [
        DashboardModule(
          id: 'mgmt-home',
          label: 'Bosh sahifa',
          icon: LucideIcons.layoutDashboard,
          builder: (_) => ManagementHomeScreen(user: user, permissions: permissions),
        ),
        // Buyurtmalar administrator eng ko'p ochadigan bo'lim - avval u faqat
        // "Ko'proq" ichida edi va har safar ikki bosish talab qilardi.
        DashboardModule(
          id: 'mgmt-orders',
          label: 'Buyurtmalar',
          icon: LucideIcons.clipboardList,
          permissionKey: PermissionKeys.orders,
          builder: (_) => const OrdersAdminScreen(),
        ),
        DashboardModule(
          id: 'mgmt-clients',
          label: 'Mijozlar',
          icon: LucideIcons.users,
          permissionKey: PermissionKeys.clients,
          builder: (_) => const ClientsScreen(),
        ),
        DashboardModule(
          id: 'mgmt-more',
          label: "Ko'proq",
          icon: LucideIcons.menu,
          builder: (_) => MoreMenuScreen(permissions: permissions),
        ),
        DashboardModule(
          id: 'mgmt-profile',
          label: 'Profil',
          icon: LucideIcons.userCircle,
          builder: (_) => ProfileScreen(
            user: user,
            canViewSalary: permissions.canViewSalary,
          ),
        ),
      ],
    );
  }
}
