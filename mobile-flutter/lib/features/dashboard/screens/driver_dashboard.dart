import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../auth/bloc/auth_bloc.dart';

class DriverDashboard extends StatefulWidget {
  final User user;
  const DriverDashboard({super.key, required this.user});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  bool _isOnline = false;
  double _collectedCash = 450000.0; // Simulated cash in hand
  double _earnedKpi = 180000.0; // Commission earned

  // Mock list of assigned orders with stage categories:
  // "OLISH" (Collection), "YETKAZISH" (Delivery), "TUGALLANDI" (History)
  final List<Map<String, dynamic>> _mockOrders = [
    {
      'id': 'ORD-2026-00001',
      'client': 'Jasur Mavlonov',
      'phone': '+998 99 888 77 66',
      'service': 'Tezkor Yetkazib berish',
      'address': 'Yunusobod tumani, 4-kvartal',
      'price': 25000.0,
      'status': 'Qabul qilindi',
      'stage': 'OLISH', // Olib kelish bosqichi
      'return_date': '2026-06-28 18:00',
      'collected_amount': 0.0,
      'payment_method': 'Tanlanmagan',
      'expense_amount': 0.0,
      'expense_desc': '',
    },
    {
      'id': 'ORD-2026-00003',
      'client': 'Sardor Alimov',
      'phone': '+998 90 444 33 22',
      'service': 'Standart Yetkazib berish (Yuvish)',
      'address': 'Chilonzor, 2-kvartal, 12-uy',
      'price': 15000.0,
      'status': 'Sexda tayyorlandi',
      'stage': 'YETKAZISH', // Yetkazib berish bosqichi
      'return_date': '2026-06-29 10:00',
      'collected_amount': 0.0,
      'payment_method': 'Tanlanmagan',
      'expense_amount': 0.0,
      'expense_desc': '',
    },
    {
      'id': 'ORD-2026-00002',
      'client': 'Zilola Karimova',
      'phone': '+998 90 777 66 55',
      'service': 'Konditsioner Ta\'mirlash',
      'address': 'Chilonzor tumani, 1-kvartal',
      'price': 120000.0,
      'status': 'Tugallandi',
      'stage': 'TUGALLANDI', // Tarix
      'return_date': '2026-06-26 14:30',
      'collected_amount': 120000.0,
      'payment_method': 'Karta',
      'expense_amount': 15000.0,
      'expense_desc': 'Taksi xarajati',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: AppTheme.darkSurface,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.user.fullName,
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Text(
                'Mas\'ul Kuryer (Online Monitor)',
                style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
              ),
            ],
          ),
          actions: [
            Row(
              children: [
                Text(
                  _isOnline ? 'ONLINE' : 'OFFLINE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: _isOnline
                        ? AppTheme.successColor
                        : AppTheme.textSecondary,
                  ),
                ),
                Switch(
                  value: _isOnline,
                  activeColor: AppTheme.successColor,
                  onChanged: (val) => _handleOnlineToggle(val),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(
                LucideIcons.logOut,
                size: 18,
                color: AppTheme.dangerColor,
              ),
              onPressed: () {
                context.read<AuthBloc>().add(LogoutEvent());
              },
            ),
          ],
          bottom: const TabBar(
            indicatorColor: AppTheme.primaryColor,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: AppTheme.textSecondary,
            labelStyle: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
            tabs: [
              Tab(text: 'Olib kelish (Olish)'),
              Tab(text: 'Yetkazib berish'),
              Tab(text: 'Tarix (Eski)'),
            ],
          ),
        ),
        body: Column(
          children: [
            // Top Wallet Balance Stats
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: _buildWalletCards(),
            ),
            if (_isOnline)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: _buildGpsActiveAlert(),
              ),
            const SizedBox(height: 8),

