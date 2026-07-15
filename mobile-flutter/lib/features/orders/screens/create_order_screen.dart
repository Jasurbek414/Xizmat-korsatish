import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
  final _formKey = GlobalKey<FormState>();
  final _repository = OrdersRepository();

  bool _loading = false;
  List<ServiceInfo> _services = [];
  List<ClientInfo> _clients = [];

  bool _createNewClient = false;

  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();

  ClientInfo? _selectedClient;
  ServiceInfo? _selectedService;

  final _addressController = TextEditingController();
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();

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
          SnackBar(content: Text("Boshlang'ich ma'lumotlarni yuklashda xatolik: $e")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Yangi buyurtma yaratish",
          style: TextStyle(
            fontFamily: 'Outfit',
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.white,
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Client Selection Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.cardColor.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "Mijoz tanlash",
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              Row(
                                children: [
                                  const Text("Yangi mijoz", style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                                  Switch(
                                    value: _createNewClient,
                                    activeColor: AppTheme.accentColor,
                                    onChanged: (val) {
                                      setState(() {
                                        _createNewClient = val;
                                      });
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          if (_createNewClient) ...[
                            TextFormField(
                              controller: _clientNameController,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: const InputDecoration(
                                labelText: "Mijoz ismi (F.I.O)",
                                labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                              ),
                              validator: (val) => (val == null || val.trim().isEmpty) ? "Mijoz ismini yozing" : null,
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _clientPhoneController,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                labelText: "Telefon raqami (+998)",
                                labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                              ),
                              validator: (val) => (val == null || val.trim().isEmpty) ? "Telefon raqamini yozing" : null,
                            ),
                          ] else ...[
                            DropdownButtonFormField<ClientInfo>(
                              value: _selectedClient,
                              dropdownColor: const Color(0xff1f2937),
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: const InputDecoration(
                                labelText: "Mavjud mijozlardan tanlang",
                                labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                              ),
                              items: _clients.map((c) {
                                return DropdownMenuItem<ClientInfo>(
                                  value: c,
                                  child: Text("${c.fullName} (${c.phone})"),
                                );
                              }).toList(),
                              onChanged: (val) {
                                setState(() {
                                  _selectedClient = val;
                                  if (val != null && _addressController.text.isEmpty) {
                                    _addressController.text = val.address;
                                  }
                                });
                              },
                              validator: (val) => val == null ? "Mijozni tanlang" : null,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 2. Service Selection Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.cardColor.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Xizmat turi va Narxi",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const SizedBox(height: 10),
                          DropdownButtonFormField<ServiceInfo>(
                            value: _selectedService,
                            dropdownColor: const Color(0xff1f2937),
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: "Xizmat turini tanlang",
                              labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                            items: _services.map((s) {
                              return DropdownMenuItem<ServiceInfo>(
                                  value: s,
                                  child: Text("${s.nameUz} (${s.price.toStringAsFixed(0)} so'm / ${s.measurementUnit})")
                              );
                            }).toList(),
                            onChanged: (val) {
                              setState(() {
                                _selectedService = val;
                                if (val != null) {
                                  _priceController.text = val.price.toStringAsFixed(0);
                                }
                              });
                            },
                            validator: (val) => val == null ? "Xizmatni tanlang" : null,
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _priceController,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: "Umumiy taxminiy narx (so'm)",
                              labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                            validator: (val) => (val == null || val.trim().isEmpty) ? "Narxni kiriting" : null,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 3. Location and Details Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.cardColor.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Manzil va Izoh",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _addressController,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: "Buyurtma manzili",
                              labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                            validator: (val) => (val == null || val.trim().isEmpty) ? "Manzilni kiriting" : null,
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _descriptionController,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: "Izoh / Qo'shimcha ma'lumotlar",
                              labelStyle: TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _submitForm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successColor,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text(
                          "Buyurtma yaratish",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    final ordersCubit = context.read<OrdersCubit>();

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

      await ordersCubit.createOrder(
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
          const SnackBar(content: Text("Buyurtma muvaffaqiyatli yaratildi")),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Buyurtma yaratishda xatolik: $e")),
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
}
