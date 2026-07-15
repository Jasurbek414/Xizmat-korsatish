import 'package:flutter/material.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../models/dashboard_module.dart';

/// Har bir rol uchun bitta umumiy dashboard qobig'i: pastki navigatsiya
/// paneli faqat backend'dan kelgan ruxsatlarga (permissions) ega bo'limlarni
/// ko'rsatadi. Admin panelida rolga yangi modul yoqilsa/o'chirilsa, mobil
/// ilova kod o'zgarishisiz avtomatik moslashadi.
class AdaptiveDashboardShell extends StatefulWidget {
  final String title;
  final Permissions permissions;
  final List<DashboardModule> modules;
  final List<Widget>? actions;

  const AdaptiveDashboardShell({
    super.key,
    required this.title,
    required this.permissions,
    required this.modules,
    this.actions,
  });

  @override
  State<AdaptiveDashboardShell> createState() =>
      _AdaptiveDashboardShellState();
}

class _AdaptiveDashboardShellState extends State<AdaptiveDashboardShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final visibleModules = widget.modules
        .where((m) => m.isVisibleFor(widget.permissions))
        .toList();

    if (visibleModules.isEmpty) {
      return const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              "Sizning rolingiz uchun hech qanday mobil funksiya yoqilmagan.\n"
              "Administratordan ruxsatlarni sozlashini so'rang.",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          ),
        ),
      );
    }

    final activeIndex = _index < visibleModules.length ? _index : 0;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        centerTitle: false,
        actions: widget.actions,
      ),
      body: IndexedStack(
        index: activeIndex,
        children: visibleModules
            .map((m) => Builder(builder: m.builder))
            .toList(),
      ),
      bottomNavigationBar: visibleModules.length > 1
          ? NavigationBar(
              selectedIndex: activeIndex,
              onDestinationSelected: (i) => setState(() => _index = i),
              backgroundColor: AppTheme.darkSurface,
              destinations: visibleModules
                  .map(
                    (m) => NavigationDestination(
                      icon: Icon(m.icon),
                      label: m.label,
                    ),
                  )
                  .toList(),
            )
          : null,
    );
  }
}
