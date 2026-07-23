import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
import '../repository/orders_repository.dart';
import 'detail_common.dart';

/// Gilam uchun status ma'lumoti (label + rang)
class _ItemStatusInfo {
  final String label;
  final Color color;
  const _ItemStatusInfo(this.label, this.color);
}

/// SEX XODIMI zakaz tafsiloti - to'liq funksional:
/// ✓ Gilam o'lchovlarini kiritish (eni × bo'yi → kv.m)
/// ✓ Yangi gilam qo'shish
/// ✓ Narx va izoh tahrirlash
/// ✓ Saqlash va keyingi bosqichga o'tkazish
class FactoryOrderDetailScreen extends StatefulWidget {
  final Order order;
  final List<OrderStatusInfo> statuses;

  const FactoryOrderDetailScreen({super.key, required this.order, required this.statuses});

  @override
  State<FactoryOrderDetailScreen> createState() => _FactoryOrderDetailScreenState();
}

class _FactoryOrderDetailScreenState extends State<FactoryOrderDetailScreen> {
  final _repo = OrdersRepository();
  final _priceController = TextEditingController();
  final _noteController = TextEditingController();
  final Map<String, TextEditingController> _eniCtrl = {};
  final Map<String, TextEditingController> _boyiCtrl = {};
  bool _saving = false;
  bool _addingItem = false;

