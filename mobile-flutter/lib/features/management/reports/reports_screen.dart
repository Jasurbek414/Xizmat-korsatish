import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../finance/finance_repository.dart';
import '../orders/orders_admin_repository.dart';

/// Hisobotlar - OYLIK ko'rinishda: istalgan oyni tanlab (shu jumladan
/// o'tgan oylarni) o'sha davr uchun buyurtmalar, mijozlar, foyda va
/// kirim/chiqim ko'riladi. Kerak bo'lsa o'sha oyga yangi kirim/chiqim
/// ham shu yerdan kiritiladi (backend 2026-08-06 da eski sanaga yozishni
/// qo'llab-quvvatlaydigan qilindi - Order'dagi bilan bir xil naqsh).
///
/// MUHIM: sanalar MAHALLIY vaqt bo'yicha solishtiriladi (`toIso8601String()`
/// yoki UTC EMAS) - bu loyihada UTC+5 bilan bog'liq bir necha marta
/// takrorlangan xato (ertalabki yozuvlar oldingi kunga/oyga tushib
/// ketishi). Mijozlar soni MIJOZ ID orqali hisoblanadi, ism orqali EMAS -
/// 2026-08-04 da web panelda bir xil ismli mijozlar aralashib ketgan edi,
/// bu yerda o'sha xato TAKRORLANMAYDI. Status taqsimoti HAQIQIY
/// ma'lumotdan yig'iladi, inglizcha nom taxmin qilinmaydi.
class ReportsScreen extends StatefulWidget {
  final Permissions permissions;
  const ReportsScreen({super.key, required this.permissions});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final _ordersRepo = OrdersAdminRepository();
  final _financeRepo = FinanceRepository();
  static final _money = NumberFormat.decimalPattern('uz');

  static const _monthsUz = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  List<AdminOrder> _orders = [];
  List<TxRecord> _txs = [];
  bool _loading = true;
  String? _error;

