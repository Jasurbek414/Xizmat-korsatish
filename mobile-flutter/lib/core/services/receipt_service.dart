import 'dart:convert';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img;
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../network/api_client.dart';
import '../storage/secure_storage_service.dart';
import '../../models/order.dart';

/// Admin panel (Sozlamalar > Umumiy) belgilagan chek sozlamalari -
/// GET /api/v1/company/receipt-settings orqali olinadi. Haydovchida hech
/// qachon 'settings' huquqi bo'lmagani uchun bu ALOHIDA, yengil endpoint
/// (CompanyController.getReceiptSettings'ga qarang).
class ReceiptSettings {
  final bool enabled;
  final String paperSize; // "58" yoki "80" (mm)
  final bool showAddress;
  final bool showPhone;
  final bool showItems;
  final bool showPaymentMethod;
  final bool showOrderNumber;
  final bool showEmployeeName;
  final int copies;
  final String fontSize; // "normal" yoki "large"
  final String? logoBase64; // data:image/png;base64,... yoki xom base64
  final String headerText;
  final String footerText;
  final String companyName;
  final String companyAddress;
  final String companyPhone;

  ReceiptSettings({
    required this.enabled,
    required this.paperSize,
    required this.showAddress,
    required this.showPhone,
    required this.showItems,
    required this.showPaymentMethod,
    required this.showOrderNumber,
    required this.showEmployeeName,
    required this.copies,
    required this.fontSize,
    required this.logoBase64,
    required this.headerText,
    required this.footerText,
    required this.companyName,
    required this.companyAddress,
    required this.companyPhone,
  });

  factory ReceiptSettings.fromJson(Map<String, dynamic> json) {
    return ReceiptSettings(
      enabled: json['enabled'] == true,
      paperSize: json['paperSize']?.toString() ?? '58',
      showAddress: json['showAddress'] == true,
      showPhone: json['showPhone'] == true,
      showItems: json['showItems'] == true,
      showPaymentMethod: json['showPaymentMethod'] == true,
      showOrderNumber: json['showOrderNumber'] == true,
      showEmployeeName: json['showEmployeeName'] == true,
      copies: (json['copies'] as num?)?.toInt().clamp(1, 5) ?? 1,
      fontSize: json['fontSize']?.toString() ?? 'normal',
      logoBase64: (json['logoBase64'] as String?)?.trim().isNotEmpty == true
          ? json['logoBase64'] as String
          : null,
      headerText: json['headerText']?.toString() ?? '',
      footerText: json['footerText']?.toString() ?? '',
      companyName: json['companyName']?.toString() ?? '',
      companyAddress: json['companyAddress']?.toString() ?? '',
      companyPhone: json['companyPhone']?.toString() ?? '',
    );
  }

  PaperSize get escPosPaperSize =>
      paperSize == '80' ? PaperSize.mm80 : PaperSize.mm58;
}

/// Haydovchi to'lovni qabul qilgach, ulangan Bluetooth termal printerga
/// mijoz uchun chek chiqarish. Ikki kutubxona birgalikda ishlaydi:
/// - esc_pos_utils_plus: chek matnini ESC/POS bayt buyruqlariga aylantiradi
///   (platformadan mustaqil, faqat "qanday chop etish kerak"ni biladi)
/// - print_bluetooth_thermal: shu baytlarni haqiqiy Bluetooth qurilmaga
///   yuboradi (ulanish/qurilmalarni topish)
class ReceiptService {
  final ApiClient _api;
  final SecureStorageService _storage;

  ReceiptService({ApiClient? api, SecureStorageService? storage})
      : _api = api ?? ApiClient(),
        _storage = storage ?? SecureStorageService();

  Future<ReceiptSettings> fetchSettings() async {
    final data = await _api.get('/company/receipt-settings') as Map<String, dynamic>;
    return ReceiptSettings.fromJson(data);
  }

  /// Android 12+ da BLUETOOTH_CONNECT/BLUETOOTH_SCAN ruxsati berilganmi.
  Future<bool> isPermissionGranted() =>
      PrintBluetoothThermal.isPermissionBluetoothGranted;

