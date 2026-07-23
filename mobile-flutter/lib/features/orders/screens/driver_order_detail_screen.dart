import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
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

  const DriverOrderDetailScreen({
    super.key,
    required this.order,
    required this.statuses,
    this.currentUserId = '',
  });

  @override
  State<DriverOrderDetailScreen> createState() =>
      _DriverOrderDetailScreenState();
}

class _DriverOrderDetailScreenState extends State<DriverOrderDetailScreen> {
  bool _isProcessing = false;

  bool get _isMine =>
      widget.currentUserId.isNotEmpty &&
      widget.order.workerId == widget.currentUserId;

  Order get order => widget.order;
  List<OrderStatusInfo> get statuses => widget.statuses;

  /// Tarix (o'tgan) buyurtma ekanligini tekshiradi — yakunlangan
  /// yoki to'lov qilingan buyurtmalar tahrirlanmasligi kerak.
  bool get _isCompleted {
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final lastId = sorted.isNotEmpty ? sorted.last.id : null;
    final atLast = lastId != null && order.status?.id == lastId;
    final paid = order.paymentStatus.isNotEmpty && order.paymentStatus != 'PENDING';
    return atLast || paid;
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

  Future<void> _collectPayment() async {
    final amountCtrl = TextEditingController(
        text: order.price.toStringAsFixed(0));
    final formatter = NumberFormat.decimalPattern('uz');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18)),
        title: const Text("To'lovni qabul qilish",
            style: TextStyle(
                fontWeight: FontWeight.w700, fontSize: 16)),
        content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          Text(
              'Buyurtma summasi: ${formatter.format(order.price)} so\'m',
              style: const TextStyle(
                  color: AppTheme.textSecondary, fontSize: 13)),
          const SizedBox(height: 12),
          TextField(
            controller: amountCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: "Olingan summa (so'm)",
              prefixIcon:
                  Icon(LucideIcons.wallet, size: 18),
              suffixText: "so'm",
            ),
            style: const TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ]),
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
                backgroundColor: AppTheme.green),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Tasdiqlash'),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.bg.withOpacity(0.3),
          borderRadius: BorderRadius.circular(12),
        ),
        child: InkWell(
          onTap: _isCompleted ? null : () => _showCarpetOptions(item),
          borderRadius: BorderRadius.circular(12),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: AppTheme.bg, borderRadius: BorderRadius.circular(9)),
              child: Icon(_isCompleted ? LucideIcons.checkCircle : LucideIcons.layers, size: 18, color: _isCompleted ? AppTheme.green : AppTheme.textMuted),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.name.isEmpty ? 'Gilam ${i + 1}' : item.name,
                  style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 13)),
              Text('${item.quantity} ta - ${_sizeLabel(item)}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
            ])),
            if (!_isCompleted)
              const Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMuted),
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
    // Case 1: Not my order - Accept button
    if (!_isMine) {
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
        const SizedBox(height: 10),
        Center(
          child: Text(
            'Haydovchi: ${order.workerName ?? "Biriktirilmagan"}',
            style: const TextStyle(
                color: AppTheme.textSecondary, fontSize: 12),
          ),
        ),
      ];
    }

    // Case 2: My order - show remaining status steps
    final sorted = [...statuses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final idx =
        sorted.indexWhere((s) => s.id == order.status?.id);
    final remaining = (idx == -1)
        ? <OrderStatusInfo>[]
        : sorted.sublist(idx + 1);

    if (remaining.isNotEmpty) {
      // Birinchi bosqich (Qabul qilindi -> Yuvilmoqda) uchun "Qabul qilish" matni ishlatiladi
      final isFirstStep = sorted.isNotEmpty && sorted.first.id == order.status?.id;
      final primaryLabel = isFirstStep ? "Qabul qilish" : remaining[0].nameUz;
      final widgets = <Widget>[
        // Primary action - next step
        Container(
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

      // Additional actions
      if (remaining.length >= 2) {
        widgets.add(const SizedBox(height: 10));
        widgets.add(
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _advanceToStatus(
                  remaining[1].id, remaining[1].nameUz),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.textPrimary,
                side: const BorderSide(
                    color: AppTheme.borderColor),
                padding:
                    const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              icon: Icon(LucideIcons.chevronRight,
                  size: 18, color: AppTheme.textSecondary),
              label: Text(remaining[1].nameUz,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14)),
            ),
          ),
        );
      }

      return widgets;
    }

    // Case 3: Final status - collect payment or completed
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
                    fontWeight: FontWeight.w700, fontSize: 15)),
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
