import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../../team/repository/team_repository.dart';
import 'employees_repository.dart';

/// Xodimlar boshqaruvi - web paneldagi "Xodimlar Boshqaruvi" ning mobil
/// varianti: ro'yxat, qidiruv, qo'shish, tahrirlash, bloklash, parolni
/// tiklash va qo'ng'iroq.
///
/// NEGA ALOHIDA: avval "Ko'proq" menyusidagi "Xodimlar" mavjud [TeamScreen]
/// ni ochardi - u faqat RO'YXATNI ko'rsatadi, hech qanday boshqaruv amali
/// yo'q. Administrator uchun bu yetarli emas edi.
class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  final _repo = EmployeesRepository();

  List<TeamMember> _all = [];
  List<({String key, String nameUz})> _roles = [];
  bool _loading = true;
  String? _error;
  String _query = '';

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
      final results = await Future.wait([
        _repo.fetchAll(),
        // Rollar yuklanmasa ham ro'yxat ko'rinishi kerak - faqat forma
        // cheklanadi.
        _repo.fetchRoles().catchError((_) => <({String key, String nameUz})>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _all = results[0] as List<TeamMember>;
        _roles = results[1] as List<({String key, String nameUz})>;
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

  List<TeamMember> get _visible {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _all;
    return _all
        .where((e) =>
            e.fullName.toLowerCase().contains(q) ||
            e.phone.toLowerCase().contains(q) ||
            e.role.toLowerCase().contains(q))
        .toList();
  }

  String _roleName(String key) {
    for (final r in _roles) {
      if (r.key == key) return r.nameUz;
    }
    return key;
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

  Future<void> _call(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return;
    final uri = Uri.parse('tel:$digits');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _openForm({TeamMember? existing}) async {
    if (_roles.isEmpty) {
      _notify("Rollar ro'yxati yuklanmadi, qaytadan urinib ko'ring", error: true);
      return;
    }
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EmployeeForm(repo: _repo, roles: _roles, existing: existing),
    );
    if (saved == true) {
      _notify(existing == null ? "Xodim qo'shildi" : 'Maʼlumotlar yangilandi');
      _load();
    }
  }

  Future<void> _toggleBlock(TeamMember e) async {
    final active = e.status.toUpperCase() == 'ACTIVE';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(active ? 'Bloklansinmi?' : 'Blokdan chiqarilsinmi?'),
        content: Text(active
            ? '${e.fullName} tizimga kira olmaydi. Uning hozirgi sessiyasi ham '
                'darhol tugaydi.'
            : '${e.fullName} qaytadan tizimga kira oladi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: active ? AppTheme.dangerColor : AppTheme.primary),
            child: Text(active ? 'Bloklash' : 'Ochish'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _repo.setStatus(id: e.id, active: !active);
      _notify(active ? 'Bloklandi' : 'Blokdan chiqarildi');
      _load();
    } catch (err) {
      _notify(err.toString(), error: true);
    }
  }

  Future<void> _resetPassword(TeamMember e) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yangi parol'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: InputDecoration(labelText: '${e.fullName} uchun yangi parol'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Saqlash')),
        ],
      ),
    );
    final value = ctrl.text.trim();
    ctrl.dispose();
    if (ok != true) return;
    if (value.length < 4) {
      _notify("Parol kamida 4 belgi bo'lishi kerak", error: true);
      return;
    }
    try {
      await _repo.resetPassword(id: e.id, password: value);
      _notify('Parol yangilandi');
    } catch (err) {
      _notify(err.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      appBar: AppBar(title: const Text('Xodimlar')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openForm(),
        backgroundColor: AppTheme.primary,
        child: const Icon(LucideIcons.userPlus, color: Colors.white),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'Ism, telefon yoki lavozim',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                filled: true,
                fillColor: AppTheme.surfaceOf(context),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.rMd)),
              ),
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

    final items = _visible;
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: const [
          SizedBox(height: 60),
          EmptyState(icon: LucideIcons.userCog, message: 'Xodim topilmadi.'),
        ]),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final e = items[i];
          final active = e.status.toUpperCase() == 'ACTIVE';
          return AppCard(
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: active ? AppTheme.primarySoft : AppTheme.surfaceAltOf(context),
                    borderRadius: BorderRadius.circular(AppTheme.rMd),
                  ),
                  child: Icon(LucideIcons.user, size: 18,
                      color: active ? AppTheme.primary : AppTheme.textMutedOf(context)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        e.fullName.isEmpty ? '(nomsiz)' : e.fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimaryOf(context)),
                      ),
                      const SizedBox(height: 3),
                      MetaLine(LucideIcons.briefcase, _roleName(e.role)),
                      if (e.phone.isNotEmpty) MetaLine(LucideIcons.phone, e.phone),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    StatusPill(active ? 'Faol' : 'Bloklangan',
                        active ? AppTheme.primary : AppTheme.dangerColor),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (e.phone.isNotEmpty)
                          IconButton(
                            onPressed: () => _call(e.phone),
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(LucideIcons.phoneCall, size: 17, color: AppTheme.primary),
                          ),
                        PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          icon: Icon(LucideIcons.moreVertical, size: 17, color: AppTheme.textSecondaryOf(context)),
                          onSelected: (v) {
                            if (v == 'edit') _openForm(existing: e);
                            if (v == 'password') _resetPassword(e);
                            if (v == 'block') _toggleBlock(e);
                          },
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'edit', child: Text('Tahrirlash')),
                            const PopupMenuItem(value: 'password', child: Text('Parolni tiklash')),
                            PopupMenuItem(
                              value: 'block',
                              child: Text(active ? 'Bloklash' : 'Blokdan chiqarish'),
                            ),
                          ],
                        ),
                      ],
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