  /// Qurilmaning Bluetooth sozlamalarida ALLAQACHON ulangan (paired)
  /// printerlar ro'yxati - ilova o'zi "skanerlash" qilmaydi, chunki termal
  /// printerlar odatda oldindan telefon sozlamalaridan ulanadi (PIN kod bilan).
  Future<List<BluetoothInfo>> pairedDevices() =>
      PrintBluetoothThermal.pairedBluetooths;

  Future<bool> get isConnected => PrintBluetoothThermal.connectionStatus;

  Future<bool> connect(String mac) =>
      PrintBluetoothThermal.connect(macPrinterAddress: mac);

  Future<bool> disconnect() => PrintBluetoothThermal.disconnect;

  Future<String?> savedPrinterMac() => _storage.readPrinterMac();
  Future<String?> savedPrinterName() => _storage.readPrinterName();

  Future<void> savePrinter(BluetoothInfo device) =>
      _storage.savePrinter(mac: device.macAdress, name: device.name);

  Future<void> forgetPrinter() => _storage.clearPrinter();

  /// Saqlangan printerga (agar bo'lsa) ulanib, shu buyurtma uchun chekni
  /// chop etadi. Muvaffaqiyatli bo'lsa true qaytaradi.
  ///
  /// [amount]/[paymentMethod]/[cashAmount]/[cardAmount] ixtiyoriy - to'lov
  /// ENDIGINA qabul qilingan paytda `order` obyekti hali ESKI (server
  /// javobidan oldingi) holatda bo'lishi mumkin, shuning uchun chaqiruvchi
  /// aynan HOZIRGI qabul qilingan qiymatlarni shu yerda ustidan yozib
  /// yuborishi mumkin. Berilmasa, order'ning o'zidagi qiymatlar ishlatiladi
  /// (masalan tarixdan qayta chop etishda).
  Future<bool> printReceipt({
    required Order order,
    required ReceiptSettings settings,
    double? amount,
    String? paymentMethod,
    double? cashAmount,
    double? cardAmount,
  }) async {
    final mac = await savedPrinterMac();
    if (mac == null) return false;

    final connected = await isConnected;
    if (!connected) {
      final ok = await connect(mac);
      if (!ok) return false;
    }

    final bytes = await _buildReceiptBytes(
      order,
      settings,
      amount: amount,
      paymentMethod: paymentMethod,
      cashAmount: cashAmount,
      cardAmount: cardAmount,
    );

    final copies = settings.copies.clamp(1, 5);
    for (int i = 0; i < copies; i++) {
      final ok = await PrintBluetoothThermal.writeBytes(bytes);
      if (!ok) return false;
      // Ketma-ket nusxalar orasida printer buferiga ulgurishi uchun
      // kichik tanaffus - aks holda ba'zi arzon printerlar navbatdagi
      // baytlarni yo'qotib qo'yishi mumkin.
      if (i < copies - 1) {
        await Future.delayed(const Duration(milliseconds: 300));
      }
    }
    return true;
  }

