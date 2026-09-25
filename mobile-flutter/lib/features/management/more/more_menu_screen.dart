import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../map/fleet_map_screen.dart';
import '../clients/clients_screen.dart';
import '../employees/employees_screen.dart';
import '../finance/finance_screen.dart';
import '../orders/live_orders_screen.dart';
import '../reports/reports_screen.dart';
import '../salaries/salaries_screen.dart';
import '../settings/settings_screen.dart';

/// Pastki navigatsiyaga sig'magan boshqaruv bo'limlari.
///
/// Har bir katakcha o'z ruxsat kalitiga bog'langan: menejerda `settings` yo'q,
/// shuning uchun "Sozlamalar" katakchasi unga UMUMAN ko'rinmaydi (o'chirilgan
/// holda emas - butunlay yashiriladi, chunki mavjud emas degan taassurot
/// aniqroq).
///
/// `ready: false` bo'lgan bo'limlar hali qurilmagan - ular ATAYIN ko'rsatiladi
/// va "tayyorlanmoqda" deb belgilanadi, aks holda administrator "webda bor,
/// mobilda yo'q" deb izlanib vaqt yo'qotardi.
class MoreMenuScreen extends StatelessWidget {
  final Permissions permissions;

  const MoreMenuScreen({
    super.key,
    required this.permissions,
  });

  @override
  Widget build(BuildContext context) {
    final p = permissions;

    final tiles = <_ModuleTile>[
      // Mijozlar allaqachon pastki navigatsiyada bor - bu YORLIQ, xuddi
      // shu ekranga tezroq kirish uchun (2026-08-05 da administrator
      // "Ko'proq" ichida ham ko'rishni so'radi).
      if (p.canManageClients)
        _ModuleTile(
          icon: LucideIcons.users,
          label: 'Mijozlar',
          color: AppTheme.purple,
          soft: AppTheme.purpleSoft,
          // MUHIM: ClientsScreen o'zi `SafeArea(top: false)` ishlatadi -
          // chunki pastki navigatsiya tabida u ALLAQACHON AppBar'li
          // qobiq ostida ochiladi. Bu yorliq orqali AppBar'SIZ ochilsa,
          // qidiruv maydoni status panели ostiga kirib ketardi (2026-08-06
          // da real qurilmada topilgan). Shuning uchun shu yerda o'z
          // AppBar'i bilan o'raladi - status panел joyi to'g'ri hisobga
          // olinadi.
          builder: (_) => Scaffold(
            appBar: AppBar(title: const Text('Mijozlar')),
            body: const ClientsScreen(),
          ),
        ),
      if (p.canManageOrders)
        _ModuleTile(
          icon: LucideIcons.radio,
          label: 'Jonli buyurtmalar',
          color: AppTheme.blue,
          soft: AppTheme.blueSoft,
          builder: (_) => const LiveOrdersScreen(),
        ),
      if (p.canManageOrders || p.canManageFinance)
        _ModuleTile(
          icon: LucideIcons.barChart2,
          label: 'Hisobotlar',
          color: AppTheme.teal,
          soft: AppTheme.tealSoft,
          builder: (_) => ReportsScreen(permissions: p),
        ),
      if (p.canManageEmployees)
        _ModuleTile(
          icon: LucideIcons.userCog,
          label: 'Xodimlar',
          color: AppTheme.amber,
          soft: AppTheme.amberSoft,
          builder: (_) => const EmployeesScreen(),
        ),
      if (p.canViewMap)
        _ModuleTile(
          icon: LucideIcons.map,
          label: 'Xarita',
          color: AppTheme.teal,
          soft: AppTheme.tealSoft,
          builder: (_) => const FleetMapScreen(),
        ),
      if (p.canManageFinance)
        _ModuleTile(
          icon: LucideIcons.wallet,
          label: 'Moliya',
          color: AppTheme.primary,
          soft: AppTheme.primarySoft,
          builder: (_) => const FinanceScreen(),
        ),
      if (p.canManageSalaries)
        _ModuleTile(
          icon: LucideIcons.banknote,
          label: 'Ish haqi',
          color: AppTheme.purple,
          soft: AppTheme.purpleSoft,
          builder: (_) => const SalariesScreen(),
        ),
      if (p.canManageSettings)
        _ModuleTile(
          icon: LucideIcons.settings,
          label: 'Sozlamalar',
          color: AppTheme.navy,
          soft: AppTheme.surfaceAlt,
          builder: (_) => const ManagementSettingsScreen(),
        ),
    ];

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          const Text(
            "Bo'limlar",
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          if (tiles.isEmpty)
            const EmptyState(
              icon: LucideIcons.lock,
              message: "Sizning rolingizga qo'shimcha bo'lim biriktirilmagan.",
            )
          else
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.95,
              children: tiles,
            ),
        ],
      ),
    );
  }
}

class _ModuleTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color soft;
  final WidgetBuilder? builder;
  final bool ready;

  const _ModuleTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.soft,
    this.builder,
    this.ready = true,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = ready && builder != null;

    return Opacity(
      opacity: enabled ? 1 : 0.55,
      child: Material(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.rLg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.rLg),
          onTap: enabled
              ? () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: builder!),
                  )
              : () => ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                    SnackBar(
                      content: Text(
                        '$label bo\'limi tayyorlanmoqda. Hozircha veb-paneldan foydalaning.',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      behavior: SnackBarBehavior.floating,
                    ),
                  ),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTheme.rLg),
              border: Border.all(color: AppTheme.borderColor),
            ),
            padding: const EdgeInsets.all(10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: soft,
                    borderRadius: BorderRadius.circular(AppTheme.rMd),
                  ),
                  child: Icon(icon, size: 20, color: color),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                if (!ready) ...[
                  const SizedBox(height: 2),
                  const Text(
                    'tayyorlanmoqda',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: AppTheme.textMuted),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
