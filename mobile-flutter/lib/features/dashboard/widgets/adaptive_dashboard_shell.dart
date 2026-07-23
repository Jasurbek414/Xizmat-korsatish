import 'package:flutter/material.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../models/dashboard_module.dart';

/// Har bir rol uchun bitta umumiy dashboard qobig'i: pastki navigatsiya faqat
/// backend ruxsatlariga (permissions) ega bo'limlarni ko'rsatadi. Markazda
/// yashil "+" FAB (masalan "Yangi buyurtma"). Admin panelida rolga modul
/// yoqilsa/o'chirilsa, mobil ilova kod o'zgarishisiz moslashadi.
class AdaptiveDashboardShell extends StatefulWidget {
  final String title;
  final Widget? titleWidget;
  final Permissions permissions;
  final List<DashboardModule> modules;
  final List<Widget>? actions;
  final IconData? centerIcon;
  final String? centerLabel;
  final VoidCallback? onCenterTap;

  const AdaptiveDashboardShell({
    super.key,
    required this.title,
    this.titleWidget,
    required this.permissions,
    required this.modules,
    this.actions,
    this.centerIcon,
    this.centerLabel,
    this.onCenterTap,
  });

  @override
  State<AdaptiveDashboardShell> createState() => _AdaptiveDashboardShellState();
}

class _AdaptiveDashboardShellState extends State<AdaptiveDashboardShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final visibleModules = widget.modules.where((m) => m.isVisibleFor(widget.permissions)).toList();

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
    final hasCenter = widget.centerIcon != null && widget.onCenterTap != null && visibleModules.length > 1;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        toolbarHeight: widget.titleWidget != null ? 72 : 56,
        title: widget.titleWidget ?? Text(widget.title),
        centerTitle: false,
        actions: widget.actions,
      ),
      body: IndexedStack(
        index: activeIndex,
        children: visibleModules.map((m) => Builder(builder: m.builder)).toList(),
      ),
      floatingActionButton: hasCenter ? AppNavFab(icon: widget.centerIcon!, onTap: widget.onCenterTap!) : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: visibleModules.length > 1
          ? AppBottomNav(
              hasCenter: hasCenter,
              selected: activeIndex,
              onSelect: (i) => setState(() => _index = i),
              items: visibleModules.map((m) => NavDest(m.icon, m.label)).toList(),
            )
          : null,
    );
  }
}