  Future<List<int>> _buildReceiptBytes(
    Order order,
    ReceiptSettings settings, {
    double? amount,
    String? paymentMethod,
    double? cashAmount,
    double? cardAmount,
  }) async {
    final finalAmount = amount ?? (order.collectedPrice > 0 ? order.collectedPrice : order.price);
    final finalMethod = paymentMethod ?? order.paymentMethod;
    final finalCash = cashAmount ?? order.cashAmount;
    final finalCard = cardAmount ?? order.cardAmount;
    final profile = await CapabilityProfile.load();
    // MUHIM (jonli xato: "chekda harflar aralashib ketgan"): generator
    // standart holatda `latin1` kodировkadan foydalanadi - kiril harflari
    // (mijoz F.I.Sh/manzili ba'zan kiril bilan kiritiladi) yoki "o'"/"g'"
    // uchun telefon klaviaturasi qo'yadigan maxsus apostrof belgilar
    // (ʻ ʼ ' ') latin1 doirasidan tashqarida - shu sabab `_sanitizeForPrint`
    // orqali oldindan lotinlashtiriladi, `allowInvalid: true` esa
    // qolgan (kutilmagan) belgilarni xato tashlab yubormasdan '?' bilan
    // almashtiradi.
    final generator = Generator(settings.escPosPaperSize, profile,
        codec: const Latin1Codec(allowInvalid: true));
    final now = DateTime.now();
    final dateStr = '${now.day.toString().padLeft(2, '0')}.${now.month.toString().padLeft(2, '0')}.${now.year} '
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    final bodyStyle = settings.fontSize == 'large'
        ? const PosStyles(height: PosTextSize.size2)
        : const PosStyles();

    List<int> bytes = [];

    if (settings.logoBase64 != null) {
      final logoImage = _decodeLogo(settings.logoBase64!);
      if (logoImage != null) {
        bytes += generator.image(logoImage);
      }
    }

    bytes += generator.text(
      _sanitizeForPrint(settings.headerText.isNotEmpty ? settings.headerText : (settings.companyName.isNotEmpty ? settings.companyName : 'Chek')),
      styles: const PosStyles(align: PosAlign.center, bold: true, height: PosTextSize.size2, width: PosTextSize.size2),
    );
    if (settings.showAddress && settings.companyAddress.isNotEmpty) {
      bytes += generator.text(_sanitizeForPrint(settings.companyAddress),
          styles: const PosStyles(align: PosAlign.center));
    }
    if (settings.showPhone && settings.companyPhone.isNotEmpty) {
      bytes += generator.text(_sanitizeForPrint(settings.companyPhone),
          styles: const PosStyles(align: PosAlign.center));
    }
    bytes += generator.hr();

    if (settings.showOrderNumber) {
      final shortId = order.id.length > 8
          ? order.id.substring(order.id.length - 8).toUpperCase()
          : order.id.toUpperCase();
      bytes += generator.text('Buyurtma #: $shortId', styles: bodyStyle);
    }
    bytes += generator.text('Xizmat: ${_sanitizeForPrint(order.serviceName)}', styles: bodyStyle);
    bytes += generator.text('Mijoz: ${_sanitizeForPrint(order.client.fullName)}', styles: bodyStyle);
    if (order.address.isNotEmpty) {
      bytes += generator.text('Manzil: ${_sanitizeForPrint(order.address)}', styles: bodyStyle);
    }
    bytes += generator.text('Sana: $dateStr', styles: bodyStyle);
    bytes += generator.hr();

    if (settings.showItems && order.items.isNotEmpty) {
      for (final item in order.items) {
        bytes += generator.row([
          PosColumn(text: _sanitizeForPrint(item.name), width: 8, styles: bodyStyle),
          PosColumn(
              text: item.quantity == item.quantity.roundToDouble()
                  ? item.quantity.toStringAsFixed(0)
                  : item.quantity.toStringAsFixed(2),
              width: 4,
              styles: bodyStyle.copyWith(align: PosAlign.right)),
        ]);
      }
      bytes += generator.hr();
    }

    bytes += generator.row([
      PosColumn(
          text: 'JAMI',
          width: 6,
          styles: const PosStyles(bold: true, height: PosTextSize.size2)),
      PosColumn(
          text: '${_formatMoney(finalAmount)} so\'m',
          width: 6,
          styles: const PosStyles(align: PosAlign.right, bold: true, height: PosTextSize.size2)),
    ]);

    if (settings.showPaymentMethod) {
      final methodLabel = switch (finalMethod) {
        'CARD' => 'Karta',
        'MIXED' => 'Aralash',
        _ => 'Naqd',
      };
      bytes += generator.text('To\'lov usuli: $methodLabel', styles: bodyStyle);
      if (finalMethod == 'MIXED') {
        bytes += generator.text(
            'Naqd: ${_formatMoney(finalCash)} / Karta: ${_formatMoney(finalCard)}',
            styles: bodyStyle);
      }
    }

    if (settings.showEmployeeName && (order.driverName ?? '').isNotEmpty) {
      bytes += generator.text('Xodim: ${_sanitizeForPrint(order.driverName!)}', styles: bodyStyle);
    }

    if (settings.footerText.isNotEmpty) {
      bytes += generator.hr();
      bytes += generator.text(_sanitizeForPrint(settings.footerText),
          styles: const PosStyles(align: PosAlign.center));
    }

    bytes += generator.feed(2);
    bytes += generator.cut();
    return bytes;
  }

