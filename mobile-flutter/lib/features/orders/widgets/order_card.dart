import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../../../ui/app_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/orders_cubit.dart';
import '../screens/driver_order_detail_screen.dart';
import '../screens/factory_order_detail_screen.dart';

/// Buyurtma kartasi - rolга qarab moslashadi:
///  - haydovchi: raqamli rail + amal tugmalari (qo'ng'iroq/manzil/asosiy amal);
///  - sex hodimi: gilam rasmi + ma'lumot + gilam soni + chevron.
/// Ustiga bosilganda rolга mos tafsilot ochiladi.
class OrderCard extends StatelessWidget {
  final Order order;
  final List<OrderStatusInfo> statuses;
  final bool isNew;
  final String currentUserId;
  final int index;

  const OrderCard({
    super.key,
    required this.order,
    required this.statuses,
    this.isNew = false,
    this.currentUserId = '',
    this.index = 0,
  });

  // MUHIM (jonli xato: "haydovchida 'Bajarmoqda: Xodim' bo'lib chiqib
  // qolgan"): avval umumiy `workerId` tekshirilardi - sex hodimi band
  // qilgan (haydovchisiz) buyurtmalarda ham TRUE bo'lib qolar, haydovchi
  // uni HECH QACHON o'ziniki deb bilolmasdi. Bu getter faqat haydovchi
  // kartasida (_driverCard) ishlatiladi - shu sabab FAQAT `driverId`
  // tekshiriladi.
  bool get _isMine => currentUserId.isNotEmpty && order.driverId == currentUserId;
  Color get _statusColor => AppTheme.hex(order.status?.colorCode ?? '#2563EB');

  bool _isFactory(BuildContext context) {
    final s = context.read<AuthBloc>().state;
    final role = s is Authenticated ? s.user.role : '';
    // DRIVER bo'lmagan barcha rollar (WORKER, FACTORY, SEX, ADMIN, MANAGER)
    // sex xodimi ekranini ko'radi
    return !role.contains('DRIVER');
  }

  ({List<OrderStatusInfo> sorted, int index}) get _progress {
    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return (sorted: sorted, index: sorted.indexWhere((s) => s.id == order.status?.id));
  }

  OrderStatusInfo? get _nextStatus {
    final p = _progress;
    if (p.index == -1 || p.index >= p.sorted.length - 1) return null;
    return p.sorted[p.index + 1];
  }

