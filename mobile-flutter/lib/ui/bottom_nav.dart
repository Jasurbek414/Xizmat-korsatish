import 'package:flutter/material.dart';
import '../core/theme.dart';

class NavDest {
  final IconData icon;
  final String label;
  const NavDest(this.icon, this.label);
}

/// Markaziy FAB'li pastki menyu paneli. Elementlar markaz atrofida teng
/// ikkiga bo'linadi (har biri Expanded) - shunda o'rtadagi bo'shliq va FAB
/// aniq markazga to'g'ri keladi, element ustiga chiqmaydi.
///
/// FABni Scaffold.floatingActionButton = AppNavFab(...) sifatida, joyini esa
/// FloatingActionButtonLocation.centerDocked qilib bering.
class AppBottomNav extends StatelessWidget {
  final List<NavDest> items;
  final int selected;
  final ValueChanged<int> onSelect;
  final bool hasCenter;

  const AppBottomNav({
    super.key,
    required this.items,
    required this.selected,
    required this.onSelect,
    this.hasCenter = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!hasCenter) {
      return _bar(Row(children: [
        for (var i = 0; i < items.length; i++) Expanded(child: _item(i)),
      ]));
    }
    final leftCount = (items.length / 2).ceil();
    Widget half(int start, int end) => Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [for (var i = start; i < end; i++) _item(i)],
          ),
        );
    return _bar(Row(children: [
      half(0, leftCount),
      const SizedBox(width: 62), // markaziy FAB uchun teng joy
      half(leftCount, items.length),
    ]));
  }

  Widget _bar(Widget child) => BottomAppBar(
        color: AppTheme.surface,
        elevation: 0,
        shape: hasCenter ? const CircularNotchedRectangle() : null,
        notchMargin: 8,
        height: 70,
        padding: EdgeInsets.zero,
        child: Container(
          decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppTheme.borderColor))),
          child: child,
        ),
      );

  Widget _item(int i) {
    final on = i == selected;
    final color = on ? AppTheme.primaryDark : AppTheme.textMuted;
    return InkWell(
      onTap: () => onSelect(i),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(items[i].icon, size: 22, color: color),
            const SizedBox(height: 3),
            Text(items[i].label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTheme.text(10, weight: FontWeight.w600, color: on ? AppTheme.primaryDark : AppTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}

/// Pastki menyuning markazidagi yashil dumaloq "+" tugma.
class AppNavFab extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const AppNavFab({super.key, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 58,
      height: 58,
      child: FloatingActionButton(
        onPressed: onTap,
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 3,
        shape: const CircleBorder(),
        child: Icon(icon, size: 27),
      ),
    );
  }
}
