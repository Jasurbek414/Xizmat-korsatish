import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../../core/services/printer_service.dart';
import '../../../core/theme.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  final BluetoothPrinterService _printerService = BluetoothPrinterService();

  bool _loading = false;
  bool _scanning = false;
  bool _bluetoothEnabled = false;
  List<BluetoothInfo> _pairedDevices = [];
  String? _connectingMac;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  Future<void> _initData() async {
    setState(() => _loading = true);
    await _printerService.init();
    _bluetoothEnabled = await _printerService.isBluetoothEnabled();
    if (_bluetoothEnabled) {
      _pairedDevices = await _printerService.getPairedDevices();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _scan() async {
    setState(() => _scanning = true);
    try {
      _bluetoothEnabled = await _printerService.isBluetoothEnabled();
      if (!_bluetoothEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Iltimos, avval Bluetooth-ni yoqing'),
            backgroundColor: AppTheme.amber,
            behavior: SnackBarBehavior.floating,
          ));
        }
        return;
      }
      _pairedDevices = await _printerService.getPairedDevices();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Qurilmalarni olishda xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _connect(BluetoothInfo info) async {
    setState(() => _connectingMac = info.macAdress);
    try {
      final ok = await _printerService.connect(info.macAdress, name: info.name);
      if (ok) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('${info.name.isNotEmpty ? info.name : "Printer"}ga ulandi!'),
            backgroundColor: AppTheme.green,
            behavior: SnackBarBehavior.floating,
          ));
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('${info.name.isNotEmpty ? info.name : "Printer"}ga ulanib bo\'lmadi'),
            backgroundColor: AppTheme.dangerColor,
            behavior: SnackBarBehavior.floating,
          ));
        }
      }
    } finally {
      if (mounted) setState(() => _connectingMac = null);
    }
  }

  Future<void> _disconnect() async {
    setState(() => _loading = true);
    await _printerService.disconnect();
    if (mounted) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Printer uzildi'),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  Future<void> _testPrint() async {
    setState(() => _loading = true);
    final ok = await _printerService.printTestReceipt();
    if (mounted) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Test chek chiqarildi!' : 'Chek chiqarishda xatolik (printer ulanganligini tekshiring)'),
        backgroundColor: ok ? AppTheme.green : AppTheme.dangerColor,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isConnected = _printerService.isConnected;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          'Chek printeri (Bluetooth)',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        actions: [
          IconButton(
            onPressed: _scanning ? null : _scan,
            icon: _scanning
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(LucideIcons.refreshCw),
            tooltip: 'Qidirish',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Ulangan printer kartasi
                _buildConnectedCard(isDark, isConnected),
                const SizedBox(height: 16),

                // Printer sozlamalari
                _buildSettingsCard(isDark),
                const SizedBox(height: 20),

                // Juftlangan qurilmalar ro'yxati
                _sectionHeader('Juftlangan printerlar'),
                const SizedBox(height: 8),
                if (_pairedDevices.isEmpty)
                  _emptyPlaceholder(
                    'Juftlangan Bluetooth qurilmalar topilmadi.\nTelefon sozlamalarida printerni avval ulang.',
                    isDark,
                  )
                else
                  ..._pairedDevices.map((d) => _deviceTile(d, isDark)),

                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.blue.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.blue.withOpacity(0.2)),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(LucideIcons.helpCircle, size: 18, color: AppTheme.blue),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Printer ulash bo\'yicha yo\'riqnoma:',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.blue)),
                            SizedBox(height: 4),
                            Text(
                              '1. Termal printerni yoqing.\n2. Telefoningizning Sozlamalar -> Bluetooth bo\'limida printerni qidiring va juftlang (PIN odatda 0000 yoki 1234 bo\'ladi).\n3. Ilovaga qaytib, yuqoridagi yangilash tugmasini bosing va printer yonidagi "Ulash" tugmasini bosing.',
                              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
    );
  }

  Widget _buildConnectedCard(bool isDark, bool isConnected) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isConnected
            ? AppTheme.greenSoft
            : (isDark ? AppTheme.darkSurfaceAltColor : AppTheme.bg),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isConnected ? AppTheme.green.withOpacity(0.3) : AppTheme.borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: isConnected ? AppTheme.green : AppTheme.textMuted.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  LucideIcons.printer,
                  size: 20,
                  color: isConnected ? Colors.white : AppTheme.textMuted,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isConnected ? 'Printer ulangan' : 'Printer ulanmagan',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isConnected ? AppTheme.green : AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _printerService.connectedName ?? 'Bluetooth orqali ulang',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              if (isConnected)
                OutlinedButton(
                  onPressed: _disconnect,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.dangerColor,
                    side: const BorderSide(color: AppTheme.dangerColor),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    visualDensity: VisualDensity.compact,
                  ),
                  child: const Text('Uzish', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
            ],
          ),
          if (isConnected) ...[
            const SizedBox(height: 12),
            const Divider(color: AppTheme.borderColor, height: 1),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _testPrint,
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.green,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(LucideIcons.checkCheck, size: 16),
                label: const Text('Test chek chiqarish', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSettingsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceAltColor : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Chek parametrlari', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 10),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('To\'lovda avtomatik chek chiqarish', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: const Text('Buyurtma topshirilib to\'lov qabul qilinganda avtomatik printerga yuboradi', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            value: _printerService.autoPrintEnabled,
            activeColor: AppTheme.primary,
            onChanged: (val) async {
              await _printerService.setAutoPrint(val);
              setState(() {});
            },
          ),
          const Divider(color: AppTheme.borderColor),
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Qog\'oz o\'lchami', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    Text('Termal printer qog\'ozi kengligi', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 58, label: Text('58mm')),
                  ButtonSegment(value: 80, label: Text('80mm')),
                ],
                selected: {_printerService.paperWidthMm},
                onSelectionChanged: (set) async {
                  if (set.isNotEmpty) {
                    await _printerService.setPaperSize(set.first);
                    setState(() {});
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _deviceTile(BluetoothInfo info, bool isDark) {
    final isThisConnected = _printerService.isConnected && _printerService.connectedMac == info.macAdress;
    final isConnecting = _connectingMac == info.macAdress;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceAltColor : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isThisConnected ? AppTheme.green : AppTheme.borderColor,
          width: isThisConnected ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            LucideIcons.bluetooth,
            size: 20,
            color: isThisConnected ? AppTheme.green : AppTheme.textMuted,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  info.name.isNotEmpty ? info.name : 'Noma\'lum qurilma',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isThisConnected ? AppTheme.green : AppTheme.textPrimary,
                  ),
                ),
                Text(
                  info.macAdress,
                  style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
          if (isThisConnected)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.greenSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text('Ulangan', style: TextStyle(color: AppTheme.green, fontSize: 11, fontWeight: FontWeight.w700)),
            )
          else
            FilledButton(
              onPressed: isConnecting ? null : () => _connect(info),
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                visualDensity: VisualDensity.compact,
              ),
              child: isConnecting
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Ulash', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }

  Widget _emptyPlaceholder(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Center(
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
        ),
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 16,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
