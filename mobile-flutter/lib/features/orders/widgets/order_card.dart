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

  bool get _isMine => currentUserId.isNotEmpty && order.workerId == currentUserId;
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
    if (order.latitude != null && order.longitude != null) {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}');
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
              const Icon(LucideIcons.clock, size: 13, color: AppTheme.textMuted),
              const SizedBox(width: 5),
              Text(time, style: AppTheme.text(12, weight: FontWeight.w600, color: AppTheme.textSecondary)),
              const Spacer(),
              Text('${formatter.format(order.price)} so\'m', style: AppTheme.display(13, weight: FontWeight.w800, spacing: 0, color: AppTheme.primary)),
            ]),
            if (p.sorted.length > 1 && p.index >= 0) ...[
              const SizedBox(height: 10),
              _stepBar(p.sorted, p.index),
            ],
            if (!_isMine && order.workerId != null) ...[
              const SizedBox(height: 8),
              MetaLine(LucideIcons.userCheck, 'Haydovchi: ${order.workerName ?? "-"}'),
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
      return AppButton('Qabul qilish', icon: LucideIcons.check, height: 40, onTap: () => _confirmAccept(context));
    }
    final next = _nextStatus;
    if (next != null) {
      // Birinchi bosqich uchun "Qabul qilish" matni ishlatiladi
      final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      final isFirstStep = sorted.isNotEmpty && sorted.first.id == order.status?.id;
      final label = isFirstStep ? 'Qabul qilish' : next.nameUz;
      final c = AppTheme.hex(next.colorCode);
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
  Widget _factoryCard(BuildContext context) {
    final shortId = order.id.length > 4 ? order.id.substring(0, 4) : order.id;
    final time = _formatTime(order.createdAt).split(', ').last;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        padding: const EdgeInsets.all(11),
        highlight: isNew,
        onTap: () => _openDetail(context),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CarpetThumb(size: 72, id: '#$shortId', variant: index),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(order.client.fullName, style: AppTheme.display(15, weight: FontWeight.w700, spacing: -0.2)),
              const SizedBox(height: 3),
              MetaLine(LucideIcons.mapPin, order.address.isEmpty ? order.client.address : order.address),
              const SizedBox(height: 2),
              MetaLine(LucideIcons.phone, order.client.phone),
              if (order.workerName != null && order.workerName!.isNotEmpty) ...[
                const SizedBox(height: 2),
                MetaLine(LucideIcons.user, 'Haydovchi: ${order.workerName}'),
              ],
            ]),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(time, style: AppTheme.display(13, weight: FontWeight.w800, spacing: 0, color: AppTheme.primary)),
            const SizedBox(height: 4),
            Text('${order.items.length} ta gilam', style: AppTheme.text(11, weight: FontWeight.w600, color: AppTheme.textSecondary)),
            const SizedBox(height: 6),
            StatusPill(order.status?.nameUz ?? '-', _statusColor),
          ]),
          const Padding(
            padding: EdgeInsets.only(left: 4, top: 22),
            child: Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textMuted),
          ),
        ]),
      ),
    );
  }

  // ---------------- umumiy ----------------
  Widget _stepBar(List<OrderStatusInfo> sorted, int current) {
    return Row(
      children: List.generate(sorted.length, (i) {
        final done = i <= current;
        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: i == sorted.length - 1 ? 0 : 4),
            decoration: BoxDecoration(
              color: done ? AppTheme.hex(sorted[i].colorCode) : AppTheme.borderColor,
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
    final msg = (order.workerName != null && order.workerName!.isNotEmpty)
        ? 'Bu buyurtma "${order.workerName}"ga biriktirilgan. O\'zingizga olasizmi?'
        : 'Bu buyurtmani o\'zingizga qabul qilasizmi?';
    final ok = await _confirm(context, 'Qabul qilish', msg, AppTheme.primary, 'Qabul qilish');
    if (ok && context.mounted) context.read<OrdersCubit>().acceptOrder(order);
  }

  Future<bool> _confirm(BuildContext context, String title, String body, Color color, String action) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.rLg)),
        title: Text(title, style: AppTheme.display(16, weight: FontWeight.w700)),
        content: Text(body, style: AppTheme.text(13, color: AppTheme.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Bekor', style: TextStyle(color: AppTheme.textSecondary))),
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
