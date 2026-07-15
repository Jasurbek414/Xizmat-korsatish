import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/constants.dart';

/// Internet yo'qolganda GPS koordinatalarini lokal (Hive) navbatga qo'yadi va
/// tarmoq tiklanganda ularni ketma-ket serverga yuborish uchun ishlatiladi.
class GpsOfflineQueue {
  static const _boxName = AppConstants.offlineQueueBox;

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
      'timestamp': DateTime.now().toIso8601String(),
    });
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
