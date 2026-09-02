import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'create_order_sheet.dart';
import 'orders_admin_repository.dart';

/// Buyurtmalar bo'limi (boshqaruv) - kompaniyaning BARCHA buyurtmalari:
/// qidiruv, status bo'yicha filtr, statusni o'zgartirish va narx belgilash.
class OrdersAdminScreen extends StatefulWidget {
  const OrdersAdminScreen({super.key});

  @override
  State<OrdersAdminScreen> createState() => _OrdersAdminScreenState();
}

class _OrdersAdminScreenState extends State<OrdersAdminScreen> {
  final _repo = OrdersAdminRepository();
  static final _money = NumberFormat.decimalPattern('uz');
  static final _date = DateFormat('dd.MM.yyyy');

  List<AdminOrder> _all = [];
  List<OrderStatusOption> _statuses = [];
  bool _loading = true;
  String? _error;
  String _query = '';
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repo.fetchAll(),
        // Statuslar ro'yxati bo'lmasa ham buyurtmalar ko'rinishi kerak.
        _repo.fetchStatuses().catchError((_) => <OrderStatusOption>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _all = results[0] as List<AdminOrder>;
        _statuses = results[1] as List<OrderStatusOption>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// order_zone.dart dagi OrderZoneBoundary.isCompleted() bilan AYNAN bir
  /// xil mezon: FAQAT to'lov allaqachon qabul qilingan bo'lsa - tugatilgan
  /// hisoblanadi. Tugatilgan buyurtmalar uchun alohida "Tarix" menyusi bor,
  /// shu sabab bu ro'yxatda standart holatda ko'rinmaydi.
  ///
  /// MUHIM (jonli xato, tuzatildi): avval "oxirgi statusga yetgan" sharti
  /// HAM (to'lovdan mustaqil) tekshirilardi - sex sexdan haydovchiga
  /// TOPSHIRISH signali sifatida oxirgi statusni qo'ysa (to'lov hali
  /// PENDING), buyurtma DARHOL "tugagan" hisoblanib, admin/dispetcherning
  /// standart ro'yxatidan yashirinib, hech kim uni haydovchiga
  /// topshirilganini/topshirilmaganini kuzata olmasdi.
  bool _isDone(AdminOrder o) =>
      o.paymentStatus.isNotEmpty && o.paymentStatus != 'PENDING';

  List<AdminOrder> get _visible {
    var list = _all;
    if (_statusFilter != null) {
      list = list.where((o) => o.statusLabel == _statusFilter).toList();
    } else {
      // Standart holatda (filtr tanlanmagan) tugatilgan buyurtmalar
      // ro'yxatda ko'rinmaydi - ular "Tarix" menyusida bor, aniq kerak
      // bo'lsa status chip'idan tanlab ko'rish ham mumkin.
      list = list.where((o) => !_isDone(o)).toList();
    }
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return list;
    return list
        .where((o) =>
            o.clientName.toLowerCase().contains(q) ||
            o.clientPhone.toLowerCase().contains(q) ||
            o.orderNumber.toLowerCase().contains(q) ||
            o.address.toLowerCase().contains(q))
        .toList();
  }

  void _notify(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: error ? AppTheme.dangerColor : AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _call(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return;
    final uri = Uri.parse('tel:$digits');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  /// Buyurtmaning to'liq tafsiloti - karta bosilganda ochiladi. Avval
  /// status/narx amallari faqat uch nuqtali menyuda edi, ekranda buyurtma
  /// haqida to'liq ma'lumot (xizmat, izoh) umuman ko'rinmasdi.
  void _openDetail(AdminOrder o) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OrderDetailSheet(
        order: o,
        dateLabel: o.createdAt != null ? _date.format(o.createdAt!) : null,
        moneyFmt: _money,
        onCall: o.clientPhone.isEmpty ? null : () => _call(o.clientPhone),
        onChangeStatus: () {
          Navigator.pop(context);
          _changeStatus(o);
        },
        onSetPrice: () {
          Navigator.pop(context);
          _setPrice(o);
        },
        onAssignWorker: () {
          Navigator.pop(context);
          _assignWorker(o);
        },
      ),
    );
  }

  Future<void> _openCreate() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateOrderSheet(repo: _repo),
    );
    if (created == true) {
      _notify('Buyurtma yaratildi');
      _load();
    }
  }

  Future<void> _changeStatus(AdminOrder o) async {
    if (_statuses.isEmpty) {
      _notify("Statuslar ro'yxati yuklanmadi", error: true);
      return;
    }
    final picked = await showModalBottomSheet<OrderStatusOption>(
      context: context,
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Yangi status',
                  style: TextStyle(fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800)),
            ),
            for (final s in _statuses)
              ListTile(
                leading: Icon(LucideIcons.circle, size: 14, color: _parseColor(s.colorCode)),
                title: Text(s.nameUz),
                onTap: () => Navigator.pop(context, s),
              ),
          ],
        ),
      ),
    );
    if (picked == null) return;
    try {
      await _repo.changeStatus(o.id, picked.id);
      _notify("Status o'zgartirildi");
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  /// MUHIM (audit'da topilgan xato, tuzatildi): telefondan yaratilgan
  /// buyurtmada "Mas'ul xodim" ixtiyoriy edi (create_order_sheet.dart) va
  /// biriktirilmasa, buni keyinroq to'g'irlashning HECH QANDAY yo'li yo'q
  /// edi - buyurtma "egasiz" qolib ketaverardi. Endi tafsilot varag'ida
  /// alohida "Xodim" amali orqali istalgan vaqt biriktirish/almashtirish
  /// mumkin.
  Future<void> _assignWorker(AdminOrder o) async {
    List<({String id, String name})> workers;
    try {
      workers = await _repo.fetchWorkers();
    } catch (e) {
      _notify(e.toString(), error: true);
      return;
    }
    if (workers.isEmpty) {
      _notify("Haydovchilar ro'yxati bo'sh", error: true);
      return;
    }
    if (!mounted) return;
    final picked = await showModalBottomSheet<({String id, String name})>(
      context: context,
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Xodim tanlang',
                  style: TextStyle(fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800)),
            ),
            for (final w in workers)
              ListTile(
                leading: const Icon(LucideIcons.user, size: 18),
                title: Text(w.name),
                onTap: () => Navigator.pop(context, w),
              ),
          ],
        ),
      ),
    );
    if (picked == null) return;
    try {
      await _repo.assignWorker(o.id, picked.id);
      _notify('Xodim biriktirildi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Future<void> _setPrice(AdminOrder o) async {
    final ctrl = TextEditingController(text: o.price > 0 ? o.price.round().toString() : '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Narx belgilash'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: "Summa (so'm)"),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Saqlash')),
        ],
      ),
    );
    final value = double.tryParse(ctrl.text.replaceAll(RegExp(r'[^0-9.]'), ''));
    ctrl.dispose();
    if (ok != true || value == null) return;
    try {
      await _repo.setPrice(o.id, value);
      _notify('Narx saqlandi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Color _parseColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return AppTheme.blue;
    return Color(cleaned.length == 6 ? 0xFF000000 + value : value);
  }

  @override
  Widget build(BuildContext context) {
    final statusNames = _all.map((o) => o.statusLabel).where((s) => s.isNotEmpty).toSet().toList()..sort();

    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreate,
        backgroundColor: AppTheme.primary,
        child: const Icon(LucideIcons.plus, color: Colors.white),
      ),
      // AppBar ATAYIN yo'q: bu ekran endi dashboard qobig'i ichida bo'lim
      // sifatida ochiladi va qobiqning o'z AppBar'i bor - o'zimiznikini
      // qo'shsak, ekranda ikkita sarlavha paydo bo'lardi.
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'Mijoz, raqam yoki manzil',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                filled: true,
                fillColor: AppTheme.surfaceOf(context),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.rMd)),
              ),
            ),
          ),
          if (statusNames.isNotEmpty)
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _filterChip('Hammasi', null),
                  for (final s in statusNames) _filterChip(s, s),
                ],
              ),
            ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String? value) {
    final selected = _statusFilter == value;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        selected: selected,
        onSelected: (_) => setState(() => _statusFilter = value),
      ),
    );
  }

  Widget _body() {
    if (_loading) return const OrderListSkeleton();
    if (_error != null) return EmptyState(icon: LucideIcons.alertTriangle, message: _error!);
    final items = _visible;
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: const [
          SizedBox(height: 60),
          EmptyState(icon: LucideIcons.clipboardList, message: 'Buyurtma topilmadi.'),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final o = items[i];
          final color = _parseColor(o.statusColor);
          // Ixcham karta (2026-08-05): avval 5 qatorli edi (ism, xizmat,
          // manzil, xodim, sana - alohida qatorlarda), endi 3 qatorga
          // siqilgan. Rangli doiradagi ikonka statusni BIR QARASHDA
          // ko'rsatadi, o'ng tarafdagi o'q butun karta bosiladigan
          // ekanini bildiradi - alohida "ko'rish" tugmasi endi shart emas.
          return AppCard(
            onTap: () => _openDetail(o),
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.13),
                    borderRadius: BorderRadius.circular(AppTheme.rMd),
                  ),
                  child: Icon(LucideIcons.clipboardList, size: 18, color: color),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              o.clientName.isEmpty ? '(mijozsiz)' : o.clientName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimaryOf(context)),
                            ),
                          ),
                          Text(
                            o.price > 0 ? "${_money.format(o.price.round())}" : "—",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: o.price > 0 ? AppTheme.primary : AppTheme.textMutedOf(context),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        o.serviceName.isEmpty ? "Xizmat ko'rsatilmagan" : o.serviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textMutedOf(context)),
                      ),
                      const SizedBox(height: 7),
                      Row(
                        children: [
                          if (o.statusLabel.isNotEmpty) StatusPill(o.statusLabel, color),
                          const SizedBox(width: 6),
                          if (o.createdAt != null)
                            Expanded(
                              child: Text(
                                _date.format(o.createdAt!),
                                textAlign: TextAlign.end,
                                style: TextStyle(
                                    fontSize: 10.5, fontWeight: FontWeight.w600, color: AppTheme.textMutedOf(context)),
                              ),
                            ),
                          if (o.clientPhone.isNotEmpty) ...[
                            const SizedBox(width: 4),
                            GestureDetector(
                              onTap: () => _call(o.clientPhone),
                              child: Container(
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(
                                  color: AppTheme.primarySoft,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(LucideIcons.phoneCall, size: 13, color: AppTheme.primary),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 2),
                Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMutedOf(context)),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Buyurtma haqida to'liq ma'lumot + amallar - karta bosilganda ochiladi.
class _OrderDetailSheet extends StatelessWidget {
  final AdminOrder order;
  final String? dateLabel;
  final NumberFormat moneyFmt;
  final VoidCallback? onCall;
  final VoidCallback onChangeStatus;
  final VoidCallback onSetPrice;
  final VoidCallback onAssignWorker;

  const _OrderDetailSheet({
    required this.order,
    required this.dateLabel,
    required this.moneyFmt,
    required this.onCall,
    required this.onChangeStatus,
    required this.onSetPrice,
    required this.onAssignWorker,
  });

  Color _parseColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return AppTheme.blue;
    return Color(cleaned.length == 6 ? 0xFF000000 + value : value);
  }

  Widget _section(BuildContext context, String title) => Padding(
        padding: const EdgeInsets.only(bottom: 6, top: 2),
        child: Text(title.toUpperCase(),
            style: TextStyle(
                fontSize: 9.5, fontWeight: FontWeight.w800, color: AppTheme.textMutedOf(context), letterSpacing: 0.5)),
      );

  @override
  Widget build(BuildContext context) {
    final o = order;
    final color = _parseColor(o.statusColor);

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.only(top: 40),
        decoration: BoxDecoration(
          color: AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration:
                      BoxDecoration(color: AppTheme.borderOf(context), borderRadius: BorderRadius.circular(99)),
                ),
              ),
              const SizedBox(height: 18),

              // Sarlavha: rangli doira ichida ikonka + mijoz ismi + status.
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.13), shape: BoxShape.circle),
                    child: Icon(LucideIcons.clipboardList, size: 20, color: color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          o.clientName.isEmpty ? '(mijozsiz)' : o.clientName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontFamily: 'Outfit', fontSize: 17, fontWeight: FontWeight.w800,
                              color: AppTheme.textPrimaryOf(context)),
                        ),
                        if (o.serviceName.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(o.serviceName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondaryOf(context))),
                        ],
                      ],
                    ),
                  ),
                  if (o.statusLabel.isNotEmpty) StatusPill(o.statusLabel, color),
                ],
              ),

              const SizedBox(height: 18),

              // Summa - moliya kartalaridagi uslub bilan bir xil aniq blok.
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: o.price > 0 ? AppTheme.primarySoft : AppTheme.surfaceAltOf(context),
                  borderRadius: BorderRadius.circular(AppTheme.rLg),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Buyurtma summasi',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondaryOf(context))),
                    const SizedBox(height: 3),
                    Text(
                      o.price > 0 ? "${moneyFmt.format(o.price.round())} so'm" : "Narx belgilanmagan",
                      style: TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                          color: o.price > 0 ? AppTheme.primary : AppTheme.textMutedOf(context)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),
              _section(context, 'Aloqa va manzil'),
              if (o.clientPhone.isNotEmpty) ...[
                MetaLine(LucideIcons.phone, o.clientPhone),
                const SizedBox(height: 6),
              ],
              if (o.address.isNotEmpty) ...[
                MetaLine(LucideIcons.mapPin, o.address),
                const SizedBox(height: 6),
              ],
              MetaLine(LucideIcons.user,
                  o.workerName == null || o.workerName!.isEmpty ? 'Xodim tayinlanmagan' : o.workerName!),
              if (dateLabel != null) ...[
                const SizedBox(height: 6),
                MetaLine(LucideIcons.calendar, dateLabel!),
              ],

              if (o.description.trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                _section(context, 'Izoh'),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceAltOf(context),
                    borderRadius: BorderRadius.circular(AppTheme.rMd),
                  ),
                  child: Text(o.description,
                      style: TextStyle(
                          fontSize: 12.5, color: AppTheme.textSecondaryOf(context), fontWeight: FontWeight.w500)),
                ),
              ],

              const SizedBox(height: 10),
              // MUHIM (audit'da topilgan, tuzatildi): avval bu yerda faqat
              // Status/Narx bor edi - telefondan yaratilgan, xodim
              // biriktirilmagan buyurtmani KEYINROQ hech qanday xodimga
              // berish imkoni yo'q edi. Alohida qatorda - qolgan uchtasi
              // bilan bir qatorga sig'maydi.
              AppButton('Xodim biriktirish', icon: LucideIcons.userPlus, kind: AppBtn.ghost, onTap: onAssignWorker),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (onCall != null) ...[
                    Expanded(
                      child: AppButton("Qo'ng'iroq", icon: LucideIcons.phoneCall, kind: AppBtn.ghost, onTap: onCall),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: AppButton('Status', icon: LucideIcons.flag, kind: AppBtn.ghost, onTap: onChangeStatus),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: AppButton('Narx', icon: LucideIcons.wallet, onTap: onSetPrice),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
