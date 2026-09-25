import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'finance_repository.dart';

/// Moliya bo'limi - web paneldagi "Buxgalteriya" ning mobil varianti.
///
/// Uch bo'lim: Kassa (barcha yozuvlar), Tasdiqlash kutilmoqda (haydovchi
/// topshirgan naqd pul) va Qarzlar. Byudjet va P&L hisobotlari ATAYIN
/// kiritilmagan - ular kengaytirilgan jadval va grafiklarga tayanadi,
/// telefonda o'qish qiyin; ular uchun veb-panel qulayroq.
class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> with SingleTickerProviderStateMixin {
  final _repo = FinanceRepository();
  late final TabController _tabs;

  static final _money = NumberFormat.decimalPattern('uz');
  static final _date = DateFormat('dd.MM.yyyy HH:mm');
  static const _months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  /// Tanlangan davr. `null` - butun tarix.
  /// Kun tanlanmasa faqat oy bo'yicha filtrlanadi.
  int? _year;
  int? _month;
  int? _day;

  bool get _hasPeriod => _year != null && _month != null;

  /// MUHIM: sana MAHALLIY vaqt bo'yicha solishtiriladi. `toUtc()` yoki
  /// `toIso8601String()` bilan kesish UTC+5 da ertalabki yozuvlarni oldingi
  /// kunga tashlab yuborardi (web tomonda ham xuddi shu tuzoqqa duch kelgan
  /// edik).
  bool _inPeriod(DateTime? d) {
    if (!_hasPeriod) return true;
    if (d == null) return false;
    if (d.year != _year || d.month != _month) return false;
    return _day == null || d.day == _day;
  }

  List<TxRecord> get _periodTxs => _txs.where((t) => _inPeriod(t.createdAt)).toList();

  /// Tanlangan davr uchun kirim/chiqim. Davr tanlanmagan bo'lsa serverdan
  /// kelgan umumiy statistika ishlatiladi (u tasdiqlangan yozuvlar bo'yicha
  /// hisoblanadi va aniqroq).
  FinanceStats get _periodStats {
    if (!_hasPeriod) return _stats;
    var inc = 0.0, exp = 0.0;
    for (final t in _periodTxs) {
      if (t.isIncome) {
        inc += t.amount;
      } else {
        exp += t.amount;
      }
    }
    return FinanceStats(income: inc, expense: exp, balance: inc - exp);
  }

  /// "Nima uchun" - kategoriya kesimida chiqimlar/kirimlar.
  Map<String, double> get _byCategory {
    final map = <String, double>{};
    for (final t in _periodTxs) {
      final key = t.category.isEmpty ? 'Boshqa' : t.category;
      map[key] = (map[key] ?? 0) + t.amount;
    }
    final sorted = map.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(sorted);
  }

  String get _periodLabel {
    if (!_hasPeriod) return 'Butun davr';
    final m = _months[_month! - 1];
    return _day == null ? '$m $_year' : '$_day-$m $_year';
  }

  /// Yozuvlar mavjud bo'lgan oylar - foydalanuvchi bo'sh oyni tanlab
  /// vaqt yo'qotmasligi uchun faqat shular ko'rsatiladi.
  List<({int year, int month})> get _availableMonths {
    final set = <String>{};
    final out = <({int year, int month})>[];
    for (final t in _txs) {
      final d = t.createdAt;
      if (d == null) continue;
      final key = '${d.year}-${d.month}';
      if (set.add(key)) out.add((year: d.year, month: d.month));
    }
    out.sort((a, b) => a.year == b.year ? b.month.compareTo(a.month) : b.year.compareTo(a.year));
    return out;
  }