/// Qo'shish va tahrirlash uchun bitta forma.
///
/// MUHIM: login va parol FAQAT yangi xodim yaratishda so'raladi - backend
/// `PUT /employees/{id}` ularni qabul qilmaydi, parol esa alohida
/// `/password` endpointi orqali almashtiriladi.
class _EmployeeForm extends StatefulWidget {
  final EmployeesRepository repo;
  final List<({String key, String nameUz})> roles;
  final TeamMember? existing;

  const _EmployeeForm({required this.repo, required this.roles, this.existing});

  @override
  State<_EmployeeForm> createState() => _EmployeeFormState();
}

class _EmployeeFormState extends State<_EmployeeForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _phone;
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _salary = TextEditingController();

  late String _role;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.existing?.fullName ?? '');
    _phone = TextEditingController(text: widget.existing?.phone ?? '');
    _username.text = widget.existing?.username ?? '';
    final current = widget.existing?.role;
    _role = widget.roles.any((r) => r.key == current) ? current! : widget.roles.first.key;
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _username, _password, _salary]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final salary = double.tryParse(_salary.text.replaceAll(RegExp(r'[^0-9.]'), ''));
      if (_isEdit) {
        await widget.repo.update(
          id: widget.existing!.id,
          fullName: _name.text,
          phone: _phone.text,
          role: _role,
          username: _username.text,
          salary: salary,
        );
      } else {
        await widget.repo.create(
          fullName: _name.text,
          username: _username.text,
          password: _password.text,
          phone: _phone.text,
          role: _role,
          salary: salary ?? 0,
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
                Text(
                  _isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim',
                  style: TextStyle(
                      fontFamily: 'Outfit', fontSize: 18, fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimaryOf(context)),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!,
                      style: const TextStyle(
                          color: AppTheme.dangerColor, fontSize: 12, fontWeight: FontWeight.w600)),
                ],
                const FieldLabel('F.I.SH'),
                TextFormField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Ism kiritilishi shart' : null,
                ),
                const FieldLabel('Telefon'),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                      border: OutlineInputBorder(), hintText: '+998 90 123 45 67'),
                ),
                const FieldLabel('Lavozim'),
                DropdownButtonFormField<String>(
                  value: _role,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: widget.roles
                      .map((r) => DropdownMenuItem(value: r.key, child: Text(r.nameUz)))
                      .toList(),
                  onChanged: (v) => setState(() => _role = v ?? _role),
                ),
                // Login tahrirlashda ham o'zgartiriladi - backend
                // `PUT /employees/{id}` da `username` ni qabul qiladi va
                // bandligini o'zi tekshiradi (username butun baza bo'ylab
                // yagona bo'lishi shart).
                const FieldLabel('Login'),
                TextFormField(
                  controller: _username,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Login kiritilishi shart' : null,
                ),
                // Parol faqat YARATISHDA - mavjud xodimniki alohida
                // "Parolni tiklash" menyusi orqali almashtiriladi.
                if (!_isEdit) ...[
                  const FieldLabel('Parol'),
                  TextFormField(
                    controller: _password,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    validator: (v) =>
                        (v == null || v.trim().length < 4) ? "Kamida 4 belgi" : null,
                  ),
                ],
                const FieldLabel('Oylik (ixtiyoriy)'),
                TextFormField(
                  controller: _salary,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '0'),
                ),
                const SizedBox(height: 18),
                AppButton(
                  _saving ? 'Saqlanmoqda...' : (_isEdit ? 'Saqlash' : "Xodim qo'shish"),
                  onTap: _saving ? null : _save,
                  loading: _saving,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
