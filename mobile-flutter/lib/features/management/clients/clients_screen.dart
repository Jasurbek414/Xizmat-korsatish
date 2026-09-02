import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'client_detail_screen.dart';
import 'clients_repository.dart';

/// Mijozlar bazasi (CRM) - web paneldagi "Mijozlar Bazasi" bo'limining
/// telefon uchun moslashtirilgan varianti: ro'yxat, qidiruv, qo'shish,
/// tahrirlash, o'chirish va bitta bosishda qo'ng'iroq qilish.
class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final _repo = ClientsRepository();
  final _searchController = TextEditingController();

  List<ClientRecord> _all = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _repo.fetchAll();
      // Eng yangi mijoz yuqorida - web paneldagi tartib bilan bir xil.
      list.sort((a, b) {
        final ad = a.createdAt, bd = b.createdAt;
        if (ad == null && bd == null) return 0;
        if (ad == null) return 1;
        if (bd == null) return -1;
        return bd.compareTo(ad);
      });
      if (!mounted) return;
      setState(() {
        _all = list;
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

  List<ClientRecord> get _visible {
    if (_query.trim().isEmpty) return _all;
    final q = _query.toLowerCase().trim();
    return _all
        .where((c) =>
            c.fullName.toLowerCase().contains(q) ||
            c.phone.toLowerCase().contains(q) ||
            c.address.toLowerCase().contains(q))
        .toList();
  }

  Future<void> _call(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return;
    final uri = Uri.parse('tel:$digits');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _notify(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: error ? AppTheme.dangerColor : AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Qo'shish va tahrirlash uchun BITTA forma - `existing` null bo'lsa yangi
  /// mijoz yaratiladi, aks holda mavjudi yangilanadi.
  Future<void> _openForm({ClientRecord? existing}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ClientFormSheet(repo: _repo, existing: existing),
    );
    if (saved == true) {
      _notify(existing == null ? "Mijoz qo'shildi" : "Mijoz ma'lumotlari yangilandi");
      _load();
    }
  }

  Future<void> _confirmDelete(ClientRecord client) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Mijoz o'chirilsinmi?"),
        content: Text(
          '${client.fullName} bazadan butunlay o\'chiriladi. '
          'Bu amalni ortga qaytarib bo\'lmaydi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Bekor qilish'),
          ),
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
      await _repo.delete(client.id);
      _notify("Mijoz o'chirildi");
      _load();
    } catch (e) {
      _notify(e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _query = v),
                      decoration: InputDecoration(
                        hintText: "Ism yoki telefon bo'yicha qidirish",
                        prefixIcon: const Icon(LucideIcons.search, size: 18),
                        suffixIcon: _query.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(LucideIcons.x, size: 16),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _query = '');
                                },
                              ),
                        filled: true,
                        fillColor: AppTheme.surfaceOf(context),
                        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.rMd),
                          borderSide: BorderSide(color: AppTheme.borderOf(context)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.rMd),
                          borderSide: BorderSide(color: AppTheme.borderOf(context)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  AppIconButton(LucideIcons.userPlus, onTap: () => _openForm()),
                ],
              ),
            ),
            if (!_loading && _error == null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Text(
                      'Jami ${_all.length} ta mijoz'
                      '${_query.trim().isEmpty ? '' : ' · topildi ${_visible.length}'}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textSecondaryOf(context),
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const OrderListSkeleton();
    if (_error != null) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          children: [
            const SizedBox(height: 80),
            EmptyState(icon: LucideIcons.alertTriangle, message: _error!),
          ],
        ),
      );
    }
    final items = _visible;
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          children: [
            const SizedBox(height: 80),
            EmptyState(
              icon: LucideIcons.users,
              message: _query.trim().isEmpty
                  ? "Hali mijoz qo'shilmagan.\nYuqoridagi tugma orqali qo'shing."
                  : "Bu so'rov bo'yicha mijoz topilmadi.",
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _ClientCard(
          client: items[i],
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => ClientDetailScreen(client: items[i])),
          ),
          onCall: () => _call(items[i].phone),
          onEdit: () => _openForm(existing: items[i]),
          onDelete: () => _confirmDelete(items[i]),
        ),
      ),
    );
  }
}

