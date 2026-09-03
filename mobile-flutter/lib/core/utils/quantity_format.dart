/// Miqdorni (OrderItem.quantity) o'qish uchun qulay matnga aylantiradi -
/// butun son bo'lsa ortiqcha ".0" ko'rsatmaydi ("3" emas "3.0"), kasr
/// bo'lsa esa ("kg"/"litr"/"metr" kabi uzluksiz birliklarda) 2 xonagacha
/// aniqlik bilan ko'rsatadi ("2.5", "0.75").
String formatQty(double value) {
  if (value == value.roundToDouble()) {
    return value.toStringAsFixed(0);
  }
  String s = value.toStringAsFixed(2);
  // Ortiqcha nol xonalarni kesish (masalan "2.50" -> "2.5").
  s = s.replaceFirst(RegExp(r'0+$'), '');
  s = s.replaceFirst(RegExp(r'\.$'), '');
  return s;
}