  static const Map<String, String> _cyrillicToLatin = {
    'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g', 'Д': 'D', 'д': 'd', 'Е': 'E', 'е': 'e',
    'Ё': 'Yo', 'ё': 'yo', 'Ж': 'J', 'ж': 'j', 'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i', 'Й': 'Y', 'й': 'y', 'К': 'K', 'к': 'k',
    'Л': 'L', 'л': 'l', 'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n',
    'О': 'O', 'о': 'o', 'П': 'P', 'п': 'p', 'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's', 'Т': 'T', 'т': 't', 'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f', 'Х': 'X', 'х': 'x', 'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ch', 'ч': 'ch', 'Ш': 'Sh', 'ш': 'sh', 'Щ': 'Sh', 'щ': 'sh',
    'Ъ': '', 'ъ': '', 'Ы': 'I', 'ы': 'i', 'Ь': '', 'ь': '',
    'Э': 'E', 'э': 'e', 'Ю': 'Yu', 'ю': 'yu', 'Я': 'Ya', 'я': 'ya',
    'Ў': "O'", 'ў': "o'", 'Қ': 'Q', 'қ': 'q', 'Ғ': "G'", 'ғ': "g'",
    'Ҳ': 'H', 'ҳ': 'h',
  };

  /// MUHIM (jonli xato: "chekda harflar aralashib ketgan"): chekka
  /// chiqadigan HAR QANDAY erkin matn (mijoz F.I.Sh, manzil, xizmat nomi,
  /// buyurtma tarkibi, xodim ismi va h.k.) foydalanuvchi tomonidan
  /// kiritiladi va kiril harflarini yoki telefon klaviaturasi "o'"/"g'"
  /// uchun qo'yadigan turli apostrof belgilarini (ʻ ʼ ' `) o'z ichiga
  /// olishi mumkin - bularning barchasi printer ishlatadigan `latin1`
  /// (bir baytli, kod 0-255) doirasidan tashqarida, shu sabab chop
  /// etilganda tasodifiy/aralash belgilarga aylanib qolardi. Bu funksiya
  /// oldindan kiril harflarini lotinlashtiradi va apostrof variantlarini
  /// bittasiga normallashtiradi; qolgan (kutilmagan) belgilar '?' bilan
  /// almashtiriladi - shu bilan chek HAR DOIM o'qiladigan holda chiqadi.
  String _sanitizeForPrint(String text) {
    final buffer = StringBuffer();
    for (final rune in text.runes) {
      if (rune == 0x2018 || rune == 0x2019 || rune == 0x02BB || rune == 0x02BC || rune == 0x60) {
        buffer.write("'");
        continue;
      }
      final ch = String.fromCharCode(rune);
      final translit = _cyrillicToLatin[ch];
      if (translit != null) {
        buffer.write(translit);
      } else if (rune <= 0xFF) {
        buffer.write(ch);
      } else {
        buffer.write('?');
      }
    }
    return buffer.toString();
  }

  /// Admin panelda yuklangan "data:image/png;base64,..." (yoki xom base64)
  /// logotipni printer chop eta oladigan img.Image'ga aylantiradi.
  /// Noto'g'ri/buzilgan ma'lumot bo'lsa null qaytaradi - chek logotivsiz
  /// baribir chop etilaveradi (butun jarayon to'xtab qolmasligi kerak).
  img.Image? _decodeLogo(String base64Data) {
    try {
      final commaIndex = base64Data.indexOf(',');
      final raw = commaIndex != -1 ? base64Data.substring(commaIndex + 1) : base64Data;
      final decoded = img.decodeImage(base64Decode(raw));
      return decoded;
    } catch (_) {
      return null;
    }
  }

  String _formatMoney(double value) {
    final rounded = value.round();
    final str = rounded.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buffer.write(' ');
      buffer.write(str[i]);
    }
    return buffer.toString();
  }
}
