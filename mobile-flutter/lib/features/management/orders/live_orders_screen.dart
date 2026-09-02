import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'orders_admin_repository.dart';

/// Real vaqtdagi buyurtmalar - kompaniyaga tushayotgan buyurtmalarni
/// KUZATISH uchun alohida ekran (to'liq boshqaruv "Buyurtmalar" tabida).
///
/// "Real vaqt" REST so'rovlarni davriy TAKRORLASH orqali amalga oshiriladi
/// (WebSocket infratuzilmasi loyihada faqat telefoniya uchun bor va bu
/// yerga ulash xavfli/keragidan ortiq bo'lardi). So'nggi 10 daqiqada
/// yaratilgan buyurtmalar "YANGI" belgisi bilan ajratiladi.
class LiveOrdersScreen extends StatefulWidget {
  const LiveOrdersScreen({super.key});

  @override
  State<LiveOrdersScreen> createState() => _LiveOrdersScreenState();
}

class _LiveOrdersScreenState extends State<LiveOrdersScreen> {
  final _repo = OrdersAdminRepository();
  static final _money = NumberFormat.decimalPattern('uz');
  static final _time = DateFormat('HH:mm');
  static const _pollInterval = Duration(seconds: 15);
  static const _newThreshold = Duration(minutes: 10);

  Timer? _timer;
  List<AdminOrder> _orders = [];
  bool _loading = true;
  String? _error;
  DateTime? _lastRefreshed;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final list = await _repo.fetchAll();
      if (!mounted) return;
      setState(() {
        _orders = list;
        _loading = false;
        _lastRefreshed = DateTime.now();
      });
    } catch (e) {
      if (!mounted) return;
      // Jimgina yangilash muvaffaqiyatsiz bo'lsa, ekrandagi mavjud
      // ro'yxatni xato bilan almashtirmaymiz - tarmoq bir zumga uzilsa
      // ekran bekorga bo'shab qolmasin.
      if (silent) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  bool _isNew(AdminOrder o) =>
      o.createdAt != null && DateTime.now().difference(o.createdAt!) < _newThreshold;

  Future<void> _call(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return;
    final uri = Uri.parse('tel:$digits');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Color _parseColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return AppTheme.blue;
    return Color(cleaned.length == 6 ? 0xFF000000 + value : value);
  }

  @override
  Widget build(BuildContext context) {
    final newCount = _orders.where(_isNew).length;

    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      appBar: AppBar(
        title: Row(
          children: [
            // Pulsatsiya qiluvchi jonli belgi - ekran avtomatik yangilanib
            // turganini ko'rsatadi.
            const _LivePulseDot(),
            const SizedBox(width: 8),
            const Text('Jonli buyurtmalar'),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => _load(),
            icon: const Icon(LucideIcons.refreshCw, size: 19),
            tooltip: 'Yangilash',
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: AppTheme.surfaceOf(context),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: Row(
              children: [
                Text(
                  newCount > 0
                      ? '$newCount ta yangi buyurtma (so\'nggi 10 daqiqada)'
                      : 'So\'nggi 10 daqiqada yangi buyurtma yo\'q',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: newCount > 0 ? AppTheme.primary : AppTheme.textMutedOf(context),
                  ),
                ),
                const Spacer(),
                if (_lastRefreshed != null)
                  Text(
                    'Yangilandi: ${_time.format(_lastRefreshed!)}',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppTheme.textMutedOf(context)),
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
    if (_error != null) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: [
          const SizedBox(height: 60),
          EmptyState(icon: LucideIcons.alertTriangle, message: _error!),
        ]),
      );
    }
    if (_orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: const [
          SizedBox(height: 60),
          EmptyState(icon: LucideIcons.inbox, message: "Hali buyurtma yo'q."),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
        itemCount: _orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final o = _orders[i];
          final color = _parseColor(o.statusColor);
          final isNew = _isNew(o);
          return AppCard(
            highlight: isNew,
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration:
                      BoxDecoration(color: color.withValues(alpha: 0.13), borderRadius: BorderRadius.circular(AppTheme.rMd)),
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
                          if (isNew) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: const Text('YANGI',
                                  style: TextStyle(
                                      fontSize: 8.5, fontWeight: FontWeight.w800, color: Colors.white)),
                            ),
                          ],
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
                          const Spacer(),
                          if (o.price > 0)
                            Text("${_money.format(o.price.round())} so'm",
                                style: const TextStyle(
                                    fontSize: 11.5, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                        ],
                      ),
                    ],
                  ),
                ),
                if (o.clientPhone.isNotEmpty) ...[
                  const SizedBox(width: 4),
                  IconButton(
                    onPressed: () => _call(o.clientPhone),
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(LucideIcons.phoneCall, size: 17, color: AppTheme.primary),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Sekin pulsatsiya qiluvchi nuqta - "jonli" ekan degan tuyg'u beradi.
class _LivePulseDot extends StatefulWidget {
  const _LivePulseDot();

  @override
  State<_LivePulseDot> createState() => _LivePulseDotState();
}

class _LivePulseDotState extends State<_LivePulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.35, end: 1.0).animate(_ctrl),
      child: Container(
        width: 9,
        height: 9,
        decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle),
      ),
    );
  }
}
