import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../../models/order.dart';

/// Bluetooth termal chek printeri boshqaruvi (ESC/POS 58mm / 80mm).
/// Haydovchi to'lov qabul qilganda avtomatik yoki qo'lda chek chiqarish uchun.
class BluetoothPrinterService {
  static final BluetoothPrinterService _instance = BluetoothPrinterService._internal();
  factory BluetoothPrinterService() => _instance;
  BluetoothPrinterService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _keySavedMac = 'printer_saved_mac';
  static const String _keySavedName = 'printer_saved_name';
  static const String _keyAutoPrint = 'printer_auto_print';
  static const String _keyPaperSize = 'printer_paper_size';

  String? _savedMac;
  String? _savedName;
  bool _autoPrint = false;
  int _paperWidthMm = 58; // 58mm standart ixcham printer

  bool _isConnected = false;
  String? _connectedMac;
  String? _connectedName;

  bool get isConnected => _isConnected;
  String? get connectedName => _connectedName ?? _savedName;
  String? get connectedMac => _connectedMac ?? _savedMac;
  // Faqat avtomatik chek yoqilgan, printer mac saqlangan va ulangan bo'lsa
  bool get autoPrintEnabled => _autoPrint && _savedMac != null && _savedMac!.isNotEmpty && _isConnected;
  int get paperWidthMm => _paperWidthMm;

  /// Sozlamalarni xotiradan yuklash
  Future<void> init() async {
    try {
      _savedMac = await _storage.read(key: _keySavedMac);
      _savedName = await _storage.read(key: _keySavedName);
      final autoPrintStr = await _storage.read(key: _keyAutoPrint);
      if (autoPrintStr != null) {
        _autoPrint = autoPrintStr == 'true';
      } else {
        _autoPrint = false;
      }
      final paperStr = await _storage.read(key: _keyPaperSize);
      if (paperStr != null) {
        _paperWidthMm = int.tryParse(paperStr) ?? 58;
      }
      // Holatni xavfsiz tekshirish (timeout bilan)
      if (_savedMac != null && _savedMac!.isNotEmpty) {
        final hasPerm = await checkPermission();
        if (hasPerm) {
          _isConnected = await PrintBluetoothThermal.connectionStatus
              .timeout(const Duration(milliseconds: 1500), onTimeout: () => false);
          if (_isConnected) {
            _connectedMac = _savedMac;
            _connectedName = _savedName;
          }
        }
      }
    } catch (e) {
      debugPrint('PrinterService init error: $e');
      _isConnected = false;
    }
  }

  Future<void> setAutoPrint(bool value) async {
    _autoPrint = value;
    await _storage.write(key: _keyAutoPrint, value: value.toString());
  }

  Future<void> setPaperSize(int widthMm) async {
    _paperWidthMm = widthMm;
    await _storage.write(key: _keyPaperSize, value: widthMm.toString());
  }

  /// Bluetooth ruxsatlari berilganmi (1 soniya timeout bilan)
  Future<bool> checkPermission() async {
    try {
      return await PrintBluetoothThermal.isPermissionBluetoothGranted
          .timeout(const Duration(milliseconds: 1000), onTimeout: () => false);
    } catch (_) {
      return false;
    }
  }

  /// Bluetooth yoqilganmi
  Future<bool> isBluetoothEnabled() async {
    try {
      final hasPerm = await checkPermission();
      if (!hasPerm) return false;
      return await PrintBluetoothThermal.bluetoothEnabled
          .timeout(const Duration(milliseconds: 1000), onTimeout: () => false);
    } catch (_) {
      return false;
    }
  }

  /// Oldindan ulangan / juftlangan (paired) qurilmalar
  Future<List<BluetoothInfo>> getPairedDevices() async {
    try {
      final hasPerm = await checkPermission();
      if (!hasPerm) return [];
      return await PrintBluetoothThermal.pairedBluetooths
          .timeout(const Duration(milliseconds: 2000), onTimeout: () => []);
    } catch (e) {
      debugPrint('getPairedDevices error: $e');
      return [];
    }
  }

  /// Qurilmalarni yangilash (Android'da juftlangan Bluetooth printerlar)
  Future<List<BluetoothInfo>> scanDevices() async {
    try {
      final hasPerm = await checkPermission();
      if (!hasPerm) return [];
      return await PrintBluetoothThermal.pairedBluetooths
          .timeout(const Duration(milliseconds: 2000), onTimeout: () => []);
    } catch (e) {
      debugPrint('scanDevices error: $e');
      return [];
    }
  }