  /// Tarix (o'tgan) buyurtma ekanligini tekshiradi — yakunlangan
  /// yoki to'lov qilingan buyurtmalar tahrirlanmasligi kerak.
  bool get _isCompleted {
    final sorted = [...widget.statuses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final lastId = sorted.isNotEmpty ? sorted.last.id : null;
    final atLast = lastId != null && widget.order.status?.id == lastId;
    final paid = widget.order.paymentStatus.isNotEmpty && widget.order.paymentStatus != 'PENDING';
    return atLast || paid;
  }

  @override
  void initState() {
    super.initState();
    if (!_isCompleted) _initControllers();
  }

  void _initControllers() {
    for (final item in widget.order.items) {
      _eniCtrl[item.id] = TextEditingController(text: item.width > 0 ? item.width.toString() : '');
      _boyiCtrl[item.id] = TextEditingController(text: item.length > 0 ? item.length.toString() : '');
    }
    if (widget.order.price > 0) _priceController.text = widget.order.price.toStringAsFixed(0);
    if (widget.order.description.isNotEmpty) _noteController.text = widget.order.description;
  }

  @override
  void dispose() {
    _priceController.dispose();
    _noteController.dispose();
    for (final c in _eniCtrl.values) {
      c.dispose();
    }
    for (final c in _boyiCtrl.values) {
      c.dispose();
    }
    super.dispose();
  }

  double _itemArea(OrderItemInfo item) {
    final eni = double.tryParse(_eniCtrl[item.id]?.text ?? '') ?? 0;
    final boyi = double.tryParse(_boyiCtrl[item.id]?.text ?? '') ?? 0;
    return eni * boyi * item.quantity;
  }

  double _calcTotalArea(List<OrderItemInfo> items) {
    if (_isCompleted) {
      return items.fold(0.0, (s, i) => s + (i.width * i.length * i.quantity));
    }
    return items.fold(0.0, (s, i) => s + _itemArea(i));
  }

  int _calcTotalQuantity(List<OrderItemInfo> items) =>
      items.fold(0, (s, i) => s + i.quantity);

  /// Barcha gilamlar "Tayyor" bosqichiga yetganmi - shu bo'lmasa buyurtmani
  /// haydovchiga topshirish (keyingi bosqichga o'tkazish) taqiqlanadi.
  /// Gilamlar umuman kiritilmagan bo'lsa (item-based bo'lmagan xizmat) - to'siq
  /// qo'yilmaydi.
  bool get _allItemsReady =>
      widget.order.items.isEmpty ||
      widget.order.items.every((i) => i.status == 'READY');

  OrderStatusInfo? get _nextStatus {
    final sorted = [...widget.statuses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final idx =
        sorted.indexWhere((s) => s.id == widget.order.status?.id);
    if (idx == -1 || idx >= sorted.length - 1) return null;
    return sorted[idx + 1];
  }

  Future<void> _save({bool advance = false}) async {
    setState(() => _saving = true);
    try {
      // Save measurements
      for (final item in widget.order.items) {
        final eni = double.tryParse(_eniCtrl[item.id]?.text ?? '') ?? 0;
        final boyi = double.tryParse(_boyiCtrl[item.id]?.text ?? '') ?? 0;
        if (eni > 0 || boyi > 0) {
          await _repo.updateItemMeasurements(
              widget.order.id, item.id, boyi, eni);
        }
      }
      // Save price + note
      final price =
          double.tryParse(
              _priceController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ??
          0;
      await _repo.updateOrderPrice(widget.order.id, price,
          description: _noteController.text.trim());

      // Advance to next status
      if (advance && _nextStatus != null) {
        await _repo.updateStatus(widget.order.id, _nextStatus!.id);
      }

      if (!mounted) return;
      try {
        context.read<OrdersCubit>().refresh();
      } catch (_) {}
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(advance
            ? 'Saqlandi va ${_nextStatus!.nameUz}ga yuborildi'
            : 'Saqlandi'),
        backgroundColor: AppTheme.primary,
        behavior: SnackBarBehavior.floating,
      ));
      if (advance) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addNewItem() async {
    final nameCtrl = TextEditingController();
    final eniCtrl = TextEditingController();
    final boyiCtrl = TextEditingController();
    final quantityCtrl = TextEditingController(text: '1');

    final result = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.plus,
                  size: 16, color: AppTheme.primary),
            ),
            const SizedBox(width: 10),
            const Text('Yangi gilam qo\'shish',
                style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 16)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Gilam nomi',
                    hintText: 'Masalan: Oshxona gilami',
                    prefixIcon:
                        Icon(LucideIcons.tag, size: 18),
                  ),
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: eniCtrl,
                        keyboardType:
                            const TextInputType.numberWithOptions(
                                decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Eni (m)',
                          prefixIcon: Icon(
                              LucideIcons.moveHorizontal,
                              size: 18),
                        ),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: boyiCtrl,
                        keyboardType:
                            const TextInputType.numberWithOptions(
                                decimal: true),
                        decoration: const InputDecoration(
                          labelText: "Bo'yi (m)",
                          prefixIcon: Icon(
                              LucideIcons.moveVertical,
                              size: 18),
                        ),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: quantityCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Soni',
                    prefixIcon:
                        Icon(LucideIcons.hash, size: 18),
                  ),
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor',
                style: TextStyle(
                    color: Theme.of(context).brightness ==
                            Brightness.dark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.textSecondary)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primary),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Qo\'shish'),
          ),
        ],
      ),
    );

    if (result != true) {
      nameCtrl.dispose();
      eniCtrl.dispose();
      boyiCtrl.dispose();
      quantityCtrl.dispose();
      return;
    }

    final name = nameCtrl.text.trim();
    final eni = double.tryParse(eniCtrl.text) ?? 0;
    final boyi = double.tryParse(boyiCtrl.text) ?? 0;
    final quantity = int.tryParse(quantityCtrl.text) ?? 1;

    nameCtrl.dispose();
    eniCtrl.dispose();
    boyiCtrl.dispose();
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

    setState(() => _addingItem = true);
    try {
      await context
          .read<OrdersCubit>()
          .createOrderItem(widget.order, name, boyi, eni, quantity);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('"$name" qo\'shildi'),
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

  Future<void> _call(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  /// Status nomi va rangi
  static final Map<String, _ItemStatusInfo> _itemStatuses = {
    'ACCEPTED': const _ItemStatusInfo('Qabul qilindi', AppTheme.amber),
    'WASHED': const _ItemStatusInfo('Yuvildi', AppTheme.blue),
    'DRIED': const _ItemStatusInfo('Quritildi', AppTheme.green),
    'READY': const _ItemStatusInfo('Tayyor', AppTheme.teal),
  };

  _ItemStatusInfo _itemStatusInfo(String status) =>
      _itemStatuses[status] ?? _ItemStatusInfo(status, AppTheme.textMuted);

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

    setState(() => _saving = true);
    try {
      await context.read<OrdersCubit>().deleteOrderItem(widget.order, item);
      _eniCtrl[item.id]?.dispose();
      _boyiCtrl[item.id]?.dispose();
      _eniCtrl.remove(item.id);
      _boyiCtrl.remove(item.id);
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
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        title: Text('Zakaz #${widget.order.id.length > 6 ? widget.order.id.substring(0, 6) : widget.order.id}',
            style: const TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.w700,
                color: Colors.white)),
        actions: [
          if (!_isCompleted)
            IconButton(
                onPressed: _saving ? null : () => _save(),
                icon: const Icon(LucideIcons.save)),
          if (_isCompleted)
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(LucideIcons.checkCircle2, size: 16, color: Colors.white),
                  SizedBox(width: 4),
                  Text('Yakunlangan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                ],
              ),
            ),
        ],
      ),
      body: BlocBuilder<OrdersCubit, OrdersState>(
        builder: (context, cubitState) {
          Order liveOrder = widget.order;
          if (cubitState is OrdersLoaded) {
            for (final o in cubitState.orders) {
              if (o.id == widget.order.id) { liveOrder = o; break; }
            }
          }
          // Ensure controllers exist for all items (faqat aktiv buyurtma uchun)
          if (!_isCompleted) {
            for (final item in liveOrder.items) {
              _eniCtrl.putIfAbsent(item.id, () => TextEditingController(text: item.width > 0 ? item.width.toString() : ''));
              _boyiCtrl.putIfAbsent(item.id, () => TextEditingController(text: item.length > 0 ? item.length.toString() : ''));
            }
            // Remove controllers for deleted items
            _eniCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
            _boyiCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
          }
          final o = liveOrder;
          final statusColor = AppTheme.hex(o.status?.colorCode ?? '#16A34A');
          return _buildBody(o, statusColor);
        },
      ),
    );
  }

  Widget _buildBody(Order o, Color statusColor) {
    final shortId = o.id.length > 6 ? o.id.substring(0, 6) : o.id;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          // Status badges
          Row(children: [
            DetailBadge(
                icon: LucideIcons.droplet,
                text: o.status?.nameUz ?? 'Sexda',
                color: statusColor),
            const Spacer(),
            DetailBadge(
                icon: LucideIcons.inbox,
                text: '${o.items.length} ta gilam',
                color: AppTheme.amber,
                soft: true),
          ]),
          const SizedBox(height: 14),

          // Client card
          ClientCard(
              name: o.client.fullName,
              phone: o.client.phone,
              address: o.address.isEmpty
                  ? o.client.address
                  : o.address,
              onCall: () => _call(o.client.phone)),
          const SizedBox(height: 12),

          // Driver info
          if (o.workerName != null && o.workerName!.isNotEmpty) ...[
            DetailPanel(
                child: Row(children: [
              const Icon(LucideIcons.user,
                  size: 18, color: AppTheme.textMuted),
              const SizedBox(width: 10),
              Expanded(
                  child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                    const Text('Haydovchi',
                        style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11)),
                    Text(o.workerName!,
                        style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 14)),
                  ])),
            ])),
            const SizedBox(height: 12),
          ],

          // Order description
          if (o.description.isNotEmpty) ...[
            DetailPanel(
                child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                  const Text('Izoh',
                      style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 11)),
                  const SizedBox(height: 3),
                  Text(o.description,
                      style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 13)),
                ])),
            const SizedBox(height: 12),
          ],

          // ===== MEASUREMENT TABLE =====
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
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: const Icon(LucideIcons.ruler,
                        size: 15, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 8),
                  const Text("O'lchamlar",
                      style: TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w800,
                          fontSize: 15)),
                ],
              ),
              const SizedBox(height: 14),

              // Table header
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppTheme.darkSurfaceAltColor
                      : AppTheme.bg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(children: [
                  Expanded(
                      flex: 3,
                      child: Text('Gilam',
                          style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                  Expanded(
                      flex: 2,
                      child: Text('Eni',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                  Expanded(
                      flex: 2,
                      child: Text("Bo'yi",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                  Expanded(
                      flex: 2,
                      child: Text('Kv.m',
                          textAlign: TextAlign.right,
                          style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                ]),
              ),
              const SizedBox(height: 4),

              // Items - live order items (cubit dan)
              if (o.items.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Column(children: [
                      Icon(LucideIcons.packageOpen,
                          size: 32,
                          color: isDark
                              ? AppTheme.darkTextMutedColor
                              : AppTheme.textMuted),
                      const SizedBox(height: 8),
                      Text("Gilamlar kiritilmagan",
                          style: TextStyle(
                              color: isDark
                                  ? AppTheme.darkTextSecondaryColor
                                  : AppTheme.textSecondary,
                              fontSize: 12)),
                    ]),
                  ),
                )
              else
                ...o.items.asMap().entries.map(
                    (e) => _measureRow(e.key, e.value)),

              const Divider(
                  color: AppTheme.borderColor, height: 24),

              // Total row
              Row(children: [
                const Expanded(
                    child: Text('Jami',
                        style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13))),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                      '${_calcTotalQuantity(o.items)} ta / ${_calcTotalArea(o.items).toStringAsFixed(2)} m²',
                      style: const TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w800,
                          fontSize: 13)),
                ),
              ]),

              const SizedBox(height: 14),

              // Add carpet button (tarixda yashirin)
              if (!_isCompleted)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _addingItem ? null : _addNewItem,
                    icon: _addingItem
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2))
                        : const Icon(LucideIcons.plus, size: 18),
                    label: Text(
                        _addingItem
                            ? 'Qo\'shilmoqda...'
                            : 'Yangi gilam qo\'shish',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.primary),
                      padding:
                          const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(12)),
                    ),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 16),

          // Note (tarixda faqat ma'lumot, aktivda tahrirlanadigan maydon)
          if (_isCompleted && widget.order.description.isNotEmpty)
            DetailPanel(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Qo\'shimcha izoh',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                const SizedBox(height: 4),
                Text(widget.order.description,
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
              ]),
            )
          else if (!_isCompleted) ...[            
            const Text("Qo'shimcha izoh",
                style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Izoh yozing...',
                prefixIcon:
                    Icon(LucideIcons.fileText, size: 18),
              ),
              style: const TextStyle(fontSize: 13),
            ),
          ],
          const SizedBox(height: 16),

          // Price (tarixda faqat ma'lumot)
          if (_isCompleted)
            DetailPanel(
              child: Row(children: [
                const Icon(LucideIcons.wallet, size: 18, color: AppTheme.textMuted),
                const SizedBox(width: 8),
                const Text('Narx: ', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                Text('${NumberFormat.decimalPattern('uz').format(widget.order.price)} so\'m',
                    style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
              ]),
            )
          else ...[            
            const Text('Narx (so\'m)',
                style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                hintText: 'Narxni kiriting',
                prefixIcon:
                    Icon(LucideIcons.wallet, size: 18),
                suffixText: 'so\'m',
              ),
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 24),

          // Action buttons (tarixda yashirin)
          if (!_isCompleted) ...[
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saving ? null : () => _save(),
                style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding:
                        const EdgeInsets.symmetric(vertical: 15)),
                icon: _saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(LucideIcons.save, size: 18),
                label: const Text('Saqlash',
                    style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 10),
            if (_nextStatus != null) ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: (_saving || !_allItemsReady)
                      ? null
                      : () => _save(advance: true),
                  style: FilledButton.styleFrom(
                      backgroundColor:
                          _allItemsReady ? AppTheme.blue : AppTheme.textMuted,
                      padding:
                          const EdgeInsets.symmetric(vertical: 15)),
                  icon: Icon(
                      _allItemsReady
                          ? LucideIcons.arrowRight
                          : LucideIcons.lock,
                      size: 18),
                  label: Text(
                      _allItemsReady
                          ? 'Tayyor - ${_nextStatus!.nameUz}ga yuborish'
                          : 'Avval barcha gilamlarni "Tayyor" belgilang',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700)),
                ),
              ),
              if (!_allItemsReady)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    "Haydovchiga topshirishdan oldin har bir gilamning \"Tayyor\" katagini belgilang.",
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                  ),
                ),
            ],
          ] else
            // Tarix — yakunlangan belgisi
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
                    Text('Buyurtma yakunlangan ✓',
                        style: TextStyle(
                            color: AppTheme.green,
                            fontWeight: FontWeight.w700,
                            fontSize: 15)),
                  ]),
            ),
        ],
      );
  }

  /// Gilam ustiga bosganda o'lcham va narx kiritish paneli
  void _showCarpetOptions(OrderItemInfo item) {
    final eniCtrl = TextEditingController(text: _eniCtrl[item.id]?.text ?? '');
    final boyiCtrl = TextEditingController(text: _boyiCtrl[item.id]?.text ?? '');
    final priceCtrl = TextEditingController(
      text: widget.order.price > 0 ? widget.order.price.toStringAsFixed(0) : '',
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(bctx).viewInsets.bottom,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(child: Container(
                  width: 36, height: 4,
                  decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
                )),
                const SizedBox(height: 16),
                // Gilam nomi
                Row(children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(9)),
                    child: const Icon(LucideIcons.layers, size: 18, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item.name.isEmpty ? 'Gilam' : item.name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                      Text('${item.quantity} ta',
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                    ]),
                  ),
                ]),
                const SizedBox(height: 20),
                // O'lchamlar
                const Text("O'lchamlar",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimary)),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: eniCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Eni (m)',
                        prefixIcon: Icon(LucideIcons.moveHorizontal, size: 18),
                      ),
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: boyiCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: "Bo'yi (m)",
                        prefixIcon: Icon(LucideIcons.moveVertical, size: 18),
                      ),
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),
                // Narx
                const Text('Narx (so\'m)',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimary)),
                const SizedBox(height: 8),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Narxni kiriting',
                    prefixIcon: Icon(LucideIcons.wallet, size: 18),
                    suffixText: "so'm",
                  ),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                // Status tanlash
                const Text("Holati",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimary)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: _itemStatuses.entries.map((e) {
                    final selected = item.status == e.key;
                    final info = e.value;
                    return ChoiceChip(
                      label: Text(info.label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      selected: selected,
                      selectedColor: info.color.withOpacity(0.2),
                      backgroundColor: info.color.withOpacity(0.05),
                      side: BorderSide(
                        color: selected ? info.color : Colors.transparent,
                        width: 1.5,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      onSelected: (val) async {
                        if (!val || selected) return;
                        Navigator.pop(bctx);
                        try {
                          await context.read<OrdersCubit>().changeOrderItemStatus(widget.order, item, e.key);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('"${item.name.isEmpty ? "Gilam" : item.name}" → ${info.label}'),
                              backgroundColor: info.color,
                              behavior: SnackBarBehavior.floating,
                            ));
                          }
                        } catch (err) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('Xatolik: $err'),
                              backgroundColor: AppTheme.dangerColor,
                              behavior: SnackBarBehavior.floating,
                            ));
                          }
                        }
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
                // Tugmalar
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(bctx);
                        _deleteItem(item);
                      },
                      icon: const Icon(LucideIcons.trash2, size: 18),
                      label: const Text('O\'chirish', style: TextStyle(fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.dangerColor,
                        side: const BorderSide(color: AppTheme.dangerColor),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: FilledButton.icon(
                      onPressed: () async {
                        // Save measurements to controller maps
                        _eniCtrl[item.id]?.text = eniCtrl.text;
                        _boyiCtrl[item.id]?.text = boyiCtrl.text;
                        // Sync price to main controller
                        final priceText = priceCtrl.text.trim();
                        if (priceText.isNotEmpty) {
                          _priceController.text = priceText;
                        }
                        setState(() {});
                        Navigator.pop(bctx);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: const Text('O\'lcham va narx saqlandi'),
                            backgroundColor: AppTheme.primary,
                            behavior: SnackBarBehavior.floating,
                          ));
                        }
                      },
                      icon: const Icon(LucideIcons.check, size: 18),
                      label: const Text('Saqlash', style: TextStyle(fontWeight: FontWeight.w700)),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    ).whenComplete(() {
      try {
        eniCtrl.dispose();
        boyiCtrl.dispose();
        priceCtrl.dispose();
      } catch (_) {}
    });
  }

  /// Gilam qatori — aktiv buyurtmada o'lcham maydonlari bilan,
  /// tarixda faqat ma'lumot (read-only).
  Widget _measureRow(int i, OrderItemInfo item) {
    final eni = item.width;
    final boyi = item.length;
    final area = eni * boyi;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark
        ? AppTheme.darkSurfaceAltColor.withOpacity(0.3)
        : AppTheme.bg.withOpacity(0.5);

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Gilam nomi + status badge (tarixda tahrirlash tugmalari yo'q)
          Row(children: [
            Expanded(
              child: Row(children: [
                Icon(LucideIcons.layers, size: 14,
                    color: _isCompleted ? AppTheme.green : AppTheme.textMuted),
                const SizedBox(width: 6),
                Text(
                  item.name.isEmpty ? 'Gilam ${i + 1}' : item.name,
                  style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700),
                ),
              ]),
            ),
            // Status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _itemStatusInfo(item.status).color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _itemStatusInfo(item.status).label,
                style: TextStyle(
                  color: _itemStatusInfo(item.status).color,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (!_isCompleted) ...[
              const SizedBox(width: 4),
              // Tahrirlash tugmasi
              InkWell(
                onTap: () => _showCarpetOptions(item),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  width: 28, height: 28,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.pencil, size: 14, color: AppTheme.primary),
                ),
              ),
              const SizedBox(width: 4),
              // O'chirish tugmasi
              InkWell(
                onTap: () => _deleteItem(item),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  width: 28, height: 28,
                  decoration: BoxDecoration(
                    color: AppTheme.dangerColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.trash2, size: 14, color: AppTheme.dangerColor),
                ),
              ),
            ],
          ]),
          const SizedBox(height: 6),
          // O'lcham ma'lumotlari — tarixda oddiy matn, aktivda maydon
          Row(children: [
            Expanded(
                flex: 3,
                child: Text('${item.quantity} ta',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10))),
            if (_isCompleted) ...[
              Expanded(
                  flex: 2,
                  child: Text(eni > 0 ? eni.toStringAsFixed(1) : '—',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600))),
              const SizedBox(width: 4),
              Expanded(
                  flex: 2,
                  child: Text(boyi > 0 ? boyi.toStringAsFixed(1) : '—',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600))),
            ] else ...[
              Expanded(
                  flex: 2,
                  child: _numField(_eniCtrl[item.id]!)),
              const SizedBox(width: 4),
              Expanded(
                  flex: 2,
                  child: _numField(_boyiCtrl[item.id]!)),
            ],
            const SizedBox(width: 4),
            Expanded(
                flex: 2,
                child: Text(
                  area > 0 ? '${area.toStringAsFixed(1)}' : (_isCompleted ? '—' : '0.0'),
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                      color: AppTheme.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700),
                )),
          ]),
        ],
      ),
    );
  }

  Widget _numField(TextEditingController c) {
    return SizedBox(
      height: 34,
      child: TextField(
        controller: c,
        keyboardType:
            const TextInputType.numberWithOptions(decimal: true),
        textAlign: TextAlign.center,
        onChanged: (_) => setState(() {}),
        style: const TextStyle(
            fontSize: 12,
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          hintText: '0.0',
          contentPadding:
              const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
          fillColor: AppTheme.bg,
          filled: true,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide:
                const BorderSide(color: AppTheme.borderColor),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide:
                const BorderSide(color: AppTheme.borderColor),
          ),
        ),
      ),
    );
  }
}
