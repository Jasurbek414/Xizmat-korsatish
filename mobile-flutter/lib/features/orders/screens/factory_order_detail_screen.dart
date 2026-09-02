import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
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
  // Har bir gilamning O'ZIGA XOS narxi (modalda kiritiladi) - order-level
  // _priceController bilan ARALASHTIRMASLIK kerak (u butun buyurtma narxi).
  final Map<String, TextEditingController> _priceCtrl = {};
  bool _saving = false;
  bool _addingItem = false;

  // Bir nechta gilamni birga belgilab, holatini BIRGALIKDA o'zgartirish
  // uchun (foydalanuvchi so'rovi bo'yicha qo'shildi) - har birini alohida
  // ochib o'zgartirish o'rniga.
  final Set<String> _selectedItemIds = {};

  void _toggleItemSelected(String id) {
    setState(() {
      if (_selectedItemIds.contains(id)) {
        _selectedItemIds.remove(id);
      } else {
        _selectedItemIds.add(id);
      }
    });
  }

  /// Narx maydoniga foydalanuvchi o'zi qo'lda yozganmi (aks holda avtomatik
  /// hisoblangan taklif ko'rsatiladi va _save() da alohida yuborilmaydi -
  /// backend OrderItemController.recalculatePrice orqali o'lchovlardan
  /// narxni o'zi hisoblab qo'yadi).
  bool _priceManuallyEdited = false;
  bool _suppressPriceListener = false;

  void _setPriceText(String text) {
    _suppressPriceListener = true;
    _priceController.text = text;
    _suppressPriceListener = false;
  }

  /// Backend'dagi OrderItemController.recalculatePrice bilan BIR XIL qoida:
  /// xizmat o'lchov birligi "m²"/"kv..." bo'lsa maydon (eni×bo'yi×soni)
  /// bo'yicha, aks holda faqat soni bo'yicha hisoblanadi.
  ///
  /// MUHIM: `items` chaqiruvchidan ANIQ parametr sifatida olinadi -
  /// `widget.order.items` (ekran birinchi ochilgandagi qotib qolgan
  /// ro'yxat) EMAS, chunki shu ekranda gilam qo'shish/o'chirish davomida
  /// buyurtma narxi shu funksiya orqali qayta hisoblanishi kerak.
  double _suggestedPrice(List<OrderItemInfo> items) {
    if (items.isEmpty) return 0;
    final unit = widget.order.measurementUnit.toLowerCase().replaceAll('.', '');
    final isAreaBased = unit == 'm²' || unit.contains('kv');
    double total = 0;
    for (final item in items) {
      // Gilamga modalda ALOHIDA narx qo'yilgan bo'lsa - AYNAN o'sha
      // ishlatiladi (backend recalculatePrice bilan bir xil qoida).
      final manualPrice = double.tryParse(_priceCtrl[item.id]?.text ?? '') ?? item.price;
      if (manualPrice != null && manualPrice > 0) {
        total += manualPrice;
        continue;
      }
      final eni = double.tryParse(_eniCtrl[item.id]?.text ?? '') ?? item.width;
      final boyi = double.tryParse(_boyiCtrl[item.id]?.text ?? '') ?? item.length;
      final basis = isAreaBased ? (eni * boyi * item.quantity) : item.quantity.toDouble();
      total += basis * widget.order.servicePrice;
    }
    return total;
  }

  /// O'lcham/gilam ro'yxati o'zgarganda - agar inson narxni qo'lda
  /// tahrirlamagan bo'lsa - taklif etilgan narxni maydonga yozib qo'yadi.
  void _refreshSuggestedPriceIfNotEdited(List<OrderItemInfo> items) {
    if (_priceManuallyEdited || items.isEmpty) return;
    _setPriceText(_suggestedPrice(items).toStringAsFixed(0));
  }

  /// Tarix (o'tgan) buyurtma ekanligini tekshiradi — to'lov qilingan
  /// buyurtmalar tahrirlanmasligi kerak.
  ///
  /// MUHIM (jonli xato, tuzatildi): avval "oxirgi statusga yetgan"
  /// shartini HAM (to'lovdan mustaqil) tekshirardi - sex xodimi "Tayyor -
  /// ...ga yuborish" tugmasini bosgan ZAHOTI (bu haydovchiga TOPSHIRISH
  /// signali, to'lov hali PENDING) shu ekranning o'zi darhol "Yakunlangan"
  /// (read-only) holatiga o'tib qolar edi - garchi buyurtma aslida ENDIGINA
  /// haydovchiga o'tayotgan bo'lsa ham. Bu "sex hodimining o'zida tugab
  /// qolyapti, haydovchiga o'tmayapti" degan taassurotni berardi. Endi
  /// OrderZoneBoundary.isCompleted() bilan BIR XIL - FAQAT to'lov qabul
  /// qilinganda tugagan hisoblanadi.
  bool get _isCompleted =>
      OrderZoneBoundary.fromStatuses(widget.statuses).isCompleted(widget.order);

  @override
  void initState() {
    super.initState();
    if (!_isCompleted) _initControllers();
  }

  void _initControllers() {
    for (final item in widget.order.items) {
      _eniCtrl[item.id] = TextEditingController(text: item.width > 0 ? item.width.toString() : '');
      _boyiCtrl[item.id] = TextEditingController(text: item.length > 0 ? item.length.toString() : '');
      _priceCtrl[item.id] = TextEditingController(
          text: item.price != null && item.price! > 0 ? item.price!.toStringAsFixed(0) : '');
    }
    final suggested = _suggestedPrice(widget.order.items);
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
    for (final c in _eniCtrl.values) {
      c.dispose();
    }
    for (final c in _boyiCtrl.values) {
      c.dispose();
    }
    for (final c in _priceCtrl.values) {
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
  ///
  /// MUHIM (audit'da topilgan xato, tuzatildi): avval `items.isEmpty ||` sharti
  /// bor edi - ya'ni gilamlar ro'yxati BO'SH bo'lsa ham "hammasi tayyor"
  /// hisoblanardi. Natijada sex xodimi bitta ham gilam kiritmasdan, o'lchov
  /// olmasdan va narx belgilamasdan buyurtmani haydovchiga qaytarib yuborishi
  /// mumkin edi - "Avval barcha gilamlarni Tayyor belgilang" himoyasi aynan
  /// eng muhim holatda (hech narsa kiritilmaganda) ishlamasdi. Endi kamida
  /// bitta gilam kiritilgan bo'lishi SHART.
  // MUHIM (jonli xato: gilamlarni "Tayyor" belgilagandan keyin ham
  // "...ga yuborish" tugmasi ochilmasdi): avval `widget.order.items` -
  // ekran birinchi ochilgandagi QOTIB QOLGAN (static) ro'yxatdan
  // o'qirdi. Gilam holatini modalda o'zgartirish cubit orqali darhol
  // backend'ga yozilib, ekran _buildBody(o, ...) REAKTIV `o` bilan
  // qayta chizilsa ham, shu ikki funksiya hamon ESKI ro'yxatni tekshirib,
  // tugma doim "band" ko'rinardi. Endi chaqiruvchi (_buildBody) reaktiv
  // `o.items`ni ANIQ parametr sifatida beradi.
  bool _hasItemsOf(List<OrderItemInfo> items) => items.isNotEmpty;

  bool _allItemsReadyOf(List<OrderItemInfo> items) =>
      items.isNotEmpty && items.every((i) => i.status == 'READY');

  /// Sex ishi tugagach buyurtma o'tkaziladigan status - haydovchi yana
  /// ko'radigan "yetkazish" zonasining birinchi statusi. Bitta bosishda
  /// (oraliq sex statuslarini sakrab o'tib) shu yerga o'tkaziladi -
  /// batafsil izoh uchun OrderZoneBoundary.handoverStatus'ga qarang.
  OrderStatusInfo? get _nextStatus =>
      OrderZoneBoundary.fromStatuses(widget.statuses).handoverStatus(widget.statuses);

  /// MUHIM: `items` chaqiruvchidan (_buildBody, REAKTIV `o.items`) ANIQ
  /// beriladi - `widget.order.items` (ekran ochilgandagi qotib qolgan
  /// ro'yxat) emas. Aks holda shu ekranda YANGI qo'shilgan gilamning
  /// o'lchovi/narxi "Saqlash" bosilganda umuman backend'ga yuborilmasdi.
  Future<void> _save(List<OrderItemInfo> items, {bool advance = false}) async {
    setState(() => _saving = true);
    try {
      // Save measurements + har bir gilamning o'ziga xos narxi (agar
      // modalda kiritilgan bo'lsa - _showCarpetOptions() ga q.)
      for (final item in items) {
        final eni = double.tryParse(_eniCtrl[item.id]?.text ?? '') ?? 0;
        final boyi = double.tryParse(_boyiCtrl[item.id]?.text ?? '') ?? 0;
        final itemPrice = double.tryParse(_priceCtrl[item.id]?.text ?? '');
        final hasMeasurement = eni > 0 || boyi > 0;
        final hasPrice = itemPrice != null && itemPrice > 0;
        if (hasMeasurement || hasPrice) {
          await _repo.updateOrderItem(
            widget.order.id, item.id,
            length: hasMeasurement ? boyi : null,
            width: hasMeasurement ? eni : null,
            price: hasPrice ? itemPrice : null,
          );
        }
      }
      // Save price + note. Agar inson narxni qo'lda o'zgartirmagan bo'lsa,
      // taklif etilgan (avtomatik hisoblangan) narx yuboriladi - shu bilan
      // eski/tahrirlanmagan matn qiymati backend hisoblagan narxni ustidan
      // yozib qo'yishining oldi olinadi. Backend ham xuddi shu formula
      // bo'yicha mustaqil qayta hisoblaydi (OrderItemController.recalculatePrice).
      final typedPrice = double.tryParse(
              _priceController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ??
          0;
      // MUHIM (audit'da topilgan, jiddiy xato): avval o'lchov hali
      // kiritilmagan (haydovchi 0×0 bilan qo'shgan) gilamda _suggestedPrice()
      // 0 qaytarardi-yu, shu 0 TO'G'RIDAN-TO'G'RI yuborilardi - garchi
      // maydonda haqiqiy eski narx ko'rinib turgan bo'lsa ham (_initControllers
      // dagi zaxira yo'l orqali). Natijada "Saqlash" bosilishi bilan (hali
      // o'lchov kiritmasdan) buyurtma narxi jimgina 0'ga tushib qolardi.
      // Endi _initControllers bilan BIR XIL qoida: taklif faqat musbat
      // bo'lsagina ishlatiladi, aks holda maydonda ko'rinib turgan
      // (haqiqiy) qiymat yuboriladi.
      final suggested = _suggestedPrice(items);
      final priceToSend = (items.isNotEmpty && !_priceManuallyEdited && suggested > 0)
          ? suggested
          : typedPrice;
      await _repo.updateOrderPrice(widget.order.id, priceToSend,
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
                        : AppTheme.textSecondaryOf(context))),
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
      _itemStatuses[status] ?? _ItemStatusInfo(status, AppTheme.textMutedOf(context));

  /// Gilam bosqichlari ketma-ketligi (yuqoridagi xarita tartibida).
  static final List<String> _itemStatusOrder = _itemStatuses.keys.toList();

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
    final fromIdx = _itemStatusOrder.indexOf(from);
    final toIdx = _itemStatusOrder.indexOf(to);
    if (fromIdx == -1 || toIdx == -1) return true; // noma'lum status - cheklamaymiz
    return (toIdx - fromIdx).abs() == 1;
  }

  /// Tanlangan gilamlarning HAMMASI uchun bitta bosqichga o'tishni bir
  /// yo'la qo'llaydi - har biri o'z hozirgi bosqichidan (_canMoveItemTo
  /// bilan BIR XIL qoida: faqat bitta qadam) o'tishi mumkin bo'lganlarigina
  /// yangilanadi, mos kelmaganlari o'tkazib yuboriladi va buni xabar orqali
  /// bildiramiz - shunda foydalanuvchi nima uchun ba'zilari o'zgarmaganini
  /// tushunadi.
  Future<void> _bulkChangeStatus(List<OrderItemInfo> items, String targetStatus) async {
    final selected = items.where((i) => _selectedItemIds.contains(i.id)).toList();
    final eligible = selected.where((i) => _canMoveItemTo(i.status, targetStatus)).toList();
    final skipped = selected.length - eligible.length;

    if (eligible.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text("Tanlangan gilamlar uchun bu bosqichga o'tish mumkin emas"),
        backgroundColor: AppTheme.dangerColor,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }

    setState(() => _saving = true);
    try {
      for (final item in eligible) {
        await context.read<OrdersCubit>().changeOrderItemStatus(widget.order, item, targetStatus);
      }
      if (mounted) {
        final info = _itemStatusInfo(targetStatus);
        setState(() => _selectedItemIds.clear());
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(skipped > 0
              ? '${eligible.length} ta gilam "${info.label}" holatiga o\'tkazildi, $skipped tasi o\'tkazib yuborildi (bosqich mos kelmadi)'
              : '${eligible.length} ta gilam "${info.label}" holatiga o\'tkazildi'),
          backgroundColor: info.color,
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
            child: Text('Bekor', style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondaryOf(context))),
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
    // MUHIM (jonli xato: "Tayyor" belgilangandan keyin ham haydovchiga
    // yuborish tugmasi ochilmasdi): avval AppBar'dagi saqlash tugmasi
    // BlocBuilder DOIRASIDAN TASHQARIDA edi va shu sabab har doim
    // `widget.order` (ekran ochilgandagi qotib qolgan nusxa) bilan
    // ishlardi. Endi butun build() bitta joyda `context.watch` orqali
    // REAKTIV holatni o'qiydi - AppBar ham, tana (body) ham BIR XIL
    // yangilangan `o`dan foydalanadi.
    final cubitState = context.watch<OrdersCubit>().state;
    Order liveOrder = widget.order;
    if (cubitState is OrdersLoaded) {
      for (final ord in cubitState.orders) {
        if (ord.id == widget.order.id) { liveOrder = ord; break; }
      }
    }
    // Ensure controllers exist for all items (faqat aktiv buyurtma uchun)
    if (!_isCompleted) {
      for (final item in liveOrder.items) {
        _eniCtrl.putIfAbsent(item.id, () => TextEditingController(text: item.width > 0 ? item.width.toString() : ''));
        _boyiCtrl.putIfAbsent(item.id, () => TextEditingController(text: item.length > 0 ? item.length.toString() : ''));
        _priceCtrl.putIfAbsent(item.id, () => TextEditingController(
            text: item.price != null && item.price! > 0 ? item.price!.toStringAsFixed(0) : ''));
      }
      // Remove controllers for deleted items
      _eniCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
      _boyiCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
      _priceCtrl.removeWhere((k, _) => !liveOrder.items.any((i) => i.id == k));
      _selectedItemIds.removeWhere((id) => !liveOrder.items.any((i) => i.id == id));
    }
    final o = liveOrder;
    final statusColor = AppTheme.hex(o.status?.colorCode ?? '#16A34A');

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
                onPressed: _saving ? null : () => _save(o.items),
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
      body: _buildBody(o, statusColor),
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
          // MUHIM (jonli xato: "mas'ul hodim noto'g'ri ko'rsatilyapti"):
          // avval bu yerda umumiy `workerName` "Haydovchi" deb yorliqlanib
          // ko'rsatilardi - lekin worker aslida sex hodimining O'ZI bo'lib
          // qolishi mumkin edi (masalan sex hodimi buyurtmani to'g'ridan
          // to'g'ri o'ziga qabul qilsa), natijada sex hodimi o'z ismini
          // "Haydovchi" deb ko'rar edi. Endi aniq `driverName` ishlatiladi.
          if (o.driverName != null && o.driverName!.isNotEmpty) ...[
            DetailPanel(
                child: Row(children: [
              Icon(LucideIcons.user,
                  size: 18, color: AppTheme.textMutedOf(context)),
              const SizedBox(width: 10),
              Expanded(
                  child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                    Text('Haydovchi',
                        style: TextStyle(
                            color: AppTheme.textMutedOf(context),
                            fontSize: 11)),
                    Text(o.driverName!,
                        style: TextStyle(
                            color: AppTheme.textPrimaryOf(context),
                            fontWeight: FontWeight.w700,
                            fontSize: 14)),
                  ])),
            ])),
            const SizedBox(height: 12),
          ],

          // MUHIM (jonli so'rov: "buyurtma aniq qachon kelgani
          // ko'rsatilmayapti"): ro'yxatda faqat nisbiy vaqt ("42 daq
          // oldin") bor edi - tafsilotda aniq sana/soat ko'rsatiladi.
          DetailPanel(
              child: Row(children: [
            Icon(LucideIcons.clock,
                size: 18, color: AppTheme.textMutedOf(context)),
            const SizedBox(width: 10),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('Sexga kelgan vaqti',
                      style: TextStyle(
                          color: AppTheme.textMutedOf(context),
                          fontSize: 11)),
                  Text(
                      DateFormat('dd.MM.yyyy, HH:mm')
                          .format(o.workshopArrivalTime),
                      style: TextStyle(
                          color: AppTheme.textPrimaryOf(context),
                          fontWeight: FontWeight.w700,
                          fontSize: 14)),
                ])),
          ])),
          const SizedBox(height: 12),

          // Order description
          if (o.description.isNotEmpty) ...[
            DetailPanel(
                child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                  Text('Izoh',
                      style: TextStyle(
                          color: AppTheme.textMutedOf(context),
                          fontSize: 11)),
                  const SizedBox(height: 3),
                  Text(o.description,
                      style: TextStyle(
                          color: AppTheme.textPrimaryOf(context),
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
                      : AppTheme.bgOf(context),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  Expanded(
                      flex: 3,
                      child: Text('Gilam',
                          style: TextStyle(
                              color: AppTheme.textMutedOf(context),
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                  Expanded(
                      flex: 2,
                      child: Text('Eni',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: AppTheme.textMutedOf(context),
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                  Expanded(
                      flex: 2,
                      child: Text("Bo'yi",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: AppTheme.textMutedOf(context),
                              fontSize: 10,
                              fontWeight: FontWeight.w600))),
                  Expanded(
                      flex: 2,
                      child: Text('Kv.m',
                          textAlign: TextAlign.right,
                          style: TextStyle(
                              color: AppTheme.textMutedOf(context),
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
                              : AppTheme.textMutedOf(context)),
                      const SizedBox(height: 8),
                      Text("Gilamlar kiritilmagan",
                          style: TextStyle(
                              color: isDark
                                  ? AppTheme.darkTextSecondaryColor
                                  : AppTheme.textSecondaryOf(context),
                              fontSize: 12)),
                    ]),
                  ),
                )
              else
                ...o.items.asMap().entries.map(
                    (e) => _measureRow(e.key, e.value, o.items)),

              if (!_isCompleted && _selectedItemIds.isNotEmpty) ...[
                const SizedBox(height: 8),
                _bulkStatusBar(o.items),
              ],

              Divider(
                  color: AppTheme.borderOf(context), height: 24),

              // Total row
              Row(children: [
                Expanded(
                    child: Text('Jami',
                        style: TextStyle(
                            color: AppTheme.textPrimaryOf(context),
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
                Text('Qo\'shimcha izoh',
                    style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 11)),
                const SizedBox(height: 4),
                Text(widget.order.description,
                    style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 13)),
              ]),
            )
          else if (!_isCompleted) ...[            
            Text("Qo'shimcha izoh",
                style: TextStyle(
                    color: AppTheme.textPrimaryOf(context),
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
                Icon(LucideIcons.wallet, size: 18, color: AppTheme.textMutedOf(context)),
                const SizedBox(width: 8),
                Text('Narx: ', style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 12)),
                Text('${NumberFormat.decimalPattern('uz').format(widget.order.price)} so\'m',
                    style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w800, fontSize: 15)),
              ]),
            )
          else ...[            
            Text('Narx (so\'m)',
                style: TextStyle(
                    color: AppTheme.textPrimaryOf(context),
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
            if (_hasItemsOf(o.items) && !_priceManuallyEdited)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'Avtomatik hisoblangan: ${NumberFormat.decimalPattern('uz').format(_suggestedPrice(o.items))} so\'m (o\'lchov asosida)',
                  style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 11),
                ),
              ),
          ],
          const SizedBox(height: 24),

          // Action buttons (tarixda yashirin)
          if (!_isCompleted) ...[
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saving ? null : () => _save(o.items),
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
                  onPressed: (_saving || !_allItemsReadyOf(o.items))
                      ? null
                      : () => _save(o.items, advance: true),
                  style: FilledButton.styleFrom(
                      backgroundColor:
                          _allItemsReadyOf(o.items) ? AppTheme.blue : AppTheme.textMutedOf(context),
                      padding:
                          const EdgeInsets.symmetric(vertical: 15)),
                  icon: Icon(
                      _allItemsReadyOf(o.items)
                          ? LucideIcons.arrowRight
                          : LucideIcons.lock,
                      size: 18),
                  label: Text(
                      _allItemsReadyOf(o.items)
                          ? 'Tayyor - ${_nextStatus!.nameUz}ga yuborish'
                          : (!_hasItemsOf(o.items)
                              ? 'Avval gilam qo\'shing'
                              : 'Avval barcha gilamlarni "Tayyor" belgilang'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700)),
                ),
              ),
              if (!_allItemsReadyOf(o.items))
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    !_hasItemsOf(o.items)
                        ? "Buyurtmada birorta ham gilam kiritilmagan. Haydovchiga topshirishdan oldin gilamlarni qo'shing va o'lchovlarini kiriting."
                        : "Haydovchiga topshirishdan oldin har bir gilamning \"Tayyor\" katagini belgilang.",
                    style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 11),
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
  void _showCarpetOptions(OrderItemInfo item, List<OrderItemInfo> items) {
    final eniCtrl = TextEditingController(text: _eniCtrl[item.id]?.text ?? '');
    final boyiCtrl = TextEditingController(text: _boyiCtrl[item.id]?.text ?? '');
    // MUHIM (jonli xato: har bir gilamga alohida narx berilganda butun
    // buyurtma narxining ustidan yozib yuborardi): bu maydon endi SHU
    // GILAMNING o'ziga xos narxi - widget.order.price (butun buyurtma
    // narxi) EMAS. _priceCtrl[item.id] - shu ekran uchun umumiy holat.
    final priceCtrl = TextEditingController(text: _priceCtrl[item.id]?.text ?? '');
    // Foydalanuvchi so'rovi bo'yicha qo'shildi: 1 m² narxini kiritsa,
    // eni x bo'yi x shu narx - jami narx AVTOMATIK hisoblanib "Narx"
    // maydoniga yoziladi (masalan eni=3, bo'yi=4, 1 m²=12000 -> 144 000).
    // Faqat hisoblash uchun yordamchi maydon - bazaga alohida saqlanmaydi.
    final perUnitPriceCtrl = TextEditingController();
    void recalcTotalFromUnitPrice() {
      final eni = double.tryParse(eniCtrl.text) ?? 0;
      final boyi = double.tryParse(boyiCtrl.text) ?? 0;
      final perUnit = double.tryParse(perUnitPriceCtrl.text) ?? 0;
      if (eni > 0 && boyi > 0 && perUnit > 0) {
        priceCtrl.text = (eni * boyi * perUnit).toStringAsFixed(0);
      }
    }

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
                  decoration: BoxDecoration(color: AppTheme.borderOf(context), borderRadius: BorderRadius.circular(2)),
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
                          style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 12)),
                    ]),
                  ),
                ]),
                const SizedBox(height: 20),
                // O'lchamlar
                Text("O'lchamlar",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimaryOf(context))),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: eniCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      onChanged: (_) => recalcTotalFromUnitPrice(),
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
                      onChanged: (_) => recalcTotalFromUnitPrice(),
                      decoration: const InputDecoration(
                        labelText: "Bo'yi (m)",
                        prefixIcon: Icon(LucideIcons.moveVertical, size: 18),
                      ),
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),
                // 1 m² narxi - kiritilsa eni x bo'yi x shu narx = jami
                // narx avtomatik hisoblanib pastdagi "Narx" maydoniga yoziladi.
                Text("1 m² narxi (so'm)",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimaryOf(context))),
                const SizedBox(height: 4),
                Text(
                  "Kiritilsa: eni x bo'yi x shu narx = jami narx avtomatik hisoblanadi",
                  style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 11),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: perUnitPriceCtrl,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => recalcTotalFromUnitPrice(),
                  decoration: const InputDecoration(
                    hintText: 'Masalan: 12000',
                    prefixIcon: Icon(LucideIcons.ruler, size: 18),
                    suffixText: "so'm/m²",
                  ),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                // Narx - shu GILAMNING o'ziga xos narxi
                Text("Shu gilamning narxi (so'm)",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimaryOf(context))),
                const SizedBox(height: 4),
                Text(
                  "Bo'sh qoldirsangiz, o'lchov asosida avtomatik hisoblanadi",
                  style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 11),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Avtomatik hisoblanadi',
                    prefixIcon: Icon(LucideIcons.wallet, size: 18),
                    suffixText: "so'm",
                  ),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                // Status tanlash
                Text("Holati",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimaryOf(context))),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: _itemStatuses.entries.map((e) {
                    final selected = item.status == e.key;
                    final info = e.value;
                    // Bosqichni sakrab o'tish taqiqlanadi - faqat qo'shni
                    // bosqichlar tanlanadi (izoh uchun _canMoveItemTo'ga qarang).
                    final allowed = selected || _canMoveItemTo(item.status, e.key);
                    return ChoiceChip(
                      label: Text(info.label,
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: allowed ? null : AppTheme.textMutedOf(context))),
                      selected: selected,
                      selectedColor: info.color.withOpacity(0.2),
                      backgroundColor: info.color.withOpacity(allowed ? 0.05 : 0.02),
                      side: BorderSide(
                        color: selected ? info.color : Colors.transparent,
                        width: 1.5,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      onSelected: !allowed
                          ? null
                          : (val) async {
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
                        // Save measurements + shu gilamning o'ziga xos
                        // narxini lokal controller xaritalariga yozamiz.
                        // Bular faqat asosiy "Saqlash" tugmasi bosilganda
                        // backend'ga yuboriladi (_save() ga q.).
                        _eniCtrl[item.id]?.text = eniCtrl.text;
                        _boyiCtrl[item.id]?.text = boyiCtrl.text;
                        _priceCtrl[item.id]?.text = priceCtrl.text.trim();
                        // Buyurtmaning umumiy (order-level) narx maydonini
                        // shu gilamlarning yig'indisiga mos yangilaymiz -
                        // agar inson umumiy narxni ALOHIDA qo'lda
                        // o'zgartirmagan bo'lsa (_priceManuallyEdited).
                        _refreshSuggestedPriceIfNotEdited(items);
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
        perUnitPriceCtrl.dispose();
      } catch (_) {}
    });
  }

  /// Tanlangan gilamlar sonini va ularning holatini bir yo'la
  /// o'zgartirish uchun tugmalarni ko'rsatadi.
  Widget _bulkStatusBar(List<OrderItemInfo> items) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(LucideIcons.checkSquare, size: 15, color: AppTheme.primary),
            const SizedBox(width: 6),
            Expanded(
              child: Text('${_selectedItemIds.length} ta gilam tanlandi',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.primary)),
            ),
            TextButton(
              onPressed: () => setState(() => _selectedItemIds.clear()),
              style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap),
              child: const Text('Bekor qilish', style: TextStyle(fontSize: 12)),
            ),
          ]),
          const SizedBox(height: 6),
          Text("Holatini o'zgartirish:",
              style: TextStyle(fontSize: 11, color: AppTheme.textMutedOf(context))),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _itemStatuses.entries.map((e) {
              final info = e.value;
              return ActionChip(
                label: Text(info.label,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                backgroundColor: info.color.withOpacity(0.12),
                side: BorderSide(color: info.color.withOpacity(0.4)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                onPressed: _saving ? null : () => _bulkChangeStatus(items, e.key),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  /// Gilam qatori — aktiv buyurtmada o'lcham maydonlari bilan,
  /// tarixda faqat ma'lumot (read-only).
  Widget _measureRow(int i, OrderItemInfo item, List<OrderItemInfo> items) {
    // MUHIM (jonli xato: modalda eni/bo'yi kiritib "Saqlash" bosilgandan
    // keyin ham qatorda ko'rinmasdi): modaldagi "Saqlash" tugmasi faqat
    // _eniCtrl/_boyiCtrl (lokal, hali backend'ga yuborilmagan) qiymatini
    // yangilaydi - backend'ga haqiqiy yozish faqat ekran pastidagi asosiy
    // "Saqlash" tugmasi bosilganda amalga oshadi. Shu sabab qator
    // ko'rsatilishi ham item.width/length (eski, hali saqlanmagan)
    // o'rniga o'sha lokal controller qiymatlaridan o'qishi kerak -
    // tarixiy (_isCompleted) buyurtmalarda controller yo'q, o'sha holda
    // item'ning o'zidagi (backend'dan kelgan, yakuniy) qiymatga tushadi.
    final eni = _isCompleted
        ? item.width
        : (double.tryParse(_eniCtrl[item.id]?.text ?? '') ?? 0);
    final boyi = _isCompleted
        ? item.length
        : (double.tryParse(_boyiCtrl[item.id]?.text ?? '') ?? 0);
    final area = eni * boyi;
    final manualPrice = _isCompleted
        ? item.price
        : double.tryParse(_priceCtrl[item.id]?.text ?? '');
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark
        ? AppTheme.darkSurfaceAltColor.withOpacity(0.3)
        : AppTheme.bgOf(context).withOpacity(0.5);

    // MUHIM (foydalanuvchi so'rovi bo'yicha): avval qatorning o'zida
    // alohida tahrirlash (qalam) va o'chirish (savat) tugmalari, hamda
    // eni/bo'yi uchun to'g'ridan-to'g'ri tahrirlanadigan maydonlar bor
    // edi. Endi BARCHA amallar (o'lcham, narx, holat, o'chirish)
    // FAQAT _showCarpetOptions() modali ichida - qator butunlay shu
    // modalni ochadigan bitta bosiladigan karta.
    return InkWell(
      onTap: _isCompleted ? null : () => _showCarpetOptions(item, items),
      borderRadius: BorderRadius.circular(10),
      child: Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Gilam nomi + status badge
          Row(children: [
            // Bir nechta gilamni birga belgilab, holatini bir yo'la
            // o'zgartirish uchun (pastdagi tanlash paneli - _buildBody'ga q.).
            if (!_isCompleted)
              SizedBox(
                width: 26,
                height: 26,
                child: Checkbox(
                  value: _selectedItemIds.contains(item.id),
                  onChanged: (_) => _toggleItemSelected(item.id),
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            if (!_isCompleted) const SizedBox(width: 4),
            Expanded(
              child: Row(children: [
                Icon(LucideIcons.layers, size: 14,
                    color: _isCompleted ? AppTheme.green : AppTheme.textMutedOf(context)),
                const SizedBox(width: 6),
                Text(
                  item.name.isEmpty ? 'Gilam ${i + 1}' : item.name,
                  style: TextStyle(
                      color: AppTheme.textPrimaryOf(context),
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
              Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMutedOf(context)),
            ],
          ]),
          const SizedBox(height: 6),
          // O'lcham ma'lumotlari — faqat ko'rsatiladi, tahrirlash modalda
          Row(children: [
            Expanded(
                flex: 3,
                child: Text('${item.quantity} ta',
                    style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 10))),
            Expanded(
                flex: 2,
                child: Text(eni > 0 ? eni.toStringAsFixed(1) : '—',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 11, fontWeight: FontWeight.w600))),
            const SizedBox(width: 4),
            Expanded(
                flex: 2,
                child: Text(boyi > 0 ? boyi.toStringAsFixed(1) : '—',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 11, fontWeight: FontWeight.w600))),
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
          if (manualPrice != null && manualPrice > 0) ...[
            const SizedBox(height: 4),
            Row(children: [
              Icon(LucideIcons.wallet, size: 11, color: AppTheme.teal),
              const SizedBox(width: 4),
              Text(
                '${NumberFormat.decimalPattern('uz').format(manualPrice)} so\'m (shu gilamga alohida)',
                style: const TextStyle(color: AppTheme.teal, fontSize: 10, fontWeight: FontWeight.w600),
              ),
            ]),
          ],
        ],
      ),
      ),
    );
  }

}