  late int _year;
  late int _month;
  bool _yearly = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _year = now.year;
    _month = now.month;
    _load();
  }

  bool get _isCurrentMonth {
    final now = DateTime.now();
    return _year == now.year && _month == now.month;
  }

  bool get _isCurrentYear => _year == DateTime.now().year;

  String get _periodLabel => _yearly ? '$_year' : '${_monthsUz[_month - 1]} $_year';

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final p = widget.permissions;
    try {
      final results = await Future.wait([
        p.canManageOrders ? _ordersRepo.fetchAll() : Future.value(<AdminOrder>[]),
        p.canManageFinance ? _financeRepo.fetchTransactions() : Future.value(<TxRecord>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _orders = results[0] as List<AdminOrder>;
        _txs = results[1] as List<TxRecord>;
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

  void _shiftMonth(int delta) {
    var y = _year;
    var m = _month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    final now = DateTime.now();
    // Kelajak davrga o'tishga ATAYIN ruxsat yo'q - hisobot faqat o'tgan va
    // joriy davr uchun ma'noli.
    if (y > now.year || (y == now.year && m > now.month)) return;
    setState(() {
      _year = y;
      _month = m;
    });
  }

  void _shiftYear(int delta) {
    final y = _year + delta;
    if (y > DateTime.now().year) return;
    setState(() => _year = y);
  }

  /// Davr ichidami - rejimga qarab OY+YIL yoki faqat YIL solishtiriladi.
  bool _inSelectedPeriod(DateTime? d) {
    if (d == null) return false;
    if (_yearly) return d.year == _year;
    return d.year == _year && d.month == _month;
  }

  List<AdminOrder> get _monthOrders => _orders.where((o) => _inSelectedPeriod(o.createdAt)).toList();
  List<TxRecord> get _monthTxs => _txs.where((t) => _inSelectedPeriod(t.createdAt)).toList();

  /// Yillik rejimda - har bir oy uchun buyurtma soni va sof foyda
  /// (kirim - chiqim). Faqat tanlangan YIL ichidagi ma'lumotdan hisoblanadi.
  List<({int month, int orderCount, double profit})> get _monthlyBreakdown {
    return List.generate(12, (i) {
      final m = i + 1;
      final orderCount = _orders.where((o) => o.createdAt != null && o.createdAt!.year == _year && o.createdAt!.month == m).length;
      final inc = _txs
          .where((t) => t.isIncome && t.createdAt != null && t.createdAt!.year == _year && t.createdAt!.month == m)
          .fold(0.0, (s, t) => s + t.amount);
      final exp = _txs
          .where((t) => !t.isIncome && t.createdAt != null && t.createdAt!.year == _year && t.createdAt!.month == m)
          .fold(0.0, (s, t) => s + t.amount);
      return (month: m, orderCount: orderCount, profit: inc - exp);
    });
  }

  int get _clientCount =>
      _monthOrders.map((o) => o.clientId).where((id) => id.isNotEmpty).toSet().length;

  double get _income => _monthTxs.where((t) => t.isIncome).fold(0, (s, t) => s + t.amount);
  double get _expense => _monthTxs.where((t) => !t.isIncome).fold(0, (s, t) => s + t.amount);
  double get _profit => _income - _expense;
  double get _orderValue => _monthOrders.fold(0, (s, o) => s + o.price);

  List<MapEntry<String, ({int count, Color color})>> get _byStatus {
    final map = <String, ({int count, Color color})>{};
    for (final o in _monthOrders) {
      final key = o.statusLabel.isEmpty ? 'Statussiz' : o.statusLabel;
      final color = _parseColor(o.statusColor);
      final existing = map[key];
      map[key] = (count: (existing?.count ?? 0) + 1, color: color);
    }
    final list = map.entries.toList()..sort((a, b) => b.value.count.compareTo(a.value.count));
    return list;
  }

  List<MapEntry<String, int>> get _topServices {
    final map = <String, int>{};
    for (final o in _monthOrders) {
      if (o.serviceName.isEmpty) continue;
      map[o.serviceName] = (map[o.serviceName] ?? 0) + 1;
    }
    final list = map.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return list.take(5).toList();
  }

  Color _parseColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return AppTheme.blue;
    return Color(cleaned.length == 6 ? 0xFF000000 + value : value);
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

  Future<void> _openAddTx() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _MonthTxFormSheet(
        repo: _financeRepo,
        year: _year,
        month: _month,
        monthLabel: '${_monthsUz[_month - 1]} $_year',
      ),
    );
    if (saved == true) {
      _notify("$_year-${_month.toString().padLeft(2, '0')} uchun yozuv qo'shildi");
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.permissions;
    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      appBar: AppBar(title: const Text('Hisobotlar')),
      floatingActionButton: p.canManageFinance
          ? FloatingActionButton(
              onPressed: _openAddTx,
              backgroundColor: AppTheme.primary,
              child: const Icon(LucideIcons.plus, color: Colors.white),
            )
          : null,
      body: Column(
        children: [
          _monthNavigator(),
          Expanded(
            child: _loading
                ? const OrderListSkeleton()
                : _error != null
                    ? EmptyState(icon: LucideIcons.alertTriangle, message: _error!)
                    : RefreshIndicator(onRefresh: _load, child: _body()),
          ),
        ],
      ),
    );
  }

  Widget _monthNavigator() {
    return Container(
      width: double.infinity,
      color: AppTheme.surfaceOf(context),
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: () => _yearly ? _shiftYear(-1) : _shiftMonth(-1),
                icon: const Icon(LucideIcons.chevronLeft, size: 20),
              ),
              SizedBox(
                width: 160,
                child: Text(
                  _periodLabel,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontFamily: 'Outfit', fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ),
              IconButton(
                onPressed: (_yearly ? _isCurrentYear : _isCurrentMonth) ? null : () => _yearly ? _shiftYear(1) : _shiftMonth(1),
                icon: const Icon(LucideIcons.chevronRight, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Oylik / yillik almashtirgich - "istalgan oydagi" va "yillik
          // to'liq" hisobot ikkalasi ham so'ralgan edi.
          SegmentedButton<bool>(
            style: const ButtonStyle(visualDensity: VisualDensity.compact),
            segments: const [
              ButtonSegment(value: false, label: Text('Oylik'), icon: Icon(LucideIcons.calendar, size: 14)),
              ButtonSegment(value: true, label: Text('Yillik'), icon: Icon(LucideIcons.calendarRange, size: 14)),
            ],
            selected: {_yearly},
            onSelectionChanged: (s) => setState(() => _yearly = s.first),
          ),
        ],
      ),
    );
  }

  Widget _body() {
    final p = widget.permissions;
    final statuses = _byStatus;
    final services = _topServices;
    final maxStatusCount = statuses.isEmpty ? 1 : statuses.first.value.count;

    if (!p.canManageOrders && !p.canManageFinance) {
      return ListView(children: const [
        SizedBox(height: 60),
        EmptyState(icon: LucideIcons.barChart2, message: "Hisobot uchun ruxsat yo'q."),
      ]);
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
      children: [
        if (p.canManageOrders) ...[
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.7,
            children: [
              StatTile(
                icon: LucideIcons.clipboardList,
                value: '${_monthOrders.length}',
                label: 'Buyurtmalar',
                color: AppTheme.blue,
                soft: AppTheme.blueSoft,
                width: double.infinity,
              ),
              StatTile(
                icon: LucideIcons.users,
                value: '$_clientCount',
                label: 'Mijozlar',
                color: AppTheme.purple,
                soft: AppTheme.purpleSoft,
                width: double.infinity,
              ),
            ],
          ),
          const SizedBox(height: 8),
          AppCard(
            child: Row(
              children: [
                Text('Buyurtmalar qiymati',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondaryOf(context))),
                const Spacer(),
                Text("${_money.format(_orderValue.round())} so'm",
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.primary)),
              ],
            ),
          ),
          const SizedBox(height: 18),
        ],
        if (p.canManageFinance) ...[
          const _SectionTitle('Moliya'),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: _profit >= 0
                    ? const [AppTheme.primaryDark, AppTheme.primary]
                    : [AppTheme.dangerColor.withValues(alpha: 0.85), AppTheme.dangerColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AppTheme.rLg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sof foyda',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.white70)),
                const SizedBox(height: 3),
                Text("${_money.format(_profit.round())} so'm",
                    style: const TextStyle(
                        fontFamily: 'Outfit', fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _WhiteMiniStat(
                          icon: LucideIcons.arrowDownLeft, label: 'Kirim', value: _money.format(_income.round())),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _WhiteMiniStat(
                          icon: LucideIcons.arrowUpRight, label: 'Chiqim', value: _money.format(_expense.round())),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
        ],
        if (statuses.isNotEmpty) ...[
          const _SectionTitle('Status taqsimoti'),
          const SizedBox(height: 8),
          AppCard(
            child: Column(
              children: [
                for (final e in statuses)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(e.key,
                                  style: TextStyle(
                                      fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimaryOf(context))),
                            ),
                            Text('${e.value.count}',
                                style: TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.w800, color: e.value.color)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: e.value.count / maxStatusCount,
                            minHeight: 6,
                            backgroundColor: AppTheme.surfaceAltOf(context),
                            valueColor: AlwaysStoppedAnimation(e.value.color),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
        ],
        if (services.isNotEmpty) ...[
          const _SectionTitle("Ko'p buyurtma qilingan xizmatlar"),
          const SizedBox(height: 8),
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < services.length; i++) ...[
                  if (i > 0) const Divider(height: 18),
                  Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: AppTheme.primarySoft, shape: BoxShape.circle),
                        child: Text('${i + 1}',
                            style: const TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(services[i].key,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 12.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimaryOf(context))),
                      ),
                      Text('${services[i].value} ta',
                          style: TextStyle(
                              fontSize: 11.5, fontWeight: FontWeight.w700, color: AppTheme.textMutedOf(context))),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (p.canManageOrders && _monthOrders.isEmpty && p.canManageFinance && _monthTxs.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 30),
            child: EmptyState(icon: LucideIcons.calendarX, message: 'Bu oy uchun maʼlumot yoʻq.'),
          ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: TextStyle(fontFamily: 'Outfit', fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.textPrimaryOf(context)),
      );
}

class _WhiteMiniStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _WhiteMiniStat({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppTheme.rMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 13, color: Colors.white),
            const SizedBox(width: 5),
            Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white70)),
          ]),
          const SizedBox(height: 4),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
        ],
      ),
    );
  }
}

