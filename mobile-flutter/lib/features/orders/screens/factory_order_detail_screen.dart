import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/money.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
import '../order_zone.dart';
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
  final Map<String, TextEditingController> _unitPriceCtrl = {};
  final _globalUnitPriceCtrl = TextEditingController();
  bool _saving = false;
  bool _addingItem = false;
  final Set<String> _selectedItemIds = {};
  bool _isBulkUpdating = false;

  /// Gilam bosqichlari (Sozlamalar -> Gilam bosqichlari) - OrdersCubit'ning
  /// so'nggi holatidan BlocBuilder ichida yangilanadi (qarang build() pastda).
  List<OrderItemStageInfo> _itemStages = [];

  /// Narx maydoniga foydalanuvchi o'zi qo'lda yozganmi
  bool _priceManuallyEdited = false;
  bool _suppressPriceListener = false;

  void _setPriceText(String text) {
    _suppressPriceListener = true;
    _priceController.text = text;
    _suppressPriceListener = false;
  }

  /// 1 m² narxini olish (so'm)
  double _getItemUnitPrice(OrderItemInfo item) {
    final text = _unitPriceCtrl[item.id]?.text;
    final parsed = parseMoney(text);
    if (parsed != null && parsed > 0) {
      return parsed;
    }
    final area = _itemArea(item);
    if (item.price != null && item.price! > 0 && area > 0) {
      return (item.price! / area).roundToDouble();
    }
    final globalParsed = parseMoney(_globalUnitPriceCtrl.text);
    if (globalParsed != null && globalParsed > 0) {
      return globalParsed;
    }
    if (widget.order.servicePrice > 0) {
      return widget.order.servicePrice;
    }
    return 12000.0;
  }

  /// Har bir gilam narxi = Maydon (kv.m) * 1 m² narxi (yoki soni * xizmat narxi)
  double _getItemPrice(OrderItemInfo item) {
    final area = _itemArea(item);
    final unitPrice = _getItemUnitPrice(item);
    if (area > 0 && unitPrice > 0) {
      return (area * unitPrice).roundToDouble();
    }
    if (item.price != null && item.price! > 0) {
      return item.price!;
    }
    if (widget.order.servicePrice > 0) {
      return (area > 0 ? area : item.quantity.toDouble()) * widget.order.servicePrice;
    }
    return 0.0;
  }

  Order get _currentOrder {
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

  /// Barcha gilamlarga bir xil 1 m² narxi belgilash
  void _applyGlobalUnitPrice(double unitPrice) {
    for (final item in _currentOrder.items) {
      _unitPriceCtrl[item.id]?.text = unitPrice.toStringAsFixed(0);
    }
    setState(() {});
    _refreshSuggestedPriceIfNotEdited();
  }

  /// Backend OrderItemController.recalculatePrice bilan mos formula
  double _suggestedPrice({List<OrderItemInfo>? items}) {
    final list = items ?? _currentOrder.items;
    if (list.isEmpty) return 0;
    double total = 0;
    for (final item in list) {
      total += _getItemPrice(item);
    }
    return total;
  }

  /// O'lcham/gilam ro'yxati o'zgarganda taklif etilgan narxni yangilash
  void _refreshSuggestedPriceIfNotEdited() {
    if (_priceManuallyEdited || _currentOrder.items.isEmpty) return;
    _setPriceText(_suggestedPrice().toStringAsFixed(0));
  }

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
    final defaultUnitP = widget.order.servicePrice > 0 ? widget.order.servicePrice : 12000.0;
    _globalUnitPriceCtrl.text = defaultUnitP.toStringAsFixed(0);

    for (final item in widget.order.items) {
      _eniCtrl[item.id] = TextEditingController(text: item.width > 0 ? item.width.toString() : '');
      _boyiCtrl[item.id] = TextEditingController(text: item.length > 0 ? item.length.toString() : '');

      final area = item.width * item.length * item.quantity;
      double itemUnit = defaultUnitP;
      if (item.price != null && item.price! > 0 && area > 0) {
        itemUnit = (item.price! / area).roundToDouble();
      }
      _unitPriceCtrl[item.id] = TextEditingController(text: itemUnit.toStringAsFixed(0));
    }
    final suggested = _suggestedPrice();
    if (suggested > 0) {
      _setPriceText(suggested.toStringAsFixed(0));
    } else if (widget.order.price > 0) {
      _setPriceText(widget.order.price.toStringAsFixed(0));
    }
    if (widget.order.description.isNotEmpty) _noteController.text = widget.order.description;
  }

  @override
  void dispose() {
    _priceController.dispose();
    _noteController.dispose();
    _globalUnitPriceCtrl.dispose();
    for (final c in _eniCtrl.values) {
      c.dispose();
    }
    for (final c in _boyiCtrl.values) {
      c.dispose();
    }
    for (final c in _unitPriceCtrl.values) {
      c.dispose();
    }
    super.dispose();
  }

  double _itemArea(OrderItemInfo item) {
    final eni = parseMoney(_eniCtrl[item.id]?.text) ?? item.width;
    final boyi = parseMoney(_boyiCtrl[item.id]?.text) ?? item.length;
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
  ///
  bool _isItemReady(OrderItemInfo item) {
    final s = item.status.trim().toUpperCase();
    if (s == 'READY' || s == 'TAYYOR' || s == 'COMPLETED' || s == 'FINISHED') {
      return true;
    }
    final stages = _itemStages.isNotEmpty ? _itemStages : kDefaultItemStages;
    final sorted = [...stages]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    if (sorted.isNotEmpty) {
      final last = sorted.last;
      if (s == last.key.trim().toUpperCase() ||
          s == last.nameUz.trim().toUpperCase() ||
          s == last.nameRu.trim().toUpperCase() ||
          s == last.nameEn.trim().toUpperCase()) {
        return true;
      }
    }
    return false;
  }

  bool _checkHasItems(Order o) => o.items.isNotEmpty;

  bool _checkAllItemsReady(Order o) {
    if (o.items.isEmpty) return false;
    return o.items.every(_isItemReady);
  }

  bool _checkIsAreaBased(Order o) {
    final unit = o.measurementUnit.toLowerCase().replaceAll('.', '');
    return unit == 'm²' || unit.contains('kv');
  }

  bool _checkItemMeasured(OrderItemInfo item) {
    final eni = parseMoney(_eniCtrl[item.id]?.text) ?? item.width;
    final boyi = parseMoney(_boyiCtrl[item.id]?.text) ?? item.length;
    return eni > 0 && boyi > 0;
  }

  bool _checkAllItemsMeasured(Order o) {
    if (o.items.isEmpty) return false;
    if (!_checkIsAreaBased(o)) return true;
    return o.items.every(_checkItemMeasured);
  }

  bool _checkCanHandover(Order o) => _checkAllItemsReady(o) && _checkAllItemsMeasured(o);

  bool get _hasItems => _checkHasItems(_currentOrder);
  bool get _allItemsReady => _checkAllItemsReady(_currentOrder);
  bool get _isAreaBased => _checkIsAreaBased(_currentOrder);
  bool _itemMeasured(OrderItemInfo item) => _checkItemMeasured(item);
  bool get _allItemsMeasured => _checkAllItemsMeasured(_currentOrder);
  bool get _canHandover => _checkCanHandover(_currentOrder);

  /// Sex ishi tugagach buyurtma o'tkaziladigan status - haydovchi yana
  /// ko'radigan "yetkazish" zonasining birinchi statusi. Bitta bosishda
  /// (oraliq sex statuslarini sakrab o'tib) shu yerga o'tkaziladi -
  /// batafsil izoh uchun OrderZoneBoundary.handoverStatus'ga qarang.
  OrderStatusInfo? get _nextStatus {
    final handover = OrderZoneBoundary.fromStatuses(widget.statuses).handoverStatus(widget.statuses);
    if (handover != null) return handover;
    if (widget.statuses.isNotEmpty) {
      final sorted = [...widget.statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      return sorted.last;
    }
    return null;
  }

  Future<void> _save({bool advance = false}) async {
    setState(() => _saving = true);
    try {
      // Har bir gilamning o'lchami va hisoblangan narxini saqlash
      final currentOrder = _currentOrder;
      for (final item in currentOrder.items) {
        final eni = parseMoney(_eniCtrl[item.id]?.text) ?? item.width;
        final boyi = parseMoney(_boyiCtrl[item.id]?.text) ?? item.length;
        final calculatedPrice = _getItemPrice(item);
        if (eni > 0 || boyi > 0 || calculatedPrice > 0) {
          await _repo.updateOrderItem(
            currentOrder.id,
            item.id,
            length: boyi,
            width: eni,
            price: calculatedPrice > 0 ? calculatedPrice : null,
          );
        }
      }
      // Buyurtmaning umumiy narxi va izohini saqlash
      final typedPrice = parseMoney(_priceController.text) ?? 0;
      final priceToSend = (currentOrder.items.isNotEmpty && !_priceManuallyEdited)
          ? _suggestedPrice(items: currentOrder.items)
          : typedPrice;
      await _repo.updateOrderPrice(currentOrder.id, priceToSend,
          description: _noteController.text.trim());

      // Advance to next status
      if (advance && _nextStatus != null) {
        await _repo.updateStatus(currentOrder.id, _nextStatus!.id);
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
    final eni = parseMoney(eniCtrl.text) ?? 0;
    final boyi = parseMoney(boyiCtrl.text) ?? 0;
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
          .createOrderItem(_currentOrder, name, boyi, eni, quantity);
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

  /// Status nomi va rangi - `_itemStages` yoki standart kDefaultItemStages'dan
  _ItemStatusInfo _itemStatusInfo(String status) {
    final stages = _itemStages.isNotEmpty ? _itemStages : kDefaultItemStages;
    for (final s in stages) {
      if (s.key.toUpperCase() == status.toUpperCase() || s.nameUz.toLowerCase() == status.toLowerCase()) {
        return _ItemStatusInfo(s.nameUz, AppTheme.hex(s.colorCode));
      }
    }
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
        return const _ItemStatusInfo('Qabul qilindi', Color(0xFF3B82F6));
      case 'WASHED':
        return const _ItemStatusInfo('Yuvildi', Color(0xFF0284C7));
      case 'DRIED':
        return const _ItemStatusInfo('Quritildi', Color(0xFFF59E0B));
      case 'READY':
        return const _ItemStatusInfo('Tayyor', Color(0xFF10B981));
      default:
        return _ItemStatusInfo(status.isNotEmpty ? status : 'Qabul qilindi', const Color(0xFF3B82F6));
    }
  }

  /// Gilam bosqichlari ketma-ketligi
  List<String> get _itemStatusOrder {
    final stages = _itemStages.isNotEmpty ? _itemStages : kDefaultItemStages;
    return stages.map((s) => s.key).toList();
  }

  /// Gilamni `from` bosqichidan `to` bosqichiga o'tkazish mumkinmi.
  ///
  /// MUHIM (audit'da topilgan xato, tuzatildi): avval barcha bosqichlar
  /// tanlanadigan (ChoiceChip) bo'lgani uchun gilamni "Qabul qilindi"dan
  /// TO'G'RIDAN-TO'G'RI "Tayyor"ga o'tkazish mumkin edi - yuvish va quritish
  /// bosqichlari butunlay o'tkazib yuborilardi va bu hech qayerda qayd
  /// etilmasdi. Endi faqat bitta qadam oldinga siljish mumkin; bitta qadam
  /// orqaga qaytish esa ataylab ochiq qoldirilgan (xodim adashib bosgan
  /// bosqichni tuzata olishi uchun).
  bool _canMoveItemTo(String from, String to) {
    final order = _itemStatusOrder;
    final fromIdx = order.indexOf(from);
    final toIdx = order.indexOf(to);
    if (fromIdx == -1 || toIdx == -1) return true; // noma'lum status - cheklamaymiz
    return (toIdx - fromIdx).abs() == 1;
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

    setState(() => _saving = true);
    try {
      await context.read<OrdersCubit>().deleteOrderItem(_currentOrder, item);
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

  /// Tanlangan gilamlarni bitta bosqich oldinga surish
  Future<void> _advanceSelectedItems(Order order) async {
    final selectedItems = order.items.where((i) => _selectedItemIds.contains(i.id)).toList();
    if (selectedItems.isEmpty) return;

    setState(() => _isBulkUpdating = true);
    int advancedCount = 0;
    try {
      final orderKeys = _itemStatusOrder;
      for (final item in selectedItems) {
        final curIdx = orderKeys.indexOf(item.status);
        if (curIdx != -1 && curIdx < orderKeys.length - 1) {
          final nextStageKey = orderKeys[curIdx + 1];
          await context.read<OrdersCubit>().changeOrderItemStatus(order, item, nextStageKey);
          advancedCount++;
        }
      }
      _selectedItemIds.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('$advancedCount ta gilam keyingi bosqichga o\'tkazildi'),
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
      if (mounted) setState(() => _isBulkUpdating = false);
    }
  }

  /// Tanlangan gilamlarni bitta aniq bosqichga o'tkazish
  Future<void> _moveSelectedItemsToStage(Order order, String targetStageKey, String stageName, Color stageColor) async {
    final selectedItems = order.items.where((i) => _selectedItemIds.contains(i.id)).toList();
    if (selectedItems.isEmpty) return;

    setState(() => _isBulkUpdating = true);
    try {
      await context.read<OrdersCubit>().bulkChangeOrderItemStatus(order, selectedItems, targetStageKey);
      final count = selectedItems.length;
      _selectedItemIds.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('$count ta gilam "$stageName" bosqichiga o\'tkazildi'),
          backgroundColor: stageColor,
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
      if (mounted) setState(() => _isBulkUpdating = false);
    }
  }

  /// Bir nechta gilam uchun bosqich tanlash dialogi
  void _showBulkStagePicker(Order o) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36, height: 4,
                  decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Tanlangan ${_selectedItemIds.length} ta gilamni qaysi bosqichga o\'tkazasiz?',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: (_itemStages.isNotEmpty ? _itemStages : kDefaultItemStages).map((stage) {
                  final color = AppTheme.hex(stage.colorCode);
                  return ActionChip(
                    backgroundColor: color.withOpacity(0.12),
                    side: BorderSide(color: color.withOpacity(0.4)),
                    avatar: Icon(LucideIcons.checkCircle2, size: 16, color: color),
                    label: Text(stage.nameUz, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
                    onPressed: () {
                      Navigator.pop(bctx);
                      _moveSelectedItemsToStage(o, stage.key, stage.nameUz, color);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
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
            _itemStages = cubitState.itemStages.isNotEmpty ? cubitState.itemStages : kDefaultItemStages;
          }
          // Ensure controllers exist for all items (faqat aktiv buyurtma uchun)
          if (!_isCompleted) {
            final defaultUnitP = liveOrder.servicePrice > 0 ? liveOrder.servicePrice : 12000.0;
            for (final item in liveOrder.items) {
              _eniCtrl.putIfAbsent(item.id, () => TextEditingController(text: item.width > 0 ? item.width.toString() : ''));
              _boyiCtrl.putIfAbsent(item.id, () => TextEditingController(text: item.length > 0 ? item.length.toString() : ''));
              _unitPriceCtrl.putIfAbsent(item.id, () {
                final area = item.width * item.length * item.quantity;
                double itemUnit = defaultUnitP;
                if (item.price != null && item.price! > 0 && area > 0) {
                  itemUnit = (item.price! / area).roundToDouble();
                }
                return TextEditingController(text: itemUnit.toStringAsFixed(0));
              });
            }
            // Remove controllers for deleted items
            _eniCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
            _boyiCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
            _unitPriceCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
          }
          final o = liveOrder;
          final statusColor = AppTheme.hex(o.status?.colorCode ?? '#16A34A');
          return _buildBody(o, statusColor);
        },
      ),
    );
  }

  Widget _buildBody(Order o, Color statusColor) {
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

              // Multi-select toolbar (aktiv buyurtmada)
              if (!_isCompleted && o.items.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: _selectedItemIds.isNotEmpty
                        ? AppTheme.primary.withOpacity(0.08)
                        : (isDark ? AppTheme.darkSurfaceAltColor : AppTheme.bg),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _selectedItemIds.isNotEmpty ? AppTheme.primary.withOpacity(0.35) : AppTheme.borderColor,
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            width: 22,
                            height: 22,
                            child: Checkbox(
                              value: _selectedItemIds.isNotEmpty && _selectedItemIds.length == o.items.length,
                              tristate: _selectedItemIds.isNotEmpty && _selectedItemIds.length < o.items.length,
                              activeColor: AppTheme.primary,
                              onChanged: (val) {
                                setState(() {
                                  if (_selectedItemIds.length == o.items.length) {
                                    _selectedItemIds.clear();
                                  } else {
                                    _selectedItemIds.clear();
                                    _selectedItemIds.addAll(o.items.map((i) => i.id));
                                  }
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _selectedItemIds.isEmpty
                                  ? 'Barcha gilamlarni tanlash'
                                  : '${_selectedItemIds.length} ta gilam tanlandi',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: _selectedItemIds.isNotEmpty ? AppTheme.primary : AppTheme.textSecondary,
                              ),
                            ),
                          ),
                          if (_selectedItemIds.isNotEmpty)
                            InkWell(
                              onTap: () => setState(() => _selectedItemIds.clear()),
                              borderRadius: BorderRadius.circular(6),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                child: Text('Bekor qilish', style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                              ),
                            ),
                        ],
                      ),
                      if (_selectedItemIds.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: FilledButton.icon(
                                onPressed: _isBulkUpdating ? null : () => _advanceSelectedItems(o),
                                icon: _isBulkUpdating
                                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Icon(LucideIcons.arrowRight, size: 14),
                                label: const Text('Keyingi bosqich', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: OutlinedButton.icon(
                                onPressed: _isBulkUpdating ? null : () => _showBulkStagePicker(o),
                                icon: const Icon(LucideIcons.slidersHorizontal, size: 13),
                                label: const Text('Bosqich...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppTheme.primary,
                                  side: const BorderSide(color: AppTheme.primary),
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],

              // Items - live order items (cubit dan)
              if (o.items.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Column(children: [
                      Icon(LucideIcons.packageOpen,
                          size: 32,
                          color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted),
                      const SizedBox(height: 8),
                      Text("Gilamlar kiritilmagan",
                          style: TextStyle(
                              color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary,
                              fontSize: 12)),
                    ]),
                  ),
                )
              else
                ...o.items.asMap().entries.map(
                    (e) => _measureRow(e.key, e.value, o)),

              // ===== BARCHA GILAMLAR UCHUN 1 M² NARXI =====
              if (!_isCompleted && o.items.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(LucideIcons.calculator, size: 16, color: AppTheme.primary),
                          SizedBox(width: 8),
                          Text(
                            'Barcha gilamlar uchun 1 m² narxi:',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 42,
                              child: TextField(
                                controller: _globalUnitPriceCtrl,
                                keyboardType: TextInputType.number,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                decoration: InputDecoration(
                                  hintText: '12000',
                                  suffixText: "so'm / m²",
                                  suffixStyle: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  isDense: true,
                                  filled: true,
                                  fillColor: isDark ? AppTheme.darkSurfaceColor : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppTheme.borderColor)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppTheme.borderColor)),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
                                ),
                                onChanged: (val) {
                                  final p = parseMoney(val);
                                  if (p != null && p > 0) {
                                    _applyGlobalUnitPrice(p);
                                  }
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            height: 42,
                            child: FilledButton.icon(
                              onPressed: () {
                                final p = parseMoney(_globalUnitPriceCtrl.text);
                                if (p != null && p > 0) {
                                  _applyGlobalUnitPrice(p);
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                    content: Text('Barcha gilamlarga 1 m² = ${NumberFormat.decimalPattern('uz').format(p)} so\'mdan qo\'yildi'),
                                    backgroundColor: AppTheme.primary,
                                    behavior: SnackBarBehavior.floating,
                                    duration: const Duration(seconds: 2),
                                  ));
                                }
                              },
                              icon: const Icon(LucideIcons.check, size: 16),
                              label: const Text('Qo\'llash', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppTheme.primary,
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],

              const Divider(color: AppTheme.borderColor, height: 20),

              // Jami hisob kartasi (Umumiy soni, Umumiy kv metr, Umumiy narx)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkSurfaceAltColor : AppTheme.bg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.layers, size: 13, color: AppTheme.amber),
                              const SizedBox(width: 4),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text('${_calcTotalQuantity(o.items)} ta',
                                    style: const TextStyle(color: AppTheme.amber, fontWeight: FontWeight.w800, fontSize: 13)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text('Umumiy soni', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 28, color: AppTheme.borderColor),
                    Expanded(
                      flex: 3,
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.ruler, size: 13, color: AppTheme.blue),
                              const SizedBox(width: 4),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text('${_calcTotalArea(o.items).toStringAsFixed(2)} m²',
                                    style: const TextStyle(color: AppTheme.blue, fontWeight: FontWeight.w800, fontSize: 13)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text('Jami maydon', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 28, color: AppTheme.borderColor),
                    Expanded(
                      flex: 4,
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.wallet, size: 13, color: AppTheme.green),
                              const SizedBox(width: 4),
                              Flexible(
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    '${NumberFormat.decimalPattern('uz').format(_suggestedPrice(items: o.items))} so\'m',
                                    style: const TextStyle(color: AppTheme.green, fontWeight: FontWeight.w800, fontSize: 13),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text('Jami summa', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

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
              onChanged: (_) {
                if (!_suppressPriceListener) _priceManuallyEdited = true;
              },
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
            if (_hasItems)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _priceManuallyEdited = false;
                      _setPriceText(_suggestedPrice().toStringAsFixed(0));
                    });
                  },
                  child: Row(
                    children: [
                      const Icon(LucideIcons.sparkles, size: 13, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Avtomatik hisob: ${NumberFormat.decimalPattern('uz').format(_suggestedPrice())} so\'m',
                        style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 6),
                      const Text('(qo\'llash)', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
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
              Builder(builder: (ctx) {
                final hasItems = _checkHasItems(o);
                final allItemsReady = _checkAllItemsReady(o);
                final allItemsMeasured = _checkAllItemsMeasured(o);
                final canHandover = allItemsReady && allItemsMeasured;

                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: (_saving || !canHandover)
                            ? null
                            : () => _save(advance: true),
                        style: FilledButton.styleFrom(
                            backgroundColor:
                                canHandover ? AppTheme.blue : AppTheme.textMuted,
                            padding:
                                const EdgeInsets.symmetric(vertical: 15)),
                        icon: Icon(
                            canHandover
                                ? LucideIcons.arrowRight
                                : LucideIcons.lock,
                            size: 18),
                        label: Text(
                            canHandover
                                ? 'Tayyor - ${_nextStatus!.nameUz}ga yuborish'
                                : (!hasItems
                                    ? 'Avval gilam qo\'shing'
                                    : !allItemsReady
                                        ? 'Avval barcha gilamlarni "Tayyor" belgilang'
                                        : 'Avval har bir gilamning o\'lchovini kiriting'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                    if (!canHandover)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          !hasItems
                              ? "Buyurtmada birorta ham gilam kiritilmagan. Haydovchiga topshirishdan oldin gilamlarni qo'shing va o'lchovlarini kiriting."
                              : !allItemsReady
                                  ? "Haydovchiga topshirishdan oldin har bir gilamning \"Tayyor\" katagini belgilang."
                                  : "Har bir gilamning eni va bo'yi kiritilishi shart — aks holda narx 0 so'm bo'lib qoladi.",
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ),
                  ],
                );
              }),
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

  /// Gilam ustiga bosganda o'lcham, soni, kv metr va narx kiritish paneli
  void _showCarpetOptions(OrderItemInfo item) {
    final nameCtrl = TextEditingController(text: item.name.isEmpty ? 'Gilam' : item.name);
    final eniCtrl = TextEditingController(
      text: (_eniCtrl[item.id]?.text.isNotEmpty ?? false)
          ? _eniCtrl[item.id]!.text
          : (item.width > 0 ? item.width.toString() : ''),
    );
    final boyiCtrl = TextEditingController(
      text: (_boyiCtrl[item.id]?.text.isNotEmpty ?? false)
          ? _boyiCtrl[item.id]!.text
          : (item.length > 0 ? item.length.toString() : ''),
    );
    final quantityCtrl = TextEditingController(text: item.quantity.toString());

    final initialUnitP = _getItemUnitPrice(item);
    final unitPriceCtrl = TextEditingController(text: initialUnitP > 0 ? initialUnitP.toStringAsFixed(0) : '12000');

    final currentArea = _itemArea(item);
    final areaCtrl = TextEditingController(text: currentArea > 0 ? currentArea.toStringAsFixed(2) : '');

    final currentPrice = _getItemPrice(item);
    final priceCtrl = TextEditingController(text: currentPrice > 0 ? currentPrice.toStringAsFixed(0) : '');

    String selectedStage = item.status;
    final stages = _itemStages.isNotEmpty ? _itemStages : kDefaultItemStages;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bctx) => StatefulBuilder(
        builder: (context, setModalState) {
          void updateCalculations({bool fromArea = false}) {
            final eni = parseMoney(eniCtrl.text) ?? 0;
            final boyi = parseMoney(boyiCtrl.text) ?? 0;
            final qty = int.tryParse(quantityCtrl.text) ?? 1;
            final unitP = parseMoney(unitPriceCtrl.text) ?? 12000;

            if (fromArea) {
              final directArea = parseMoney(areaCtrl.text) ?? 0;
              if (unitP > 0 && directArea > 0) {
                final calcPrice = directArea * unitP;
                priceCtrl.text = calcPrice > 0 ? calcPrice.toStringAsFixed(0) : '';
              }
            } else {
              final calcArea = eni * boyi * qty;
              areaCtrl.text = calcArea > 0 ? calcArea.toStringAsFixed(2) : '';
              if (unitP > 0 && calcArea > 0) {
                final calcPrice = calcArea * unitP;
                priceCtrl.text = calcPrice > 0 ? calcPrice.toStringAsFixed(0) : '';
              }
            }
            setModalState(() {});
          }

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(bctx).viewInsets.bottom,
            ),
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Gilam nomi
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Gilam nomi',
                        prefixIcon: Icon(LucideIcons.tag, size: 18),
                      ),
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    const SizedBox(height: 14),

                    // Eni, Bo'yi, Soni
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: eniCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Eni (m)',
                              prefixIcon: Icon(LucideIcons.moveHorizontal, size: 16),
                            ),
                            style: const TextStyle(fontSize: 14),
                            onChanged: (_) => updateCalculations(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: boyiCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: "Bo'yi (m)",
                              prefixIcon: Icon(LucideIcons.moveVertical, size: 16),
                            ),
                            style: const TextStyle(fontSize: 14),
                            onChanged: (_) => updateCalculations(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: quantityCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Soni',
                              prefixIcon: Icon(LucideIcons.hash, size: 16),
                            ),
                            style: const TextStyle(fontSize: 14),
                            onChanged: (_) => updateCalculations(),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // 1 m² narxi va Maydoni (2 ta ustun - bemalol sig'adi)
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: areaCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Maydoni (m²)',
                              prefixIcon: Icon(LucideIcons.ruler, size: 16),
                              hintText: '0.00',
                            ),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.blue),
                            onChanged: (_) => updateCalculations(fromArea: true),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: unitPriceCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: '1 m² narxi',
                              prefixIcon: Icon(LucideIcons.tag, size: 16),
                              suffixText: "so'm",
                            ),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                            onChanged: (_) {
                              final u = parseMoney(unitPriceCtrl.text) ?? 0;
                              final a = parseMoney(areaCtrl.text) ?? 0;
                              if (u > 0 && a > 0) {
                                priceCtrl.text = (a * u).round().toString();
                              }
                              setModalState(() {});
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Jami narx (keng qatorda, bemalol sig'adigan qilib)
                    TextField(
                      controller: priceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Jami hisoblangan narx',
                        prefixIcon: Icon(LucideIcons.wallet, size: 18, color: AppTheme.green),
                        suffixText: "so'm",
                        suffixStyle: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.green),
                      ),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.green),
                      onChanged: (_) {
                        final p = parseMoney(priceCtrl.text) ?? 0;
                        final a = parseMoney(areaCtrl.text) ?? 0;
                        if (p > 0 && a > 0) {
                          unitPriceCtrl.text = (p / a).round().toString();
                        }
                        setModalState(() {});
                      },
                    ),
                    const SizedBox(height: 16),

                    // Gilam statusi / jarayoni
                    const Text('Gilam holati (jarayoni):',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimary)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: stages.map((stage) {
                        final isSel = selectedStage == stage.key;
                        final color = AppTheme.hex(stage.colorCode);
                        return ChoiceChip(
                          label: Text(stage.nameUz),
                          selected: isSel,
                          selectedColor: color.withOpacity(0.2),
                          backgroundColor: color.withOpacity(0.06),
                          labelStyle: TextStyle(
                            color: isSel ? color : AppTheme.textPrimary,
                            fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 12,
                          ),
                          side: BorderSide(
                            color: isSel ? color : color.withOpacity(0.25),
                            width: isSel ? 1.5 : 1,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          onSelected: (val) {
                            if (val) {
                              setModalState(() => selectedStage = stage.key);
                            }
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    // Tugmalar
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.pop(bctx);
                              _deleteItem(item);
                            },
                            icon: const Icon(LucideIcons.trash2, size: 16),
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
                              final name = nameCtrl.text.trim();
                              final eni = parseMoney(eniCtrl.text) ?? 0;
                              final boyi = parseMoney(boyiCtrl.text) ?? 0;
                              final qty = int.tryParse(quantityCtrl.text) ?? 1;
                              final price = parseMoney(priceCtrl.text);

                              _eniCtrl[item.id]?.text = eniCtrl.text;
                              _boyiCtrl[item.id]?.text = boyiCtrl.text;
                              _unitPriceCtrl[item.id]?.text = unitPriceCtrl.text;

                              Navigator.pop(bctx);

                              setState(() => _saving = true);
                              try {
                                await context.read<OrdersCubit>().updateOrderItem(
                                  _currentOrder,
                                  item,
                                  name: name.isNotEmpty ? name : item.name,
                                  length: boyi,
                                  width: eni,
                                  quantity: qty,
                                  price: price,
                                  status: selectedStage,
                                );
                                _refreshSuggestedPriceIfNotEdited();
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                                    content: Text('Gilam ma\'lumotlari va narxi saqlandi'),
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
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    ).whenComplete(() {
      try {
        nameCtrl.dispose();
        eniCtrl.dispose();
        boyiCtrl.dispose();
        quantityCtrl.dispose();
        unitPriceCtrl.dispose();
        areaCtrl.dispose();
        priceCtrl.dispose();
      } catch (_) {}
    });
  }

  /// Tezkor status almashtirish modali
  /// Tezkor status almashtirish modali
  void _showQuickStatusPicker(OrderItemInfo item, Order order) {
    final stages = _itemStages.isNotEmpty ? _itemStages : kDefaultItemStages;
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (bctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.layers, size: 18, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name.isEmpty ? "Gilam" : item.name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                        Text(
                          'Hozirgi holati: ${_itemStatusInfo(item.status).label}',
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Text(
                'Gilam holatini o\'zgartirish:',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 10),
              ...stages.map((stage) {
                final isCurrent = item.status == stage.key;
                final color = AppTheme.hex(stage.colorCode);
                IconData stageIcon = LucideIcons.circleDot;
                if (stage.key == 'ACCEPTED') stageIcon = LucideIcons.inbox;
                if (stage.key == 'WASHED') stageIcon = LucideIcons.droplets;
                if (stage.key == 'DRIED') stageIcon = LucideIcons.sun;
                if (stage.key == 'READY') stageIcon = LucideIcons.checkCircle2;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    onTap: () async {
                      Navigator.pop(bctx);
                      if (isCurrent) return;
                      setState(() => _saving = true);
                      try {
                        await context.read<OrdersCubit>().changeOrderItemStatus(order, item, stage.key);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Row(
                              children: [
                                Icon(stageIcon, color: Colors.white, size: 16),
                                const SizedBox(width: 8),
                                Text('"${item.name.isEmpty ? "Gilam" : item.name}" -> ${stage.nameUz}'),
                              ],
                            ),
                            backgroundColor: color,
                            behavior: SnackBarBehavior.floating,
                            duration: const Duration(seconds: 2),
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
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isCurrent ? color.withOpacity(0.15) : (Theme.of(context).brightness == Brightness.dark ? AppTheme.darkSurfaceAltColor : AppTheme.bg),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isCurrent ? color : AppTheme.borderColor, width: isCurrent ? 2 : 1),
                      ),
                      child: Row(
                        children: [
                          Icon(stageIcon, size: 18, color: color),
                          const SizedBox(width: 12),
                          Text(
                            stage.nameUz,
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: isCurrent ? color : AppTheme.textPrimary),
                          ),
                          const Spacer(),
                          if (isCurrent)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
                              child: const Text('Hozirgi', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 6),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    Navigator.pop(bctx);
                    _showCarpetOptions(item);
                  },
                  icon: const Icon(LucideIcons.pencil, size: 15),
                  label: const Text('O\'lchov va narxni to\'liq tahrirlash'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Gilam qatori — aktiv buyurtmada o'lcham maydonlari bilan,
  /// tarixda faqat ma'lumot (read-only).
  Widget _measureRow(int i, OrderItemInfo item, Order order) {
    final eni = parseMoney(_eniCtrl[item.id]?.text) ?? item.width;
    final boyi = parseMoney(_boyiCtrl[item.id]?.text) ?? item.length;
    final currentArea = _itemArea(item);
    final unitPrice = _getItemUnitPrice(item);
    final itemPrice = _getItemPrice(item);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelected = _selectedItemIds.contains(item.id);
    final statusInfo = _itemStatusInfo(item.status);
    final moneyFmt = NumberFormat.decimalPattern('uz');

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isSelected
            ? AppTheme.primary.withOpacity(0.06)
            : (isDark ? AppTheme.darkSurfaceColor : Colors.white),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? AppTheme.primary : AppTheme.borderColor,
          width: isSelected ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1-qator: [Checkbox] + [Gilam nomi] + [Status chip ▼] + [⋮ (menu)]
          Row(
            children: [
              if (!_isCompleted)
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: isSelected,
                    activeColor: AppTheme.primary,
                    onChanged: (val) {
                      setState(() {
                        if (val == true) {
                          _selectedItemIds.add(item.id);
                        } else {
                          _selectedItemIds.remove(item.id);
                        }
                      });
                    },
                  ),
                ),
              if (!_isCompleted) const SizedBox(width: 6),
              // Gilam raqami va nomi
              Expanded(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '#${i + 1}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.primary),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        (item.name.trim().isNotEmpty && item.name != 'Gilam')
                            ? item.name
                            : '${i + 1}-gilam',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                          color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    if (item.quantity > 1) ...[
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: AppTheme.amber.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${item.quantity} dona',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.amber),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 6),
              // Status Badge (bosganda status tanlash)
              InkWell(
                onTap: _isCompleted ? null : () => _showQuickStatusPicker(item, order),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusInfo.color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: statusInfo.color.withOpacity(0.6), width: 1.2),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(color: statusInfo.color, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        statusInfo.label,
                        style: TextStyle(
                          color: statusInfo.color,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (!_isCompleted) ...[
                        const SizedBox(width: 4),
                        Icon(LucideIcons.chevronDown, size: 12, color: statusInfo.color),
                      ],
                    ],
                  ),
                ),
              ),
              if (!_isCompleted) ...[
                const SizedBox(width: 2),
                PopupMenuButton<String>(
                  icon: const Icon(LucideIcons.moreVertical, size: 18, color: AppTheme.textMuted),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  tooltip: 'Amallar',
                  onSelected: (val) {
                    if (val == 'edit') _showCarpetOptions(item);
                    if (val == 'delete') _deleteItem(item);
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(LucideIcons.pencil, size: 15, color: AppTheme.primary),
                          SizedBox(width: 8),
                          Text('Tahrirlash', style: TextStyle(fontSize: 13)),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(LucideIcons.trash2, size: 15, color: AppTheme.dangerColor),
                          SizedBox(width: 8),
                          Text('O\'chirish', style: TextStyle(fontSize: 13, color: AppTheme.dangerColor)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: AppTheme.borderColor),
          const SizedBox(height: 8),

          // 2-qator: Eni x Bo'yi = Maydon
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Eni (m)', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 3),
                    if (_isCompleted)
                      Text(eni > 0 ? eni.toStringAsFixed(1) : '—', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13))
                    else
                      _numField(_eniCtrl[item.id]!, hint: 'Eni'),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                child: Text('×', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textMuted, fontSize: 16)),
              ),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Bo'yi (m)", style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 3),
                    if (_isCompleted)
                      Text(boyi > 0 ? boyi.toStringAsFixed(1) : '—', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13))
                    else
                      _numField(_boyiCtrl[item.id]!, hint: "Bo'yi"),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 3,
                child: Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.blue.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.blue.withOpacity(0.25)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Text('Maydoni', style: TextStyle(fontSize: 9, color: AppTheme.blue, fontWeight: FontWeight.w600)),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          currentArea > 0 ? '${currentArea.toStringAsFixed(2)} m²' : '0.00 m²',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppTheme.blue),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // 3-qator: 1 m² narxi va Hisoblangan Jami Narx
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkSurfaceAltColor : AppTheme.bg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.borderColor.withOpacity(0.6)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.tag, size: 13, color: AppTheme.primary),
                const SizedBox(width: 6),
                const Text('1 m² narxi:', style: TextStyle(fontSize: 11.5, color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                const SizedBox(width: 6),
                if (_isCompleted)
                  Text('${moneyFmt.format(unitPrice)} so\'m', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))
                else
                  SizedBox(
                    width: 85,
                    height: 32,
                    child: TextField(
                      controller: _unitPriceCtrl[item.id],
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
                      ),
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        hintText: '12000',
                        isDense: true,
                        filled: true,
                        fillColor: isDark ? AppTheme.darkSurfaceColor : Colors.white,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: AppTheme.borderColor)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: AppTheme.borderColor)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
                      ),
                      onChanged: (_) {
                        setState(() {});
                        _refreshSuggestedPriceIfNotEdited();
                      },
                    ),
                  ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Jami summa', style: TextStyle(fontSize: 9, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        itemPrice > 0 ? '${moneyFmt.format(itemPrice)} so\'m' : '0 so\'m',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: AppTheme.green),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _numField(TextEditingController c, {String? hint}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: 36,
      child: TextField(
        controller: c,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textAlign: TextAlign.center,
        onChanged: (_) => setState(() => _refreshSuggestedPriceIfNotEdited()),
        style: TextStyle(
            fontSize: 13.5,
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
            fontWeight: FontWeight.w700),
        decoration: InputDecoration(
          hintText: hint ?? '0.0',
          contentPadding:
              const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
          fillColor: isDark ? AppTheme.darkSurfaceColor : Colors.white,
          filled: true,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppTheme.borderColor),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppTheme.borderColor),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
          ),
        ),
      ),
    );
  }
}