            // Tab Views
            Expanded(
              child: TabBarView(
                children: [
                  _buildOrderListByStage('OLISH'),
                  _buildOrderListByStage('YETKAZISH'),
                  _buildOrderListByStage('TUGALLANDI'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletCards() {
    return Row(
      children: [
        // Cash in Hand Wallet
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppTheme.textSecondary.withOpacity(0.1),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      LucideIcons.wallet,
                      size: 14,
                      color: AppTheme.warningColor,
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Kuryer Kassasi',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${_collectedCash.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} so\'m',
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => _showHandoverModal(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 6,
                      horizontal: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: AppTheme.primaryColor.withOpacity(0.2),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.qrCode,
                          size: 11,
                          color: AppTheme.primaryColor,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Topshirish',
                          style: TextStyle(
                            fontSize: 9,
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),

        // KPI Wallet
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppTheme.textSecondary.withOpacity(0.1),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      LucideIcons.percent,
                      size: 14,
                      color: AppTheme.successColor,
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Ishlangan KPI',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${_earnedKpi.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} so\'m',
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 6,
                    horizontal: 8,
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Komissiya foizi: 10%',
                    style: TextStyle(
                      fontSize: 9,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGpsActiveAlert() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.successColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.successColor.withOpacity(0.2)),
      ),
      child: const Row(
        children: [
          Icon(LucideIcons.navigation, size: 16, color: AppTheme.successColor),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Majburiy GPS Kuzatuvi Faol',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
                Text(
                  'Koordinatalaringiz har 15 soniyada serverga yuborilmoqda.',
                  style: TextStyle(fontSize: 9, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderListByStage(String stage) {
    final list = _mockOrders.where((o) => o['stage'] == stage).toList();
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              LucideIcons.fileSpreadsheet,
              size: 40,
              color: AppTheme.textSecondary.withOpacity(0.4),
            ),
            const SizedBox(height: 8),
            Text(
              stage == 'OLISH'
                  ? 'Olib kelish uchun buyurtmalar yo\'q'
                  : stage == 'YETKAZISH'
                  ? 'Yetkazib berish uchun buyurtmalar yo\'q'
                  : 'Tarixda buyurtmalar topilmadi',
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final ord = list[index];
        return _buildOrderCard(ord);
      },
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> ord) {
    final isHistory = ord['stage'] == 'TUGALLANDI';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardColor.withOpacity(0.4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.textSecondary.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                ord['id'],
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: ord['status'] == 'Tugallandi'
                      ? AppTheme.successColor.withOpacity(0.1)
                      : Colors.amber.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  ord['status'],
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: ord['status'] == 'Tugallandi'
                        ? AppTheme.successColor
                        : Colors.amber,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            ord['client'],
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(
                LucideIcons.phone,
                size: 12,
                color: AppTheme.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                ord['phone'],
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2.0),
                child: Icon(
                  LucideIcons.mapPin,
                  size: 12,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  ord['address'],
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Show Return Date and Collected status
          Row(
            children: [
              const Icon(
                LucideIcons.calendar,
                size: 12,
                color: AppTheme.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                'Qaytarish: ${ord['return_date']}',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(
                LucideIcons.calculator,
                size: 12,
                color: AppTheme.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                ord['collected_amount'] > 0
                    ? 'Kirim: ${ord['collected_amount'].toInt()} UZS (${ord['payment_method']})'
                    : 'Kirim: Qilinmagan',
                style: TextStyle(
                  fontSize: 11,
                  color: ord['collected_amount'] > 0
                      ? AppTheme.successColor
                      : AppTheme.textSecondary,
                  fontWeight: ord['collected_amount'] > 0
                      ? FontWeight.bold
                      : FontWeight.normal,
                ),
              ),
              if (ord['expense_amount'] > 0) ...[
                const SizedBox(width: 10),
                const Icon(
                  LucideIcons.trendingDown,
                  size: 12,
                  color: AppTheme.dangerColor,
                ),
                const SizedBox(width: 2),
                Text(
                  'Chiqim: ${ord['expense_amount'].toInt()} UZS',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.dangerColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${ord['price'].toInt()} UZS',
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              if (!isHistory)
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(
                        LucideIcons.edit3,
                        size: 16,
                        color: AppTheme.primaryColor,
                      ),
                      tooltip: 'Narxni tahrirlash',
                      onPressed: () => _showPriceChangeDialog(ord),
                    ),
                    const SizedBox(width: 4),
                    ElevatedButton(
                      onPressed: () => _showFinanceDialog(ord),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        backgroundColor: AppTheme.cardColor,
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            LucideIcons.calculator,
                            size: 12,
                            color: Colors.white,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Moliya & Sana',
                            style: TextStyle(fontSize: 10, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),

                    // Stage specific actions
                    if (ord['stage'] == 'OLISH')
                      ElevatedButton(
                        onPressed: () => _transitionToOldim(ord),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successColor,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          'Oldim',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    else if (ord['stage'] == 'YETKAZISH')
                      ElevatedButton(
                        onPressed: () => _transitionToYetkazish(ord),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          'Yetkazish',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _handleOnlineToggle(bool val) async {
    if (val) {
      // Force GPS permission & service check
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showGpsErrorDialog(
          'Telefoningizda GPS geolokatsiya xizmati o\'chirilgan. Iltimos, GPSni yoqing!',
        );
        return;
      }
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showGpsErrorDialog('Ilova ishlashi uchun GPS ruxsatnomasi zarur!');
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        _showGpsErrorDialog(
          'GPS ruxsatnomasi butunlay taqiqlangan. Sozlamalardan faollashtiring!',
        );
        return;
      }
    }
    setState(() {
      _isOnline = val;
    });
  }

  void _showGpsErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: const Row(
          children: [
            Icon(LucideIcons.alertTriangle, color: AppTheme.dangerColor),
            SizedBox(width: 8),
            Text(
              'GPS Majburiy',
              style: TextStyle(fontFamily: 'Outfit', fontSize: 16),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tushunarli'),
          ),
        ],
      ),
    );
  }

  void _transitionToOldim(Map<String, dynamic> ord) {
    final TextEditingController amountController = TextEditingController(
      text: '0',
    );
    String paymentMethod = 'Naqd';
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.darkSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            '${ord['id']} - Buyurtmani qabul qilish',
            style: const TextStyle(fontFamily: 'Outfit', fontSize: 15),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Buyurtmani olish vaqtida mijoz to\'lov qildimi?\n(Bu bosqichda to\'lov kiritish ixtiyoriy)',
                style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(
                  suffixText: 'UZS',
                  hintText: '0',
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: ['Naqd', 'Karta', 'Click'].map((method) {
                  final isSelected = paymentMethod == method;
                  return ChoiceChip(
                    label: Text(method, style: const TextStyle(fontSize: 10)),
                    selected: isSelected,
                    selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                    side: BorderSide(
                      color: isSelected
                          ? AppTheme.primaryColor
                          : Colors.white10,
                    ),
                    onSelected: (val) {
                      setDialogState(() {
                        paymentMethod = method;
                      });
                    },
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Bekor qilish'),
            ),
            ElevatedButton(
              onPressed: () {
                final double collected =
                    double.tryParse(amountController.text) ?? 0.0;
                setState(() {
                  ord['status'] = 'Oldim (Qabul qilindi)';
                  ord['stage'] = 'YETKAZISH';
                  if (collected > 0) {
                    ord['collected_amount'] = collected;
                    ord['payment_method'] = paymentMethod;
                    if (paymentMethod == 'Naqd') {
                      _collectedCash += collected;
                    }
                  }
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Buyurtma qabul qilindi. Sexga yetkazish kutilmoqda.',
                    ),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              },
              child: const Text('Saqlash va Davom etish'),
            ),
          ],
        ),
      ),
    );
  }

  void _transitionToYetkazish(Map<String, dynamic> ord) {
    setState(() {
      ord['status'] = 'Yo\'lda (Yetkazib berish)';
    });
    _showDeliveryCompleteDialog(ord);
  }

  void _showDeliveryCompleteDialog(Map<String, dynamic> ord) {
    final bool alreadyPaid = ord['collected_amount'] > 0;
    final TextEditingController amountController = TextEditingController(
      text: alreadyPaid ? '0' : ord['price'].toInt().toString(),
    );
    String paymentMethod = alreadyPaid ? ord['payment_method'] : 'Naqd';
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.darkSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            '${ord['id']} - Yetkazib berishni yakunlash',
            style: const TextStyle(fontFamily: 'Outfit', fontSize: 15),
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (alreadyPaid) ...[
                  Text(
                    'Buyurtma uchun oldindan ${ord['collected_amount'].toInt()} UZS (${ord['payment_method']}) to\'langan.',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.successColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Qo\'shimcha to\'lov qabul qilindimi? (ixtiyoriy)',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ] else ...[
                  const Text(
                    'Ushbu buyurtma uchun oldindan to\'lov qilinmagan.\nTo\'lovni qabul qilish majburiy!',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.dangerColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                TextFormField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(
                    suffixText: 'UZS',
                    hintText: '0',
                  ),
                  validator: (value) {
                    if (alreadyPaid) return null;
                    final double val = double.tryParse(value ?? '') ?? 0.0;
                    if (val <= 0) {
                      return 'To\'lov summasini kiriting (majburiy)!';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: ['Naqd', 'Karta', 'Click'].map((method) {
                    final isSelected = paymentMethod == method;
                    return ChoiceChip(
                      label: Text(method, style: const TextStyle(fontSize: 10)),
                      selected: isSelected,
                      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                      side: BorderSide(
                        color: isSelected
                            ? AppTheme.primaryColor
                            : Colors.white10,
                      ),
                      onSelected: (val) {
                        setDialogState(() {
                          paymentMethod = method;
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Bekor qilish'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState?.validate() ?? false) {
                  final double entered =
                      double.tryParse(amountController.text) ?? 0.0;
                  setState(() {
                    ord['status'] = 'Tugallandi';
                    ord['stage'] = 'TUGALLANDI';
                    if (alreadyPaid) {
                      if (entered > 0) {
                        ord['collected_amount'] =
                            ord['collected_amount'] + entered;
                        if (paymentMethod == 'Naqd') {
                          _collectedCash += entered;
                        }
                      }
                    } else {
                      ord['collected_amount'] = entered;
                      ord['payment_method'] = paymentMethod;
                      if (paymentMethod == 'Naqd') {
                        _collectedCash += entered;
                      }
                    }
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Buyurtma muvaffaqiyatli topshirildi va pul hisobga olindi!',
                      ),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              },
              child: const Text('Topshirildi / Yakunlash'),
            ),
          ],
        ),
      ),
    );
  }

  void _showPriceChangeDialog(Map<String, dynamic> ord) {
    final TextEditingController priceController = TextEditingController(
      text: ord['price'].toInt().toString(),
    );
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: Text(
          '${ord['id']} - Summani belgilash',
          style: const TextStyle(fontFamily: 'Outfit', fontSize: 15),
        ),
        content: TextField(
          controller: priceController,
          keyboardType: TextInputType.number,
          style: const TextStyle(fontSize: 13),
          decoration: const InputDecoration(suffixText: 'UZS'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              final double p =
                  double.tryParse(priceController.text) ?? ord['price'];
              setState(() {
                ord['price'] = p;
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Buyurtma narxi muvaffaqiyatli o\'zgartirildi!',
                  ),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _showFinanceDialog(Map<String, dynamic> ord) {
    final TextEditingController amountController = TextEditingController(
      text: ord['price'].toInt().toString(),
    );
    final TextEditingController expAmountController = TextEditingController(
      text: ord['expense_amount'] > 0
          ? ord['expense_amount'].toInt().toString()
          : '0',
    );
    final TextEditingController expDescController = TextEditingController(
      text: ord['expense_desc'],
    );
    String paymentMethod = ord['payment_method'] == 'Tanlanmagan'
        ? 'Naqd'
        : ord['payment_method'];
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.darkSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            '${ord['id']} - Sana va Moliya',
            style: const TextStyle(
              fontFamily: 'Outfit',
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Return date picker trigger
                const Text(
                  'Qaytarish vaqti (Date)',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 6),
                OutlinedButton.icon(
                  icon: const Icon(LucideIcons.calendar, size: 14),
                  label: Text(
                    ord['return_date'] != 'Belgilanmagan' &&
                            selectedDate ==
                                DateTime.now().add(const Duration(days: 1))
                        ? ord['return_date']
                        : DateFormat('yyyy-MM-dd HH:mm').format(selectedDate),
                    style: const TextStyle(fontSize: 12),
                  ),
                  onPressed: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 30)),
                    );
                    if (d != null) {
                      if (!context.mounted) return;
                      final t = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.fromDateTime(selectedDate),
                      );
                      if (t != null) {
                        setDialogState(() {
                          selectedDate = DateTime(
                            d.year,
                            d.month,
                            d.day,
                            t.hour,
                            t.minute,
                          );
                        });
                      }
                    }
                  },
                ),
                const SizedBox(height: 16),
                const Divider(color: Colors.white10),
                const SizedBox(height: 12),

                // Kirim section
                const Text(
                  'Kirim qilish (Mijozdan olingan pul)',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(
                    suffixText: 'UZS',
                    hintText: '0',
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: ['Naqd', 'Karta', 'Click'].map((method) {
                    final isSelected = paymentMethod == method;
                    return ChoiceChip(
                      label: Text(method, style: const TextStyle(fontSize: 10)),
                      selected: isSelected,
                      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                      side: BorderSide(
                        color: isSelected
                            ? AppTheme.primaryColor
                            : Colors.white10,
                      ),
                      onSelected: (val) {
                        setDialogState(() {
                          paymentMethod = method;
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Divider(color: Colors.white10),
                const SizedBox(height: 12),

                // Chiqim section
                const Text(
                  'Chiqim qilish (Buyurtma xarajati)',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.dangerColor,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: expAmountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(
                    suffixText: 'UZS',
                    hintText: '0',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: expDescController,
                  style: const TextStyle(fontSize: 12),
                  decoration: const InputDecoration(
                    hintText: 'Xarajat izohi (masalan: yoqilg\'i)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                'Bekor qilish',
                style: TextStyle(color: AppTheme.textSecondary),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                final double collected =
                    double.tryParse(amountController.text) ?? 0.0;
                final double expense =
                    double.tryParse(expAmountController.text) ?? 0.0;

                setState(() {
                  ord['return_date'] = DateFormat(
                    'yyyy-MM-dd HH:mm',
                  ).format(selectedDate);

                  // Update virtual wallets
                  if (collected > 0 && paymentMethod == 'Naqd') {
                    final diff = collected - ord['collected_amount'];
                    _collectedCash += diff;
                  }

                  if (expense > 0) {
                    final diff = expense - ord['expense_amount'];
                    _collectedCash -= diff;
                  }

                  ord['collected_amount'] = collected;
                  ord['payment_method'] = paymentMethod;
                  ord['expense_amount'] = expense;
                  ord['expense_desc'] = expDescController.text;
                });

                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Sana va moliya ma\'lumotlari muvaffaqiyatli saqlandi!',
                    ),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              },
              child: const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );
  }

  void _showHandoverModal() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Kassani Topshirish',
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'G\'aznachiga ushbu QR-kodni ko\'rsating. Pul sanab olingach balans tasdiqlanadi.',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                LucideIcons.qrCode,
                size: 140,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Topshirilayotgan pul: ${_collectedCash.toInt()} UZS',
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Yopish',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _collectedCash = 0.0;
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Kassa muvaffaqiyatli topshirildi!'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            child: const Text('Simulyatsiya: Tasdiqlash'),
          ),
        ],
      ),
    );
  }
}