/// Tanlangan OYGA kirim/chiqim qo'shish formasi. Sana shu oy ichida
/// tanlanadi (joriy oy bo'lsa - bugungacha, o'tgan oy bo'lsa - oyning
/// istalgan kunigacha).
class _MonthTxFormSheet extends StatefulWidget {
  final FinanceRepository repo;
  final int year;
  final int month;
  final String monthLabel;

  const _MonthTxFormSheet({
    required this.repo,
    required this.year,
    required this.month,
    required this.monthLabel,
  });

  @override
  State<_MonthTxFormSheet> createState() => _MonthTxFormSheetState();
}

class _MonthTxFormSheetState extends State<_MonthTxFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _desc = TextEditingController();
  String _type = 'INCOME';
  String _category = 'ORDER_PAYMENT';
  late DateTime _day;
  bool _saving = false;
  String? _error;

  static const _categories = {
    'ORDER_PAYMENT': "Buyurtma to'lovi",
    'SALARY': 'Ish haqi',
    'OFFICE_EXPENSE': 'Ofis xarajati',
    'TRANSPORT': 'Transport',
    'MATERIAL': 'Material',
    'OTHER': 'Boshqa',
  };

  DateTime get _monthEnd => DateTime(widget.year, widget.month + 1, 0);
  DateTime get _maxSelectable {
    final now = DateTime.now();
    final monthEnd = _monthEnd;
    return monthEnd.isBefore(now) ? monthEnd : now;
  }

  @override
  void initState() {
    super.initState();
    _day = _maxSelectable;
  }

  @override
  void dispose() {
    _amount.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pickDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: DateTime(widget.year, widget.month, 1),
      lastDate: _maxSelectable,
    );
    if (picked != null) setState(() => _day = picked);
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.repo.createTransaction(
        type: _type,
        amount: double.parse(_amount.text.replaceAll(RegExp(r'[^0-9.]'), '')),
        category: _category,
        description: _desc.text.trim(),
        backdate: _day,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom +
              MediaQuery.of(context).padding.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('${widget.monthLabel} uchun yozuv',
                    style: TextStyle(
                        fontFamily: 'Outfit', fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textPrimaryOf(context))),
                const SizedBox(height: 14),
                if (_error != null) ...[
                  Text(_error!,
                      style: const TextStyle(color: AppTheme.dangerColor, fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                ],
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'INCOME', label: Text('Kirim'), icon: Icon(LucideIcons.arrowDownLeft, size: 15)),
                    ButtonSegment(value: 'EXPENSE', label: Text('Chiqim'), icon: Icon(LucideIcons.arrowUpRight, size: 15)),
                  ],
                  selected: {_type},
                  onSelectionChanged: (s) => setState(() => _type = s.first),
                ),
                const FieldLabel('Sana'),
                OutlinedButton.icon(
                  onPressed: _pickDay,
                  icon: const Icon(LucideIcons.calendar, size: 16),
                  label: Text(
                    '${_day.day.toString().padLeft(2, '0')}.${_day.month.toString().padLeft(2, '0')}.${_day.year}',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                  ),
                ),
                const FieldLabel('Summa'),
                TextFormField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: '0', border: OutlineInputBorder()),
                  validator: (v) {
                    final n = double.tryParse((v ?? '').replaceAll(RegExp(r'[^0-9.]'), ''));
                    if (n == null || n <= 0) return "To'g'ri summa kiriting";
                    return null;
                  },
                ),
                const FieldLabel('Kategoriya'),
                DropdownButtonFormField<String>(
                  value: _category,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: _categories.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (v) => setState(() => _category = v ?? _category),
                ),
                const FieldLabel('Izoh'),
                TextFormField(
                  controller: _desc,
                  decoration: const InputDecoration(hintText: 'Qisqacha tavsif', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 18),
                AppButton(_saving ? 'Saqlanmoqda...' : 'Saqlash', onTap: _saving ? null : _save, loading: _saving),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
