import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../auth/bloc/auth_bloc.dart';

class WorkshopDashboard extends StatefulWidget {
  final User user;
  const WorkshopDashboard({super.key, required this.user});

  @override
  State<WorkshopDashboard> createState() => _WorkshopDashboardState();
}

class _WorkshopDashboardState extends State<WorkshopDashboard> {
  // Mock list of active items inside the workshop with pricing details
  final List<Map<String, dynamic>> _workshopItems = [
    {
      'id': 'ORD-2026-00004',
      'service': 'Gilam Yuvish',
      'qty': 0.0, // Awaiting measurement
      'unit': 'kv. metr',
      'price_per_unit': 15000.0,
      'price': 0.0,
      'status': 'Sexga qabul qilindi',
      'return_date': '2026-06-26 18:00', // Delay (Current time is June 27)
    },
    {
      'id': 'ORD-2026-00005',
      'service': 'Konditsioner Ta\'mirlash',
      'qty': 2.0,
      'unit': 'dona',
      'price_per_unit': 120000.0,
      'price': 240000.0,
      'status': 'Sexda yuvilmoqda',
      'return_date': '2026-06-28 15:00', // Normal
    },
  ];

  final List<String> _units = ['dona', 'kv. metr', 'kg', 'litr', 'metr'];

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
              'Sex / Ishxona Ishchisi',
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildScannerCard(),
            const SizedBox(height: 24),
            const Text(
              'Ishlov berilayotgan buyurtmalar',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _workshopItems.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = _workshopItems[index];
                return _buildWorkshopItemCard(item);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScannerCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primaryColor.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.qrCode,
              size: 28,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'QR-kod Skaneri (Kamera)',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Mahsulotdagi yorliqni skan qilib, statusni bir tegishda o\'zgartiring.',
            style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            icon: const Icon(LucideIcons.camera, size: 16),
            label: const Text('Skan qilishni boshlash'),
            onPressed: () => _openScannerSimulator(),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkshopItemCard(Map<String, dynamic> item) {
    final isDelayed = _isOrderDelayed(item['return_date']);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkSurface,
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
                item['id'],
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
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.warningColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item['status'],
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.warningColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            item['service'],
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                item['qty'] > 0
                    ? 'O\'lchov miqdori: ${item['qty']} ${item['unit']}'
                    : 'O\'lchov miqdori: Kiritilmagan',
                style: TextStyle(
                  fontSize: 11,
                  color: item['qty'] > 0
                      ? AppTheme.textPrimary
                      : AppTheme.warningColor,
                  fontWeight: item['qty'] > 0
                      ? FontWeight.normal
                      : FontWeight.bold,
                ),
              ),
              if (item['price'] > 0)
                Text(
                  'Narxi: ${item['price'].toInt()} UZS',
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                icon: const Icon(LucideIcons.scale, size: 14),
                label: const Text('O\'lchov & Narx'),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: AppTheme.primaryColor.withOpacity(0.2),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () => _showMeasurementDialog(item),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                icon: const Icon(LucideIcons.image, size: 14),
                label: const Text('Quality Photo'),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: AppTheme.textSecondary.withOpacity(0.2),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () => _simulatedQualityPhoto(),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => _showStageDialog(item),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('Bosqich', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showMeasurementDialog(Map<String, dynamic> item) {
    final TextEditingController qtyController = TextEditingController(
      text: item['qty'] > 0 ? item['qty'].toString() : '',
    );
    String selectedUnit = item['unit'];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.darkSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            '${item['id']} - O\'lchov kiritish',
            style: const TextStyle(
              fontFamily: 'Outfit',
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Mahsulot hajmi/miqdorini aniq o\'lchab kiriting:',
                style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: qtyController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(fontSize: 13),
                      decoration: const InputDecoration(
                        hintText: 'Hajmi / soni',
                      ),
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
                        setDialogState(() {
                          selectedUnit = val;
                        });
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Birlik narxi: ${item['price_per_unit'].toInt()} UZS',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textSecondary,
                ),
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
                final double q = double.tryParse(qtyController.text) ?? 0.0;
                if (q > 0) {
                  setState(() {
                    item['qty'] = q;
                    item['unit'] = selectedUnit;
                    item['price'] = q * item['price_per_unit'];
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'O\'lchov va narx muvaffaqiyatli saqlandi!',
                      ),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              },
              child: const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );
  }

  void _openScannerSimulator() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: const Text(
          'Skanerlash Simulyatori',
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.scan, size: 80, color: AppTheme.primaryColor),
            SizedBox(height: 16),
            Text(
              'Kamera orqali yorliqdagi QR-kod aniqlanmoqda...',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
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
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Yorliq skan qilindi! Buyurtma ORD-2026-00004 aniqlandi.',
                  ),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            child: const Text('Skaned: ORD-2026-00004'),
          ),
        ],
      ),
    );
  }

  void _simulatedQualityPhoto() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(LucideIcons.checkCircle, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Tayyor holat rasmi muvaffaqiyatli yuklandi (MinIO storage).'),
          ],
        ),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }

  void _showStageDialog(Map<String, dynamic> item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Ishlov berish bosqichini o\'zgartirish: ${item['id']}',
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildStageItem('Sexda yuvilmoqda', item),
            _buildStageItem('Quritish xonasida', item),
            _buildStageItem('Tayyor / Kuryerga topshirildi', item),
          ],
        ),
      ),
    );
  }

  Widget _buildStageItem(String label, Map<String, dynamic> item) {
    return ListTile(
      title: Text(
        label,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      ),
      onTap: () {
        setState(() {
          item['status'] = label;
        });
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Buyurtma holati yangilandi: "$label"'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      },
    );
  }
}
