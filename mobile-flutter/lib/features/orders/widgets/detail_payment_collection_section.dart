import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';

class DetailPaymentCollectionSection extends StatelessWidget {
  final Order order;

  const DetailPaymentCollectionSection({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.decimalPattern('uz');

    if (order.paymentStatus == 'COLLECTED') {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.amber.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.amber.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            const Icon(LucideIcons.clock, size: 16, color: Colors.amber),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Topshirish kutilmoqda",
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.amber,
                    ),
                  ),
                  Text(
                    "Olingan pul: ${formatter.format(order.collectedPrice)} so'm",
                    style: TextStyle(
                      fontSize: 9,
                      color: Colors.amber.shade200,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (order.paymentStatus == 'HANDED_OVER') {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.successColor.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.successColor.withOpacity(0.2)),
        ),
        child: Row(
          children: const [
            Icon(LucideIcons.checkCircle, size: 16, color: AppTheme.successColor),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                "Kassaga topshirildi (Tasdiqlandi)",
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.successColor,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => _showCollectDialog(context),
            icon: const Icon(LucideIcons.wallet, size: 14),
            label: const Text(
              "To'lovni qabul qilish",
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.indigo.shade600,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showCollectDialog(BuildContext context) {
    final controller = TextEditingController(text: order.price.toStringAsFixed(0));
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xff1f2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          "To'lovni qabul qilish",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Mijozdan olingan naqd pul summasini yozing:",
              style: TextStyle(color: Colors.white70, fontSize: 11),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                suffixText: "so'm",
                suffixStyle: const TextStyle(color: Colors.white54, fontSize: 12),
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text("Bekor qilish", style: TextStyle(color: Colors.white54, fontSize: 12)),
          ),
          ElevatedButton(
            onPressed: () {
              final double? amount = double.tryParse(controller.text);
              if (amount != null && amount > 0) {
                Navigator.pop(dialogContext);
                context.read<OrdersCubit>().collectOrderPayment(order, amount);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text("Tasdiqlash", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
