import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/money.dart';

/// `parseMoney` testlari.
///
/// Bu testlar 2026-09-26 auditida topilgan xato uchun yozildi: narx matni
/// o'qilmasa `double.tryParse(...) ?? 0` uni JIMGINA nolga aylantirar va
/// buyurtma 0 so'm bilan saqlanib ketardi.
void main() {
  group('parseMoney — to\'g\'ri o\'qiladigan variantlar', () {
    test('oddiy son', () {
      expect(parseMoney('500000'), 500000);
    });

    test('probel bilan ming ajratgich (O\'zbekistonda tabiiy yozilish)', () {
      // AVVAL: double.tryParse('500 000') == null -> narx 0 bo'lardi
      expect(parseMoney('500 000'), 500000);
      expect(parseMoney('1 250 000'), 1250000);
    });

    test('nuqta bilan ming ajratgich', () {
      // AVVAL: '1.000.000' -> tryParse null -> 0
      expect(parseMoney('1.000.000'), 1000000);
      expect(parseMoney('12.500'), 12500);
    });

    test('vergul bilan ming ajratgich', () {
      expect(parseMoney('1,000,000'), 1000000);
    });

    test('o\'nlik kasr — nuqta va vergul ikkalasi ham', () {
      expect(parseMoney('12500.5'), 12500.5);
      expect(parseMoney('12500,5'), 12500.5);
      expect(parseMoney('1 250,75'), 1250.75);
    });

    test('valyuta so\'zi va ortiqcha belgilar tashlanadi', () {
      expect(parseMoney('500 000 so\'m'), 500000);
      expect(parseMoney('  500000  '), 500000);
    });

    test('ming ajratgich va kasr birga', () {
      // Oxirgi ajratgichdan keyin 2 raqam -> kasr; qolganlari ming ajratgich
      expect(parseMoney('1.250.000,50'), 1250000.50);
    });
  });

  group('parseMoney — null qaytarishi SHART (0 emas)', () {
    test('bo\'sh matn', () {
      expect(parseMoney(''), isNull);
      expect(parseMoney('   '), isNull);
      expect(parseMoney(null), isNull);
    });

    test('raqamsiz matn', () {
      expect(parseMoney('salom'), isNull);
      expect(parseMoney('so\'m'), isNull);
      expect(parseMoney('-'), isNull);
    });

    test('faqat ajratgich', () {
      expect(parseMoney('.'), isNull);
      expect(parseMoney(','), isNull);
    });
  });

  group('requiredPositiveMoney validatori', () {
    test('to\'g\'ri summa — xato yo\'q', () {
      expect(requiredPositiveMoney('500 000'), isNull);
      expect(requiredPositiveMoney('1.000.000'), isNull);
    });

    test('bo\'sh maydon rad etiladi', () {
      expect(requiredPositiveMoney(''), isNotNull);
      expect(requiredPositiveMoney(null), isNotNull);
    });

    test('o\'qilmaydigan matn rad etiladi', () {
      expect(requiredPositiveMoney('salom'), isNotNull);
    });

    test('nol va manfiy rad etiladi', () {
      expect(requiredPositiveMoney('0'), isNotNull);
      expect(requiredPositiveMoney('0.00'), isNotNull);
    });
  });
}
