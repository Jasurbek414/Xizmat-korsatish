import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../../team/repository/team_repository.dart';
import '../../team/screens/team_map_screen.dart';

/// Boshqaruv uchun xarita - BARCHA faol haydovchilarning joriy joylashuvi.
///
/// NEGA ALOHIDA: "Ko'proq" menyusidagi "Xarita" avval [DriverMapScreen] ni
/// ochardi. U `OrdersCubit` ga qurilgan va HAYDOVCHINING o'z faol buyurtmasini
/// ko'rsatadi - administratorda esa biriktirilgan buyurtma bo'lmaydi, ya'ni u
/// amalda BO'SH xarita ko'rardi.
///
/// TO'LIQ FUNKSIYALAR (2026-08-05): faqat nuqtalarni ko'rsatish yetarli
/// emasligi aniqlandi. Endi qo'shildi: onlayn/aloqasi uzilgan hisoblagich,
/// ism bo'yicha qidiruv, pastdagi tortiladigan (draggable) ro'yxat panel -
/// undan haydovchini bosib ismi/vaqti ko'riladi va qo'ng'iroq qilinadi,
/// xaritadagi belgini bosganda esa to'liq tafsilot varag'i ochiladi.
class FleetMapScreen extends StatefulWidget {
  const FleetMapScreen({super.key});

  @override
  State<FleetMapScreen> createState() => _FleetMapScreenState();
}

class _FleetMapScreenState extends State<FleetMapScreen> {
  final _repo = TeamRepository();
  final _searchCtrl = TextEditingController();
  Timer? _timer;

  /// Joylashuv fon xizmati orqali har 15 soniyada yangilanadi, shuning uchun
  /// xaritani ham shunga yaqin oraliqda yangilab turamiz - aks holda
  /// administrator eskirgan nuqtalarni ko'rib turaveradi.
  static const _refreshInterval = Duration(seconds: 20);

