import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../auth/bloc/auth_bloc.dart';

class ManagerDashboard extends StatefulWidget {
  final User user;
  const ManagerDashboard({super.key, required this.user});

  @override
  State<ManagerDashboard> createState() => _ManagerDashboardState();
}

class _ManagerDashboardState extends State<ManagerDashboard> {
  int _activeSubTab =
      0; // 0: Zakazlar, 1: Xodimlar & Davomad, 2: Kassa, 3: CRM Mijozlar
  String _orderSearchQuery = '';
  String _selectedOrderFilter = 'Barchasi';

  // Mock global orders list for Manager
  final List<Map<String, dynamic>> _managerOrders = [
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
      'return_date': '2026-06-26 18:00', // Delay (Current time is June 27)
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
      'return_date': '2026-06-28 10:00', // Normal
    },
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

  // Mock wallets
  final List<Map<String, dynamic>> _wallets = [
    {
      'name': 'Naqd pul (Asosiy Kassa)',
      'balance': 4500000.0,
      'color': AppTheme.successColor,
    },
    {
      'name': 'Click / Payme tranzit',
      'balance': 8200000.0,
      'color': AppTheme.primaryColor,
    },
  ];

  // Transaction Ledger Feed
  final List<Map<String, dynamic>> _recentTransactions = [
    {
      'desc': 'Kirim (ORD-2026-00001)',
      'amount': 487500.0,
      'type': 'IN',
      'time': '09:15',
    },
  ];

  // Mock CRM client directory
  final List<Map<String, dynamic>> _crmClients = [
    {'name': 'Jasur Mavlonov', 'phone': '+998 99 888 77 66', 'ordersCount': 5},
    {'name': 'Sardor Alimov', 'phone': '+998 90 444 33 22', 'ordersCount': 12},
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
              'Operativ Bo\'lim Menejeri',
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
            icon: Icon(LucideIcons.userPlus, size: 20),
            label: 'CRM',
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedTab() {
    switch (_activeSubTab) {
      case 0:
        return _buildOrdersTab();
      case 1:
        return _buildEmployeesTab();
      case 2:
        return _buildFinanceTab();
      case 3:
        return _buildCRMTab();
      default:
        return _buildOrdersTab();
    }
  }

  // 1. Orders Management with Lateness Alert Badges
  Widget _buildOrdersTab() {
    final filtered = _managerOrders.where((o) {
      final matchesSearch =
          o['id'].toLowerCase().contains(_orderSearchQuery.toLowerCase()) ||
          o['client'].toLowerCase().contains(_orderSearchQuery.toLowerCase()) ||
          o['service'].toLowerCase().contains(_orderSearchQuery.toLowerCase());

      if (_selectedOrderFilter == 'Barchasi') return matchesSearch;
      if (_selectedOrderFilter == 'Delayed')
        return _isOrderDelayed(o['return_date']) && matchesSearch;
      return matchesSearch;
    }).toList();

    return Column(
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
                  hintText: 'Menejer: Zakazlarni izlash...',
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
                children: ['Barchasi', 'Delayed'].map((filter) {
                  final isSelected = _selectedOrderFilter == filter;
                  return ChoiceChip(
                    label: Text(
                      filter == 'Delayed' ? 'Kechikkanlar' : 'Barchasi',
                      style: const TextStyle(fontSize: 10),
                    ),
                    selected: isSelected,
                    selectedColor: filter == 'Delayed'
                        ? AppTheme.dangerColor.withOpacity(0.2)
                        : AppTheme.primaryColor.withOpacity(0.2),
                    side: BorderSide(
                      color: isSelected
                          ? (filter == 'Delayed'
                                ? AppTheme.dangerColor
                                : AppTheme.primaryColor)
                          : Colors.white10,
                    ),
                    onSelected: (val) {
                      setState(() {
                        _selectedOrderFilter = filter;
                      });
                    },
                  );
                }).toList(),
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
              final isDelayed = _isOrderDelayed(ord['return_date']);

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
                                  color: AppTheme.dangerColor.withOpacity(0.1),
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
                            'Status / Kuryer',
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
                'Kuryerni biriktirish',
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

  // 2. Staff Payroll & Premium Attendance UI
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
                    child: Row(
                      children: [
                        Icon(LucideIcons.clock, size: 10, color: attColor),
                        const SizedBox(width: 4),
                        Text(
                          emp['attendance'],
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: attColor,
                          ),
                        ),
                      ],
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

              // Salary statistics
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
            isAdvance ? 'Menejer: Avans berish' : 'Menejer: Oylik to\'lash',
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
                      ? 'Avans summasini kiritish'
                      : 'To\'lanadigan qoldiq: ${maxPayable.toInt()} UZS',
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
                          'Menejer: ${emp['name']}ga ${isAdvance ? "avans" : "oylik"} to\'ladi',
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

  // 3. Finance (Kassa & Bookkeeping) Tab
  Widget _buildFinanceTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          const Text(
            'Kassa Balanslari',
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
            isIncome ? 'Kirim qilish' : 'Chiqim qilish',
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
                      ? 'Kirim summasini kiritish'
                      : 'Chiqim summasini kiritish',
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
                    hintText: 'Tranzaksiya izohi',
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Kassa',
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
                          : (isIncome ? 'Menejer: Kirim' : 'Menejer: Chiqim'),
                      'amount': isIncome ? amt : -amt,
                      'type': isIncome ? 'IN' : 'OUT',
                      'time': 'Hozir',
                    });
                  });

                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Tranzaksiya muvaffaqiyatli bajarildi!'),
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

  // 4. CRM Client Directory Tab
  Widget _buildCRMTab() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _crmClients.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final cl = _crmClients[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.cardColor,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cl['name'],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    cl['phone'],
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.darkBackground,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${cl['ordersCount']} ta zakaz',
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
