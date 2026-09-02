import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../orders/orders_admin_repository.dart';
import 'clients_repository.dart';

/// Mijoz tafsiloti - web paneldagi "Mijoz Profili" ning mobil varianti:
/// statistika (buyurtmalar soni, jami summa) va buyurtmalar tarixi.
///
/// MUHIM: buyurtmalar mijoz ID orqali filtrlanadi, ISM orqali EMAS.
/// 2026-08-04 da web panelda aynan shu sabab jiddiy xato bo'lgan edi -
/// bir xil ismli 15 ta alohida mijoz bor edi va ism bo'yicha solishtirish
/// ularning buyurtmalarini bittasiga qo'shib yuborardi.
class ClientDetailScreen extends StatefulWidget {
  final ClientRecord client;
  const ClientDetailScreen({super.key, required this.client});

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  final _ordersRepo = OrdersAdminRepository();
  static final _money = NumberFormat.decimalPattern('uz');
  static final _date = DateFormat('dd.MM.yyyy');

  List<AdminOrder> _orders = [];
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
      final all = await _ordersRepo.fetchAll();
      if (!mounted) return;
      setState(() {
        _orders = all.where((o) => o.clientId == widget.client.id).toList();
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

  double get _totalSpent => _orders.fold(0, (sum, o) => sum + o.price);

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
    final c = widget.client;
    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      appBar: AppBar(title: Text(c.fullName.isEmpty ? 'Mijoz' : c.fullName)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppTheme.primarySoft,
                          borderRadius: BorderRadius.circular(AppTheme.rMd),
                        ),
                        child: Text(c.initials,
                            style: const TextStyle(
                                fontFamily: 'Outfit', fontWeight: FontWeight.w800, fontSize: 16,
                                color: AppTheme.primary)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c.fullName,
                                style: TextStyle(
                                    fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w800,
                                    color: AppTheme.textPrimaryOf(context))),
                            const SizedBox(height: 2),
                            if (c.phone.isNotEmpty) MetaLine(LucideIcons.phone, c.phone),
                          ],
                        ),
                      ),
                      if (c.phone.isNotEmpty)
                        AppIconButton(LucideIcons.phoneCall, onTap: () => _call(c.phone)),
                    ],
                  ),
                  if (c.address.trim().isNotEmpty) ...[
                    const SizedBox(height: 10),
                    MetaLine(LucideIcons.mapPin, c.address),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: StatTile(
                    icon: LucideIcons.clipboardList,
                    value: _loading ? '...' : '${_orders.length}',
                    label: 'Buyurtmalar',
                    color: AppTheme.blue,
                    soft: AppTheme.blueSoft,
                    width: double.infinity,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    icon: LucideIcons.wallet,
                    value: _loading ? '...' : "${_money.format(_totalSpent.round())}",
                    label: "Jami summa (so'm)",
                    color: AppTheme.primary,
                    soft: AppTheme.primarySoft,
                    width: double.infinity,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text('Buyurtmalar tarixi',
                style: TextStyle(fontFamily: 'Outfit', fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 20),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              EmptyState(icon: LucideIcons.alertTriangle, message: _error!)
            else if (_orders.isEmpty)
              const EmptyState(icon: LucideIcons.inbox, message: "Bu mijozda hali buyurtma yo'q.")
            else
              ..._orders.map((o) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: AppCard(
                      railColor: _parseColor(o.statusColor),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  o.serviceName.isEmpty ? 'Xizmat' : o.serviceName,
                                  style: TextStyle(
                                      fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimaryOf(context)),
                                ),
                                const SizedBox(height: 3),
                                if (o.createdAt != null)
                                  MetaLine(LucideIcons.calendar, _date.format(o.createdAt!)),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                o.price > 0 ? "${_money.format(o.price.round())} so'm" : "-",
                                style: const TextStyle(
                                    fontSize: 12.5, fontWeight: FontWeight.w800, color: AppTheme.primary),
                              ),
                              if (o.statusLabel.isNotEmpty) ...[
                                const SizedBox(height: 3),
                                StatusPill(o.statusLabel, _parseColor(o.statusColor)),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