  void _openDetail(BuildContext context) {
    final isFactory = _isFactory(context);
    final cubit = context.read<OrdersCubit>();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (rc) => BlocProvider.value(
          value: cubit,
          child: isFactory
              ? FactoryOrderDetailScreen(order: order, statuses: statuses)
              : DriverOrderDetailScreen(order: order, statuses: statuses, currentUserId: currentUserId),
        ),
      ),
    );
  }

  Future<void> _call() async {
    final phone = order.client.phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _openMap() async {
    final Uri uri;
    // Buyurtmaning o'zida koordinata bo'lmasa, mijozning saqlangan
    // lokatsiyasi (avvalgi buyurtmada belgilangan) zaxira sifatida ishlatiladi.
    final lat = order.latitude ?? order.client.latitude;
    final lng = order.longitude ?? order.client.longitude;
    if (lat != null && lng != null) {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    } else if (order.address.trim().isNotEmpty) {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(order.address)}');
    } else {
      return;
    }
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return _isFactory(context) ? _factoryCard(context) : _driverCard(context);
  }

  // ---------------- HAYDOVCHI ----------------
  Widget _driverCard(BuildContext context) {
    final formatter = NumberFormat.decimalPattern('uz');
    final p = _progress;
    final time = _formatTime(order.createdAt);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        railColor: _statusColor,
        highlight: isNew,
        onTap: () => _openDetail(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: _statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                child: Text('${index + 1}', style: AppTheme.display(14, weight: FontWeight.w800, spacing: 0, color: _statusColor)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(order.client.fullName, style: AppTheme.display(15, weight: FontWeight.w700, spacing: -0.2)),
                  const SizedBox(height: 3),
                  MetaLine(LucideIcons.mapPin, order.address.isEmpty ? '—' : order.address),
                ]),
              ),
              const SizedBox(width: 8),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                if (isNew) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(99)),
                    child: Text('YANGI', style: AppTheme.text(8.5, weight: FontWeight.w800, color: Colors.white)),
                  ),
                  const SizedBox(height: 4),
                ],
                StatusPill(order.status?.nameUz ?? '-', _statusColor),
              ]),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Icon(LucideIcons.clock, size: 13, color: AppTheme.textMutedOf(context)),
              const SizedBox(width: 5),
              Text(time, style: AppTheme.text(12, weight: FontWeight.w600, color: AppTheme.textSecondaryOf(context))),
              const Spacer(),
              Text('${formatter.format(order.price)} so\'m', style: AppTheme.display(13, weight: FontWeight.w800, spacing: 0, color: AppTheme.primary)),
            ]),
            if (p.sorted.length > 1 && p.index >= 0) ...[
              const SizedBox(height: 10),
              _stepBar(context, p.sorted, p.index),
            ],
            if (!_isMine && order.driverId != null) ...[
              const SizedBox(height: 8),
              MetaLine(LucideIcons.userCheck, 'Haydovchi: ${order.driverName ?? "-"}'),
            ],
            const SizedBox(height: 12),
            Row(children: [
              AppIconButton(LucideIcons.phone, onTap: _call),
              const SizedBox(width: 8),
              AppIconButton(LucideIcons.navigation, onTap: _openMap),
              const SizedBox(width: 8),
              Expanded(child: _mainAction(context)),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _mainAction(BuildContext context) {
    if (!_isMine) {
      // MUHIM (audit'da topilgan xato, tuzatildi): avval BOSHQA haydovchiga
      // biriktirilgan buyurtmada ham "Qabul qilish" tugmasi ko'rsatilardi va
      // tasdiqlash oynasi hatto «Bu buyurtma "X"ga biriktirilgan. O'zingizga
      // olasizmi?» deb taklif qilardi - lekin backend buni HAR DOIM 409
      // ("allaqachon boshqa haydovchiga biriktirilgan") bilan rad etardi.
      // Ya'ni tugma hech qachon ishlamaydigan, faqat chalkash xato
      // beradigan tugma edi. Endi biriktirilgan buyurtmada tugma o'rniga
      // kim bajarayotgani ko'rsatiladi; qayta biriktirishni faqat dispetcher
      // veb-panel orqali qila oladi.
      if (order.driverId != null) {
        return Container(
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppTheme.borderOf(context).withOpacity(0.35),
            borderRadius: BorderRadius.circular(AppTheme.rMd),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(LucideIcons.userCheck, size: 14, color: AppTheme.textSecondaryOf(context)),
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                order.driverName ?? 'Biriktirilgan',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTheme.text(12, weight: FontWeight.w700, color: AppTheme.textSecondaryOf(context)),
              ),
            ),
          ]),
        );
      }
      return AppButton('Qabul qilish', icon: LucideIcons.check, height: 40, onTap: () => _confirmAccept(context));
    }
    final next = _nextStatus;
    if (next != null) {
      // Birinchi bosqichdan chiqish = gilamni JISMONAN sexga topshirish
      // (DriverOrderDetailScreen'dagi bir xil tugma bilan izchil bo'lishi
      // uchun - u yerdagi batafsil izohga qarang).
      final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      final isFirstStep = sorted.isNotEmpty && sorted.first.id == order.status?.id;
      final label = isFirstStep ? 'Sexga topshirish' : next.nameUz;
      // MUHIM (audit'da topilgan xato, tuzatildi): avval bu yerda HAR DOIM
      // next.colorCode (KEYINGI statusning admin sozlagan rangi, masalan
      // "Yuvilmoqda" uchun amber/sariq) ishlatilardi - shu sabab bir xil
      // "Qabul qilish" matni buyurtmadan buyurtmaga TURLI rangda ko'rinardi:
      // hali hech kimga tayinlanmagan buyurtmalarda (yuqorida, !_isMine
      // shoxobchasida) AppButton'ning standart yashil rangi, lekin allaqachon
      // tayinlangan-u hali statusi o'zgartirilmagan buyurtmalarda (masalan
      // veb-admin orqali dispetcher tayinlagan bo'lsa) next.colorCode. Endi
      // "Qabul qilish" har doim BIR XIL (asosiy) rangda - faqat HAQIQIY
      // bosqich o'tkazish (birinchi bosqich EMAS) o'sha statusning o'z
      // rangida ko'rsatiladi.
      final c = isFirstStep ? AppTheme.primary : AppTheme.hex(next.colorCode);
      return _coloredAction(label, LucideIcons.arrowRight, c, () => _confirmAdvance(context, next));
    }
    return Container(
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: AppTheme.greenSoft, borderRadius: BorderRadius.circular(AppTheme.rMd)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(LucideIcons.checkCircle2, size: 15, color: AppTheme.green),
        const SizedBox(width: 5),
        Text('Tugadi', style: AppTheme.text(12, weight: FontWeight.w700, color: AppTheme.green)),
      ]),
    );
  }

  Widget _coloredAction(String label, IconData icon, Color color, VoidCallback onTap) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(AppTheme.rMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.rMd),
        child: Container(
          height: 40,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTheme.text(12, weight: FontWeight.w700, color: Colors.white))),
            const SizedBox(width: 4),
            Icon(icon, size: 14, color: Colors.white),
          ]),
        ),
      ),
    );
  }

  // ---------------- SEX HODIMI ----------------

  /// Buyurtmaning sexdagi bosqich rangi - FactoryOrdersScreen._stageOf bilan
  /// BIR XIL qoida (gilamlar bo'lmasa "Keldi", hammasi tayyor bo'lsa
  /// "Tugatilmoqda", aks holda "Bajarilmoqda"). Karta chap railiga va
  /// progress halqasiga rang beradi - xodim ro'yxatni pastga aylantirmasdan
  /// ham qaysi bosqichdaligini ranglar orqali darhol ilg'aydi.
  Color get _stageColor {
    if (order.items.isEmpty) return AppTheme.amber;
    if (order.items.every((i) => i.status == 'READY')) return AppTheme.teal;
    final anyStarted = order.items.any((i) => i.status != 'ACCEPTED');
    return anyStarted ? AppTheme.blue : AppTheme.amber;
  }

  /// Buyurtma sexga kirganidan beri o'tgan vaqt - navbatda "qotib qolgan"
  /// buyurtmalarni darhol ko'zga tashlash uchun (30+ daq: sariq ogohlantirish,
  /// 90+ daq: qizil - shoshilinch e'tibor talab qiladi).
  String _formatElapsed(Duration d) {
    if (d.isNegative) return '0 daq';
    if (d.inHours > 0) return '${d.inHours}s ${d.inMinutes % 60}daq';
    return '${d.inMinutes} daq';
  }

  // MUHIM (jonli so'rov: "sex hodimida buyurtma aniq qachon kelgani
  // ko'rsatilmayapti"): avval faqat NISBIY vaqt ("42 daq oldin") ko'rinardi
  // - bu shoshilinchlikni bildiradi, lekin aniq soatni bilish uchun (masalan
  // smena almashinuvida "qachon kelgan edi" deb) mos emas edi. Bugungi kun
  // bo'lsa faqat soat:daqiqa, boshqa kun bo'lsa sana ham qo'shiladi.
  String _formatArrivalClock(DateTime dt) {
    final now = DateTime.now();
    final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
    return isToday ? DateFormat('HH:mm').format(dt) : DateFormat('dd.MM HH:mm').format(dt);
  }

  Widget _statChip(IconData icon, String label, Color color) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 12, color: color),
      const SizedBox(width: 4),
      Text(label, style: AppTheme.text(11, weight: FontWeight.w600, color: color)),
    ]);
  }

  Widget _factoryCard(BuildContext context) {
    final formatter = NumberFormat.decimalPattern('uz');
    final shortId = order.id.length > 4 ? order.id.substring(0, 4) : order.id;
    final totalCount = order.items.length;
    final readyCount = order.items.where((i) => i.status == 'READY').length;
    final hasItems = totalCount > 0;
    final progress = hasItems ? readyCount / totalCount : 0.0;
    final stageColor = _stageColor;

    final elapsed = DateTime.now().difference(order.workshopArrivalTime);
    final elapsedLabel = _formatElapsed(elapsed);
    final isOverdue = elapsed.inMinutes >= 90;
    final isWarning = !isOverdue && elapsed.inMinutes >= 30;
    final elapsedColor = isOverdue
        ? AppTheme.dangerColor
        : (isWarning ? AppTheme.amber : AppTheme.textSecondaryOf(context));

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        railColor: stageColor,
        padding: const EdgeInsets.all(12),
        highlight: isNew,
        onTap: () => _openDetail(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
                if (hasItems)
                  SizedBox(
                    width: 72,
                    height: 72,
                    child: CircularProgressIndicator(
                      value: progress,
                      strokeWidth: 3,
                      backgroundColor: AppTheme.borderOf(context),
                      valueColor: AlwaysStoppedAnimation(stageColor),
                    ),
                  ),
                CarpetThumb(size: hasItems ? 63 : 72, id: '#$shortId', variant: index),
                // MUHIM (audit: "tartib raqami yo'q" muammosi) - sex navbatidagi
                // FIFO tartib raqami (butun navbat bo'yicha, faqat shu bo'lim
                // ichida emas) - xodim qaysi gilamni birinchi ishlashi kerakligini
                // aniq ko'radi.
                Positioned(
                  top: -6,
                  left: -6,
                  child: Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Theme.of(context).cardColor, width: 2),
                    ),
                    child: Text(
                      '${index + 1}',
                      style: AppTheme.text(11, weight: FontWeight.w800, color: Colors.white),
                    ),
                  ),
                ),
              ]),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(order.client.fullName, style: AppTheme.display(15, weight: FontWeight.w700, spacing: -0.2)),
                  const SizedBox(height: 3),
                  MetaLine(LucideIcons.mapPin, order.address.isEmpty ? order.client.address : order.address),
                  const SizedBox(height: 2),
                  MetaLine(LucideIcons.phone, order.client.phone),
                  if (order.driverName != null && order.driverName!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    MetaLine(LucideIcons.user, 'Haydovchi: ${order.driverName}'),
                  ],
                  const SizedBox(height: 2),
                  MetaLine(LucideIcons.clock, 'Keldi: ${_formatArrivalClock(order.workshopArrivalTime)}'),
                ]),
              ),
              const SizedBox(width: 8),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(isOverdue ? LucideIcons.alertTriangle : LucideIcons.timer, size: 12, color: elapsedColor),
                  const SizedBox(width: 3),
                  Text(elapsedLabel, style: AppTheme.text(11.5, weight: FontWeight.w800, color: elapsedColor)),
                ]),
                const SizedBox(height: 6),
                StatusPill(order.status?.nameUz ?? '-', _statusColor),
              ]),
            ]),
            const SizedBox(height: 12),
            Container(height: 1, color: AppTheme.borderOf(context)),
            const SizedBox(height: 10),
            Row(children: [
              _statChip(LucideIcons.layers, '$totalCount ta gilam', AppTheme.textSecondaryOf(context)),
              if (hasItems) ...[
                const SizedBox(width: 14),
                _statChip(LucideIcons.checkCircle2, '$readyCount/$totalCount tayyor',
                    readyCount == totalCount ? AppTheme.teal : AppTheme.textSecondaryOf(context)),
              ],
              const Spacer(),
              Text('${formatter.format(order.price)} so\'m',
                  style: AppTheme.display(13, weight: FontWeight.w800, spacing: 0, color: AppTheme.primary)),
              const SizedBox(width: 4),
              Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMutedOf(context)),
            ]),
            if (hasItems) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 5,
                  backgroundColor: AppTheme.borderOf(context),
                  valueColor: AlwaysStoppedAnimation(stageColor),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ---------------- umumiy ----------------
  Widget _stepBar(BuildContext context, List<OrderStatusInfo> sorted, int current) {
    return Row(
      children: List.generate(sorted.length, (i) {
        final done = i <= current;
        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: i == sorted.length - 1 ? 0 : 4),
            decoration: BoxDecoration(
              color: done ? AppTheme.hex(sorted[i].colorCode) : AppTheme.borderOf(context),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        );
      }),
    );
  }

  Future<void> _confirmAdvance(BuildContext context, OrderStatusInfo next) async {
    final ok = await _confirm(context, 'Keyingi bosqich', 'Buyurtmani "${next.nameUz}" bosqichiga o\'tkazasizmi?', AppTheme.hex(next.colorCode), 'Ha, o\'tkazish');
    if (ok && context.mounted) context.read<OrdersCubit>().advanceToNextStatus(order);
  }

  Future<void> _confirmAccept(BuildContext context) async {
    final assignedTo = order.driverName ?? order.workerName;
    final msg = (assignedTo != null && assignedTo.isNotEmpty)
        ? 'Bu buyurtma "$assignedTo"ga biriktirilgan. O\'zingizga olasizmi?'
        : 'Bu buyurtmani o\'zingizga qabul qilasizmi?';
    final ok = await _confirm(context, 'Qabul qilish', msg, AppTheme.primary, 'Qabul qilish');
    if (ok && context.mounted) context.read<OrdersCubit>().acceptOrder(order);
  }

  Future<bool> _confirm(BuildContext context, String title, String body, Color color, String action) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: AppTheme.surfaceOf(context),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.rLg)),
        title: Text(title, style: AppTheme.display(16, weight: FontWeight.w700)),
        content: Text(body, style: AppTheme.text(13, color: AppTheme.textSecondaryOf(context))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: Text('Bekor', style: TextStyle(color: AppTheme.textSecondaryOf(context)))),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: color), onPressed: () => Navigator.pop(dctx, true), child: Text(action)),
        ],
      ),
    );
    return ok == true;
  }

  String _formatTime(String iso) {
    try {
      return DateFormat('dd MMM, HH:mm', 'uz').format(DateTime.parse(iso).toLocal());
    } catch (_) {
      return iso.length > 10 ? iso.substring(0, 10) : iso;
    }
  }
}
