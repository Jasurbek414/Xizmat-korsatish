import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';

/// Zakaz tafsiloti ekranlari uchun umumiy vidjetlar (haydovchi va sex xodimi).

class DetailPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  const DetailPanel({super.key, required this.child, this.padding = const EdgeInsets.all(14)});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: AppTheme.surfaceOf(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderOf(context)),
      ),
      child: child,
    );
  }
}

class DetailBadge extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  final bool soft;
  const DetailBadge({super.key, required this.icon, required this.text, required this.color, this.soft = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.13), borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 5),
        Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 11)),
      ]),
    );
  }
}

class ClientCard extends StatelessWidget {
  final String name;
  final String phone;
  final String address;
  final VoidCallback onCall;
  final VoidCallback? onNavigate;
  const ClientCard({super.key, required this.name, required this.phone, required this.address, required this.onCall, this.onNavigate});

  @override
  Widget build(BuildContext context) {
    return DetailPanel(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: AppTheme.bgOf(context), borderRadius: BorderRadius.circular(12)),
            child: Icon(LucideIcons.user, size: 22, color: AppTheme.textMutedOf(context)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.textPrimaryOf(context))),
              if (phone.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(phone, style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 13, fontWeight: FontWeight.w600)),
              ],
              if (address.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(address, style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 12)),
              ],
            ]),
          ),
          const SizedBox(width: 8),
          Column(children: [
            _iconBtn(LucideIcons.phone, AppTheme.green, onCall),
            if (onNavigate != null) ...[
              const SizedBox(height: 8),
              _iconBtn(LucideIcons.navigation, AppTheme.blue, onNavigate!),
            ],
          ]),
        ],
      ),
    );
  }

  Widget _iconBtn(IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(11),
      child: Container(
        width: 42, height: 42,
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(11)),
        child: Icon(icon, size: 19, color: color),
      ),
    );
  }
}

/// Gilamlar ro'yxati (taxminiy o'lcham) - haydovchi/sex tafsilotida.
class CarpetList extends StatelessWidget {
  final List<CarpetRow> items;
  const CarpetList({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return DetailPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Text('Gilamlar', style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w700, fontSize: 14)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(color: AppTheme.bgOf(context), borderRadius: BorderRadius.circular(20)),
              child: Text('${items.length} ta', style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 8),
          ...items.map((r) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: AppTheme.bgOf(context), borderRadius: BorderRadius.circular(9)),
                    child: Icon(LucideIcons.layers, size: 18, color: AppTheme.textMutedOf(context)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(r.title, style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w700, fontSize: 13)),
                    Text(r.subtitle, style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 11)),
                  ])),
                  Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMutedOf(context)),
                ]),
              )),
        ],
      ),
    );
  }
}

class CarpetRow {
  final String title;
  final String subtitle;
  CarpetRow(this.title, this.subtitle);
}
