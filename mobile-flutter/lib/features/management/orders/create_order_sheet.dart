import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import 'orders_admin_repository.dart';

/// Yangi buyurtma yaratish.
///
/// Mijoz TELEFON bo'yicha topiladi: raqam kiritilganda mavjud mijozlar
/// orasidan qidiriladi va topilsa ismi/manzili avtomatik to'ladi. Topilmasa
/// saqlashda yangi mijoz yaratiladi - web paneldagi `CreateOrderModal.jsx`
/// bilan bir xil mantiq, chunki operatorlar odatda avval telefonni so'raydi.
class CreateOrderSheet extends StatefulWidget {
  final OrdersAdminRepository repo;

  const CreateOrderSheet({super.key, required this.repo});

  @override
  State<CreateOrderSheet> createState() => _CreateOrderSheetState();
}

class _CreateOrderSheetState extends State<CreateOrderSheet> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _name = TextEditingController();
  final _address = TextEditingController();
  final _price = TextEditingController();
  final _description = TextEditingController();

  static final _money = NumberFormat.decimalPattern('uz');

  List<({String id, String name, double price})> _services = [];
  List<({String id, String name})> _workers = [];
  List<({String id, String name, String phone, String address})> _clients = [];

  String? _serviceId;
  String? _workerId;
  String? _matchedClientId;
  DateTime? _backdate;

  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _phone.addListener(_matchClient);
    _load();
  }

  @override
  void dispose() {
    for (final c in [_phone, _name, _address, _price, _description]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = await Future.wait([
        widget.repo.fetchServices(),
        widget.repo.fetchWorkers().catchError((_) => <({String id, String name})>[]),
        widget.repo.fetchClients().catchError(
            (_) => <({String id, String name, String phone, String address})>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _services = r[0] as List<({String id, String name, double price})>;
        _workers = r[1] as List<({String id, String name})>;
        _clients = r[2] as List<({String id, String name, String phone, String address})>;
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

  /// Faqat raqamlarni solishtiramiz: baza va foydalanuvchi kiritgan format
  /// turlicha bo'lishi mumkin (+998 90 123-45-67 / 998901234567).
  void _matchClient() {
    final digits = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 7) {
      if (_matchedClientId != null) setState(() => _matchedClientId = null);
      return;
    }
    for (final c in _clients) {
      final cd = c.phone.replaceAll(RegExp(r'\D'), '');
      if (cd.isNotEmpty && cd.endsWith(digits)) {
        if (_matchedClientId == c.id) return;
        setState(() {
          _matchedClientId = c.id;
          _name.text = c.name;
          if (_address.text.trim().isEmpty) _address.text = c.address;
        });
        return;
      }
    }
    if (_matchedClientId != null) setState(() => _matchedClientId = null);
  }

  Future<void> _pickBackdate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _backdate ?? now,
      firstDate: DateTime(now.year - 2),
      // Kelajak sana ATAYIN yopiq - bu maydon o'tgan kunni qayd etish uchun.
      lastDate: now,
    );
    if (picked != null) setState(() => _backdate = picked);
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_serviceId == null) {
      setState(() => _error = 'Xizmat turini tanlang');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      // Mijoz topilmagan bo'lsa avval uni yaratamiz.
      var clientId = _matchedClientId;
      clientId ??= await widget.repo.createClient(
        fullName: _name.text,
        phone: _phone.text,
        address: _address.text,
      );

      final price = double.tryParse(_price.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;

      await widget.repo.create(
        clientId: clientId,
        serviceId: _serviceId!,
        workerId: _workerId,
        price: price,
        address: _address.text,
        description: _description.text,
        backdate: _backdate,
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
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
        child: _loading
            ? const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            : SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Yangi buyurtma',
                          style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textPrimary)),

                      if (_error != null) ...[
                        const SizedBox(height: 10),
                        Text(_error!,
                            style: const TextStyle(
                                color: AppTheme.dangerColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ],

                      const FieldLabel('Mijoz telefoni'),
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          border: const OutlineInputBorder(),
                          hintText: '+998 90 123 45 67',
                          suffixIcon: _matchedClientId != null
                              ? const Icon(LucideIcons.checkCircle2,
                                  size: 18, color: AppTheme.primary)
                              : null,
                        ),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Telefon kiritilishi shart' : null,
                      ),
                      if (_matchedClientId != null)
                        const Padding(
                          padding: EdgeInsets.only(top: 4),
                          child: Text('Mavjud mijoz topildi',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.primary)),
                        ),

                      const FieldLabel('Mijoz ismi'),
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Ism kiritilishi shart' : null,
                      ),

                      const FieldLabel('Xizmat turi'),
                      DropdownButtonFormField<String>(
                        value: _serviceId,
                        isExpanded: true,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                        hint: const Text('Tanlang'),
                        items: _services
                            .map((s) => DropdownMenuItem(
                                  value: s.id,
                                  child: Text('${s.name} (${_money.format(s.price.round())})',
                                      overflow: TextOverflow.ellipsis),
                                ))
                            .toList(),
                        onChanged: (v) {
                          // Narx tanlangan xizmatdan to'ladi, lekin qo'lda
                          // o'zgartirish mumkin - kelishilgan narx katalogdan
                          // farq qiladigan holatlar uchun.
                          final s = _services.where((e) => e.id == v).firstOrNull;
                          setState(() {
                            _serviceId = v;
                            if (s != null) _price.text = s.price.round().toString();
                          });
                        },
                      ),

                      const FieldLabel('Summa (so\'m)'),
                      TextFormField(
                        controller: _price,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                      ),

                      const FieldLabel('Mas\'ul xodim'),
                      DropdownButtonFormField<String>(
                        value: _workerId,
                        isExpanded: true,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                        hint: const Text('Biriktirilmasin'),
                        items: _workers
                            .map((w) => DropdownMenuItem(value: w.id, child: Text(w.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _workerId = v),
                      ),

                      const FieldLabel('Manzil'),
                      TextFormField(
                        controller: _address,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                      ),

                      const FieldLabel('Izoh'),
                      TextFormField(
                        controller: _description,
                        maxLines: 2,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                      ),

                      const FieldLabel('Sana'),
                      OutlinedButton.icon(
                        onPressed: _pickBackdate,
                        icon: const Icon(LucideIcons.calendar, size: 16),
                        label: Text(
                          _backdate == null
                              ? 'Bugun'
                              : DateFormat('dd.MM.yyyy').format(_backdate!),
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          "Eski sana tanlansa, buyurtma o'sha kunga yoziladi - "
                          "ro'yxatdan tushib qolgan buyurtmani kiritish uchun.",
                          style: TextStyle(
                              fontSize: 10.5,
                              color: AppTheme.textMuted,
                              fontWeight: FontWeight.w500),
                        ),
                      ),

                      const SizedBox(height: 18),
                      AppButton(
                        _saving ? 'Saqlanmoqda...' : 'Buyurtma yaratish',
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