class _ClientCard extends StatelessWidget {
  final ClientRecord client;
  final VoidCallback onTap;
  final VoidCallback onCall;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ClientCard({
    required this.client,
    required this.onTap,
    required this.onCall,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppTheme.primarySoft,
              borderRadius: BorderRadius.circular(AppTheme.rMd),
            ),
            child: Text(
              client.initials,
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: AppTheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  client.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimaryOf(context),
                  ),
                ),
                const SizedBox(height: 3),
                MetaLine(LucideIcons.phone, client.phone),
                if (client.address.trim().isNotEmpty) ...[
                  const SizedBox(height: 2),
                  MetaLine(LucideIcons.mapPin, client.address),
                ],
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                onPressed: onCall,
                visualDensity: VisualDensity.compact,
                icon: const Icon(LucideIcons.phoneCall, size: 18, color: AppTheme.primary),
                tooltip: "Qo'ng'iroq qilish",
              ),
              PopupMenuButton<String>(
                padding: EdgeInsets.zero,
                icon: Icon(LucideIcons.moreVertical, size: 18, color: AppTheme.textSecondaryOf(context)),
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'delete') onDelete();
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'edit', child: Text('Tahrirlash')),
                  PopupMenuItem(value: 'delete', child: Text("O'chirish")),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Qo'shish/tahrirlash formasi. Klaviatura ochilganda forma ustini yopmasligi
/// uchun `viewInsets` bilan surilaid.
class _ClientFormSheet extends StatefulWidget {
  final ClientsRepository repo;
  final ClientRecord? existing;

  const _ClientFormSheet({required this.repo, this.existing});

  @override
  State<_ClientFormSheet> createState() => _ClientFormSheetState();
}

class _ClientFormSheetState extends State<_ClientFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _address;

  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.existing?.fullName ?? '');
    _phone = TextEditingController(text: widget.existing?.phone ?? '');
    _address = TextEditingController(text: widget.existing?.address ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.existing == null) {
        await widget.repo.create(
          fullName: _name.text,
          phone: _phone.text,
          address: _address.text,
        );
      } else {
        await widget.repo.update(
          id: widget.existing!.id,
          fullName: _name.text,
          phone: _phone.text,
          address: _address.text,
        );
      }
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
    final isEdit = widget.existing != null;
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom +
              MediaQuery.of(context).padding.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.rXl)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.borderOf(context),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isEdit ? 'Mijozni tahrirlash' : 'Yangi mijoz',
                style: TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimaryOf(context),
                ),
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.dangerColor.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(AppTheme.rMd),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(
                      color: AppTheme.dangerColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              const FieldLabel('F.I.SH'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: _dec('Masalan: Alisher Karimov'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? "Ism kiritilishi shart" : null,
              ),
              const SizedBox(height: 12),
              const FieldLabel('Telefon raqami'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: _dec('+998 90 123 45 67'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Telefon raqami shart' : null,
              ),
              const SizedBox(height: 12),
              const FieldLabel('Manzil'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _address,
                maxLines: 2,
                textCapitalization: TextCapitalization.sentences,
                decoration: _dec('Ko\'cha, uy, mo\'ljal'),
              ),
              const SizedBox(height: 20),
              AppButton(_saving
                    ? 'Saqlanmoqda...'
                    : (isEdit ? 'Saqlash' : "Mijozni qo'shish"), onTap: _saving ? null : _save, loading: _saving),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _dec(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: AppTheme.surfaceAltOf(context),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.rMd),
          borderSide: BorderSide(color: AppTheme.borderOf(context)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.rMd),
          borderSide: BorderSide(color: AppTheme.borderOf(context)),
        ),
      );
}
