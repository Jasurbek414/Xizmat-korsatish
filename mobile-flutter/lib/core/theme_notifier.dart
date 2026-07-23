import 'package:flutter/material.dart';

/// Global theme notifier - butun ilova bo'ylab dark/light mode almashinuvi.
/// Alohida faylda joylashgani uchun circular import xavfi yo'q:
/// `main.dart` ham, `profile_screen.dart` ham shu faylni bemalol import qila oladi.
final ValueNotifier<bool> isDarkMode = ValueNotifier<bool>(false);