  /// Printerga ulanish
  Future<bool> connect(String mac, {String? name}) async {
    try {
      final hasPerm = await checkPermission();
      if (!hasPerm) return false;
      final success = await PrintBluetoothThermal.connect(macPrinterAddress: mac)
          .timeout(const Duration(seconds: 4), onTimeout: () => false);
      if (success) {
        _isConnected = true;
        _connectedMac = mac;
        _connectedName = name ?? mac;
        _savedMac = mac;
        _savedName = _connectedName;
        await _storage.write(key: _keySavedMac, value: mac);
        if (_savedName != null) {
          await _storage.write(key: _keySavedName, value: _savedName!);
        }
      }
      return success;
    } catch (e) {
      debugPrint('Printer connect error: $e');
      return false;
    }
  }

  /// Printerni uzish
  Future<bool> disconnect() async {
    try {
      final res = await PrintBluetoothThermal.disconnect
          .timeout(const Duration(milliseconds: 1000), onTimeout: () => false);
      _isConnected = false;
      _connectedMac = null;
      _connectedName = null;
      return res;
    } catch (e) {
      debugPrint('Printer disconnect error: $e');
      _isConnected = false;
      return false;
    }
  }

  /// Oxirgi saqlangan printerga qayta ulanishga urinish
  Future<bool> ensureConnected() async {
    try {
      final hasPerm = await checkPermission();
      if (!hasPerm) return false;
      final status = await PrintBluetoothThermal.connectionStatus
          .timeout(const Duration(milliseconds: 1500), onTimeout: () => false);
      if (status) {
        _isConnected = true;
        return true;
      }
      if (_savedMac != null && _savedMac!.isNotEmpty) {
        return await connect(_savedMac!, name: _savedName);
      }
    } catch (e) {
      debugPrint('ensureConnected error: $e');
    }
    _isConnected = false;
    return false;
  }

