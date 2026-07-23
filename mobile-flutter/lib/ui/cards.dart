import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Standart oq karta - chegara + yumshoq soya. Ixtiyoriy chap rangli rail.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? railColor;
  final bool highlight;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.onTap,
    this.railColor,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = railColor != null
        ? IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Container(width: 5, color: railColor),
              Expanded(child: Padding(padding: padding, child: child)),
            ]),
          )
        : Padding(padding: padding, child: child);

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.rLg),
        border: Border.all(color: highlight ? AppTheme.primary.withOpacity(0.5) : AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: onTap == null
          ? content
          : Material(
              color: Colors.transparent,
              child: InkWell(onTap: onTap, child: content),
            ),
    );
  }
}

/// Yumshoq rangli statistika plitkasi (bosh sahifadagi kartalar).
class StatTile extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final Color soft;
  final double width;
  const StatTile({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
    required this.soft,
    this.width = 108,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(AppTheme.rLg)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(color: color.withOpacity(0.16), borderRadius: BorderRadius.circular(11)),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 14),
          Text(value, style: AppTheme.display(22, weight: FontWeight.w800, height: 1)),
          const SizedBox(height: 2),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTheme.text(11, weight: FontWeight.w600, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}

/// Holat "pill" - yumshoq fon + rang, ixtiyoriy nuqta yoki ikonka.
class StatusPill extends StatelessWidget {
  final String text;
  final Color color;
  final IconData? icon;
  final bool dot;
  const StatusPill(this.text, this.color, {super.key, this.icon, this.dot = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color.withOpacity(0.13), borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 12, color: color), const SizedBox(width: 5)],
        if (dot) ...[
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 5),
        ],
        Text(text, style: AppTheme.text(11, weight: FontWeight.w700, color: color)),
      ]),
    );
  }
}

/// Gilam rasmi o'rni - dizayn konseptidagi medalyonli naqsh (rasm bo'lmaganda).
class CarpetThumb extends StatelessWidget {
  final double size;
  final String? id;
  final int variant;
  const CarpetThumb({super.key, this.size = 70, this.id, this.variant = 0});

  static const _palettes = [
    [Color(0xFFEBCF92), Color(0xFFA23E30), Color(0xFF7C2E24)],
    [Color(0xFFD7E0E8), Color(0xFF274B6B), Color(0xFF1C3A54)],
    [Color(0xFFE8D5A6), Color(0xFF5E7346), Color(0xFF455636)],
  ];

  @override
  Widget build(BuildContext context) {
    final p = _palettes[variant % _palettes.length];
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Stack(children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(colors: [p[1], p[2]], radius: 0.75),
            ),
            child: Center(
              child: Container(
                width: size * 0.56,
                height: size * 0.4,
                decoration: BoxDecoration(color: p[0], borderRadius: BorderRadius.circular(size * 0.2)),
              ),
            ),
          ),
        ),
        if (id != null)
          Positioned(
            top: 5,
            left: 5,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(6)),
              child: Text(id!, style: AppTheme.text(9, weight: FontWeight.w700, color: Colors.white)),
            ),
          ),
      ]),
    );
  }
}
