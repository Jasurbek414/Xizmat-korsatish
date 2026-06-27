import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../auth/bloc/auth_bloc.dart';

class AdminDashboard extends StatefulWidget {
  final User user;
  const AdminDashboard({super.key, required this.user});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _activeSubTab =
      0; // 0: Hisobotlar, 1: Buyurtmalar, 2: Xodimlar, 3: Kassa, 4: Sozlamalar
  String _orderSearchQuery = '';
  String _companyName = 'ExpressMail Ltd';
  String _shiftStart = '08:00';
  String _shiftEnd = '18:00';
  double _gpsInterval = 15.0;
  double _baseKpiRate = 10.0;
  double _maxAdvanceLimit = 1000000.0;
  String _selectedOrderFilter = 'Barchasi';

  // Mock global orders list for Admin
  final List<Map<String, dynamic>> _adminOrders = [
    {
      'id': 'ORD-2026-00001',
      'client': 'Jasur Mavlonov',
      'phone': '+998 99 888 77 66',
      'service': 'Gilam Yuvish',
      'qty': '32.5',
      'unit': 'kv. metr',
      'price': 487500.0,
      'status': 'Sexda yuvilmoqda',
      'driver': 'Alisher Qodirov',
      'created_at': '2026-06-27 08:30',
      'return_date': '2026-06-26 18:00', // Delayed
    },
    {
      'id': 'ORD-2026-00002',
      'client': 'Zilola Karimova',
      'phone': '+998 90 777 66 55',
      'service': 'Konditsioner Ta\'mirlash',
      'qty': '2',
      'unit': 'dona',
      'price': 240000.0,
      'status': 'Tugallandi',
      'driver': 'Dostonbek Ergashev',
      'created_at': '2026-06-26 14:30',
      'return_date': '2026-06-28 14:30',
    },
    {
      'id': 'ORD-2026-00003',
      'client': 'Sardor Alimov',
      'phone': '+998 90 444 33 22',
      'service': 'Parda tozalash',
      'qty': '10',
      'unit': 'dona',
      'price': 120000.0,
      'status': 'Yo\'lda (Yetkazib berish)',
      'driver': 'Alisher Qodirov',
      'created_at': '2026-06-27 09:00',
      'return_date': '2026-06-28 10:00',
    },
  ];

  bool _isOrderDelayed(String returnDateStr) {
    if (returnDateStr == 'Belgilanmagan') return false;
    try {
      final DateTime returnDate = DateFormat(
        'yyyy-MM-dd HH:mm',
      ).parse(returnDateStr);
      return DateTime.now().isAfter(returnDate);
    } catch (_) {
      return false;
    }
  }

  // Mock measurement units
  final List<String> _units = ['dona', 'kv. metr', 'kg', 'litr', 'metr'];
  final TextEditingController _unitController = TextEditingController();

  // Mock service catalog
  final List<Map<String, dynamic>> _services = [
    {'name': 'Gilam Yuvish', 'price': 15000.0, 'unit': 'kv. metr'},
    {'name': 'Konditsioner Ta\'mirlash', 'price': 120000.0, 'unit': 'dona'},
    {'name': 'Parda tozalash', 'price': 12000.0, 'unit': 'dona'},
    {'name': 'Uyni tozalash', 'price': 250000.0, 'unit': 'xizmat'},
  ];

  // Mock employee directory with Payroll statistics
  final List<Map<String, dynamic>> _employees = [
    {
      'name': 'Alisher Qodirov',
      'role': 'Kuryer',
      'salary': 3000000.0,
      'kpi_rate': 10.0,
      'kpi_earned': 340000.0,
      'advances_paid': 200000.0,
      'salary_paid': 0.0,
      'attendance': 'Faol (08:02)',
      'attendance_status': 'OK',
    },
    {
      'name': 'Dostonbek Ergashev',
      'role': 'Kuryer',
      'salary': 3000000.0,
      'kpi_rate': 10.0,
      'kpi_earned': 280000.0,
      'advances_paid': 0.0,
      'salary_paid': 0.0,
      'attendance': 'Faol (07:58)',
      'attendance_status': 'OK',
    },
    {
      'name': 'Aziza Qodirova',
      'role': 'Menejer',
      'salary': 4500000.0,
      'kpi_rate': 5.0,
      'kpi_earned': 120000.0,
      'advances_paid': 500000.0,
      'salary_paid': 1500000.0,
      'attendance': 'Kechikdi (08:45)',
      'attendance_status': 'LATE',
    },
    {
      'name': 'Doston Axmedov',
      'role': 'Sex ishchisi',
      'salary': 3500000.0,
      'kpi_rate': 8.0,
      'kpi_earned': 95000.0,
      'advances_paid': 0.0,
      'salary_paid': 0.0,
      'attendance': 'Kelmagan',
      'attendance_status': 'ABSENT',
    },
  ];

