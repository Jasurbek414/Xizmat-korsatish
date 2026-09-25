import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'settings_repository.dart';

/// Sozlamalar (boshqaruv) - web paneldagi "Sozlamalar" ning XAVFSIZ qismi.
///
/// ATAYIN KIRITILMAGAN: bazani tozalash (reset), zaxiradan tiklash (import) va
/// zaxira yuklab olish. Telefonda tasodifan bosilishi butun kompaniya
/// ma'lumotini yo'q qilishi mumkin - bu amallar faqat veb-panelda qoladi.
class ManagementSettingsScreen extends StatefulWidget {
  const ManagementSettingsScreen({super.key});

  @override
  State<ManagementSettingsScreen> createState() => _ManagementSettingsScreenState();
}

class _ManagementSettingsScreenState extends State<ManagementSettingsScreen>
    with SingleTickerProviderStateMixin {
  final _repo = SettingsRepository();
  late final TabController _tabs;
  static final _money = NumberFormat.decimalPattern('uz');

  bool _loading = true;
  String? _error;
  CompanyInfo? _company;
  List<ServiceCatalogItem> _services = [];
  List<StatusItem> _statuses = [];
  List<RoleItem> _roles = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repo.fetchCompany(),
        _repo.fetchServices().catchError((_) => <ServiceCatalogItem>[]),
        _repo.fetchStatuses().catchError((_) => <StatusItem>[]),
        _repo.fetchRoles().catchError((_) => <RoleItem>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _company = results[0] as CompanyInfo;
        _services = results[1] as List<ServiceCatalogItem>;
        _statuses = results[2] as List<StatusItem>;
        _roles = results[3] as List<RoleItem>;
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

  Color _parseColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return AppTheme.blue;
    return Color(cleaned.length == 6 ? 0xFF000000 + value : value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: const Text('Sozlamalar'),
        // Ikonkali tab'lar (2026-08-05 dizayn yangilanishi): faqat matn
        // o'rniga - 5 ta bo'lim orasida ko'z bilan tez farqlash uchun.
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primary,
          indicatorWeight: 2.5,
          labelStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
          tabs: const [
            Tab(icon: Icon(LucideIcons.building2, size: 17), text: 'Kompaniya'),
            Tab(icon: Icon(LucideIcons.briefcase, size: 17), text: 'Xizmatlar'),
            Tab(icon: Icon(LucideIcons.messageSquare, size: 17), text: 'SMS'),
            Tab(icon: Icon(LucideIcons.checkCircle2, size: 17), text: 'Statuslar'),
            Tab(icon: Icon(LucideIcons.shield, size: 17), text: 'Rollar'),
          ],
        ),
      ),
      body: _loading
          ? const OrderListSkeleton()
          : _error != null
              ? EmptyState(icon: LucideIcons.alertTriangle, message: _error!)
              : TabBarView(
                  controller: _tabs,
                  children: [_companyTab(), _servicesTab(), _smsTab(), _statusesTab(), _rolesTab()],
                ),
    );
  }

  Widget _companyTab() {
    final c = _company;
    if (c == null) return const EmptyState(icon: LucideIcons.building2, message: "Ma'lumot yo'q");
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      children: [
        // Sarlavha kartasi - rangli doira ikonka + nom, boshqa tafsilot
        // ekranlari (mijoz, xodim, buyurtma) bilan bir xil uslubda.
        AppCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: AppTheme.primarySoft, shape: BoxShape.circle),
                child: const Icon(LucideIcons.building2, size: 20, color: AppTheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.name,
                        style: const TextStyle(
                            fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800,
                            color: AppTheme.textPrimary)),
                    const SizedBox(height: 6),
                    if (c.phone.isNotEmpty) MetaLine(LucideIcons.phone, c.phone),
                    if (c.email.isNotEmpty) ...[const SizedBox(height: 4), MetaLine(LucideIcons.mail, c.email)],
                    if (c.address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      MetaLine(LucideIcons.mapPin, c.address),
                    ],
                    const SizedBox(height: 4),
                    MetaLine(LucideIcons.clock, '${c.workStartTime} — ${c.workEndTime}'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: StatTile(
                icon: LucideIcons.wallet,
                value: "${_money.format(c.minOrderPrice)}",
                label: "Min. narx (so'm)",
                color: AppTheme.amber,
                soft: AppTheme.amberSoft,
                width: double.infinity,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: StatTile(
                icon: LucideIcons.percent,
                value: '${c.driverKpiPercent}%',
                label: 'Haydovchi KPI',
                color: AppTheme.teal,
                soft: AppTheme.tealSoft,
                width: double.infinity,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        AppButton("Kompaniya ma'lumotini tahrirlash", icon: LucideIcons.pencil, onTap: () => _editCompany(c)),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppTheme.surfaceAlt,
            borderRadius: BorderRadius.circular(AppTheme.rMd),
          ),
          child: Row(
            children: [
              const Icon(LucideIcons.info, size: 14, color: AppTheme.textMuted),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "Zaxiralash, bazadan tiklash va bazani tozalash amallari xavfsizlik "
                  "yuzasidan faqat veb-panelda mavjud.",
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }


  Future<void> _editCompany(CompanyInfo c) async {
    final name = TextEditingController(text: c.name);
    final phone = TextEditingController(text: c.phone);
    final address = TextEditingController(text: c.address);
    final minPrice = TextEditingController(text: c.minOrderPrice.toString());
    final kpi = TextEditingController(text: c.driverKpiPercent.toString());

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text("Kompaniya ma'lumoti",
                    style: TextStyle(fontFamily: 'Outfit', fontSize: 17, fontWeight: FontWeight.w800)),
                const FieldLabel('Nomi'),
                TextField(controller: name, decoration: const InputDecoration(border: OutlineInputBorder())),
                const FieldLabel('Telefon'),
                TextField(controller: phone, decoration: const InputDecoration(border: OutlineInputBorder())),
                const FieldLabel('Manzil'),
                TextField(controller: address, decoration: const InputDecoration(border: OutlineInputBorder())),
                const FieldLabel('Minimal buyurtma narxi'),
                TextField(
                    controller: minPrice,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(border: OutlineInputBorder())),
                const FieldLabel('Haydovchi KPI ulushi (%)'),
                TextField(
                    controller: kpi,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(border: OutlineInputBorder())),
                const SizedBox(height: 18),
                AppButton('Saqlash', onTap: () => Navigator.pop(ctx, true)),
              ],
            ),
          ),
        ),
      ),
    );

    final changes = <String, dynamic>{
      'name': name.text.trim(),
      'phone': phone.text.trim(),
      'address': address.text.trim(),
      'minOrderPrice': int.tryParse(minPrice.text.trim()) ?? c.minOrderPrice,
      'driverKpiPercent': int.tryParse(kpi.text.trim()) ?? c.driverKpiPercent,
    };
    for (final ctrl in [name, phone, address, minPrice, kpi]) {
      ctrl.dispose();
    }
    if (ok != true) return;
    try {
      await _repo.updateCompany(changes);
      _notify('Saqlandi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Widget _servicesTab() {
    return Stack(
      children: [
        _services.isEmpty
            ? const EmptyState(icon: LucideIcons.briefcase, message: "Xizmat qo'shilmagan.")
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
                itemCount: _services.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final s = _services[i];
                  return AppCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(s.nameUz,
                                  style: const TextStyle(
                                      fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                              const SizedBox(height: 3),
                              MetaLine(LucideIcons.ruler, s.measurementUnit),
                            ],
                          ),
                        ),
                        Text("${_money.format(s.price.round())} so'm",
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                        PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          icon: const Icon(LucideIcons.moreVertical, size: 17, color: AppTheme.textSecondary),
                          onSelected: (v) {
                            if (v == 'edit') _editService(s);
                            if (v == 'delete') _deleteService(s);
                          },
                          itemBuilder: (_) => const [
                            PopupMenuItem(value: 'edit', child: Text('Tahrirlash')),
                            PopupMenuItem(value: 'delete', child: Text("O'chirish")),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton(
            onPressed: () => _editService(null),
            backgroundColor: AppTheme.primary,
            child: const Icon(LucideIcons.plus, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Future<void> _editService(ServiceCatalogItem? existing) async {
    final name = TextEditingController(text: existing?.nameUz ?? '');
    final price = TextEditingController(text: existing?.price.round().toString() ?? '');
    final unit = TextEditingController(text: existing?.measurementUnit ?? 'dona');

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Yangi xizmat' : 'Xizmatni tahrirlash'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Nomi')),
            TextField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Narxi')),
            TextField(controller: unit, decoration: const InputDecoration(labelText: "O'lchov birligi")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Saqlash')),
        ],
      ),
    );

    final nameText = name.text.trim();
    final priceValue = double.tryParse(price.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
    final unitText = unit.text.trim();
    for (final c in [name, price, unit]) {
      c.dispose();
    }
    if (ok != true || nameText.isEmpty) return;
    try {
      await _repo.saveService(
        id: existing?.id,
        nameUz: nameText,
        price: priceValue,
        measurementUnit: unitText.isEmpty ? 'dona' : unitText,
      );
      _notify('Saqlandi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Future<void> _deleteService(ServiceCatalogItem s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Xizmat o'chirilsinmi?"),
        content: Text('${s.nameUz} katalogdan olib tashlanadi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.dangerColor),
            child: const Text("O'chirish"),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _repo.deleteService(s.id);
      _notify("O'chirildi");
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  /// SMS bildirishnomalari - yoqish/o'chirish va uchta shablon.
  ///
  /// Shablonlarda o'zgaruvchilar ishlatiladi: {client}, {order_id}, {price},
  /// {worker}, {worker_phone}. Ular yuborishdan oldin haqiqiy qiymatlarga
  /// almashtiriladi.
  Widget _smsTab() {
    final c = _company;
    if (c == null) {
      return const EmptyState(icon: LucideIcons.messageSquare, message: "Ma'lumot yo'q");
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      children: [
        AppCard(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('SMS bildirishnomalar',
                        style: TextStyle(
                            fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                    const SizedBox(height: 2),
                    Text(
                      c.smsEnabled ? 'Yoqilgan' : "O'chirilgan",
                      style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: c.smsEnabled ? AppTheme.primary : AppTheme.textMuted),
                    ),
                  ],
                ),
              ),
              Switch(
                value: c.smsEnabled,
                onChanged: (v) async {
                  try {
                    await _repo.updateCompany({'smsEnabled': v});
                    _notify(v ? 'SMS yoqildi' : "SMS o'chirildi");
                    _load();
                  } catch (e) {
                    _notify(e.toString(), error: true);
                  }
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        _smsTemplate('Buyurtma ochilganda', c.smsCreated, 'smsTemplateCreated'),
        const SizedBox(height: 8),
        _smsTemplate('Xodim biriktirilganda', c.smsAssigned, 'smsTemplateAssigned'),
        const SizedBox(height: 8),
        _smsTemplate('Buyurtma yopilganda', c.smsCompleted, 'smsTemplateCompleted'),
        const SizedBox(height: 14),
        const Text(
          "O'zgaruvchilar: {client}, {order_id}, {price}, {worker}, {worker_phone} — "
          "yuborishdan oldin haqiqiy qiymatlarga almashtiriladi.",
          style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _smsTemplate(String label, String value, String field) {
    return AppCard(
      onTap: () => _editSmsTemplate(label, value, field),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 12.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              ),
              const Icon(LucideIcons.pencil, size: 14, color: AppTheme.textMuted),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            value.trim().isEmpty ? "(shablon kiritilmagan)" : value,
            style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: value.trim().isEmpty ? AppTheme.textMuted : AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  Future<void> _editSmsTemplate(String label, String current, String field) async {
    final ctrl = TextEditingController(text: current);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(label),
        content: TextField(
          controller: ctrl,
          maxLines: 4,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Hurmatli {client}, buyurtmangiz qabul qilindi.',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Saqlash')),
        ],
      ),
    );
    final text = ctrl.text;
    ctrl.dispose();
    if (ok != true) return;
    try {
      await _repo.updateCompany({field: text.trim()});
      _notify('Shablon saqlandi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  /// Statuslar - qo'shish, tahrirlash, o'chirish va TARTIBNI SURISH.
  ///
  /// Tartib muhim: buyurtma shu ketma-ketlik bo'yicha bosqichdan bosqichga
  /// o'tadi va yangi buyurtma har doim BIRINCHI statusdan boshlanadi.
  Widget _statusesTab() {
    return Stack(
      children: [
        if (_statuses.isEmpty)
          const EmptyState(icon: LucideIcons.checkCircle2, message: 'Status topilmadi.')
        else
          ReorderableListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
            itemCount: _statuses.length,
            onReorder: _reorderStatus,
            itemBuilder: (_, i) {
              final s = _statuses[i];
              return Padding(
                key: ValueKey(s.id),
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  child: Row(
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration:
                            BoxDecoration(color: _parseColor(s.colorCode), shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s.nameUz,
                                style: const TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary)),
                            Text('${i + 1}-bosqich',
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: AppTheme.textMuted,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                      PopupMenuButton<String>(
                        padding: EdgeInsets.zero,
                        icon: const Icon(LucideIcons.moreVertical,
                            size: 17, color: AppTheme.textSecondary),
                        onSelected: (v) {
                          if (v == 'edit') _editStatus(s);
                          if (v == 'delete') _deleteStatus(s);
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(value: 'edit', child: Text('Tahrirlash')),
                          PopupMenuItem(value: 'delete', child: Text("O'chirish")),
                        ],
                      ),
                      const Icon(LucideIcons.gripVertical, size: 16, color: AppTheme.textMuted),
                    ],
                  ),
                ),
              );
            },
          ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton(
            heroTag: 'status-add',
            onPressed: () => _editStatus(null),
            backgroundColor: AppTheme.primary,
            child: const Icon(LucideIcons.plus, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Future<void> _reorderStatus(int oldIndex, int newIndex) async {
    // ReorderableListView pastga surishda indeksni bittaga oshirib beradi.
    if (newIndex > oldIndex) newIndex -= 1;

    final list = List<StatusItem>.from(_statuses);
    final moved = list.removeAt(oldIndex);
    list.insert(newIndex, moved);

    // Avval ekranda ko'rsatamiz (kutish bo'lmasin), keyin serverga yozamiz.
    setState(() => _statuses = list);
    try {
      await _repo.reorderStatuses(list.map((s) => s.id).toList());
      _notify('Tartib saqlandi');
    } catch (e) {
      _notify(e.toString(), error: true);
      _load(); // muvaffaqiyatsiz bo'lsa serverdagi haqiqiy tartibni tiklaymiz
    }
  }

  static const _statusColors = [
    '#3b82f6', '#0B6B4F', '#D9852B', '#6D5BD0',
    '#0E9488', '#C2643A', '#D2513F', '#182534',
  ];

  Future<void> _editStatus(StatusItem? existing) async {
    final ctrl = TextEditingController(text: existing?.nameUz ?? '');
    var color = existing?.colorCode ?? _statusColors.first;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(existing == null ? 'Yangi status' : 'Statusni tahrirlash'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: ctrl,
                autofocus: true,
                decoration: const InputDecoration(labelText: 'Nomi'),
              ),
              const SizedBox(height: 14),
              const Text('Rang',
                  style: TextStyle(
                      fontSize: 11.5, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _statusColors.map((hex) {
                  final selected = hex.toLowerCase() == color.toLowerCase();
                  return GestureDetector(
                    onTap: () => setLocal(() => color = hex),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: _parseColor(hex),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? AppTheme.textPrimary : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Saqlash')),
          ],
        ),
      ),
    );

    final name = ctrl.text.trim();
    ctrl.dispose();
    if (ok != true || name.isEmpty) return;

    try {
      await _repo.saveStatus(id: existing?.id, nameUz: name, colorCode: color);
      _notify('Saqlandi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Future<void> _deleteStatus(StatusItem s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Status o'chirilsinmi?"),
        content: Text('${s.nameUz} o\'chiriladi. Bu statusdagi buyurtmalar bo\'lsa, '
            'server o\'chirishga ruxsat bermasligi mumkin.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.dangerColor),
            child: const Text("O'chirish"),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _repo.deleteStatus(s.id);
      _notify("O'chirildi");
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  /// Huquq kalitining o'zbekcha nomi. Web paneldagi tarjimalar bilan bir xil.
  static const _permLabels = {
    'web_login': 'Veb panelga kirish',
    'clients': 'Mijozlar',
    'employees': 'Xodimlar',
    'orders': 'Buyurtmalar',
    'finance': 'Moliya',
    'salaries': 'Ish haqi',
    'settings': 'Sozlamalar',
    'map': 'Xarita',
    'telephony': 'Telefoniya',
    'mobile_orders': 'Mobil: buyurtmalar',
    'mobile_gps': 'Mobil: GPS kuzatuv',
    'mobile_finance_view': 'Mobil: moliyani ko\'rish',
    'mobile_team_view': 'Mobil: jamoa ro\'yxati',
    'mobile_chat': 'Mobil: chat',
    'mobile_salary_view': 'Mobil: ish haqini ko\'rish',
    'assign_measurement_unit': 'O\'lchov birligi berish',
    'update_order_status': 'Statusni o\'zgartirish',
    'write_order_notes': 'Izoh yozish',
    'set_order_price': 'Narx belgilash',
    'record_income': 'Kirim qilish',
    'record_expense': 'Chiqim qilish',
  };

  /// Huquqlarni guruhlash - 21 ta kalit bitta uzun ro'yxatda tushunarsiz
  /// bo'lardi (web panelda ham shu sababdan guruhlangan).
  static const _permGroups = [
    ('Tizimga kirish', ['web_login']),
    ('Admin panel bo\'limlari',
        ['clients', 'employees', 'orders', 'finance', 'salaries', 'settings', 'map', 'telephony']),
    ('Mobil ilova bo\'limlari', [
      'mobile_orders', 'mobile_gps', 'mobile_finance_view',
      'mobile_team_view', 'mobile_chat', 'mobile_salary_view'
    ]),
    ('Alohida amallar', [
      'assign_measurement_unit', 'update_order_status', 'write_order_notes',
      'set_order_price', 'record_income', 'record_expense'
    ]),
  ];

  /// Rol huquqlarini tahrirlash. Tizim rollari QULFLANGAN - backend ularni
  /// o'zgartirishga 403 qaytaradi, shuning uchun UI da ham ochilmaydi.
  Future<void> _editRole(RoleItem role) async {
    if (role.isSystem) {
      _notify('Tizim rolini o\'zgartirib bo\'lmaydi', error: true);
      return;
    }

    List<String> keys;
    try {
      keys = await _repo.fetchPermissionKeys();
    } catch (e) {
      _notify(e.toString(), error: true);
      return;
    }
    if (!mounted) return;

    final draft = <String, bool>{
      for (final k in keys) k: role.permissions[k] ?? false,
    };

    // Guruhlarga kirmagan yangi kalitlar ham ko'rinishi kerak.
    final grouped = _permGroups.expand((g) => g.$2).toSet();
    final rest = keys.where((k) => !grouped.contains(k)).toList();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => Container(
          decoration: const BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
          ),
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.88),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(role.nameUz,
                  style: const TextStyle(
                      fontFamily: 'Outfit', fontSize: 18, fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary)),
              Text('${draft.values.where((v) => v).length} / ${keys.length} huquq yoqilgan',
                  style: const TextStyle(
                      fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.primary)),
              const SizedBox(height: 10),
              Expanded(
                child: ListView(
                  children: [
                    for (final g in _permGroups)
                      ..._permGroupTiles(g.$1, g.$2.where(keys.contains).toList(), draft, setLocal),
                    if (rest.isNotEmpty)
                      ..._permGroupTiles('Boshqa huquqlar', rest, draft, setLocal),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              AppButton('Saqlash', onTap: () => Navigator.pop(ctx, true)),
            ],
          ),
        ),
      ),
    );

    if (saved != true) return;
    try {
      await _repo.saveRolePermissions(
        id: role.id,
        nameUz: role.nameUz,
        nameRu: role.nameRu.isEmpty ? role.nameUz : role.nameRu,
        nameEn: role.nameEn.isEmpty ? role.nameUz : role.nameEn,
        permissions: draft,
      );
      _notify('Huquqlar saqlandi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  List<Widget> _permGroupTiles(
    String title,
    List<String> keys,
    Map<String, bool> draft,
    void Function(void Function()) setLocal,
  ) {
    if (keys.isEmpty) return const [];
    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(4, 12, 4, 6),
        child: Text(title.toUpperCase(),
            style: const TextStyle(
                fontSize: 9.5, fontWeight: FontWeight.w800,
                color: AppTheme.textMuted, letterSpacing: 0.5)),
      ),
      for (final k in keys)
        SwitchListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          value: draft[k] ?? false,
          title: Text(_permLabels[k] ?? k,
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          onChanged: (v) => setLocal(() => draft[k] = v),
        ),
    ];
  }

  Widget _rolesTab() {
    if (_roles.isEmpty) {
      return const EmptyState(icon: LucideIcons.shield, message: 'Rol topilmadi.');
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      itemCount: _roles.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final r = _roles[i];
        return AppCard(
          onTap: r.isSystem ? null : () => _editRole(r),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.nameUz,
                        style: const TextStyle(
                            fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                    const SizedBox(height: 3),
                    MetaLine(LucideIcons.key, '${r.grantedCount} ta huquq yoqilgan'),
                  ],
                ),
              ),
              StatusPill(r.isSystem ? 'Tizim' : 'Maxsus', r.isSystem ? AppTheme.textMuted : AppTheme.primary),
            ],
          ),
        );
      },
    );
  }
}
