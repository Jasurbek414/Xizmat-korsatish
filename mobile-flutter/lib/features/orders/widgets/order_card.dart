import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';

class OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onAdvance;
  final VoidCallback onReject;

  const OrderCard({
    super.key,
    required this.order,
    required this.onAdvance,
    required this.onReject,
  });

  Color get _statusColor {
    final hex = order.status?.colorCode ?? '#3b82f6';
    final buffer = StringBuffer();
    if (hex.length == 7) buffer.write('ff');
    buffer.write(hex.replaceFirst('#', ''));
    return Color(int.parse(buffer.toString(), radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.serviceName,
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  order.status?.nameUz ?? '-',
                  style: TextStyle(
                    color: _statusColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _InfoRow(icon: LucideIcons.user, text: order.client.fullName),
          _InfoRow(icon: LucideIcons.phone, text: order.client.phone),
          _InfoRow(icon: LucideIcons.mapPin, text: order.address),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                '${order.price.toStringAsFixed(0)} so\'m',
                style: const TextStyle(
                  color: AppTheme.successColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: onReject,
                icon: const Icon(LucideIcons.x, size: 16, color: AppTheme.dangerColor),
                label: const Text(
                  'Rad etish',
                  style: TextStyle(color: AppTheme.dangerColor, fontSize: 12),
                ),
              ),
              const SizedBox(width: 4),
              ElevatedButton.icon(
                onPressed: onAdvance,
                icon: const Icon(LucideIcons.arrowRight, size: 16),
                label: const Text('Keyingi bosqich', style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: AppTheme.textSecondary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