  /// Sinov cheki (Test receipt) chop etish
  Future<bool> printTestReceipt() async {
    final connected = await ensureConnected();
    if (!connected) return false;

    try {
      final profile = await CapabilityProfile.load();
      final paperSize = _paperWidthMm == 80 ? PaperSize.mm80 : PaperSize.mm58;
      final generator = Generator(paperSize, profile);

      List<int> bytes = [];
      bytes += generator.reset();
      bytes += generator.text(
        'SERVICE CORE',
        styles: const PosStyles(
          align: PosAlign.center,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
        ),
      );
      bytes += generator.text(
        'TEST CHEKI',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.hr();
      bytes += generator.text('Printer: ${_connectedName ?? "Noma'lum"}');
      bytes += generator.text('Kengligi: $_paperWidthMm mm');
      bytes += generator.text(
        'Sana: ${DateFormat('dd.MM.yyyy HH:mm').format(DateTime.now())}',
      );
      bytes += generator.hr();
      bytes += generator.text(
        'Printer sozlandi va to\'g\'ri ishlamoqda!',
        styles: const PosStyles(align: PosAlign.center),
      );
      bytes += generator.feed(2);
      bytes += generator.cut();

      return await PrintBluetoothThermal.writeBytes(bytes)
          .timeout(const Duration(seconds: 4), onTimeout: () => false);
    } catch (e) {
      debugPrint('printTestReceipt error: $e');
      return false;
    }
  }

  /// Buyurtma chekini chop etish
  Future<bool> printOrderReceipt(
    Order order, {
    double? paidAmount,
    String? driverName,
    String? companyName,
  }) async {
    final connected = await ensureConnected();
    if (!connected) return false;

    try {
      final profile = await CapabilityProfile.load();
      final paperSize = _paperWidthMm == 80 ? PaperSize.mm80 : PaperSize.mm58;
      final generator = Generator(paperSize, profile);
      final moneyFormatter = NumberFormat.decimalPattern('uz');

      List<int> bytes = [];
      bytes += generator.reset();

      // Sarlavha
      bytes += generator.text(
        companyName != null && companyName.isNotEmpty ? companyName : 'SERVICE CORE',
        styles: const PosStyles(
          align: PosAlign.center,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
        ),
      );
      bytes += generator.text(
        'TO\'LOV VA TOPSHIRISH CHEKI',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.hr();

      // Buyurtma ma'lumotlari
      final orderShortId = order.id.length > 8 ? order.id.substring(0, 8) : order.id;
      bytes += generator.row([
        PosColumn(text: 'Zakaz:', width: 4, styles: const PosStyles(bold: true)),
        PosColumn(text: '#$orderShortId', width: 8, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);

      final now = DateTime.now();
      bytes += generator.row([
        PosColumn(text: 'Sana:', width: 4),
        PosColumn(text: DateFormat('dd.MM.yyyy HH:mm').format(now), width: 8, styles: const PosStyles(align: PosAlign.right)),
      ]);

      if (order.client.fullName.isNotEmpty) {
        bytes += generator.row([
          PosColumn(text: 'Mijoz:', width: 4),
          PosColumn(text: order.client.fullName, width: 8, styles: const PosStyles(align: PosAlign.right)),
        ]);
      }

      if (order.client.phone.isNotEmpty) {
        bytes += generator.row([
          PosColumn(text: 'Tel:', width: 4),
          PosColumn(text: order.client.phone, width: 8, styles: const PosStyles(align: PosAlign.right)),
        ]);
      }

      final addr = order.address.isNotEmpty ? order.address : order.client.address;
      if (addr.isNotEmpty) {
        bytes += generator.text('Manzil: $addr');
      }

      if (driverName != null && driverName.isNotEmpty) {
        bytes += generator.row([
          PosColumn(text: 'Haydovchi:', width: 5),
          PosColumn(text: driverName, width: 7, styles: const PosStyles(align: PosAlign.right)),
        ]);
      }

      bytes += generator.hr();

      // Gilamlar ro'yxati
      bytes += generator.text('GILAMLAR:', styles: const PosStyles(bold: true));
      double totalArea = 0;
      int totalCount = 0;

      for (int i = 0; i < order.items.length; i++) {
        final item = order.items[i];
        final area = item.width * item.length * item.quantity;
        totalArea += area;
        totalCount += item.quantity;

        final itemTitle = '${i + 1}. ${item.name.isEmpty ? "Gilam" : item.name}';
        final sizeText = item.width > 0 && item.length > 0
            ? '${item.width.toStringAsFixed(1)}x${item.length.toStringAsFixed(1)}m (${area.toStringAsFixed(2)} m²)'
            : '${item.quantity} ta';

        // Har bir gilam narxi
        double itemPrice = 0;
        if (item.price != null && item.price! > 0) {
          itemPrice = item.price!;
        } else if (order.servicePrice > 0 && area > 0) {
          itemPrice = area * order.servicePrice;
        }

        bytes += generator.row([
          PosColumn(text: itemTitle, width: 7, styles: const PosStyles(bold: true)),
          PosColumn(
            text: itemPrice > 0 ? '${moneyFormatter.format(itemPrice)} s' : '',
            width: 5,
            styles: const PosStyles(align: PosAlign.right, bold: true),
          ),
        ]);
        bytes += generator.text('   $sizeText');
      }

      bytes += generator.hr();

      // Jami hisob
      bytes += generator.row([
        PosColumn(text: 'Jami miqdor:', width: 6),
        PosColumn(text: '$totalCount ta', width: 6, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);

      if (totalArea > 0) {
        bytes += generator.row([
          PosColumn(text: 'Jami maydon:', width: 6),
          PosColumn(text: '${totalArea.toStringAsFixed(2)} m²', width: 6, styles: const PosStyles(align: PosAlign.right, bold: true)),
        ]);
      }

      bytes += generator.row([
        PosColumn(text: 'JAMI SUMMA:', width: 6, styles: const PosStyles(bold: true)),
        PosColumn(
          text: '${moneyFormatter.format(order.price)} so\'m',
          width: 6,
          styles: const PosStyles(align: PosAlign.right, bold: true),
        ),
      ]);

      final paid = paidAmount ?? (order.collectedPrice > 0 ? order.collectedPrice : order.price);
      if (paid > 0) {
        bytes += generator.row([
          PosColumn(text: 'TO\'LANDI:', width: 6, styles: const PosStyles(bold: true)),
          PosColumn(
            text: '${moneyFormatter.format(paid)} so\'m',
            width: 6,
            styles: const PosStyles(align: PosAlign.right, bold: true),
          ),
        ]);
      }

      bytes += generator.hr();
      bytes += generator.text(
        'Xizmatingiz uchun rahmat!',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.feed(2);
      bytes += generator.cut();

      return await PrintBluetoothThermal.writeBytes(bytes)
          .timeout(const Duration(seconds: 4), onTimeout: () => false);
    } catch (e) {
      debugPrint('printOrderReceipt error: $e');
      return false;
    }
  }
}