  Future<void> _pickPeriod() async {
    final months = _availableMonths;
    await showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('Davrni tanlang',
                  style: TextStyle(fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800)),
            ),
            ListTile(
              leading: const Icon(LucideIcons.infinity, size: 18),
              title: const Text('Butun davr'),
              onTap: () {
                setState(() {
                  _year = null;
                  _month = null;
                  _day = null;
                });
                Navigator.pop(ctx);
              },
            ),
            const Divider(height: 1),
            for (final m in months)
              ListTile(
                leading: const Icon(LucideIcons.calendar, size: 18),
                title: Text('${_months[m.month - 1]} ${m.year}'),
                onTap: () {
                  setState(() {
                    _year = m.year;
                    _month = m.month;
                    _day = null;
                  });
                  Navigator.pop(ctx);
                },
              ),
          ],
        ),
      ),
    );
  }

  /// Oy tanlanganda o'sha oydagi kunlarni tanlash imkoni.
  Future<void> _pickDay() async {
    if (!_hasPeriod) return;
    final days = <int>{};
    for (final t in _txs) {
      final d = t.createdAt;
      if (d != null && d.year == _year && d.month == _month) days.add(d.day);
    }
    final sorted = days.toList()..sort();

    await showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('${_months[_month! - 1]} $_year - kun',
                  style: const TextStyle(fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800)),
            ),
            ListTile(
              title: const Text('Butun oy'),
              onTap: () {
                setState(() => _day = null);
                Navigator.pop(ctx);
              },
            ),
            const Divider(height: 1),
            for (final d in sorted)
              ListTile(
                title: Text('$d-${_months[_month! - 1]}'),
                onTap: () {
                  setState(() => _day = d);
                  Navigator.pop(ctx);
                },
              ),
          ],
        ),
      ),
    );
  }

  bool _loading = true;
  String? _error;
  FinanceStats _stats = const FinanceStats(income: 0, expense: 0, balance: 0);
  List<TxRecord> _txs = [];
  List<TxRecord> _pending = [];
  List<DebtRecord> _debts = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
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
      // Qarzlar endpointi ba'zi o'rnatmalarda bo'sh/xato qaytarishi mumkin -
      // u butun ekranni yiqitmasligi uchun alohida ushlanadi.
      final results = await Future.wait([
        _repo.fetchStats(),
        _repo.fetchTransactions(),
        _repo.fetchPending(),
        _repo.fetchDebts().catchError((_) => <DebtRecord>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _stats = results[0] as FinanceStats;
        _txs = results[1] as List<TxRecord>;
        _pending = results[2] as List<TxRecord>;
        _debts = results[3] as List<DebtRecord>;
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

  String _fmt(double v) => "${_money.format(v.round())} so'm";

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

  Future<void> _confirm(TxRecord tx) async {
    try {
      await _repo.confirmTransaction(tx.id);
      _notify('Kassaga qabul qilindi');
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Future<void> _openCreate() async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TxFormSheet(repo: _repo),
    );
    if (ok == true) {
      _notify("Yozuv qo'shildi");
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: const Text('Moliya'),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primary,
          labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
          tabs: [
            const Tab(text: 'Kassa'),
            Tab(text: 'Kutilmoqda${_pending.isEmpty ? '' : ' (${_pending.length})'}'),
            const Tab(text: 'Qarzlar'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreate,
        backgroundColor: AppTheme.primary,
        child: const Icon(LucideIcons.plus, color: Colors.white),
      ),
      body: Column(
        children: [
          _StatsHeader(stats: _periodStats, loading: _loading, fmt: _fmt),

          // Davr tanlagich: qaysi OY, qaysi KUN.
          Container(
            color: AppTheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickPeriod,
                    icon: const Icon(LucideIcons.calendar, size: 15),
                    label: Text(_periodLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
                if (_hasPeriod) ...[
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: _pickDay,
                    icon: const Icon(LucideIcons.calendarDays, size: 15),
                    label: Text(_day == null ? 'Kun' : '$_day-kun',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: _error != null
                ? EmptyState(icon: LucideIcons.alertTriangle, message: _error!)
                : TabBarView(
                    controller: _tabs,
                    children: [
                      _kassaTab(),
                      _txList(_pending, empty: "Tasdiqlash kutayotgan pul yo'q.", showConfirm: true),
                      _debtList(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  /// Kassa bo'limi: kategoriya kesimi ("nima uchun") + tanlangan davrdagi
  /// yozuvlar ro'yxati.
  Widget _kassaTab() {
    if (_loading) return const OrderListSkeleton();

    final cats = _byCategory;
    return Column(
      children: [
        if (cats.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Nima uchun',
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textMuted,
                        letterSpacing: 0.4)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: cats.entries
                      .take(6)
                      .map((e) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceAlt,
                              borderRadius: BorderRadius.circular(AppTheme.rSm),
                              border: Border.all(color: AppTheme.borderColor),
                            ),
                            child: Text(
                              '${_categoryLabel(e.key)} · ${_money.format(e.value.round())}',
                              style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary),
                            ),
                          ))
                      .toList(),
                ),
              ],
            ),
          ),
        Expanded(
          child: _txList(_periodTxs,
              empty: _hasPeriod
                  ? "$_periodLabel uchun yozuv yo'q."
                  : "Hali kassa yozuvi yo'q."),
        ),
      ],
    );
  }

  /// Backend kategoriya kalitlarini o'zbekcha nomga o'giradi.
  String _categoryLabel(String key) {
    switch (key.toUpperCase()) {
      case 'ORDER_PAYMENT':
        return 'Buyurtma';
      case 'SALARY':
        return 'Ish haqi';
      case 'OFFICE_EXPENSE':
        return 'Ofis';
      case 'TRANSPORT':
        return 'Transport';
      case 'MATERIAL':
        return 'Material';
      case 'OTHER':
        return 'Boshqa';
      default:
        return key;
    }
  }

  Widget _txList(List<TxRecord> items, {required String empty, bool showConfirm = false}) {
    if (_loading) return const OrderListSkeleton();
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: [const SizedBox(height: 60), EmptyState(icon: LucideIcons.wallet, message: empty)]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final tx = items[i];
          final color = tx.isIncome ? AppTheme.primary : AppTheme.orange;
          return AppCard(
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: tx.isIncome ? AppTheme.primarySoft : AppTheme.orangeSoft,
                    borderRadius: BorderRadius.circular(AppTheme.rMd),
                  ),
                  child: Icon(
                    tx.isIncome ? LucideIcons.arrowDownLeft : LucideIcons.arrowUpRight,
                    size: 17,
                    color: color,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tx.description.isEmpty ? tx.category : tx.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      MetaLine(
                        LucideIcons.clock,
                        [
                          if (tx.createdAt != null) _date.format(tx.createdAt!),
                          if (tx.workerName != null) tx.workerName!,
                        ].join(' · '),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${tx.isIncome ? '+' : '−'}${_money.format(tx.amount.round())}',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: color),
                    ),
                    if (showConfirm)
                      TextButton(
                        onPressed: () => _confirm(tx),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        child: const Text('Qabul qilish', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                      )
                    else if (tx.isPending)
                      const StatusPill('Kutilmoqda', AppTheme.amber),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _debtList() {
    if (_loading) return const OrderListSkeleton();
    if (_debts.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: const [SizedBox(height: 60), EmptyState(icon: LucideIcons.creditCard, message: "Faol qarz yo'q.")]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        itemCount: _debts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final d = _debts[i];
          final receivable = d.type.toUpperCase().startsWith('RECEIV');
          return AppCard(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        d.counterparty.isEmpty ? '(nomsiz)' : d.counterparty,
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      StatusPill(receivable ? 'Bizga qarzdor' : 'Biz qarzdormiz', receivable ? AppTheme.primary : AppTheme.orange),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _fmt(d.remaining),
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                    ),
                    Text(
                      'jami ${_money.format(d.amount.round())}',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatsHeader extends StatelessWidget {
  final FinanceStats stats;
  final bool loading;
  final String Function(double) fmt;

  const _StatsHeader({required this.stats, required this.loading, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppTheme.surface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Joriy balans', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 2),
          Text(
            loading ? '...' : fmt(stats.balance),
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: stats.balance < 0 ? AppTheme.dangerColor : AppTheme.primary,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(LucideIcons.arrowDownLeft, size: 13, color: AppTheme.primary),
              const SizedBox(width: 4),
              Text(loading ? '...' : fmt(stats.income),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary)),
              const SizedBox(width: 14),
              Icon(LucideIcons.arrowUpRight, size: 13, color: AppTheme.orange),
              const SizedBox(width: 4),
              Text(loading ? '...' : fmt(stats.expense),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.orange)),
            ],
          ),
        ],
      ),
    );
  }
}

class _TxFormSheet extends StatefulWidget {
  final FinanceRepository repo;
  const _TxFormSheet({required this.repo});

  @override
  State<_TxFormSheet> createState() => _TxFormSheetState();
}

class _TxFormSheetState extends State<_TxFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _desc = TextEditingController();
  String _type = 'INCOME';
  String _category = 'ORDER_PAYMENT';
  bool _saving = false;
  String? _error;

  static const _categories = {
    'ORDER_PAYMENT': 'Buyurtma to\'lovi',
    'SALARY': 'Ish haqi',
    'OFFICE_EXPENSE': 'Ofis xarajati',
    'TRANSPORT': 'Transport',
    'MATERIAL': 'Material',
    'OTHER': 'Boshqa',
  };

  @override
  void dispose() {
    _amount.dispose();
    _desc.dispose();
    super.dispose();
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
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Yangi yozuv',
                  style: TextStyle(fontFamily: 'Outfit', fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
              const SizedBox(height: 14),
              if (_error != null) ...[
                Text(_error!, style: const TextStyle(color: AppTheme.dangerColor, fontSize: 12, fontWeight: FontWeight.w600)),
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
                // DIQQAT: `value:` (`initialValue:` EMAS) - loyiha Flutter
                // 3.29 bilan quriladi, `initialValue` faqat 3.35+ da paydo
                // bo'lgan va bu yerda kompilyatsiya xatosi berardi.
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
    );
  }
}
