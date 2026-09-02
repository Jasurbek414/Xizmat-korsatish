import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/network/api_client.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../../ui/app_ui.dart';
import '../orders/create_order_sheet.dart';
import '../orders/orders_admin_repository.dart';

/// Boshqaruv bosh sahifasi - web paneldagi "Boshqaruv Paneli" ning telefon
/// varianti: kompaniyaning joriy holati bir ekranda.
///
/// MUHIM: har bir ko'rsatkich FAQAT tegishli ruxsat bo'lsa yuklanadi. Menejerda
/// `settings` yo'q, lekin `finance` bor - shuning uchun u moliyaviy raqamlarni
/// ko'radi. Ruxsat yo'q bo'lsa so'rov UMUMAN yuborilmaydi (backend 403 qaytarib,
/// ekranda keraksiz xato ko'rsatilmasligi uchun).
///
/// DIZAYN (2026-08-05, "maksimal darajaga olib chiqish" so'ralgan): sovuq
/// statistika ro'yxati o'rniga - kunning vaqtiga qarab salomlashuv, gradient
/// balans karta va tezkor amallar (Yangi buyurtma) qo'shildi. Ko'rsatkichlar
/// endi `Wrap` o'rniga 2 ustunli aniq to'r bilan chiziladi - shunda kartalar
/// ekran kengligidan qat'i nazar bir xil o'lchamda qoladi.
class ManagementHomeScreen extends StatefulWidget {
  final User user;
  final Permissions permissions;

  const ManagementHomeScreen({
    super.key,
    required this.user,
    required this.permissions,
  });

  @override
  State<ManagementHomeScreen> createState() => _ManagementHomeScreenState();
}

class _ManagementHomeScreenState extends State<ManagementHomeScreen> {
  final _api = ApiClient();

  bool _loading = true;
  String? _error;

  int _clientCount = 0;
  int _employeeCount = 0;
  int _orderCount = 0;
  int _todayOrderCount = 0;
  double _income = 0;
  double _expense = 0;
  double _balance = 0;

  static final _money = NumberFormat.decimalPattern('uz');

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

