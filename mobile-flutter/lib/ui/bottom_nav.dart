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
      return _bar(context, Row(children: [
        for (var i = 0; i < items.length; i++) Expanded(child: _item(context, i)),
      ]));
    }
    final leftCount = (items.length / 2).ceil();
    Widget half(int start, int end) => Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [for (var i = start; i < end; i++) _item(context, i)],
          ),
        );
    return _bar(context, Row(children: [
      half(0, leftCount),
      const SizedBox(width: 62), // markaziy FAB uchun teng joy
      half(leftCount, items.length),
    ]));
  }

  // Telefonning o'zi gesture-navigatsiya ishlatsa (orqaga qaytish chizig'i),
  // tizim pastki xavfsiz zonasi bo'lmasa tugmalar shu chiziq ostida/juda
  // yaqinida qolib, bosilmay qoladi - shuning uchun panel balandligi va
  // ichki bo'shliq shu zonaga qarab kengaytiriladi.
  Widget _bar(BuildContext context, Widget child) {
    // 24px chegara qo'yilgan - ba'zi telefonlarda (masalan 3 tugmali eski
    // uslubdagi navigatsiya) tizim zonasi 40-48px gacha bo'lishi mumkin,
    // shuni to'liq qo'shsak panel g'ayritabiiy qalin/baland ko'rinib
    // qolgan edi. 24px tugmani gesture chizig'idan chiqarish uchun yetarli.
    final bottomInset = MediaQuery.of(context).padding.bottom.clamp(0.0, 24.0);
    return BottomAppBar(
      color: AppTheme.surfaceOf(context),
      elevation: 0,
      shape: hasCenter ? const CircularNotchedRectangle() : null,
      notchMargin: 8,
      height: 70 + bottomInset,
      padding: EdgeInsets.zero,
      child: Container(
        padding: EdgeInsets.only(bottom: bottomInset),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: AppTheme.borderOf(context)))),
        child: child,
      ),
    );
  }

  Widget _item(BuildContext context, int i) {
    final on = i == selected;
    final color = on ? AppTheme.primaryDark : AppTheme.textMutedOf(context);
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
                style: AppTheme.text(10, weight: FontWeight.w600, color: on ? AppTheme.primaryDark : AppTheme.textSecondaryOf(context))),
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
