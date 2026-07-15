import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';

class OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onReject;

  const OrderCard({
    super.key,
    required this.order,
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
    final formatter = NumberFormat.decimalPattern('uz');

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
          // Order Header (Service Name & Global Status)
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

          // Client Info Rows
          _InfoRow(icon: LucideIcons.user, text: order.client.fullName),
          _InfoRow(icon: LucideIcons.phone, text: order.client.phone),
          _InfoRow(icon: LucideIcons.mapPin, text: order.address),
          const SizedBox(height: 12),

          // Divider
          Container(
            height: 1,
            color: Colors.white.withOpacity(0.05),
          ),
          const SizedBox(height: 12),

          // Order Items (Carpets List & Checkboxes)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Gilamlar tarkibi",
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  fontFamily: 'Outfit',
                ),
              ),
              TextButton.icon(
                onPressed: () => _showAddCarpetDialog(context),
                icon: const Icon(LucideIcons.plus, size: 12, color: AppTheme.accentColor),
                label: const Text(
                  "Gilam qo'shish",
                  style: TextStyle(color: AppTheme.accentColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (order.items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                "Hozircha gilamlar kiritilmagan",
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontStyle: FontStyle.italic),
              ),
            )
          else
            Column(
              children: order.items.map((item) => _CarpetItemWidget(order: order, item: item)).toList(),
            ),

          const SizedBox(height: 12),
          Container(
            height: 1,
            color: Colors.white.withOpacity(0.05),
          ),
          const SizedBox(height: 12),

          // Cash handovers / collected status
          _PaymentCollectionSection(order: order),
          const SizedBox(height: 12),

          // Footer Action Buttons
          Row(
            children: [
              Text(
                '${formatter.format(order.price)} so\'m',
                style: const TextStyle(
                  color: AppTheme.successColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: onReject,
                icon: const Icon(LucideIcons.x, size: 14, color: AppTheme.dangerColor),
                label: const Text(
                  'Rad etish',
                  style: TextStyle(color: AppTheme.dangerColor, fontSize: 11),
                ),
              ),
              const SizedBox(width: 4),
              ElevatedButton.icon(
                onPressed: () => context.read<OrdersCubit>().advanceToNextStatus(order),
                icon: const Icon(LucideIcons.arrowRight, size: 14),
                label: const Text('Bosqich', style: TextStyle(fontSize: 11)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAddCarpetDialog(BuildContext context) {
    final nameController = TextEditingController(text: "Gilam");
    final lengthController = TextEditingController(text: "4");
    final widthController = TextEditingController(text: "3");
    final qtyController = TextEditingController(text: "1");

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xff1f2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          "Yangi gilam qo'shish",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: "Nomi",
                  labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: lengthController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: "Bo'yi (m)",
                        labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: widthController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: "Eni (m)",
                        labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: qtyController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: "Soni (dona)",
                  labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text("Bekor qilish", style: TextStyle(color: Colors.white54, fontSize: 12)),
          ),
          ElevatedButton(
            onPressed: () {
              final length = double.tryParse(lengthController.text) ?? 0.0;
              final width = double.tryParse(widthController.text) ?? 0.0;
              final qty = int.tryParse(qtyController.text) ?? 1;
              Navigator.pop(dialogContext);
              context.read<OrdersCubit>().createOrderItem(order, nameController.text, length, width, qty);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentColor),
            child: const Text("Qo'shish", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _CarpetItemWidget extends StatelessWidget {
  final Order order;
  final OrderItemInfo item;

  const _CarpetItemWidget({required this.order, required this.item});

  @override
  Widget build(BuildContext context) {
    final area = item.length * item.width;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name & Details
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "${item.name} (${item.quantity} dona)",
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
              Text(
                "${item.length.toStringAsFixed(1)} x ${item.width.toStringAsFixed(1)} = ${area.toStringAsFixed(1)} m²",
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Checkboxes Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _CheckboxStep(
                label: "Qabul",
                checked: _isAtLeast(item.status, 'ACCEPTED'),
                onChanged: (val) {
                  if (val == true) {
                    context.read<OrdersCubit>().changeOrderItemStatus(order, item, 'ACCEPTED');
                  }
                },
              ),
              _CheckboxStep(
                label: "Yuvildi",
                checked: _isAtLeast(item.status, 'WASHED'),
                onChanged: (val) {
                  context.read<OrdersCubit>().changeOrderItemStatus(order, item, val == true ? 'WASHED' : 'ACCEPTED');
                },
              ),
              _CheckboxStep(
                label: "Quritish",
                checked: _isAtLeast(item.status, 'DRIED'),
                onChanged: (val) {
                  context.read<OrdersCubit>().changeOrderItemStatus(order, item, val == true ? 'DRIED' : 'WASHED');
                },
              ),
              _CheckboxStep(
                label: "Tayyor",
                checked: _isAtLeast(item.status, 'READY'),
                onChanged: (val) {
                  context.read<OrdersCubit>().changeOrderItemStatus(order, item, val == true ? 'READY' : 'DRIED');
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool _isAtLeast(String current, String target) {
    const list = ['ACCEPTED', 'WASHED', 'DRIED', 'READY'];
    final cIdx = list.indexOf(current);
    final tIdx = list.indexOf(target);
    return cIdx >= tIdx;
  }
}

class _CheckboxStep extends StatelessWidget {
  final String label;
  final bool checked;
  final ValueChanged<bool?> onChanged;

  const _CheckboxStep({
    required this.label,
    required this.checked,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 22,
          height: 22,
          child: Checkbox(
            value: checked,
            onChanged: onChanged,
            activeColor: AppTheme.successColor,
            checkColor: Colors.white,
            side: BorderSide(color: Colors.white.withOpacity(0.3), width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            color: checked ? AppTheme.successColor : AppTheme.textSecondary,
            fontSize: 9,
            fontWeight: checked ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}

class _PaymentCollectionSection extends StatelessWidget {
  final Order order;

  const _PaymentCollectionSection({required this.order});

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