  List<TeamMember> _drivers = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_refreshInterval, (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _searchCtrl.dispose();
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
      final list = await _repo.fetchActiveDrivers();
      if (!mounted) return;
      setState(() {
        _drivers = list;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      // Jimgina yangilash muvaffaqiyatsiz bo'lsa, ekrandagi mavjud
      // nuqtalarni xato bilan almashtirmaymiz - tarmoq bir zumga uzilsa
      // xarita bekorga bo'shab qolardi.
      if (silent) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<TeamMember> get _withLocation =>
      _drivers.where((d) => d.latitude != null && d.longitude != null).toList();

  List<TeamMember> get _filtered {
    final q = _query.trim().toLowerCase();
    final base = _withLocation;
    if (q.isEmpty) return base;
    return base.where((d) => d.fullName.toLowerCase().contains(q)).toList();
  }

  int get _onlineCount => _withLocation.where((d) => !d.isLocationStale).length;

  Future<void> _call(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return;
    final uri = Uri.parse('tel:$digits');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  String _lastSeenLabel(TeamMember d) {
    if (d.lastLocationAt == null) return "Joylashuv ma'lum emas";
    final diff = DateTime.now().difference(d.lastLocationAt!);
    if (diff.inSeconds < 60) return 'hozirgina';
    if (diff.inMinutes < 60) return '${diff.inMinutes} daqiqa oldin';
    if (diff.inHours < 24) return '${diff.inHours} soat oldin';
    return DateFormat('dd.MM.yyyy HH:mm').format(d.lastLocationAt!);
  }

  void _openDriverSheet(TeamMember d) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => _DriverDetailSheet(driver: d, label: _lastSeenLabel(d), onCall: () => _call(d.phone)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppTheme.bg,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: AppTheme.bg,
        appBar: AppBar(title: const Text('Xarita')),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            children: [
              const SizedBox(height: 80),
              EmptyState(icon: LucideIcons.alertTriangle, message: _error!),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: Stack(
        children: [
          TeamMapScreen(drivers: _drivers, onDriverTap: _openDriverSheet),

          // Yuqorida: onlayn/aloqasi uzilgan hisoblagich + qidiruv.
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Column(
                children: [
                  Row(
                    children: [
                      _CountBadge(
                        icon: LucideIcons.wifi,
                        label: '$_onlineCount onlayn',
                        color: AppTheme.primary,
                      ),
                      const SizedBox(width: 8),
                      _CountBadge(
                        icon: LucideIcons.wifiOff,
                        label: '${_withLocation.length - _onlineCount} aloqasiz',
                        color: AppTheme.textSecondary,
                      ),
                      const Spacer(),
                      _RefreshButton(onTap: () => _load()),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(AppTheme.rMd),
                      boxShadow: const [
                        BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (v) => setState(() => _query = v),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Haydovchi ismi bo\'yicha qidirish',
                        prefixIcon: const Icon(LucideIcons.search, size: 18),
                        suffixIcon: _query.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(LucideIcons.x, size: 16),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _query = '');
                                },
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Pastda: tortiladigan haydovchilar ro'yxati.
          DraggableScrollableSheet(
            initialChildSize: 0.16,
            minChildSize: 0.12,
            maxChildSize: 0.6,
            builder: (context, scrollController) {
              final items = _filtered;
              return Container(
                decoration: const BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
                  boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 10)],
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 8),
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.borderColor,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                      child: Row(
                        children: [
                          Text(
                            'Haydovchilar (${items.length})',
                            style: const TextStyle(
                                fontFamily: 'Outfit', fontSize: 14, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: items.isEmpty
                          ? const Center(
                              child: Padding(
                                padding: EdgeInsets.all(24),
                                child: Text('Joylashuvi bor haydovchi topilmadi',
                                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                              ),
                            )
                          : ListView.builder(
                              controller: scrollController,
                              padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                              itemCount: items.length,
                              itemBuilder: (_, i) {
                                final d = items[i];
                                final online = !d.isLocationStale;
                                return ListTile(
                                  onTap: () => _openDriverSheet(d),
                                  leading: CircleAvatar(
                                    backgroundColor:
                                        online ? AppTheme.primarySoft : AppTheme.surfaceAlt,
                                    child: Icon(LucideIcons.truck,
                                        size: 18, color: online ? AppTheme.primary : AppTheme.textMuted),
                                  ),
                                  title: Text(d.fullName,
                                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                                  subtitle: Text(_lastSeenLabel(d),
                                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                  trailing: IconButton(
                                    icon: const Icon(LucideIcons.phoneCall,
                                        size: 18, color: AppTheme.primary),
                                    onPressed: () => _call(d.phone),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _CountBadge({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(99),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }
}

class _RefreshButton extends StatelessWidget {
  final VoidCallback onTap;
  const _RefreshButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.surface,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.all(8),
          child: Icon(LucideIcons.refreshCw, size: 16, color: AppTheme.primary),
        ),
      ),
    );
  }
}

/// Xaritadagi belgi yoki ro'yxatdagi qator bosilganda ochiladigan to'liq
/// tafsilot: ism, holat, oxirgi aloqa vaqti, qo'ng'iroq tugmasi.
class _DriverDetailSheet extends StatelessWidget {
  final TeamMember driver;
  final String label;
  final VoidCallback onCall;

  const _DriverDetailSheet({required this.driver, required this.label, required this.onCall});

  @override
  Widget build(BuildContext context) {
    final online = !driver.isLocationStale;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(99)),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: online ? AppTheme.primarySoft : AppTheme.surfaceAlt,
                  child: Icon(LucideIcons.truck, color: online ? AppTheme.primary : AppTheme.textMuted),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(driver.fullName,
                          style: const TextStyle(
                              fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      StatusPill(online ? 'Onlayn' : 'Aloqasi uzilgan',
                          online ? AppTheme.primary : AppTheme.textMuted),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            MetaLine(LucideIcons.clock, 'Oxirgi joylashuv: $label'),
            if (driver.phone.isNotEmpty) ...[
              const SizedBox(height: 4),
              MetaLine(LucideIcons.phone, driver.phone),
            ],
            const SizedBox(height: 18),
            AppButton("Qo'ng'iroq qilish", icon: LucideIcons.phoneCall, onTap: onCall),
          ],
        ),
      ),
    );
  }
}