    final p = widget.permissions;
    try {
      // Parallel yuklash - ketma-ket kutilsa telefon sekin tarmoqda 4-5 soniya
      // "bo'sh" turardi.
      final results = await Future.wait([
        p.canManageClients ? _api.get('/clients') : Future.value(null),
        p.canManageEmployees ? _api.get('/employees') : Future.value(null),
        p.canManageOrders ? _api.get('/orders') : Future.value(null),
        p.canManageFinance ? _api.get('/finance/stats') : Future.value(null),
      ]);

      if (!mounted) return;

      final clients = results[0];
      final employees = results[1];
      final orders = results[2];
      final stats = results[3];

      setState(() {
        _clientCount = clients is List ? clients.length : 0;
        _employeeCount = employees is List ? employees.length : 0;

        if (orders is List) {
          _orderCount = orders.length;

          // MUHIM (tuzatildi): avval bu yerda "faol buyurtma" statusning
          // INGLIZCHA nomiga qarab ('COMPLET', 'CANCEL'...) hisoblanardi.
          // Ikki jihatdan noto'g'ri edi: birinchidan `o['status']` satr emas,
          // OBYEKT - `toString()` unga "{id: ..., nameUz: ...}" berardi;
          // ikkinchidan statuslar har kompaniyada o'zbekcha va ixtiyoriy
          // nomlanadi ('orta', 'pardozda'), ya'ni bu ro'yxat hech qachon
          // mos kelmasdi va HAMMA buyurtma "faol" deb sanalardi.
          //
          // Endi taxmin qilmaymiz: BUGUNGI buyurtmalar sanaladi - bu
          // ko'rsatkich aniq va administrator uchun ham foydaliroq.
          final now = DateTime.now();
          _todayOrderCount = orders.where((o) {
            if (o is! Map) return false;
            final raw = o['createdAt'] ?? o['created_at'];
            final d = raw == null ? null : DateTime.tryParse(raw.toString());
            return d != null &&
                d.year == now.year &&
                d.month == now.month &&
                d.day == now.day;
          }).length;
        }

        if (stats is Map) {
          _income = (stats['totalIncome'] as num?)?.toDouble() ?? 0;
          _expense = (stats['totalExpense'] as num?)?.toDouble() ?? 0;
          _balance = (stats['balance'] as num?)?.toDouble() ?? (_income - _expense);
        }

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

  String _fmt(double v) => '${_money.format(v.round())} so\'m';

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 6) return 'Xayrli tun';
    if (h < 11) return 'Xayrli tong';
    if (h < 17) return 'Xayrli kun';
    return 'Xayrli kech';
  }

  static const _weekdaysUz = [
    'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'
  ];
  static const _monthsUz = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  /// MUHIM (2026-08-05 da real qurilmada topilgan JIDDIY xato): avval bu
  /// yerda `DateFormat('dd MMMM, EEEE', 'uz')` ishlatilgan edi. `intl`
  /// paketi oy/hafta kuni NOMLARINI (MMMM, EEEE) talab qilganda locale
  /// ma'lumotini oldindan yuklashni talab qiladi (`initializeDateFormatting`)
  /// - bu ilovada HECH QACHON chaqirilmagan. Natijada shu qator ishga
  /// tushishi bilan `LocaleDataException` tashlanardi.
  ///
  /// Buning oqibati OG'IR edi: bu ekran `AdaptiveDashboardShell` ichidagi
  /// `IndexedStack`da BOSHQA barcha bo'limlar (Xodimlar, Xarita, Buyurtmalar...)
  /// bilan BIRGA quriladi - IndexedStack barcha bolalarini oldindan quradi,
  /// faqat bittasini ko'rsatadi. Shu sabab bosh sahifadagi bitta xato BUTUN
  /// ilovani (barcha bo'limlarni) ko'rinmas qilib qo'ygan edi.
  ///
  /// Endi locale ma'lumotiga UMUMAN tayanmaydi - sana qo'lda, sobit
  /// o'zbekcha nomlar ro'yxatidan yig'iladi.
  String get _todayLabel {
    final now = DateTime.now();
    final weekday = _weekdaysUz[now.weekday - 1];
    final month = _monthsUz[now.month - 1];
    return '${now.day} $month, $weekday';
  }

  Future<void> _openCreateOrder() async {
    final repo = OrdersAdminRepository();
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateOrderSheet(repo: repo),
    );
    if (created == true) {
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Buyurtma yaratildi', style: TextStyle(fontWeight: FontWeight.w600)),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
        ),
      );
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.permissions;

    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            // Salomlashuv - kunning vaqtiga mos, ekranni sovuq raqamlar
            // ro'yxati bo'lishdan chiqaradi.
            Text(
              '$_greeting, ${widget.user.fullName.split(' ').first} 👋',
              style: TextStyle(
                  fontFamily: 'Outfit', fontSize: 19, fontWeight: FontWeight.w800, color: AppTheme.textPrimaryOf(context)),
            ),
            const SizedBox(height: 2),
            Text(
              _todayLabel,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondaryOf(context)),
            ),
            const SizedBox(height: 16),

            if (_error != null) ...[
              AppCard(
                child: Row(
                  children: [
                    const Icon(LucideIcons.alertTriangle, size: 18, color: AppTheme.dangerColor),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(fontSize: 12.5, color: AppTheme.dangerColor, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],

            if (p.canManageOrders) ...[
              // Tezkor amal: eng ko'p bosiladigan harakat - yangi buyurtma -
              // bosh sahifadan bitta bosishda ochiladi.
              SizedBox(
                width: double.infinity,
                child: AppButton("+ Yangi buyurtma", onTap: _openCreateOrder, height: 46),
              ),
              const SizedBox(height: 18),
            ],

            if (p.canManageFinance) ...[
              const _SectionTitle('Moliya'),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryDark, AppTheme.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppTheme.rLg),
                  boxShadow: const [
                    BoxShadow(color: Color(0x330B6B4F), blurRadius: 16, offset: Offset(0, 6)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Joriy balans',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _loading ? '...' : _fmt(_balance),
                      style: const TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _MiniStat(
                            label: 'Kirim',
                            value: _loading ? '...' : _fmt(_income),
                            icon: LucideIcons.arrowDownLeft,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _MiniStat(
                            label: 'Chiqim',
                            value: _loading ? '...' : _fmt(_expense),
                            icon: LucideIcons.arrowUpRight,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
            ],

            const _SectionTitle('Umumiy holat'),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.55,
              children: [
                if (p.canManageOrders)
                  StatTile(
                    icon: LucideIcons.clipboardList,
                    value: _loading ? '...' : '$_todayOrderCount',
                    label: 'Bugungi buyurtma',
                    color: AppTheme.blue,
                    soft: AppTheme.blueSoft,
                  ),
                if (p.canManageOrders)
                  StatTile(
                    icon: LucideIcons.checkCircle2,
                    value: _loading ? '...' : '$_orderCount',
                    label: 'Jami buyurtma',
                    color: AppTheme.teal,
                    soft: AppTheme.tealSoft,
                  ),
                if (p.canManageClients)
                  StatTile(
                    icon: LucideIcons.users,
                    value: _loading ? '...' : '$_clientCount',
                    label: 'Mijozlar',
                    color: AppTheme.purple,
                    soft: AppTheme.purpleSoft,
                  ),
                if (p.canManageEmployees)
                  StatTile(
                    icon: LucideIcons.userCog,
                    value: _loading ? '...' : '$_employeeCount',
                    label: 'Xodimlar',
                    color: AppTheme.amber,
                    soft: AppTheme.amberSoft,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: TextStyle(
          fontFamily: 'Outfit',
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: AppTheme.textPrimaryOf(context),
        ),
      );
}

/// Gradient balans kartasi ICHIDA ishlatiladi - shuning uchun rang
/// tashqaridan berilmaydi, doim oq/yarim shaffof (fon to'q yashil).
class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _MiniStat({
    required this.label,
    required this.value,
    required this.icon,
  });

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
          Row(
            children: [
              Icon(icon, size: 13, color: Colors.white),
              const SizedBox(width: 5),
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.white70),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white),
          ),
        ],
      ),
    );
  }
}
