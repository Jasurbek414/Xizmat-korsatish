import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/services/printer_service.dart';
import '../../profile/screens/printer_settings_screen.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
import '../order_zone.dart';
import 'detail_common.dart';

/// HAYDOVCHI zakaz tafsiloti - to'liq ishlovchi tugmalar bilan:
/// ✓ Qabul qilish (agar o'ziniki bo'lmasa)
/// ✓ Bosqichma-bosqich status o'tkazish (Yo'lga chiqdim → Yetib keldim → ...)
/// ✓ Qo'ng'iroq va navigatsiya
/// ✓ To'lovni qabul qilish
class DriverOrderDetailScreen extends StatefulWidget {
  final Order order;
  final List<OrderStatusInfo> statuses;
  final String currentUserId;
  final bool autoCollectPayment;

  const DriverOrderDetailScreen({
    super.key,
    required this.order,
    required this.statuses,
    this.currentUserId = '',
    this.autoCollectPayment = false,
  });

  @override
  State<DriverOrderDetailScreen> createState() =>
      _DriverOrderDetailScreenState();
}

class _DriverOrderDetailScreenState extends State<DriverOrderDetailScreen> {
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    if (widget.autoCollectPayment) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && order.paymentStatus == 'PENDING') {
          _collectPayment();
        }
      });
    }
  }

  Order get order {
    try {
      final state = context.read<OrdersCubit>().state;
      if (state is OrdersLoaded) {
        for (final o in state.orders) {
          if (o.id == widget.order.id) return o;
        }
      }
    } catch (_) {}
    return widget.order;
  }

  bool get _isMine =>
      widget.currentUserId.isNotEmpty &&
      order.workerId == widget.currentUserId;

  List<OrderStatusInfo> get statuses => widget.statuses;

  /// Tarix (o'tgan) buyurtma ekanligini tekshiradi — faqat to'lov qilingan
  /// yoki bekor qilingan buyurtmalar yakunlangan hisoblanadi.
  bool get _isCompleted {
    final paid = order.paymentStatus.isNotEmpty && order.paymentStatus != 'PENDING';
    final isCancelled = order.status?.nameUz.toLowerCase().contains('bekor') == true;
    return paid || isCancelled;
  }

  Future<void> _call(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _openMap() async {
    final Uri uri;
    if (order.latitude != null && order.longitude != null) {
      uri = Uri.parse(
          'https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}');
    } else if (order.address.trim().isNotEmpty) {
      uri = Uri.parse(
          'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(order.address)}');
    } else {
      return;
    }
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  bool _savingLocation = false;

  Future<void> _saveCurrentLocation() async {
    setState(() => _savingLocation = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('GPS o\'chiq. Iltimos, joylashuv xizmatini yoqing'),
            backgroundColor: AppTheme.amber,
            behavior: SnackBarBehavior.floating,
          ));
        }
        await Geolocator.openLocationSettings();
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Joylashuvga ruxsat berilmadi'),
              backgroundColor: AppTheme.dangerColor,
              behavior: SnackBarBehavior.floating,
            ));
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Joylashuv ruxsati butunlay bloklangan, sozlamalardan ruxsat bering'),
            backgroundColor: AppTheme.dangerColor,
            behavior: SnackBarBehavior.floating,
          ));
        }
        await Geolocator.openAppSettings();
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      await context.read<OrdersCubit>().updateOrderLocation(
        order,
        position.latitude,
        position.longitude,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Row(children: [
            Icon(LucideIcons.mapPin, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Mijoz lokatsiyasi saqlandi va platformaga yuborildi!',
                style: TextStyle(fontWeight: FontWeight.w600)),
          ]),
          backgroundColor: AppTheme.green,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Lokatsiyani olishda xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _savingLocation = false);
    }
  }

  Future<void> _printReceipt() async {
    final printed = await BluetoothPrinterService().printOrderReceipt(
      order,
      paidAmount: order.collectedPrice > 0 ? order.collectedPrice : order.price,
      driverName: widget.order.workerName,
    ).timeout(const Duration(seconds: 4), onTimeout: () => false);
    if (!printed && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('Printer ulanmagan. Sozlamalardan printerni ulang'),
        backgroundColor: AppTheme.amber,
        action: SnackBarAction(
          label: 'Sozlash',
          textColor: Colors.white,
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
          ),
        ),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  bool _addingItem = false;

  /// Gilamni tahrirlash dialogi (faqat nom + soni)
  Future<void> _editItem(OrderItemInfo item) async {
    final nameCtrl = TextEditingController(text: item.name);
    final quantityCtrl = TextEditingController(text: item.quantity.toString());

    final result = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Gilamni tahrirlash', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(labelText: 'Gilam nomi', prefixIcon: Icon(LucideIcons.tag, size: 18)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: quantityCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Soni', prefixIcon: Icon(LucideIcons.hash, size: 18)),
          ),
        ]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor', style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );

    if (result != true) {
      nameCtrl.dispose();
      quantityCtrl.dispose();
      return;
    }

    final name = nameCtrl.text.trim();
    final quantity = int.tryParse(quantityCtrl.text) ?? 1;
    nameCtrl.dispose();
    quantityCtrl.dispose();

    if (name.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Gilam nomini kiriting'),
          behavior: SnackBarBehavior.floating,
        ));
      }
      return;
    }

    setState(() => _isProcessing = true);
    try {
      await context.read<OrdersCubit>().updateOrderItem(
        order, item,
        name: name,
        quantity: quantity,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('"$name" tahrirlandi'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  /// Gilamni o'chirish dialogi
  Future<void> _deleteItem(OrderItemInfo item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Gilamni o\'chirish', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        content: Text('"${item.name.isEmpty ? "Gilam" : item.name}" ni o\'chirishni tasdiqlaysizmi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor', style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.dangerColor),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('O\'chirish'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);
    try {
      await context.read<OrdersCubit>().deleteOrderItem(order, item);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('"${item.name.isEmpty ? "Gilam" : item.name}" o\'chirildi'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  String _sizeLabel(OrderItemInfo item) {
    final area = item.length * item.width;
    if (area <= 0) return "O'lchanmagan";
    if (area > 8) return 'Katta (${area.toStringAsFixed(1)} m²)';
    if (area > 4) return "O'rta (${area.toStringAsFixed(1)} m²)";
    return 'Kichik (${area.toStringAsFixed(1)} m²)';
  }

  /// Haydovchi gilam qo'shish dialogi - faqat nomi + soni
  Future<void> _addCarpet() async {
    final nameCtrl = TextEditingController();
    final quantityCtrl = TextEditingController(text: '1');

    final result = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.plus, size: 16, color: AppTheme.primary),
            ),
            const SizedBox(width: 10),
            const Text('Gilam qo\'shish',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Gilam nomi',
                  hintText: 'Masalan: Oshxona gilami',
                  prefixIcon: Icon(LucideIcons.tag, size: 18),
                ),
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: quantityCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Nechta gilam?',
                  hintText: '1',
                  prefixIcon: Icon(LucideIcons.hash, size: 18),
                ),
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor',
                style: TextStyle(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.textSecondary)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Qo\'shish'),
          ),
        ],
      ),
    );

    if (result != true) {
      nameCtrl.dispose();
      quantityCtrl.dispose();
      return;
    }

    final name = nameCtrl.text.trim();
    final quantity = int.tryParse(quantityCtrl.text) ?? 1;
    nameCtrl.dispose();
    quantityCtrl.dispose();

    if (name.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Iltimos, gilam nomini yozing'),
          backgroundColor: AppTheme.amber,
          behavior: SnackBarBehavior.floating,
        ));
      }
      return;
    }

    setState(() => _addingItem = true);
    try {
      await context
          .read<OrdersCubit>()
          .createOrderItem(order, name, 0, 0, quantity);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('"$name" x $quantity qo\'shildi'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _addingItem = false);
    }
  }

  Future<void> _acceptOrder() async {
    setState(() => _isProcessing = true);
    try {
      await context.read<OrdersCubit>().acceptOrder(order);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Row(children: [
            Icon(LucideIcons.checkCircle,
                color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Buyurtma qabul qilindi',
                style: TextStyle(fontWeight: FontWeight.w600)),
          ]),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _advanceToStatus(String statusId, String name) async {
    // Confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18)),
        title: Text('"$name"',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        content: const Text(
            'Buyurtma holatini o\'zgartirishni tasdiqlaysizmi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor',
                style: TextStyle(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.textSecondary)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primary),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Tasdiqlash'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);
    try {
      await context.read<OrdersCubit>().setOrderStatus(order, statusId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Holat "$name" ga o\'zgartirildi'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  double _getItemArea(OrderItemInfo item) {
    return item.width * item.length * (item.quantity > 0 ? item.quantity : 1);
  }

  double _getItemPrice(OrderItemInfo item) {
    if (item.price != null && item.price! > 0) {
      return item.price!;
    }
    final area = _getItemArea(item);
    if (order.servicePrice > 0 && area > 0) {
      return area * order.servicePrice;
    }
    return 0;
  }

  Future<void> _collectPayment() async {
    final formatter = NumberFormat.decimalPattern('uz');

    // Jami miqdor va maydonlarni hisoblash
    int totalCount = 0;
    double totalArea = 0;
    double calculatedTotal = 0;
    for (final item in order.items) {
      totalCount += item.quantity;
      final area = _getItemArea(item);
      totalArea += area;
      calculatedTotal += _getItemPrice(item);
    }
    final effectivePrice = order.price > 0 ? order.price : calculatedTotal;
    final amountCtrl = TextEditingController(
        text: effectivePrice > 0 ? effectivePrice.toStringAsFixed(0) : '');

    final printerService = BluetoothPrinterService();
    final isPrinterConnected = printerService.isConnected;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppTheme.greenSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.wallet, size: 18, color: AppTheme.green),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                "To'lovni qabul qilish",
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.65,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Gilamlar ro'yxati
                  if (order.items.isNotEmpty) ...[
                    const Text(
                      'BUYURTMA GILAMLARI',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.bg.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: order.items.length,
                        separatorBuilder: (_, __) => Divider(height: 1, color: AppTheme.borderColor.withOpacity(0.5)),
                        itemBuilder: (ctx, i) {
                          final item = order.items[i];
                          final area = _getItemArea(item);
                          final price = _getItemPrice(item);

                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${i + 1}.',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.textMuted),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name.isEmpty ? 'Gilam' : item.name,
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                      ),
                                      const SizedBox(height: 2),
                                      Wrap(
                                        spacing: 4,
                                        children: [
                                          if (item.width > 0 && item.length > 0) ...[
                                            Text(
                                              '${item.width.toStringAsFixed(1)}×${item.length.toStringAsFixed(1)}m',
                                              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                            ),
                                            const Text('•', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                            Text(
                                              '${area.toStringAsFixed(2)} m²',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
                                            ),
                                            const Text('•', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                          ],
                                          Text(
                                            '${item.quantity} ta',
                                            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                if (price > 0)
                                  Text(
                                    '${formatter.format(price)} so\'m',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.green),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Jami hisob-kitob kartasi (3 ta metrika)
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Jami gilamlar soni:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                            Text('$totalCount ta', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                          ],
                        ),
                        if (totalArea > 0) ...[
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Jami maydon:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                              Text('${totalArea.toStringAsFixed(2)} m²', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                            ],
                          ),
                        ],
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Buyurtma summasi:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                            Text('${formatter.format(effectivePrice)} so\'m', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.green)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Olingan summa kiritish
                  TextField(
                    controller: amountCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: "Olingan summa (so'm)",
                      hintText: "0",
                      prefixIcon: Icon(LucideIcons.banknote, size: 18),
                      suffixText: "so'm",
                    ),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),

                  const SizedBox(height: 10),

                  // Printer holati belgisi
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isPrinterConnected ? AppTheme.greenSoft : AppTheme.bg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.printer,
                          size: 14,
                          color: isPrinterConnected ? AppTheme.green : AppTheme.textMuted,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            isPrinterConnected
                                ? 'Printer ulangan (${printerService.connectedName ?? "Bluetooth"}). Avtomatik chek chiqadi.'
                                : 'Printer ulanmagan (Chek chiqarish uchun sozlang)',
                            style: TextStyle(
                              fontSize: 11,
                              color: isPrinterConnected ? AppTheme.green : AppTheme.textMuted,
                              fontWeight: isPrinterConnected ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor',
                style: TextStyle(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.textSecondary)),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.green),
            onPressed: () => Navigator.pop(dctx, true),
            icon: const Icon(LucideIcons.check, size: 16),
            label: const Text('To\'lovni tasdiqlash'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      amountCtrl.dispose();
      return;
    }

    final amount = double.tryParse(
            amountCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ??
        0;
    amountCtrl.dispose();

    setState(() => _isProcessing = true);
    try {
      await context
          .read<OrdersCubit>()
          .collectOrderPayment(order, amount);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Row(children: [
            Icon(LucideIcons.checkCircle,
                color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text("To'lov qabul qilindi, mijozga topshirildi",
                style: TextStyle(fontWeight: FontWeight.w600)),
          ]),
          backgroundColor: AppTheme.green,
          behavior: SnackBarBehavior.floating,
        ));
        Navigator.pop(context);
      }

      // Agar avtomatik chek yoqilgan bo'lsa, printerga fonda yuboramiz (UI'ni kutdirmaydi)
      if (BluetoothPrinterService().autoPrintEnabled) {
        BluetoothPrinterService().printOrderReceipt(
          order,
          paidAmount: amount,
          driverName: widget.order.workerName,
        ).timeout(const Duration(seconds: 3), onTimeout: () => false).catchError((_) => false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  /// Gilam ustiga bosganda tahrirlash/o'chirish opsiyalari tushadigan panel
  void _showCarpetOptions(OrderItemInfo item) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle indicator
              Center(
                child: Container(
                  width: 36, height: 4,
                  decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Text(item.name.isEmpty ? 'Gilam' : item.name,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              const SizedBox(height: 4),
              Text('${item.quantity} ta - ${_sizeLabel(item)}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              const SizedBox(height: 20),
              // Tahrirlash
              SizedBox(
                width: double.infinity,
                child: ListTile(
                  leading: Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: AppTheme.blue.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(LucideIcons.pencil, size: 20, color: AppTheme.blue),
                  ),
                  title: const Text('Tahrirlash', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Nomi va sonini o\'zgartirish', style: TextStyle(fontSize: 12)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  onTap: () {
                    Navigator.pop(bctx);
                    _editItem(item);
                  },
                ),
              ),
              const SizedBox(height: 4),
              // O'chirish
              SizedBox(
                width: double.infinity,
                child: ListTile(
                  leading: Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: AppTheme.dangerColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(LucideIcons.trash2, size: 20, color: AppTheme.dangerColor),
                  ),
                  title: Text('O\'chirish', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.dangerColor)),
                  subtitle: const Text('Gilamni ro\'yxatdan olib tashlash', style: TextStyle(fontSize: 12)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  onTap: () {
                    Navigator.pop(bctx);
                    _deleteItem(item);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Har bir gilam qatori - tarixda faqat ma'lumot, aktiv buyurtmada bosiladigan
  Widget _carpetRow(int i, OrderItemInfo item) {
    final area = _getItemArea(item);
    final price = _getItemPrice(item);
    final formatter = NumberFormat.decimalPattern('uz');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.borderColor.withOpacity(0.6)),
        ),
        child: InkWell(
          onTap: _isCompleted ? null : () => _showCarpetOptions(item),
          borderRadius: BorderRadius.circular(12),
          child: Row(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Center(
                child: Text(
                  '${i + 1}',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.name.isEmpty ? 'Gilam ${i + 1}' : item.name,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 2),
              Wrap(spacing: 4, children: [
                if (item.width > 0 && item.length > 0) ...[
                  Text(
                    '${item.width.toStringAsFixed(1)}×${item.length.toStringAsFixed(1)}m',
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  const Text('•', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  Text(
                    '${area.toStringAsFixed(2)} m²',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
                  ),
                  const Text('•', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ],
                Text(
                  '${item.quantity} ta',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
              ]),
            ])),
            if (price > 0)
              Text(
                '${formatter.format(price)} so\'m',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.green),
              ),
            if (!_isCompleted) ...[
              const SizedBox(width: 6),
              const Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMuted),
            ],
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Short ID & formatter (constant props)
    final shortId = widget.order.id.length > 6 ? widget.order.id.substring(0, 6) : widget.order.id;
    final formatter = NumberFormat.decimalPattern('uz');

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.navy,
        foregroundColor: Colors.white,
        title: Text('Zakaz #$shortId',
            style: const TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.w700,
                color: Colors.white)),
        actions: [
          IconButton(
            tooltip: 'Chek printeri',
            icon: const Icon(LucideIcons.printer),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
            ),
          ),
          IconButton(
            onPressed: () => _call(widget.order.client.phone),
            icon: const Icon(LucideIcons.phone),
          )
        ],
      ),
      // BlocBuilder - cubit state o'zgarganda avtomatik rebuild qiladi
      body: BlocBuilder<OrdersCubit, OrdersState>(
        builder: (context, cubitState) {
          // Live order: cubit statdan topamiz, topilmasa widget.order
          Order liveOrder = widget.order;
          if (cubitState is OrdersLoaded) {
            for (final o in cubitState.orders) {
              if (o.id == widget.order.id) {
                liveOrder = o;
                break;
              }
            }
          }
          final o = liveOrder;
          final statusColor = AppTheme.hex(o.status?.colorCode ?? '#2563EB');

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              // Status + price row
              Row(children: [
                DetailBadge(icon: LucideIcons.truck, text: o.status?.nameUz ?? '-', color: statusColor),
                const Spacer(),
                DetailBadge(icon: LucideIcons.circleDot, text: '${formatter.format(o.price)} so\'m', color: AppTheme.primary, soft: true),
              ]),
              const SizedBox(height: 14),

              // Client card
              ClientCard(
                name: o.client.fullName,
                phone: o.client.phone,
                address: o.address.isEmpty ? o.client.address : o.address,
                onCall: () => _call(o.client.phone),
                onNavigate: _openMap,
              ),
              const SizedBox(height: 12),

              // Mijoz Lokatsiyasi (GPS)
              DetailPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: (o.latitude != null && o.longitude != null)
                                ? AppTheme.greenSoft
                                : AppTheme.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Icon(
                            LucideIcons.mapPin,
                            size: 15,
                            color: (o.latitude != null && o.longitude != null)
                                ? AppTheme.green
                                : AppTheme.primary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          (o.latitude != null && o.longitude != null)
                              ? 'Mijoz lokatsiyasi saqlangan'
                              : 'Mijoz lokatsiyasi',
                          style: TextStyle(
                            color: (o.latitude != null && o.longitude != null)
                                ? AppTheme.green
                                : AppTheme.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        const Spacer(),
                        if (o.latitude != null && o.longitude != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.greenSoft,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('✓ Saqlangan', style: TextStyle(fontSize: 10, color: AppTheme.green, fontWeight: FontWeight.w700)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (o.latitude != null && o.longitude != null) ...[
                      Text(
                        'Koordinatalar: ${o.latitude!.toStringAsFixed(5)}, ${o.longitude!.toStringAsFixed(5)}',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _openMap,
                              icon: const Icon(LucideIcons.navigation, size: 16),
                              label: const Text('Xaritada ochish', style: TextStyle(fontSize: 12)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.primary,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _savingLocation ? null : _saveCurrentLocation,
                              icon: _savingLocation
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Icon(LucideIcons.refreshCw, size: 16),
                              label: const Text('Yangilash', style: TextStyle(fontSize: 12)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.textSecondary,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      const Text(
                        'Mijoz oldiga borganda "Lokatsiyani saqlash"ni bosing. Bu platformada saqlanadi va qayta yetkazish yoki yangi buyurtmalarda ishlatiladi.',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _savingLocation ? null : _saveCurrentLocation,
                          icon: _savingLocation
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(LucideIcons.crosshair, size: 18),
                          label: Text(
                            _savingLocation ? 'GPS aniqlanmoqda...' : 'Mijoz lokatsiyasini saqlash (GPS)',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Description
              if (o.description.isNotEmpty) ...[
                DetailPanel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Izoh', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  const SizedBox(height: 3),
                  Text(o.description, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                ])),
                const SizedBox(height: 12),
              ],

              // Carpet list with edit/delete (LIVE - cubit state o'zgarsa darhol yangilanadi)
              if (o.items.isNotEmpty) ...[
                DetailPanel(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const Text('Gilamlar', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                        decoration: BoxDecoration(color: AppTheme.bg, borderRadius: BorderRadius.circular(20)),
                        child: Text('${o.items.length} ta', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w700)),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    ...o.items.asMap().entries.map((e) => _carpetRow(e.key, e.value)),
                    const SizedBox(height: 10),
                    Builder(builder: (ctx) {
                      int totalCount = 0;
                      double totalArea = 0;
                      double calculatedTotal = 0;
                      for (final it in o.items) {
                        totalCount += it.quantity;
                        final a = _getItemArea(it);
                        totalArea += a;
                        calculatedTotal += _getItemPrice(it);
                      }
                      final effPrice = o.price > 0 ? o.price : calculatedTotal;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
                        ),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Jami soni', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                Text('$totalCount ta', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              ],
                            ),
                            if (totalArea > 0) ...[
                              Container(margin: const EdgeInsets.symmetric(horizontal: 12), width: 1, height: 24, color: AppTheme.borderColor),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Jami maydon', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                  Text('${totalArea.toStringAsFixed(2)} m²', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.primary)),
                                ],
                              ),
                            ],
                            const Spacer(),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                const Text('Umumiy summa', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                Text('${formatter.format(effPrice)} so\'m', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.green)),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                  ]),
                ),
                const SizedBox(height: 8),
              ],

              // Add carpet button (tarixda yashirin — faqat ma'lumot ko'rinadi)
              if (!_isCompleted)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _addingItem ? null : _addCarpet,
                    icon: _addingItem
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(LucideIcons.plus, size: 18, color: AppTheme.primary),
                    label: Text(_addingItem ? 'Qo\'shilmoqda...' : 'Gilam qo\'shish',
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primary)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              const SizedBox(height: 12),

              // Order status
              DetailPanel(child: Row(children: [
                const Text('Buyurtma holati', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.13), borderRadius: BorderRadius.circular(20)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 6, height: 6, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(o.status?.nameUz ?? '-', style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w700)),
                  ]),
                ),
              ])),
              const SizedBox(height: 22),

              // Action buttons
              if (_isProcessing)
                const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
              else
                ..._buildActions(),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _buildActions() {
    // MUHIM (audit'da topilgan xato, tuzatildi): bu metod `_isCompleted`
    // holatini UMUMAN tekshirmasdi. Natijada haydovchi "Tarix" bo'limidan
    // allaqachon yakunlangan va to'langan buyurtmani ochsa (ayniqsa boshqa
    // haydovchinikini) unga "Olib ketish" tugmasi ko'rsatilardi. Bosilganda
    // backend uni 409 bilan rad etardi va foydalanuvchi tushunarsiz xato
    // olardi. Endi yakunlangan buyurtmada hech qanday amal tugmasi yo'q.
    if (_isCompleted) {
      return [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: AppTheme.greenSoft,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(LucideIcons.checkCircle2, size: 18, color: AppTheme.green),
            const SizedBox(width: 8),
            Text('Buyurtma yakunlangan',
                style: AppTheme.text(14, weight: FontWeight.w700, color: AppTheme.green)),
          ]),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _printReceipt,
            icon: const Icon(LucideIcons.printer, size: 18),
            label: const Text('Chek chiqarish'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.primary,
              side: const BorderSide(color: AppTheme.primary),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
      ];
    }

    // Case 1: Not my order
    if (!_isMine) {
      // MUHIM (audit'da topilgan xato, tuzatildi): avval BOSHQA haydovchiga
      // biriktirilgan buyurtmada ham "Olib ketish" tugmasi chiqardi, lekin
      // backend uni har doim 409 bilan rad etardi - foydalanuvchi bosib,
      // faqat tushunarsiz xato olardi. Endi biriktirilgan buyurtmada tugma
      // yo'q, faqat kim bajarayotgani ko'rsatiladi. Qayta biriktirish -
      // dispetcherning veb-panel orqali bajaradigan ishi.
      if (order.workerId != null) {
        return [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: AppTheme.borderColor.withOpacity(0.3),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(LucideIcons.userCheck, size: 18, color: AppTheme.textSecondary),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  'Bajarmoqda: ${order.workerName ?? "boshqa xodim"}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ]),
          ),
        ];
      }
      return [
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _acceptOrder,
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primary,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            icon: const Icon(LucideIcons.arrowRight, size: 20),
            label: const Text('Olib ketish',
                style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 16)),
          ),
        ),
      ];
    }

    // Case 2: My order
    final sorted = [...statuses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final idx =
        sorted.indexWhere((s) => s.id == order.status?.id);
    final remaining = (idx == -1)
        ? <OrderStatusInfo>[]
        : sorted.sublist(idx + 1);

    final zoneBoundary = OrderZoneBoundary.fromStatuses(sorted);
    final isInDeliveryZone = zoneBoundary.isDelivery(order);

    // Agar delivery (yetkazish) zonasida bo'lsa yoki oxirgi statusda bo'lsa va to'lanmagan bo'lsa:
    // TO'LOVNI QABUL QILISH TUGMASI birinchi o'rinda chiqadi!
    if (order.paymentStatus == 'PENDING' && (isInDeliveryZone || remaining.isEmpty)) {
      final widgets = <Widget>[
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _collectPayment,
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.green,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            icon: const Icon(LucideIcons.wallet, size: 20),
            label: const Text("To'lovni qabul qilish",
                style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 16)),
          ),
        ),
      ];

      // Agar yetkazish ichida keyingi oraliq status qolgan bo'lsa:
      if (remaining.isNotEmpty) {
        widgets.add(const SizedBox(height: 10));
        widgets.add(
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _advanceToStatus(
                  remaining[0].id, remaining[0].nameUz),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.blue,
                side: const BorderSide(color: AppTheme.blue),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(LucideIcons.arrowRight, size: 18),
              label: Text('${remaining[0].nameUz} bosqichiga o\'tkazish',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14)),
            ),
          ),
        );
      }

      return widgets;
    }

    if (remaining.isNotEmpty) {
      final isFirstStep = sorted.isNotEmpty && sorted.first.id == order.status?.id;
      final primaryLabel = isFirstStep ? "Sexga topshirish" : remaining[0].nameUz;
      return [
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () => _advanceToStatus(
                remaining[0].id, primaryLabel),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.blue,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            icon: const Icon(LucideIcons.arrowRight, size: 20),
            label: Text(primaryLabel,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 16)),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Text(
              '${sorted.length} bosqichdan ${idx + 1} - ${
                  sorted
                      .sublist(0, idx + 1)
                      .map((s) => s.nameUz)
                      .join(' → ')
              }',
              style: const TextStyle(
                  color: AppTheme.textSecondary, fontSize: 11),
            ),
          ],
        ),
      ];
    }

    // Case 3: To'lov kutilmoqda
    if (order.paymentStatus == 'PENDING') {
      return [
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _collectPayment,
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.green,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            icon: const Icon(LucideIcons.wallet, size: 20),
            label: const Text("To'lovni qabul qilish",
                style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 16)),
          ),
        ),
      ];
    }

    // Completed
    return [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.greenSoft,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.checkCircle2,
                  size: 20, color: AppTheme.green),
              SizedBox(width: 8),
              Text('Mijozga topshirildi ✓',
                  style: TextStyle(
                      color: AppTheme.green,
                      fontWeight: FontWeight.w700,
                      fontSize: 15)),
            ]),
      ),
    ];
  }
}
