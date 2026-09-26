/// Foydalanuvchi kiritgan pul/o'lchov matnini xavfsiz o'qish.
///
/// NEGA KERAK (2026-09-26 audit): ilovada narx o'qishning to'rtta alohida nusxasi
/// bor edi va hammasi bir xil xatoga yo'l qo'yardi — `double.tryParse(...) ?? 0`.
/// Ya'ni matn o'qib bo'lmasa narx JIMGINA nolga aylanardi va buyurtma/xizmat
/// 0 so'm bilan saqlanib ketardi, foydalanuvchiga hech narsa aytilmasdi.
///
/// Aniq holatlar:
///   "500 000"    -> probel bilan yozish O'zbekistonda tabiiy, lekin
///                   `double.tryParse` uni o'qiy olmaydi -> 0 bo'lardi
///   "1.000.000"  -> nuqta ming ajratgich sifatida -> o'qilmaydi -> 0
///   ""           -> bo'sh maydon -> 0
///
/// Bu funksiya ajratgichlarni to'g'ri tashlaydi va **o'qib bo'lmasa `null`
/// qaytaradi** (0 EMAS) — chaqiruvchi xatoni ko'rsatishga majbur bo'ladi.
library;

/// Matnni pul/son sifatida o'qiydi. O'qilmasa `null`.
///
/// Qabul qiladi: `500000`, `500 000`, `500,000`, `1.000.000`, `12 500.5`,
/// `12500,5`, `500 000 so'm`.
double? parseMoney(String? raw) {
  if (raw == null) return null;

  // Raqam, nuqta, vergul va probellardan boshqa hamma narsani tashlaymiz
  // ("so'm", valyuta belgisi va h.k.).
  var s = raw.replaceAll(RegExp(r'[^0-9.,\s]'), '').trim();
  if (s.isEmpty) return null;

  // Probel — faqat ming ajratgich bo'lishi mumkin, olib tashlanadi.
  s = s.replaceAll(RegExp(r'\s+'), '');
  if (s.isEmpty) return null;

  final lastDot = s.lastIndexOf('.');
  final lastComma = s.lastIndexOf(',');

  // Oxirgi ajratgich o'nlik kasr belgisi bo'lishi MUMKIN. Uning o'ngida
  // 1-2 raqam bo'lsa kasr, 3 ta bo'lsa ming ajratgich (masalan "1.000").
  final lastSep = lastDot > lastComma ? lastDot : lastComma;
  if (lastSep >= 0) {
    final decimals = s.length - lastSep - 1;
    final isDecimalSep = decimals >= 1 && decimals <= 2;
    if (isDecimalSep) {
      // Oxirgisidan boshqa barcha ajratgichlar — ming ajratgich.
      final intPart = s.substring(0, lastSep).replaceAll(RegExp(r'[.,]'), '');
      final fracPart = s.substring(lastSep + 1);
      s = '$intPart.$fracPart';
    } else {
      // Hammasi ming ajratgich.
      s = s.replaceAll(RegExp(r'[.,]'), '');
    }
  }

  if (s.isEmpty || s == '.') return null;
  final value = double.tryParse(s);
  if (value == null || value.isNaN || value.isInfinite) return null;
  return value;
}

/// Forma maydonlari uchun validator: majburiy va noldan katta bo'lishi shart.
///
/// `TextFormField(validator: requiredPositiveMoney)` ko'rinishida ishlatiladi —
/// shu bilan narx maydoni forma validatsiyasiga QO'SHILADI (avval maydonlarda
/// validator umuman yo'q edi, shuning uchun `_formKey.validate()` narxni
/// tekshirmasdan o'tib ketardi).
String? requiredPositiveMoney(String? value) {
  if (value == null || value.trim().isEmpty) return 'Summani kiriting';
  final parsed = parseMoney(value);
  if (parsed == null) return 'Summa faqat raqamlardan iborat bo\'lishi kerak';
  if (parsed <= 0) return 'Summa 0 dan katta bo\'lishi kerak';
  return null;
}
