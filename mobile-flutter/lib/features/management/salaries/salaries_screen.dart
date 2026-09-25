import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'salaries_repository.dart';

/// Ish haqi bo'limi - web paneldagi "Ish Haqlari" ning mobil varianti:
/// xodimlar bo'yicha hisoblar, davr uchun hisob yaratish, to'lash va chegirma.
class SalariesScreen extends StatefulWidget {
  const SalariesScreen({super.key});

  @override
  State<SalariesScreen> createState() => _SalariesScreenState();
}

class _SalariesScreenState extends State<SalariesScreen> {
  final _repo = SalariesRepository();
  static final _money = NumberFormat.decimalPattern('uz');

  List<SalaryRecord> _items = [];
  bool _loading = true;
  String? _error;

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
      final list = await _repo.fetchAll();
      if (!mounted) return;
      setState(() {
        _items = list;
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

  double get _unpaidTotal =>
      _items.where((s) => !s.isPaid).fold<double>(0, (sum, s) => sum + s.net);

  /// Joriy oy uchun hisob yaratish. Backend allaqachon yaratilganlarini
  /// o'tkazib yuboradi, shuning uchun takror bosish xavfsiz.
  Future<void> _generate() async {
    final now = DateTime.now();
    final period = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hisob yaratish'),
        content: Text('$period oyi uchun barcha xodimga ish haqi hisobi yaratilsinmi?\n\n'
            'Allaqachon yaratilgan hisoblar takrorlanmaydi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yaratish')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final msg = await _repo.generate(period);
      _notify(msg);
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Future<void> _pay(SalaryRecord s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("To'lov"),
        content: Text(
          "${s.employeeName} uchun ${_money.format(s.net.round())} so'm "
          "to'langan deb belgilansinmi?",
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("To'landi")),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _repo.pay(s.id);
      _notify("To'lov qayd etildi");
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  Future<void> _deduct(SalaryRecord s) async {
    final amountCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Chegirma / Avans'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Summa'),
            ),
            TextField(
              controller: reasonCtrl,
              decoration: const InputDecoration(labelText: 'Sabab'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Qo'shish")),
        ],
      ),
    );
    final amount = double.tryParse(amountCtrl.text.replaceAll(RegExp(r'[^0-9.]'), ''));
    amountCtrl.dispose();
    final reason = reasonCtrl.text.trim();
    reasonCtrl.dispose();
    if (ok != true || amount == null || amount <= 0) return;
    try {
      await _repo.addDeduction(s.id, amount, reason);
      _notify("Chegirma qo'shildi");
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: const Text('Ish haqi'),
        actions: [
          IconButton(
            onPressed: _generate,
            icon: const Icon(LucideIcons.filePlus, size: 20),
            tooltip: 'Joriy oy uchun hisob yaratish',
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: AppTheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("To'lanishi kutilayotgan",
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                const SizedBox(height: 2),
                Text(
                  _loading ? '...' : "${_money.format(_unpaidTotal.round())} so'm",
                  style: const TextStyle(
                      fontFamily: 'Outfit', fontSize: 21, fontWeight: FontWeight.w800, color: AppTheme.amber),
                ),
              ],
            ),
          ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const OrderListSkeleton();
    if (_error != null) return EmptyState(icon: LucideIcons.alertTriangle, message: _error!);
    if (_items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: const [
          SizedBox(height: 60),
          EmptyState(
            icon: LucideIcons.banknote,
            message: "Hali ish haqi hisobi yaratilmagan.\nYuqoridagi tugma bilan joriy oy uchun yarating.",
          ),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final s = _items[i];
          return AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s.employeeName.isEmpty ? '(nomsiz xodim)' : s.employeeName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          ),
                          const SizedBox(height: 3),
                          MetaLine(LucideIcons.calendar, s.payPeriod),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          "${_money.format(s.net.round())} so'm",
                          style: const TextStyle(
                              fontSize: 14.5, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 3),
                        StatusPill(s.isPaid ? "To'langan" : "Kutilmoqda", s.isPaid ? AppTheme.primary : AppTheme.amber),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _chip('Asosiy', s.baseSalary),
                    const SizedBox(width: 6),
                    _chip('Bonus', s.bonus),
                    const SizedBox(width: 6),
                    _chip('Chegirma', -s.deductions),
                  ],
                ),
                if (!s.isPaid) ...[
                  const Divider(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        onPressed: () => _deduct(s),
                        icon: const Icon(LucideIcons.minusCircle, size: 15),
                        label: const Text('Chegirma', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 4),
                      TextButton.icon(
                        onPressed: () => _pay(s),
                        icon: const Icon(LucideIcons.checkCircle2, size: 15),
                        label: const Text("To'lash", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _chip(String label, double value) {
    final negative = value < 0;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: BoxDecoration(
          color: AppTheme.surfaceAlt,
          borderRadius: BorderRadius.circular(AppTheme.rSm),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
            const SizedBox(height: 2),
            Text(
              _money.format(value.abs().round()),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: negative ? AppTheme.dangerColor : AppTheme.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
