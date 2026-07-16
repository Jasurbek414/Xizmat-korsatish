import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/detail_info_row.dart';
import '../widgets/detail_carpet_item_widget.dart';
import '../widgets/detail_payment_collection_section.dart';

class OrderDetailScreen extends StatelessWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        if (state is! OrdersLoaded) {
          return const Scaffold(
            backgroundColor: AppTheme.darkBackground,
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final matchingOrders = state.orders.where((o) => o.id == orderId).toList();
        if (matchingOrders.isEmpty) {
          return Scaffold(
            backgroundColor: AppTheme.darkBackground,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              title: const Text("Buyurtma topilmadi"),
            ),
            body: const Center(
              child: Text("Buyurtma ma'lumotlari yuklanmadi", style: TextStyle(color: Colors.white)),
            ),
          );
        }

        final order = matchingOrders.first;

        final formatter = NumberFormat.decimalPattern('uz');

        return Scaffold(
          backgroundColor: AppTheme.darkBackground,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              order.serviceName,
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            actions: [
              Container(
                margin: const EdgeInsets.only(right: 16, top: 12, bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(order).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Center(
                  child: Text(
                    order.status?.nameUz ?? '-',
                    style: TextStyle(
                      color: _getStatusColor(order),
                      fontWeight: FontWeight.w700,
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Client Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardColor.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Mijoz ma'lumotlari",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 10),
                      DetailInfoRow(icon: LucideIcons.user, label: "F.I.O", value: order.client.fullName),
                      DetailInfoRow(icon: LucideIcons.phone, label: "Telefon", value: order.client.phone),
                      DetailInfoRow(icon: LucideIcons.mapPin, label: "Manzil", value: order.address),
                      if (order.description.isNotEmpty)
                        DetailInfoRow(icon: LucideIcons.fileText, label: "Tavsif", value: order.description),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 2. Items List Card
                Container(
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
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Buyurtma tarkibi",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => _showAddCarpetDialog(context, order),
                            icon: const Icon(LucideIcons.plus, size: 14, color: AppTheme.accentColor),
                            label: const Text(
                              "Qo'shish",
                              style: TextStyle(color: AppTheme.accentColor, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (order.items.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            "Hozircha buyumlar kiritilmagan",
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontStyle: FontStyle.italic),
                          ),
                        )
                      else
                        Column(
                          children: order.items.map((item) => DetailCarpetItemWidget(order: order, statuses: state.statuses, item: item)).toList(),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. Payment Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardColor.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "To'lov holati",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Umumiy summa:", style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                          Text(
                            "${formatter.format(order.price)} so'm",
                            style: const TextStyle(color: AppTheme.successColor, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      DetailPaymentCollectionSection(order: order),
                    ],
                  ),
                ),
                const SizedBox(height: 80),
              ],
            ),
          ),
          bottomSheet: Container(
            color: AppTheme.darkBackground,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: _buildBottomAction(context, order, state.statuses),
          ),
        );
      },
    );
  }

  Color _getStatusColor(Order order) {
    final hex = order.status?.colorCode ?? '#3b82f6';
    final buffer = StringBuffer();
    if (hex.length == 7) buffer.write('ff');
    buffer.write(hex.replaceFirst('#', ''));
    return Color(int.parse(buffer.toString(), radix: 16));
  }

  Widget _buildBottomAction(BuildContext context, Order order, List<OrderStatusInfo> statuses) {
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final currentIndex = sorted.indexWhere((s) => s.id == order.status?.id);
    final isLastStatus = sorted.isNotEmpty && currentIndex == sorted.length - 1;

    if (isLastStatus) {
      if (order.paymentStatus == 'PENDING') {
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => _showCollectPaymentDialog(context, order),
            icon: const Icon(LucideIcons.wallet, size: 18),
            label: const Text('Chiqim qilish (Topshirish)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );
      } else {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.successColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.successColor.withOpacity(0.3)),
          ),
          child: const Center(
            child: Text(
              "Mijozga topshirildi",
              style: TextStyle(color: AppTheme.successColor, fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
        );
      }
    }

    final nextStatus = (currentIndex != -1 && currentIndex < sorted.length - 1)
        ? sorted[currentIndex + 1]
        : null;
    final nextLabel = nextStatus != null ? nextStatus.nameUz : "Keyingi bosqich";

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () => context.read<OrdersCubit>().advanceToNextStatus(order),
        icon: const Icon(LucideIcons.arrowRight, size: 16),
        label: Text("Bosqich: $nextLabel"),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accentColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  void _showCollectPaymentDialog(BuildContext context, Order order) {
    final amountController = TextEditingController(text: order.price.toStringAsFixed(0));
    final ordersCubit = context.read<OrdersCubit>();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xff1f2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          "Chiqim qilish (To'lovni qabul qilish)",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Buyurtma summasi: ${order.price.toStringAsFixed(0)} so'm",
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: const InputDecoration(
                labelText: "Olingan summa (so'm)",
                labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
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
            onPressed: () async {
              final amount = double.tryParse(amountController.text) ?? 0.0;
              if (amount < 0) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(content: Text("Iltimos, to'g'ri summa kiriting")),
                );
                return;
              }
              Navigator.pop(dialogContext);

              try {
                await ordersCubit.collectOrderPayment(order, amount);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Buyurtma topshirildi, to'lov qabul qilindi")),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("Xatolik yuz berdi: $e")),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
            ),
            child: const Text("Tasdiqlash", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showAddCarpetDialog(BuildContext context, Order order) {
    final nameController = TextEditingController(text: order.serviceName);
    final lengthController = TextEditingController(text: "1");
    final widthController = TextEditingController(text: "1");
    final qtyController = TextEditingController(text: "1");

    final isAreaBased = order.measurementUnit == 'm²' || order.measurementUnit == 'metr';

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xff1f2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          "Yangi buyum qo'shish",
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
                  labelText: "Nomi / Turi",
                  labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ),
              const SizedBox(height: 10),
              if (isAreaBased) ...[
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
              ],
              TextField(
                controller: qtyController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: "Miqdori / Soni (${order.measurementUnit})",
                  labelStyle: const TextStyle(color: Colors.white54, fontSize: 11),
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
              final length = isAreaBased ? (double.tryParse(lengthController.text) ?? 1.0) : 0.0;
              final width = isAreaBased ? (double.tryParse(widthController.text) ?? 1.0) : 0.0;
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
