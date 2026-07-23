import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Kichik matnli bo'lim sarlavhasi (masalan "Mijoz", "Narx (so'm)").
class FieldLabel extends StatelessWidget {
  final String text;
  const FieldLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 12, 2, 6),
        child: Text(text, style: AppTheme.text(12.5, weight: FontWeight.w700)),
      );
}

/// Ikonka + matn qatori (manzil, telefon, vaqt va h.k.).
class MetaLine extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color? color;
  final int maxLines;
  const MetaLine(this.icon, this.text, {super.key, this.color, this.maxLines = 1});
  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, size: 13, color: AppTheme.textMuted),
        const SizedBox(width: 5),
        Expanded(
          child: Text(text,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: AppTheme.text(12, weight: FontWeight.w500, color: color ?? AppTheme.textSecondary)),
        ),
      ]);
}

/// Standart matn maydoni.
class AppField extends StatelessWidget {
  final TextEditingController? controller;
  final String hint;
  final IconData? icon;
  final String? suffix;
  final TextInputType? keyboard;
  final ValueChanged<String>? onChanged;
  final int maxLines;
  const AppField({
    super.key,
    this.controller,
    this.hint = '',
    this.icon,
    this.suffix,
    this.keyboard,
    this.onChanged,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboard,
      onChanged: onChanged,
      maxLines: maxLines,
      style: AppTheme.text(13.5, weight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: icon == null ? null : Icon(icon, size: 18, color: AppTheme.textMuted),
        suffixText: suffix,
      ),
    );
  }
}