  // Mock cash desks & handover approvals queue
  final List<Map<String, dynamic>> _wallets = [
    {
      'name': 'Naqd pul (Asosiy Kassa)',
      'balance': 4500000.0,
      'color': AppTheme.successColor,
    },
    {
      'name': 'Bank hisob raqami (SaaS)',
      'balance': 25000000.0,
      'color': AppTheme.accentColor,
    },
    {
      'name': 'Click / Payme tranzit',
      'balance': 8200000.0,
      'color': AppTheme.primaryColor,
    },
  ];

  // Handover requests from couriers awaiting approval
  final List<Map<String, dynamic>> _handoverRequests = [
    {
      'courier': 'Alisher Qodirov',
      'amount': 450000.0,
      'time': '10 minut oldin',
      'order_id': 'ORD-2026-00001',
    },
  ];

  // Transaction Ledger Feed
  final List<Map<String, dynamic>> _recentTransactions = [
    {
      'desc': 'Kirim (ORD-2026-00002)',
      'amount': 240000.0,
      'type': 'IN',
      'time': '12:45',
    },
    {
      'desc': 'Chiqim (Yoqilg\'i xarajati)',
      'amount': -15000.0,
      'type': 'OUT',
      'time': '11:20',
    },
    {
      'desc': 'Kirim (ORD-2026-00001)',
      'amount': 487500.0,
      'type': 'IN',
      'time': '09:15',
    },
  ];

