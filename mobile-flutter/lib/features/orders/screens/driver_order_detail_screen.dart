import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../ui/app_ui.dart';
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

  // MUHIM (jonli xato: "haydovchida 'Bajarmoqda: Xodim' bo'lib chiqib
  // qolgan"): avval umumiy `workerId` tekshirilardi - lekin bu maydonda
  // SEX HODIMI ham turishi mumkin (masalan gilam to'g'ridan-to'g'ri sexga
  // olib kelingan, haydovchisiz "yo'lga tushgan" buyurtma). Bunday holatda
  // buyurtma yetkazish bosqichiga chiqqanda ham, hech qanday haydovchi uni
  // "o'zimniki" deb bilolmasdi. Endi FAQAT `driverId` tekshiriladi.
  bool get _isMine =>
      widget.currentUserId.isNotEmpty &&
      widget.order.driverId == widget.currentUserId;

  Order get order => widget.order;
  List<OrderStatusInfo> get statuses => widget.statuses;

  /// Tarix (o'tgan) buyurtma ekanligini tekshiradi — to'lov qilingan
  /// buyurtmalar tahrirlanmasligi kerak.
  ///
  /// MUHIM (jonli xato, tuzatildi): avval "oxirgi statusga yetgan"
  /// shartini HAM (to'lovdan mustaqil) tekshirardi - sex sexdan
  /// haydovchiga TOPSHIRISH signali sifatida oxirgi statusni qo'ysa,
  /// to'lov hali PENDING bo'lsa ham buyurtma DARHOL "yakunlangan"
  /// hisoblanib, haydovchi uni qabul qila olmas/yetkaza olmas edi. Endi
  /// OrderZoneBoundary.isCompleted() bilan BIR XIL - FAQAT to'lov
  /// qabul qilinganda tugagan hisoblanadi.
  bool get _isCompleted =>
      OrderZoneBoundary.fromStatuses(statuses).isCompleted(order);

  Future<void> _call(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _openMap() async {
    final Uri uri;
    // MUHIM: buyurtmaning O'ZIDA koordinata bo'lmasa (masalan bu funksiya
    // qo'shilishidan OLDIN yaratilgan eski buyurtma), mijozning saqlangan
    // lokatsiyasi (avvalgi buyurtmada belgilangan bo'lishi mumkin) zaxira
    // sifatida ishlatiladi - matn manzildan OLDIN, chunki koordinata
    // har doim aniqroq.
    final lat = order.latitude ?? order.client.latitude;
    final lng = order.longitude ?? order.client.longitude;
    if (lat != null && lng != null) {
      uri = Uri.parse(
          'https://www.google.com/maps/search/?api=1&query=$lat,$lng');
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

  bool _markingLocation = false;

  /// Haydovchi mijoz manziliga BORGANDA bosadigan tugma - joriy GPS
  /// koordinatasini oladi va buyurtmaga (backend orqali mijozning o'ziga
  /// ham) yozadi. Ruxsat so'rash naqshi shift_toggle_button.dart bilan bir
  /// xil - farqli o'laroq bu yerda faqat BIR MARTALIK o'qish kerak, "doim
  /// ruxsat" (fon xizmati uchun) shart emas.
  Future<void> _markLocation() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('GPS ruxsati talab qilinadi'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _markingLocation = true);
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      await context
          .read<OrdersCubit>()
          .setOrderLocation(order, position.latitude, position.longitude);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Joylashuv belgilandi'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Joylashuvni olib bo\'lmadi'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _markingLocation = false);
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
            child: Text('Bekor', style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondaryOf(context))),
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
                        : AppTheme.textSecondaryOf(context))),
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
                        : AppTheme.textSecondaryOf(context))),
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
    final cashCtrl = TextEditingController();
    final cardCtrl = TextEditingController();
    String paymentMethod = 'CASH';
    final formatter = NumberFormat.decimalPattern('uz');

    // Haydovchi mijoz oldida summani o'zi tekshira olishi uchun -
    // umumiy o'lcham/dona va narx birligi (order.servicePrice) shu yerda
    // ko'rsatiladi, aks holda faqat tayyor summa bo'lib, uni qanday
    // hisoblanganini tekshirishning iloji yo'q edi.
    //
    // Backend'dagi OrderItemController.recalculatePrice bilan BIR XIL qoida:
    // masalan "kv. metr" ham maydon bo'yicha hisoblanadi, faqat aniq "m²"
    // yozilganda emas - aks holda bu yerdagi umumiy m² backend hisoblagan
    // narxga mos kelmay, noto'g'ri ko'rsatilib qolar edi.
    final unit = order.measurementUnit.toLowerCase().replaceAll('.', '');
    final isAreaBased = unit == 'm²' || unit.contains('kv');
    double totalMeasure = 0;
    int totalCount = 0;
    // Ba'zi gilamlarga sex xodimi tomonidan ALOHIDA narx qo'yilgan bo'lishi
    // mumkin (item.price) - shunday holatda "o'lcham × xizmat narxi" formulasi
    // haqiqiy summaga mos kelmaydi, shuning uchun pastda shu formula
    // ko'rsatilmaydi (faqat barcha gilamlar avtomatik narxlanganda ko'rsatiladi).
    bool hasManualPriceItem = false;
    for (final item in order.items) {
      final area = item.length * item.width;
      totalMeasure += isAreaBased ? (area * item.quantity) : item.quantity.toDouble();
      totalCount += item.quantity;
      if (item.price != null && item.price! > 0) {
        hasManualPriceItem = true;
      }
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dctx) => StatefulBuilder(
        builder: (dctx, setDialogState) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18)),
        title: const Text("To'lovni qabul qilish",
            style: TextStyle(
                fontWeight: FontWeight.w700, fontSize: 16)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          if (order.items.isNotEmpty) ...[
            // Har bir gilamning o'z o'lchami ALOHIDA ko'rsatiladi - haydovchi
            // mijoz oldida "qaysi gilam noto'g'ri o'lchandi" desa, faqat
            // umumiy jami bilan buni tekshirib bo'lmaydi. Ro'yxat ICHKI
            // scroll qiladi - gilamlar soni ko'p bo'lsa ham dialog kichik
            // ekranda balandlikdan chiqib ketmaydi, jami/summa doim ko'rinadi.
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 130),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: order.items.map((item) {
                    final area = item.length * item.width;
                    final itemMeasure = isAreaBased
                        ? (area * item.quantity)
                        : item.quantity.toDouble();
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(
                          isAreaBased
                              ? '${item.name}: ${item.quantity} dona (${item.length.toStringAsFixed(1)}×${item.width.toStringAsFixed(1)} m) = ${itemMeasure.toStringAsFixed(1)} ${order.measurementUnit}'
                              : '${item.name}: ${item.quantity} ${order.measurementUnit}',
                          style: TextStyle(
                              color: AppTheme.textSecondaryOf(context), fontSize: 12)),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
                'Jami: $totalCount dona gilam'
                '${isAreaBased ? ' — ${totalMeasure.toStringAsFixed(1)} ${order.measurementUnit}' : ''}',
                style: TextStyle(
                    color: AppTheme.textPrimaryOf(context),
                    fontSize: 13,
                    fontWeight: FontWeight.w600)),
            // Ba'zi gilamlarga alohida narx qo'yilgan bo'lsa, "o'lcham × narx"
            // formulasi haqiqiy summaga mos kelmaydi - shunday holatda
            // chalg'itmaslik uchun ko'rsatilmaydi.
            if (order.servicePrice > 0 && !hasManualPriceItem)
              Text(
                  '${totalMeasure.toStringAsFixed(1)} ${order.measurementUnit} × '
                  '${formatter.format(order.servicePrice)} so\'m = '
                  '${formatter.format(order.price)} so\'m',
                  style: TextStyle(
                      color: AppTheme.textSecondaryOf(context), fontSize: 13)),
            const SizedBox(height: 6),
          ],
          Text(
              'Buyurtma summasi: ${formatter.format(order.price)} so\'m',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 12),
          // To'lov usuli tanlash: Naqd / Karta / Aralash
          Text("To'lov usuli",
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondaryOf(context))),
          const SizedBox(height: 6),
          Row(
            children: [
              _PaymentMethodChip(
                label: 'Naqd',
                icon: LucideIcons.banknote,
                selected: paymentMethod == 'CASH',
                onTap: () => setDialogState(() => paymentMethod = 'CASH'),
              ),
              const SizedBox(width: 6),
              _PaymentMethodChip(
                label: 'Karta',
                icon: LucideIcons.creditCard,
                selected: paymentMethod == 'CARD',
                onTap: () => setDialogState(() => paymentMethod = 'CARD'),
              ),
              const SizedBox(width: 6),
              _PaymentMethodChip(
                label: 'Aralash',
                icon: LucideIcons.layers,
                selected: paymentMethod == 'MIXED',
                onTap: () => setDialogState(() => paymentMethod = 'MIXED'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (paymentMethod == 'MIXED') ...[
            TextField(
              controller: cashCtrl,
              keyboardType: TextInputType.number,
              onChanged: (_) => setDialogState(() {}),
              decoration: const InputDecoration(
                labelText: "Naqd qismi (so'm)",
                prefixIcon: Icon(LucideIcons.banknote, size: 18),
                suffixText: "so'm",
              ),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: cardCtrl,
              keyboardType: TextInputType.number,
              onChanged: (_) => setDialogState(() {}),
              decoration: const InputDecoration(
                labelText: "Karta qismi (so'm)",
                prefixIcon: Icon(LucideIcons.creditCard, size: 18),
                suffixText: "so'm",
              ),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Builder(builder: (_) {
              final cash = double.tryParse(cashCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
              final card = double.tryParse(cardCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
              return Text(
                'Jami: ${formatter.format(cash + card)} so\'m',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondaryOf(context)),
              );
            }),
          ] else
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: paymentMethod == 'CARD'
                    ? "Karta orqali olingan summa (so'm)"
                    : "Olingan summa (so'm)",
                prefixIcon: Icon(
                    paymentMethod == 'CARD' ? LucideIcons.creditCard : LucideIcons.wallet,
                    size: 18),
                suffixText: "so'm",
              ),
              style: const TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w600),
            ),
        ]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor',
                style: TextStyle(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.textSecondaryOf(context))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: AppTheme.green),
            onPressed: () {
              if (paymentMethod == 'MIXED') {
                final cash = double.tryParse(cashCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
                final card = double.tryParse(cardCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
                if (cash + card <= 0) return;
              }
              Navigator.pop(dctx, true);
            },
            child: const Text('Tasdiqlash'),
          ),
        ],
        ),
      ),
    );

    if (confirmed != true) {
      amountCtrl.dispose();
      cashCtrl.dispose();
      cardCtrl.dispose();
      return;
    }

    double amount;
    double? cashAmount;
    double? cardAmount;
    if (paymentMethod == 'MIXED') {
      cashAmount = double.tryParse(cashCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
      cardAmount = double.tryParse(cardCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
      amount = cashAmount + cardAmount;
    } else {
      amount = double.tryParse(
              amountCtrl.text.replaceAll(RegExp(r'[^0-9.]'), '')) ??
          0;
    }
    amountCtrl.dispose();
    cashCtrl.dispose();
    cardCtrl.dispose();

    setState(() => _isProcessing = true);
    try {
      await context.read<OrdersCubit>().collectOrderPayment(
            order,
            amount,
            paymentMethod: paymentMethod,
            cashAmount: cashAmount,
            cardAmount: cardAmount,
          );
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
                  decoration: BoxDecoration(color: AppTheme.borderOf(context), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Text(item.name.isEmpty ? 'Gilam' : item.name,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              const SizedBox(height: 4),
              Text('${item.quantity} ta - ${_sizeLabel(item)}',
                  style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 13)),
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
          color: AppTheme.bgOf(context).withOpacity(0.3),
          borderRadius: BorderRadius.circular(12),
        ),
        child: InkWell(
          onTap: _isCompleted ? null : () => _showCarpetOptions(item),
          borderRadius: BorderRadius.circular(12),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: AppTheme.bgOf(context), borderRadius: BorderRadius.circular(9)),
              child: Icon(_isCompleted ? LucideIcons.checkCircle : LucideIcons.layers, size: 18, color: _isCompleted ? AppTheme.green : AppTheme.textMutedOf(context)),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.name.isEmpty ? 'Gilam ${i + 1}' : item.name,
                  style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w700, fontSize: 13)),
              Text('${item.quantity} ta - ${_sizeLabel(item)}',
                  style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 11)),
            ])),
            if (!_isCompleted)
              Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMutedOf(context)),
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
            padding: EdgeInsets.fromLTRB(
                16, 16, 16, 24 + MediaQuery.of(context).padding.bottom),
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
              const SizedBox(height: 8),

              // MUHIM: matn manzil ko'pincha noaniq bo'ladi - haydovchi
              // mijoz uyi oldida turib bosadi, shu aniq nuqta shu mijozning
              // KEYINGI barcha buyurtmalarida ham qayta ishlatiladi
              // (backend OrderController.updateOrderLocation).
              if (!_isCompleted)
                AppButton(
                  o.latitude != null && o.longitude != null
                      ? 'Joylashuv belgilangan (qayta belgilash)'
                      : 'Joylashuvni belgilash',
                  icon: LucideIcons.mapPin,
                  kind: AppBtn.ghost,
                  loading: _markingLocation,
                  onTap: _markingLocation ? null : _markLocation,
                ),
              const SizedBox(height: 12),

              // Description
              if (o.description.isNotEmpty) ...[
                DetailPanel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Izoh', style: TextStyle(color: AppTheme.textMutedOf(context), fontSize: 11)),
                  const SizedBox(height: 3),
                  Text(o.description, style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 13)),
                ])),
                const SizedBox(height: 12),
              ],

              // Carpet list with edit/delete (LIVE - cubit state o'zgarsa darhol yangilanadi)
              if (o.items.isNotEmpty) ...[
                DetailPanel(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text('Gilamlar', style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w700, fontSize: 14)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                        decoration: BoxDecoration(color: AppTheme.bgOf(context), borderRadius: BorderRadius.circular(20)),
                        child: Text('${o.items.length} ta', style: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 11, fontWeight: FontWeight.w700)),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    ...o.items.asMap().entries.map((e) => _carpetRow(e.key, e.value)),
                    if (o.items.length > 1) ...[
                      const Divider(height: 16),
                      Builder(builder: (context) {
                        // Backend'dagi OrderItemController.recalculatePrice bilan
                        // BIR XIL qoida (masalan "kv. metr" ham maydon bo'yicha
                        // hisoblanadi, faqat aniq "m²" yozilganda emas).
                        final unit = o.measurementUnit.toLowerCase().replaceAll('.', '');
                        final isAreaBased = unit == 'm²' || unit.contains('kv');
                        double totalMeasure = 0;
                        for (final item in o.items) {
                          final area = item.length * item.width;
                          totalMeasure += isAreaBased
                              ? (area * item.quantity)
                              : item.quantity.toDouble();
                        }
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Umumiy o\'lcham',
                                style: TextStyle(
                                    color: AppTheme.textSecondaryOf(context),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600)),
                            Text(
                                '${totalMeasure.toStringAsFixed(1)} ${o.measurementUnit}',
                                style: TextStyle(
                                    color: AppTheme.textPrimaryOf(context),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700)),
                          ],
                        );
                      }),
                    ],
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
                Text('Buyurtma holati', style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w700, fontSize: 14)),
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
      //
      // MUHIM (jonli xato, tuzatildi): avval `order.workerId != null`
      // tekshirilardi - lekin bu sex hodimi ushbu buyurtmani band qilib
      // qo'ygan (masalan o'lchov kiritgan) holatda ham TRUE bo'lardi,
      // garchi HECH QANDAY haydovchi hali biriktirilmagan bo'lsa ham.
      // Natijada "Olib ketish/Qabul qilish" tugmasi umuman chiqmay, buyurtma
      // hech qaysi haydovchiga hech qachon o'tmay qolardi. Endi FAQAT
      // `driverId` tekshiriladi - sex hodimi band qilgani haydovchiga
      // to'sqinlik qilmaydi.
      if (order.driverId != null) {
        return [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: AppTheme.borderOf(context).withOpacity(0.3),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(LucideIcons.userCheck, size: 18, color: AppTheme.textSecondaryOf(context)),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  'Bajarmoqda: ${order.driverName ?? "boshqa haydovchi"}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      color: AppTheme.textSecondaryOf(context),
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

    // Case 2: My order - show remaining status steps
    final sorted = [...statuses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final idx =
        sorted.indexWhere((s) => s.id == order.status?.id);
    final remaining = (idx == -1)
        ? <OrderStatusInfo>[]
        : sorted.sublist(idx + 1);

    if (remaining.isNotEmpty) {
      // Birinchi bosqichdan chiqish = gilamni JISMONAN sexga topshirish
      // (buyurtma shu daqiqadan boshlab haydovchi ro'yxatidan sex hodimiga
      // o'tadi). Avval bu tugma "Qabul qilish" deb nomlangan edi - bu
      // chalkash edi, chunki haydovchi buyurtmani allaqachon qabul qilgan
      // (biriktirgan) bo'ladi; bu tugma esa butunlay boshqa hodisani -
      // sexga topshirishni bildiradi.
      final isFirstStep = sorted.isNotEmpty && sorted.first.id == order.status?.id;
      final primaryLabel = isFirstStep ? "Sexga topshirish" : remaining[0].nameUz;
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
              style: TextStyle(
                  color: AppTheme.textSecondaryOf(context), fontSize: 11),
            ),
          ],
        ),
      ];

      // MUHIM (xavfsizlik/mantiq xatosi, audit'da topilgan): avval shu yerda
      // IKKINCHI ("remaining[1]") tugma ham ko'rsatilardi - bu haydovchiga
      // BIR TEGISHDA IKKI bosqichni birdan o'tkazib yuborish imkonini
      // berardi (masalan "Yuvilmoqda"dan to'g'ridan-to'g'ri "Tugallandi"ga,
      // "Bajarilmoqda" bosqichini butunlay chetlab o'tib). Aynan shu sabab
      // haydovchi sex hodimi hech qanday ishlov bermasdan turib buyurtmani
      // o'zi yakunlab qo'ya olardi. Endi haydovchi HAR DOIM faqat BITTA
      // KEYINGI bosqichga o'ta oladi - sakrab o'tish yo'q.

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

/// To'lovni qabul qilish oynasida to'lov usulini (Naqd/Karta/Aralash)
/// tanlash uchun kichik chip tugmasi.
class _PaymentMethodChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _PaymentMethodChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppTheme.primary : Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? AppTheme.primary
                  : AppTheme.textSecondaryOf(context).withOpacity(0.25),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon,
                  size: 16,
                  color: selected ? Colors.white : AppTheme.textSecondaryOf(context)),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : AppTheme.textSecondaryOf(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
