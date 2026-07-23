import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Asosiy tugma turlari - butun ilova bo'ylab bir xil ko'rinish.
enum AppBtn { green, blue, navy, ghost, danger }

class AppButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final AppBtn kind;
  final VoidCallback? onTap;
  final bool loading;
  final bool expand;
  final double height;

  const AppButton(
    this.label, {
    super.key,
    this.icon,
    this.kind = AppBtn.green,
    this.onTap,
    this.loading = false,
    this.expand = true,
    this.height = 50,
  });

  @override
  Widget build(BuildContext context) {
    final ghost = kind == AppBtn.ghost;
    final bg = switch (kind) {
      AppBtn.green => AppTheme.primary,
      AppBtn.blue => AppTheme.blue,
      AppBtn.navy => AppTheme.navy,
      AppBtn.danger => AppTheme.dangerColor,
      AppBtn.ghost => AppTheme.surface,
    };
    final fg = ghost ? AppTheme.textPrimary : Colors.white;

    final child = loading
        ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: fg))
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[Icon(icon, size: 18, color: fg), const SizedBox(width: 8)],
              Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTheme.display(14.5, weight: FontWeight.w700, spacing: 0, color: fg))),
            ],
          );

    final btn = Material(
      color: bg,
      borderRadius: BorderRadius.circular(AppTheme.rMd),
      elevation: 0,
      child: InkWell(
        onTap: loading ? null : onTap,
        borderRadius: BorderRadius.circular(AppTheme.rMd),
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.rMd),
            border: ghost ? Border.all(color: AppTheme.borderColor) : null,
            boxShadow: kind == AppBtn.green
                ? [BoxShadow(color: AppTheme.primary.withOpacity(0.28), blurRadius: 20, offset: const Offset(0, 10), spreadRadius: -8)]
                : null,
          ),
          child: child,
        ),
      ),
    );
    return expand ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}

/// Kvadrat sirtli (ghost) icon tugma - qo'ng'iroq/manzil/kamera uchun.
class AppIconButton extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final Color? bg;
  final VoidCallback? onTap;
  final double size;
  const AppIconButton(this.icon, {super.key, this.color, this.bg, this.onTap, this.size = 40});

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppTheme.primary;
    return Material(
      color: bg ?? AppTheme.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: bg == null ? Border.all(color: AppTheme.borderColor) : null,
          ),
          child: Icon(icon, size: size * 0.44, color: c),
        ),
      ),
    );
  }
}
