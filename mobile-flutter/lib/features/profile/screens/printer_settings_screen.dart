import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../../core/services/receipt_service.dart';
import '../../../core/theme.dart';

/// Chek chiqarish uchun Bluetooth termal printerni tanlash ekrani.
/// Printer avval telefonning O'ZI Bluetooth sozlamalaridan ulangan
/// (paired) bo'lishi kerak - bu ekran faqat O'SHA ro'yxatdan birini
/// tanlab, "standart chek printeri" sifatida saqlaydi.
class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  final _receiptService = ReceiptService();
  List<BluetoothInfo> _devices = [];
  String? _savedMac;
  bool _loading = true;
  bool _connecting = false;
  String? _connectingMac;
  String? _error;

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
      // Android 12+ da BLUETOOTH_CONNECT/BLUETOOTH_SCAN runtime ruxsati
      // so'ralishi kerak - aks holda pairedBluetooths bo'sh ro'yxat qaytaradi.
      await [Permission.bluetoothConnect, Permission.bluetoothScan].request();
      final granted = await _receiptService.isPermissionGranted();
      if (!granted) {
        setState(() {
          _loading = false;
          _error = 'Bluetooth ruxsati berilmadi. Ilova sozlamalaridan ruxsat bering.';
        });
        return;
      }
      final devices = await _receiptService.pairedDevices();
      final savedMac = await _receiptService.savedPrinterMac();
      if (!mounted) return;
      setState(() {
        _devices = devices;
        _savedMac = savedMac;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Xatolik: $e';
      });
    }
  }

  Future<void> _selectPrinter(BluetoothInfo device) async {
    setState(() {
      _connecting = true;
      _connectingMac = device.macAdress;
    });
    try {
      final ok = await _receiptService.connect(device.macAdress);
      if (!ok) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('"${device.name}" ga ulanib bo\'lmadi'),
            backgroundColor: AppTheme.dangerColor,
            behavior: SnackBarBehavior.floating,
          ));
        }
        return;
      }
      await _receiptService.savePrinter(device);
      if (!mounted) return;
      setState(() => _savedMac = device.macAdress);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('"${device.name}" standart chek printeri sifatida saqlandi'),
        backgroundColor: AppTheme.primary,
        behavior: SnackBarBehavior.floating,
      ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Xatolik: $e'),
          backgroundColor: AppTheme.dangerColor,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() { _connecting = false; _connectingMac = null; });
    }
  }

  Future<void> _forgetPrinter() async {
    await _receiptService.disconnect();
    await _receiptService.forgetPrinter();
    if (!mounted) return;
    setState(() => _savedMac = null);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(title: const Text('Chek printeri')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(children: [
                      const Icon(LucideIcons.info, size: 18, color: AppTheme.primary),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Avval printerni telefonning Bluetooth sozlamalaridan ulang (PIN kod bilan), so\'ng shu yerdan ro\'yxatdan tanlang.',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 16),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_error!,
                          style: const TextStyle(color: AppTheme.dangerColor, fontWeight: FontWeight.w600)),
                    ),
                  if (_devices.isEmpty && _error == null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Column(children: [
                        Icon(LucideIcons.bluetoothOff, size: 40,
                            color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMutedOf(context)),
                        const SizedBox(height: 10),
                        Text('Ulangan (paired) Bluetooth qurilma topilmadi',
                            style: TextStyle(color: AppTheme.textSecondaryOf(context))),
                      ]),
                    ),
                  ..._devices.map((d) {
                    final isSaved = _savedMac == d.macAdress;
                    final isBusy = _connecting && _connectingMac == d.macAdress;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        color: isSaved
                            ? AppTheme.primary.withOpacity(0.08)
                            : (isDark ? AppTheme.darkSurfaceColor : AppTheme.surfaceOf(context)),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSaved ? AppTheme.primary : (isDark ? AppTheme.darkBorderColor : AppTheme.borderOf(context)),
                          width: isSaved ? 1.5 : 1,
                        ),
                      ),
                      child: ListTile(
                        leading: Icon(LucideIcons.printer,
                            color: isSaved ? AppTheme.primary : AppTheme.textMutedOf(context)),
                        title: Text(d.name.isEmpty ? 'Noma\'lum qurilma' : d.name,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        subtitle: Text(d.macAdress, style: const TextStyle(fontSize: 11)),
                        trailing: isBusy
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : (isSaved
                                ? const Icon(LucideIcons.checkCircle, color: AppTheme.primary)
                                : const Icon(LucideIcons.chevronRight, size: 18)),
                        onTap: _connecting ? null : () => _selectPrinter(d),
                      ),
                    );
                  }),
                  if (_savedMac != null) ...[
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _forgetPrinter,
                      icon: const Icon(LucideIcons.trash2, size: 16, color: AppTheme.dangerColor),
                      label: const Text('Printerni unutish',
                          style: TextStyle(color: AppTheme.dangerColor, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.dangerColor),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}
