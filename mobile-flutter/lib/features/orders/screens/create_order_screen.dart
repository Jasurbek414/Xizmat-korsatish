import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/service_and_client.dart';
import '../bloc/orders_cubit.dart';
import '../repository/orders_repository.dart';

class CreateOrderScreen extends StatefulWidget {
  final String currentUserId;

  const CreateOrderScreen({super.key, required this.currentUserId});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _repository = OrdersRepository();

  bool _loading = false;
  List<ServiceInfo> _services = [];
  List<ClientInfo> _clients = [];

  bool _createNewClient = false;
  int _currentStep = 0; // 0 = mijoz, 1 = xizmat, 2 = manzil, 3 = tasdiqlash

  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();

  ClientInfo? _selectedClient;
  ServiceInfo? _selectedService;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _repository.fetchServices(),
        _repository.fetchClients(),
      ]);
      setState(() {
        _services = results[0] as List<ServiceInfo>;
        _clients = results[1] as List<ClientInfo>;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Ma'lumotlarni yuklashda xatolik: $e"),
            backgroundColor: AppTheme.dangerColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientPhoneController.dispose();
    _addressController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  bool get _canGoNext {
    switch (_currentStep) {
      case 0:
        if (_createNewClient) {
          return _clientNameController.text.trim().isNotEmpty &&
              _clientPhoneController.text.trim().isNotEmpty;
        }
        return _selectedClient != null;
      case 1:
        return _selectedService != null && _priceController.text.trim().isNotEmpty;
      case 2:
        return _addressController.text.trim().isNotEmpty;
      default:
        return true;
    }
  }

  Future<void> _submitForm() async {
    setState(() => _loading = true);
    try {
      String clientId = "";

      if (_createNewClient) {
        final client = await _repository.createClient(
          _clientNameController.text.trim(),
          _clientPhoneController.text.trim(),
          _addressController.text.trim(),
        );
        clientId = client.id;
      } else {
        clientId = _selectedClient!.id;
      }

      await context.read<OrdersCubit>().createOrder(
            clientId: clientId,
            serviceId: _selectedService!.id,
            workerId: widget.currentUserId,
            address: _addressController.text.trim(),
            price: double.tryParse(_priceController.text) ?? 0.0,
            description: _descriptionController.text.trim(),
          );

      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(LucideIcons.checkCircle, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Text("Buyurtma muvaffaqiyatli yaratildi",
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            backgroundColor: AppTheme.primary,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Xatolik: $e"),
            backgroundColor: AppTheme.dangerColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.bgOf(context),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text("Yangi buyurtma"),
      ),
      body: _loading && _services.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Step indicators
                _stepIndicator(isDark),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: 300.ms,
                    switchInCurve: Curves.easeOut,
                    switchOutCurve: Curves.easeIn,
                    child: _buildStepContent(isDark),
                  ),
                ),
                // Bottom navigation
                _buildBottomNav(isDark),
              ],
            ),
    );
  }

  Widget _stepIndicator(bool isDark) {
    final steps = [
      ('Mijoz', LucideIcons.user),
      ('Xizmat', LucideIcons.package),
      ('Manzil', LucideIcons.mapPin),
      ('Tasdiqlash', LucideIcons.checkCircle),
    ];

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: List.generate(steps.length, (i) {
          final isActive = i == _currentStep;
          final isDone = i < _currentStep;
          final color = isDone
              ? AppTheme.primary
              : isActive
                  ? AppTheme.primary
                  : isDark
                      ? AppTheme.darkTextMutedColor
                      : AppTheme.textMuted;

          return Expanded(
            child: Row(
              children: [
                // Step circle
                AnimatedContainer(
                  duration: 300.ms,
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isDone || isActive
                        ? AppTheme.primary
                        : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: color,
                      width: isActive ? 2.5 : 1.5,
                    ),
                  ),
                  child: Center(
                    child: isDone
                        ? const Icon(Icons.check,
                            size: 16, color: Colors.white)
                        : Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isActive ? Colors.white : color,
                            ),
                          ),
                  ),
                ),
                // Label
                if (i < steps.length - 1) ...[
                  const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      height: 2,
                      decoration: BoxDecoration(
                        color: isDone ? AppTheme.primary : color.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStepContent(bool isDark) {
    final key = ValueKey(_currentStep);
    final padding = const EdgeInsets.fromLTRB(16, 8, 16, 0);

    switch (_currentStep) {
      case 0:
        return Padding(
          key: key,
          padding: padding,
          child: _buildClientStep(isDark),
        ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1);
      case 1:
        return Padding(
          key: key,
          padding: padding,
          child: _buildServiceStep(isDark),
        ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1);
      case 2:
        return Padding(
          key: key,
          padding: padding,
          child: _buildLocationStep(isDark),
        ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1);
      case 3:
        return Padding(
          key: key,
          padding: padding,
          child: _buildConfirmStep(isDark),
        ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1);
      default:
        return const SizedBox.shrink();
    }
  }

  // ---- STEP 1: Mijoz ma'lumotlari ----
  Widget _buildClientStep(bool isDark) {
    return ListView(
      children: [
        _stepHeader('Mijoz tanlash', 'Buyurtma kimga tegishli?'),
        const SizedBox(height: 16),
        _sectionCard(
          isDark,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Yangi mijoz",
                    style: TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13)),
                Switch(
                  value: _createNewClient,
                  activeColor: AppTheme.primary,
                  onChanged: (val) => setState(() => _createNewClient = val),
                ),
              ],
            ),
            if (_createNewClient) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _clientNameController,
                style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.textPrimary),
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: "Mijoz ismi (F.I.O)",
                  prefixIcon:
                      Icon(LucideIcons.user, size: 18),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _clientPhoneController,
                keyboardType: TextInputType.phone,
                style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.textPrimary),
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: "Telefon raqami (+998)",
                  prefixIcon:
                      Icon(LucideIcons.phone, size: 18),
                ),
              ),
            ] else ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<ClientInfo>(
                value: _selectedClient,
                dropdownColor: isDark
                    ? AppTheme.darkSurfaceColor
                    : AppTheme.surface,
                style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.textPrimary),
                decoration: const InputDecoration(
                  labelText: "Mavjud mijozlardan tanlang",
                  prefixIcon:
                      Icon(LucideIcons.userCircle, size: 18),
                ),
                items: _clients.map((c) {
                  return DropdownMenuItem<ClientInfo>(
                    value: c,
                    child: Text("${c.fullName} (${c.phone})",
                        overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  setState(() {
                    _selectedClient = val;
                    if (val != null &&
                        _addressController.text.isEmpty) {
                      _addressController.text = val.address;
                    }
                  });
                },
              ),
            ],
          ],
        ),
      ],
    );
  }

  // ---- STEP 2: Xizmat turi va narx ----
  Widget _buildServiceStep(bool isDark) {
    return ListView(
      children: [
        _stepHeader('Xizmat va narx', 'Buyurtma turi va to\'lov miqdori'),
        const SizedBox(height: 16),
        _sectionCard(
          isDark,
          children: [
            DropdownButtonFormField<ServiceInfo>(
              value: _selectedService,
              dropdownColor:
                  isDark ? AppTheme.darkSurfaceColor : AppTheme.surface,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.textPrimary),
              decoration: const InputDecoration(
                labelText: "Xizmat turi",
                prefixIcon: Icon(LucideIcons.package, size: 18),
              ),
              items: _services.map((s) {
                return DropdownMenuItem<ServiceInfo>(
                  value: s,
                  child: Text(
                      "${s.nameUz} (${s.price.toStringAsFixed(0)} so'm / ${s.measurementUnit})",
                      overflow: TextOverflow.ellipsis),
                );
              }).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedService = val;
                  if (val != null) {
                    _priceController.text =
                        val.price.toStringAsFixed(0);
                  }
                });
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.textPrimary),
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: "Umumiy narx (so'm)",
                prefixIcon: Icon(LucideIcons.wallet, size: 18),
                suffixText: "so'm",
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              maxLines: 3,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.textPrimary),
              decoration: const InputDecoration(
                labelText: "Izoh (ixtiyoriy)",
                prefixIcon:
                    Icon(LucideIcons.fileText, size: 18),
                alignLabelWithHint: true,
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ---- STEP 3: Manzil ----
  Widget _buildLocationStep(bool isDark) {
    return ListView(
      children: [
        _stepHeader('Manzil', 'Buyurtma yetkaziladigan joy'),
        const SizedBox(height: 16),
        _sectionCard(
          isDark,
          children: [
            TextField(
              controller: _addressController,
              maxLines: 2,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.textPrimary),
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: "To'liq manzil",
                prefixIcon: Icon(LucideIcons.mapPin, size: 18),
                alignLabelWithHint: true,
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ---- STEP 4: Tasdiqlash ----
  Widget _buildConfirmStep(bool isDark) {
    final clientName = _createNewClient
        ? _clientNameController.text.trim()
        : _selectedClient?.fullName ?? '';
    final clientPhone = _createNewClient
        ? _clientPhoneController.text.trim()
        : _selectedClient?.phone ?? '';

    return ListView(
      children: [
        _stepHeader(
            'Tasdiqlash', 'Ma\'lumotlarni tekshirib chiqing'),
        const SizedBox(height: 16),
        _sectionCard(
          isDark,
          children: [
            _confirmRow(LucideIcons.user, 'Mijoz', clientName),
            _confirmRow(LucideIcons.phone, 'Telefon', clientPhone),
            _confirmRow(LucideIcons.package, 'Xizmat',
                _selectedService?.nameUz ?? ''),
            _confirmRow(
                LucideIcons.wallet,
                'Narx',
                _priceController.text.isEmpty
                    ? '-'
                    : '${_priceController.text} so\'m'),
            _confirmRow(LucideIcons.mapPin, 'Manzil',
                _addressController.text.trim()),
            if (_descriptionController.text.trim().isNotEmpty)
              _confirmRow(LucideIcons.fileText, 'Izoh',
                  _descriptionController.text.trim()),
          ],
        ),
      ],
    );
  }

  Widget _confirmRow(IconData icon, String label, String value) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppTheme.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(value,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---- Helper widgets ----
  Widget _stepHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: AppTheme.display(18, weight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(subtitle,
            style: AppTheme.text(12,
                color: Theme.of(context).brightness == Brightness.dark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.textSecondary)),
      ],
    );
  }

  Widget _sectionCard(bool isDark, {required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor,
        ),
      ),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: children),
    );
  }

  Widget _buildBottomNav(bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.surface,
        border: Border(
          top: BorderSide(
            color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor,
          ),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: OutlinedButton(
                onPressed:
                    _loading ? null : () => setState(() => _currentStep--),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor,
                  ),
                  foregroundColor: isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.textPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(LucideIcons.arrowLeft, size: 18),
                    SizedBox(width: 6),
                    Text("Orqaga",
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              onPressed: _loading
                  ? null
                  : (_canGoNext
                      ? () {
                          if (_currentStep == 3) {
                            _submitForm();
                          } else {
                            setState(() => _currentStep++);
                          }
                        }
                      : null),
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _currentStep == 3 ? "Buyurtma yaratish" : "Davom etish",
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if (_currentStep < 3) ...[
                          const SizedBox(width: 6),
                          const Icon(LucideIcons.arrowRight, size: 18),
                        ],
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