  @override
  void dispose() {
    _unitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
              'Asosiy Tizim Administratori',
              style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
            ),
          ],
        ),
        actions: [
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
      ),
      body: _buildSelectedTab(),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: AppTheme.darkSurface,
        currentIndex: _activeSubTab,
        selectedItemColor: AppTheme.primaryColor,
        unselectedItemColor: AppTheme.textSecondary,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        onTap: (index) {
          setState(() {
            _activeSubTab = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.barChart2, size: 20),
            label: 'Tahlil',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.shoppingBag, size: 20),
            label: 'Zakazlar',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.users, size: 20),
            label: 'Xodimlar',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.wallet, size: 20),
            label: 'Kassa',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.settings, size: 20),
            label: 'Sozlamalar',
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedTab() {
    switch (_activeSubTab) {
      case 0:
        return _buildAnalyticsTab();
      case 1:
        return _buildOrdersTab();
      case 2:
        return _buildEmployeesTab();
      case 3:
        return _buildFinanceTab();
      case 4:
        return _buildSettingsTab();
      default:
        return _buildAnalyticsTab();
    }
  }

  // 1. Hisobotlar (Analytics) Tab
  Widget _buildAnalyticsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Kompaniya Moliyaviy Holati',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          // Main Balance card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.cardColor,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: AppTheme.textSecondary.withOpacity(0.08),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Sof Foyda (Joriy oy)',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 4),
                const Text(
                  '32 700 000 UZS',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(color: Colors.white10),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Jami Kirim',
                          style: TextStyle(
                            fontSize: 9,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '45 000 000 UZS',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Jami Chiqim',
                          style: TextStyle(
                            fontSize: 9,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          '12 300 000 UZS',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.dangerColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Operational Indicators
          const Text(
            'Operatsion Ko\'rsatkichlar',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricMiniCard(
                  'Faol buyurtmalar',
                  '3 ta',
                  LucideIcons.shoppingBag,
                  AppTheme.primaryColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricMiniCard(
                  'Kuryerlar yo\'lda',
                  '2 nafar',
                  LucideIcons.navigation,
                  AppTheme.warningColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Ledger Entries
          const Text(
            'Oxirgi Tranzaksiyalar',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: AppTheme.cardColor.withOpacity(0.4),
              borderRadius: BorderRadius.circular(20),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _recentTransactions.length,
              separatorBuilder: (context, index) =>
                  const Divider(color: Colors.white10, height: 1),
              itemBuilder: (context, index) {
                final tx = _recentTransactions[index];
                final isIncome = tx['type'] == 'IN';
                return ListTile(
                  leading: Icon(
                    isIncome
                        ? LucideIcons.trendingUp
                        : LucideIcons.trendingDown,
                    color: isIncome
                        ? AppTheme.successColor
                        : AppTheme.dangerColor,
                    size: 16,
                  ),
                  title: Text(
                    tx['desc'],
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    tx['time'],
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  trailing: Text(
                    '${isIncome ? "+" : ""}${tx['amount'].toInt()} UZS',
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isIncome
                          ? AppTheme.successColor
                          : AppTheme.dangerColor,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricMiniCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.textSecondary.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'Outfit',
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  // 2. Buyurtmalar (Orders Console) Tab
  Widget _buildOrdersTab() {
    final filtered = _adminOrders.where((o) {
      final matchesSearch =
          o['id'].toLowerCase().contains(_orderSearchQuery.toLowerCase()) ||
          o['client'].toLowerCase().contains(_orderSearchQuery.toLowerCase()) ||
          o['service'].toLowerCase().contains(_orderSearchQuery.toLowerCase());

      if (_selectedOrderFilter == 'Barchasi') return matchesSearch;
      if (_selectedOrderFilter == 'Sexda')
        return o['status'].contains('Sexda') && matchesSearch;
      if (_selectedOrderFilter == 'Yetkazish')
        return o['status'].contains('Yo\'lda') && matchesSearch;
      if (_selectedOrderFilter == 'Tugallandi')
        return o['status'].contains('Tugallandi') && matchesSearch;
      return matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 13,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Buyurtmalarni izlash...',
                    prefixIcon: Icon(
                      LucideIcons.search,
                      size: 16,
                      color: AppTheme.textSecondary,
                    ),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                  ),
                  onChanged: (val) {
                    setState(() {
                      _orderSearchQuery = val;
                    });
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: ['Barchasi', 'Sexda', 'Yetkazish', 'Tugallandi']
                      .map((filter) {
                        final isSelected = _selectedOrderFilter == filter;
                        return ChoiceChip(
                          label: Text(
                            filter,
                            style: const TextStyle(fontSize: 10),
                          ),
                          selected: isSelected,
                          selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                          side: BorderSide(
                            color: isSelected
                                ? AppTheme.primaryColor
                                : Colors.white10,
                          ),
                          onSelected: (val) {
                            setState(() {
                              _selectedOrderFilter = filter;
                            });
                          },
                        );
                      })
                      .toList(),
                ),
              ],
            ),
          ),

          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filtered.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final ord = filtered[index];
                final isDelayed = _isOrderDelayed(
                  ord['return_date'] ?? 'Belgilanmagan',
                );
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardColor.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isDelayed
                          ? AppTheme.dangerColor.withOpacity(0.3)
                          : AppTheme.textSecondary.withOpacity(0.08),
                    ),
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
                            ),
                          ),
                          Row(
                            children: [
                              if (isDelayed) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.dangerColor.withOpacity(
                                      0.1,
                                    ),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(
                                        LucideIcons.alertTriangle,
                                        size: 10,
                                        color: AppTheme.dangerColor,
                                      ),
                                      SizedBox(width: 4),
                                      Text(
                                        'KECHIKDI!',
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: AppTheme.dangerColor,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 6),
                              ],
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  ord['status'],
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: AppTheme.primaryColor,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        ord['client'],
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${ord['service']} • ${ord['qty']} ${ord['unit']}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(
                            LucideIcons.calendar,
                            size: 12,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Qaytarish vaqti: ${ord['return_date']}',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDelayed
                                  ? AppTheme.dangerColor
                                  : AppTheme.textSecondary,
                              fontWeight: isDelayed
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(
                            LucideIcons.user,
                            size: 12,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Haydovchi: ${ord['driver']}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${ord['price'].toInt()} UZS',
                            style: const TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.successColor,
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () => _showOrderEditor(ord),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: const Text(
                              'Boshqarish',
                              style: TextStyle(fontSize: 10),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(LucideIcons.plus, color: Colors.white),
        onPressed: () => _showCreateOrderModal(),
      ),
    );
  }

  void _showOrderEditor(Map<String, dynamic> ord) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: Text(
          '${ord['id']} - Buyurtmani Boshqarish',
          style: const TextStyle(fontFamily: 'Outfit', fontSize: 15),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(
                LucideIcons.userCheck,
                color: AppTheme.primaryColor,
              ),
              title: const Text(
                'Kuryerni o\'zgartirish',
                style: TextStyle(fontSize: 12),
              ),
              subtitle: Text(
                ord['driver'],
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.textSecondary,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _showDriverAssignDialog(ord);
              },
            ),
            ListTile(
              leading: const Icon(
                LucideIcons.edit2,
                color: AppTheme.warningColor,
              ),
              title: const Text(
                'Statusni yangilash',
                style: TextStyle(fontSize: 12),
              ),
              subtitle: Text(
                ord['status'],
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.textSecondary,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _showStatusUpdateDialog(ord);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showDriverAssignDialog(Map<String, dynamic> ord) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: const Text(
          'Kuryerni biriktirish',
          style: TextStyle(fontFamily: 'Outfit', fontSize: 15),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: _employees.where((e) => e['role'] == 'Kuryer').map((emp) {
            return ListTile(
              leading: const Icon(
                LucideIcons.truck,
                color: AppTheme.primaryColor,
              ),
              title: Text(emp['name'], style: const TextStyle(fontSize: 12)),
              onTap: () {
                setState(() {
                  ord['driver'] = emp['name'];
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Buyurtma ${emp['name']} ga muvaffaqiyatli biriktirildi!',
                    ),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showStatusUpdateDialog(Map<String, dynamic> ord) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: const Text(
          'Buyurtma statusi',
          style: TextStyle(fontFamily: 'Outfit', fontSize: 15),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children:
              [
                'Qabul qilindi',
                'Sexda yuvilmoqda',
                'Yo\'lda (Yetkazib berish)',
                'Tugallandi',
              ].map((st) {
                return ListTile(
                  title: Text(st, style: const TextStyle(fontSize: 12)),
                  onTap: () {
                    setState(() {
                      ord['status'] = st;
                    });
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Status "$st" ga o\'zgartirildi!'),
                        backgroundColor: AppTheme.successColor,
                      ),
                    );
                  },
                );
              }).toList(),
        ),
      ),
    );
  }

  void _showCreateOrderModal() {
    final TextEditingController clientC = TextEditingController();
    final TextEditingController phoneC = TextEditingController();
    final TextEditingController addressC = TextEditingController();
    final TextEditingController qtyC = TextEditingController();
    String selectedService = _services.first['name'];
    String selectedUnit = _units.first;
    double pricePerUnit = _services.first['price'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            top: 24,
            left: 24,
            right: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Yangi Buyurtma Yaratish',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: clientC,
                  style: const TextStyle(fontSize: 12),
                  decoration: const InputDecoration(
                    hintText: 'Mijoz ismi (F.I.O)',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneC,
                  style: const TextStyle(fontSize: 12),
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(hintText: 'Telefon raqami'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: addressC,
                  style: const TextStyle(fontSize: 12),
                  decoration: const InputDecoration(hintText: 'Manzili'),
                ),
                const SizedBox(height: 12),

                const Text(
                  'Xizmat turi',
                  style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                ),
                DropdownButton<String>(
                  value: selectedService,
                  dropdownColor: AppTheme.darkSurface,
                  isExpanded: true,
                  items: _services.map((s) {
                    return DropdownMenuItem<String>(
                      value: s['name'],
                      child: Text(
                        '${s['name']} (${s['price'].toInt()} UZS)',
                        style: const TextStyle(fontSize: 12),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      final match = _services.firstWhere(
                        (s) => s['name'] == val,
                      );
                      setModalState(() {
                        selectedService = val;
                        pricePerUnit = match['price'];
                        selectedUnit = match['unit'];
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: qtyC,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 12),
                        decoration: const InputDecoration(hintText: 'Miqdori'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    DropdownButton<String>(
                      value: selectedUnit,
                      dropdownColor: AppTheme.darkSurface,
                      items: _units.map((u) {
                        return DropdownMenuItem<String>(
                          value: u,
                          child: Text(u, style: const TextStyle(fontSize: 12)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() {
                            selectedUnit = val;
                          });
                        }
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    final double qty = double.tryParse(qtyC.text) ?? 1.0;
                    final double calculatedPrice = qty * pricePerUnit;

                    setState(() {
                      _adminOrders.insert(0, {
                        'id': 'ORD-2026-0000${_adminOrders.length + 1}',
                        'client': clientC.text,
                        'phone': phoneC.text,
                        'service': selectedService,
                        'qty': qtyC.text,
                        'unit': selectedUnit,
                        'price': calculatedPrice,
                        'status': 'Qabul qilindi',
                        'driver': 'Biriktirilmagan',
                        'created_at': 'Bugun',
                      });
                    });
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Yangi buyurtma muvaffaqiyatli qo\'shildi!',
                        ),
                        backgroundColor: AppTheme.successColor,
                      ),
                    );
                  },
                  child: const Text('Buyurtmani Yaratish'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // 3. Xodimlar (Staff Directory & Payroll) Tab
  Widget _buildEmployeesTab() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _employees.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final emp = _employees[index];
        Color attColor = AppTheme.successColor;
        if (emp['attendance_status'] == 'LATE')
          attColor = AppTheme.warningColor;
        if (emp['attendance_status'] == 'ABSENT')
          attColor = AppTheme.dangerColor;

        // Dynamic payout balance calculation
        final double maxPayable =
            (emp['salary'] + emp['kpi_earned']) -
            emp['advances_paid'] -
            emp['salary_paid'];

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.textSecondary.withOpacity(0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    emp['name'],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: attColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      emp['attendance'],
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: attColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                emp['role'],
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 12),
              const Divider(color: Colors.white10),
              const SizedBox(height: 8),

              // Salary Breakdown
              _buildPayrollRow('Oylik maosh:', emp['salary']),
              _buildPayrollRow(
                'KPI komissiya:',
                emp['kpi_earned'],
                color: AppTheme.primaryColor,
              ),
              _buildPayrollRow(
                'Berilgan Avans:',
                emp['advances_paid'],
                color: AppTheme.warningColor,
              ),
              _buildPayrollRow(
                'To\'langan Oylik:',
                emp['salary_paid'],
                color: AppTheme.successColor,
              ),

              const SizedBox(height: 8),
              const Divider(color: Colors.white10),
              const SizedBox(height: 8),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'To\'lanadigan qoldiq:',
                        style: TextStyle(
                          fontSize: 9,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      Text(
                        '${maxPayable.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} UZS',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: maxPayable > 0
                              ? AppTheme.warningColor
                              : AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () => _showPayrollDialog(emp, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.warningColor.withOpacity(
                            0.1,
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          side: BorderSide(
                            color: AppTheme.warningColor.withOpacity(0.2),
                          ),
                        ),
                        child: const Text(
                          'Avans',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppTheme.warningColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      ElevatedButton(
                        onPressed: maxPayable <= 0
                            ? null
                            : () => _showPayrollDialog(emp, false),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successColor,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Oylik',
                          style: TextStyle(
                            fontSize: 10,
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
      },
    );
  }

  Widget _buildPayrollRow(String label, double value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
          ),
          Text(
            '${value.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} UZS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color ?? AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  void _showPayrollDialog(Map<String, dynamic> emp, bool isAdvance) {
    final double maxPayable =
        (emp['salary'] + emp['kpi_earned']) -
        emp['advances_paid'] -
        emp['salary_paid'];
    final TextEditingController amountController = TextEditingController(
      text: isAdvance ? '500000' : maxPayable.toInt().toString(),
    );
    String selectedWallet = _wallets.first['name'];
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.darkSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            isAdvance
                ? 'Avans berish: ${emp['name']}'
                : 'Oylik to\'lash: ${emp['name']}',
            style: const TextStyle(
              fontFamily: 'Outfit',
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  isAdvance
                      ? 'Avans summasini va to\'lov manbasini tanlang:'
                      : 'To\'lanishi kerak bo\'lgan qoldiq: ${maxPayable.toInt()} UZS',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
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
                    final double val = double.tryParse(value ?? '') ?? 0.0;
                    if (val <= 0) return 'Summa 0 dan katta bo\'lishi kerak!';
                    if (!isAdvance && val > maxPayable) {
                      return 'Kiritilgan summa qoldiqdan katta!';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                const Text(
                  'To\'lov manbasi (Kassa)',
                  style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 4),
                DropdownButton<String>(
                  value: selectedWallet,
                  dropdownColor: AppTheme.darkSurface,
                  isExpanded: true,
                  items: _wallets.map((w) {
                    return DropdownMenuItem<String>(
                      value: w['name'],
                      child: Text(
                        '${w['name']} (${w['balance'].toInt()} UZS)',
                        style: const TextStyle(fontSize: 11),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() {
                        selectedWallet = val;
                      });
                    }
                  },
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
                if (formKey.currentState?.validate() ?? false) {
                  final double amt =
                      double.tryParse(amountController.text) ?? 0.0;
                  final matchWallet = _wallets.firstWhere(
                    (w) => w['name'] == selectedWallet,
                  );

                  if (matchWallet['balance'] < amt) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Kassada mablag\' yetarli emas!'),
                        backgroundColor: AppTheme.dangerColor,
                      ),
                    );
                    return;
                  }

                  setState(() {
                    matchWallet['balance'] = matchWallet['balance'] - amt;
                    if (isAdvance) {
                      emp['advances_paid'] = emp['advances_paid'] + amt;
                    } else {
                      emp['salary_paid'] = emp['salary_paid'] + amt;
                    }

                    _recentTransactions.insert(0, {
                      'desc':
                          '${emp['name']}ga ${isAdvance ? "avans" : "oylik"} to\'landi',
                      'amount': -amt,
                      'type': 'OUT',
                      'time': 'Hozir',
                    });
                  });

                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        '${emp['name']}ga ${isAdvance ? "avans" : "oylik"} muvaffaqiyatli to\'landi!',
                      ),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              },
              child: const Text('To\'lashni tasdiqlash'),
            ),
          ],
        ),
      ),
    );
  }

  // 4. Kassa & Approvals & direct Kirim/Chiqim Tab
  Widget _buildFinanceTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Kirim / Chiqim transaction buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(
                    LucideIcons.plusCircle,
                    size: 16,
                    color: Colors.white,
                  ),
                  label: const Text(
                    'Kirim qilish',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.successColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _showDirectFinanceTransactionDialog(true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(
                    LucideIcons.minusCircle,
                    size: 16,
                    color: Colors.white,
                  ),
                  label: const Text(
                    'Chiqim qilish',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.dangerColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _showDirectFinanceTransactionDialog(false),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Handover Approvals Queue
          if (_handoverRequests.isNotEmpty) ...[
            const Text(
              'Pul Topsihirish So\'rovlari (Handover)',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppTheme.warningColor,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.warningColor.withOpacity(0.08),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppTheme.warningColor.withOpacity(0.2),
                ),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _handoverRequests.length,
                separatorBuilder: (context, index) =>
                    const Divider(color: Colors.white10),
                itemBuilder: (context, index) {
                  final req = _handoverRequests[index];
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req['courier'],
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Summa: ${req['amount'].toInt()} UZS (${req['time']})',
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _wallets[0]['balance'] =
                                _wallets[0]['balance'] + req['amount'];
                            _handoverRequests.removeAt(index);
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Kuryer kassasi qabul qilinib tasdiqlandi!',
                              ),
                              backgroundColor: AppTheme.successColor,
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successColor,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Tasdiqlash',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
          ],

          const Text(
            'Balanslar va Kassalar',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _wallets.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final w = _wallets[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.cardColor,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: AppTheme.textSecondary.withOpacity(0.08),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.wallet, size: 16, color: w['color']),
                        const SizedBox(width: 12),
                        Text(
                          w['name'],
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${w['balance'].toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} UZS',
                      style: const TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showDirectFinanceTransactionDialog(bool isIncome) {
    final TextEditingController amountController = TextEditingController();
    final TextEditingController descController = TextEditingController();
    String selectedWallet = _wallets.first['name'];
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.darkSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            isIncome
                ? 'Kirim qilish (Bookkeeping)'
                : 'Chiqim qilish (Bookkeeping)',
            style: const TextStyle(
              fontFamily: 'Outfit',
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  isIncome
                      ? 'Kassa balansiga kirim summasini kiritish'
                      : 'Kassa balansidan chiqim summasini kiritish',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
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
                    final double val = double.tryParse(value ?? '') ?? 0.0;
                    if (val <= 0) return 'Summa 0 dan katta bo\'lishi kerak!';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descController,
                  style: const TextStyle(fontSize: 12),
                  decoration: const InputDecoration(
                    hintText: 'Tranzaksiya tavsifi / sababi',
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Tanlangan Kassa / Wallet',
                  style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 4),
                DropdownButton<String>(
                  value: selectedWallet,
                  dropdownColor: AppTheme.darkSurface,
                  isExpanded: true,
                  items: _wallets.map((w) {
                    return DropdownMenuItem<String>(
                      value: w['name'],
                      child: Text(
                        '${w['name']} (${w['balance'].toInt()} UZS)',
                        style: const TextStyle(fontSize: 11),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() {
                        selectedWallet = val;
                      });
                    }
                  },
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
                if (formKey.currentState?.validate() ?? false) {
                  final double amt =
                      double.tryParse(amountController.text) ?? 0.0;
                  final matchWallet = _wallets.firstWhere(
                    (w) => w['name'] == selectedWallet,
                  );

                  if (!isIncome && matchWallet['balance'] < amt) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Kassada mablag\' yetarli emas!'),
                        backgroundColor: AppTheme.dangerColor,
                      ),
                    );
                    return;
                  }

                  setState(() {
                    if (isIncome) {
                      matchWallet['balance'] = matchWallet['balance'] + amt;
                    } else {
                      matchWallet['balance'] = matchWallet['balance'] - amt;
                    }

                    _recentTransactions.insert(0, {
                      'desc': descController.text.isNotEmpty
                          ? descController.text
                          : (isIncome
                                ? 'Kirim operatsiyasi'
                                : 'Chiqim operatsiyasi'),
                      'amount': isIncome ? amt : -amt,
                      'type': isIncome ? 'IN' : 'OUT',
                      'time': 'Hozir',
                    });
                  });

                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Tranzaksiya muvaffaqiyatli saqlandi!'),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              },
              child: const Text('Tasdiqlash'),
            ),
          ],
        ),
      ),
    );
  }

  // 5. Sozlamalar Tab
  Widget _buildSettingsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Company Profile settings
          _buildSettingsSectionCard(
            title: 'Kompaniya profili va ish vaqti',
            icon: LucideIcons.building,
            children: [
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Kompaniya nomi',
                  labelStyle: TextStyle(fontSize: 11),
                ),
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.textPrimary,
                ),
                controller: TextEditingController(text: _companyName),
                onChanged: (val) {
                  _companyName = val;
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(
                        labelText: 'Ish boshlanishi',
                        labelStyle: TextStyle(fontSize: 11),
                      ),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textPrimary,
                      ),
                      controller: TextEditingController(text: _shiftStart),
                      onChanged: (val) {
                        _shiftStart = val;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(
                        labelText: 'Ish yakunlanishi',
                        labelStyle: TextStyle(fontSize: 11),
                      ),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textPrimary,
                      ),
                      controller: TextEditingController(text: _shiftEnd),
                      onChanged: (val) {
                        _shiftEnd = val;
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Courier & Financial thresholds
          _buildSettingsSectionCard(
            title: 'KPI va Kuryer Sozlamalari',
            icon: LucideIcons.sliders,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'GPS koordinatalarni yangilash:',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  Text(
                    '${_gpsInterval.toInt()} soniya',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
              Slider(
                value: _gpsInterval,
                min: 5,
                max: 60,
                divisions: 11,
                activeColor: AppTheme.primaryColor,
                onChanged: (val) {
                  setState(() {
                    _gpsInterval = val;
                  });
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(
                        labelText: 'Kuryer KPI foizi (%)',
                        labelStyle: TextStyle(fontSize: 11),
                      ),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textPrimary,
                      ),
                      keyboardType: TextInputType.number,
                      controller: TextEditingController(
                        text: _baseKpiRate.toInt().toString(),
                      ),
                      onChanged: (val) {
                        _baseKpiRate = double.tryParse(val) ?? _baseKpiRate;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(
                        labelText: 'Max avans limiti (UZS)',
                        labelStyle: TextStyle(fontSize: 11),
                      ),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textPrimary,
                      ),
                      keyboardType: TextInputType.number,
                      controller: TextEditingController(
                        text: _maxAdvanceLimit.toInt().toString(),
                      ),
                      onChanged: (val) {
                        _maxAdvanceLimit =
                            double.tryParse(val) ?? _maxAdvanceLimit;
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Services Pricing Catalog
          ExpansionTile(
            leading: const Icon(
              LucideIcons.tag,
              size: 20,
              color: AppTheme.primaryColor,
            ),
            title: const Text(
              'Xizmat ko\'rsatish narxlari',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            childrenPadding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.cardColor.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _services.length,
                  separatorBuilder: (context, index) =>
                      const Divider(color: Colors.white10, height: 1),
                  itemBuilder: (context, index) {
                    final s = _services[index];
                    return ListTile(
                      title: Text(
                        s['name'],
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      subtitle: Text(
                        'O\'lchov turi: ${s['unit']}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${s['price'].toInt()} UZS',
                            style: const TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 4),
                          IconButton(
                            icon: const Icon(
                              LucideIcons.edit2,
                              size: 12,
                              color: AppTheme.textSecondary,
                            ),
                            onPressed: () => _showServicePriceEditor(s),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Measurement Units
          ExpansionTile(
            leading: const Icon(
              LucideIcons.layers,
              size: 20,
              color: AppTheme.accentColor,
            ),
            title: const Text(
              'O\'lchov Birliklari',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            childrenPadding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _units.map((unit) {
                  return Chip(
                    label: Text(
                      unit,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                    side: BorderSide(
                      color: AppTheme.primaryColor.withOpacity(0.2),
                    ),
                    deleteIcon: const Icon(
                      LucideIcons.x,
                      size: 12,
                      color: AppTheme.dangerColor,
                    ),
                    onDeleted: () {
                      setState(() {
                        _units.remove(unit);
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _unitController,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 12,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Yangi birlik...',
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () {
                      final val = _unitController.text.trim();
                      if (val.isNotEmpty && !_units.contains(val)) {
                        setState(() {
                          _units.add(val);
                        });
                        _unitController.clear();
                      }
                    },
                    child: const Text('Qo\'shish'),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Database & Backups
          _buildSettingsSectionCard(
            title: 'Tizim va Zaxira nusxalar',
            icon: LucideIcons.database,
            children: [
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(
                        LucideIcons.trash2,
                        size: 14,
                        color: AppTheme.dangerColor,
                      ),
                      label: const Text(
                        'Keshni tozalash',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppTheme.dangerColor,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.white10),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Tizim keshi tozalandi.'),
                            backgroundColor: AppTheme.successColor,
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(LucideIcons.downloadCloud, size: 14),
                      label: const Text(
                        'Zaxiralash',
                        style: TextStyle(fontSize: 10),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.white10),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Zaxira nusxasi yaratildi (Database Backup).',
                            ),
                            backgroundColor: AppTheme.successColor,
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(LucideIcons.refreshCw, size: 14),
                      label: const Text(
                        'Sinxronlash',
                        style: TextStyle(fontSize: 10, color: Colors.white),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Bulutli server bilan muvaffaqiyatli sinxronlandi.',
                            ),
                            backgroundColor: AppTheme.successColor,
                          ),
                        );
                      },
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

  Widget _buildSettingsSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardColor.withOpacity(0.4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.textSecondary.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  void _showServicePriceEditor(Map<String, dynamic> s) {
    final TextEditingController controller = TextEditingController(
      text: s['price'].toInt().toString(),
    );
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: Text(
          '${s['name']} - Narxni o\'zgartirish',
          style: const TextStyle(fontFamily: 'Outfit', fontSize: 15),
        ),
        content: TextField(
          controller: controller,
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
              final double p = double.tryParse(controller.text) ?? s['price'];
              setState(() {
                s['price'] = p;
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Xizmat narxi yangilandi!'),
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
}
