import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/constants.dart';

/// Internet yo'qolganda GPS koordinatalarini lokal (Hive) navbatga qo'yadi va
/// tarmoq tiklanganda ularni ketma-ket serverga yuborish uchun ishlatiladi.
class GpsOfflineQueue {
  static const _boxName = AppConstants.offlineQueueBox;

  /// MUHIM (audit'da topilgan xato, tuzatildi): avval navbat cheksiz o'sishi
  /// mumkin edi (masalan bir hafta oflayn = ~40 ming yozuv) - background_gps_
  /// service.dart har 15 soniyada BUTUN navbatni (readAll()) xotiraga
  /// o'qigani uchun bu qurilmani ANR/xotira yetishmasligi bilan yiqitib
  /// qo'yishi mumkin edi. 500 yozuv (~2 soatlik oflayn kuzatuv, 15s
  /// intervalda) yetarli zaxira - undan eskisi endi saqlanmaydi (eng qadimgi
  /// nuqtalar o'chiriladi, chunki uzoq oflayn holatda "joriy joylashuv"
  /// baribir eskirgan bo'ladi - to'liq tarix emas, yaqin fursat muhim).
  static const int maxQueueSize = 500;

  Future<Box> _openBox() async {
    if (Hive.isBoxOpen(_boxName)) {
      return Hive.box(_boxName);
    }
    return Hive.openBox(_boxName);
  }

  Future<void> enqueue(double latitude, double longitude) async {
    final box = await _openBox();
    await box.add({
      'latitude': latitude,
      'longitude': longitude,
      // MUHIM (audit'da topilgan xato, tuzatildi): avval DateTime.now()
      // MAHALLIY vaqtni "Z" belgisisiz yozardi, lekin jonli nuqta
      // (background_gps_service.dart'dagi position.timestamp) UTC va "Z"
      // bilan yuboriladi. Backend (GpsController.parseTimestamp) ikkalasini
      // TURLICHA (mos ravishda mahalliy/UTC) talqin qilgani uchun navbatga
      // tushib qolgan nuqta serverga yetganda haqiqiy vaqtidan 5 soat
      // (O'zbekiston UTC+5) "kelajakdagi" bo'lib ko'rinardi va haydovchining
      // joriy joylashuvini shu eski (lekin "yangiroq" hisoblangan) nuqtada
      // muzlatib qo'yardi. Endi ikkalasi ham UTC.
      'timestamp': DateTime.now().toUtc().toIso8601String(),
    });

    if (box.length > maxQueueSize) {
      final excess = box.length - maxQueueSize;
      final oldestKeys = box.keys.take(excess).toList();
      await box.deleteAll(oldestKeys);
    }
  }

  Future<List<MapEntry<dynamic, Map>>> readAll() async {
    final box = await _openBox();
    return box.keys
        .map((key) => MapEntry(key, Map.from(box.get(key) as Map)))
        .toList();
  }

  Future<void> remove(dynamic key) async {
    final box = await _openBox();
    await box.delete(key);
  }

  Future<int> length() async {
    final box = await _openBox();
    return box.length;
  }
}
