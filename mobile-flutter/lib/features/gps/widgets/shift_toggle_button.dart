import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../services/background_gps_service.dart';

/// Haydovchi/ishchi ish smenasini ONLINE/OFFLINE holatga o'tkazadi.
/// ONLINE bo'lganda fon GPS xizmati ishga tushadi va joylashuvni yubora
/// boshlaydi (ilova yopilgan holatda ham).
class ShiftToggleButton extends StatefulWidget {
  const ShiftToggleButton({super.key});

  @override
  State<ShiftToggleButton> createState() => _ShiftToggleButtonState();
}

class _ShiftToggleButtonState extends State<ShiftToggleButton> {
  bool _isOnline = false;
  bool _busy = false;

  Future<void> _toggle() async {
    setState(() => _busy = true);
    try {
      if (_isOnline) {
        await BackgroundGpsService.stop();
        setState(() => _isOnline = false);
      } else {
        // GPS ruxsatini tekshirish va so'rash
        final permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          final requested = await Geolocator.requestPermission();
          if (requested == LocationPermission.denied ||
              requested == LocationPermission.deniedForever) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('GPS ruxsati talab qilinadi'),
                  backgroundColor: AppTheme.dangerColor,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
            return;
          }
        }

        if (permission == LocationPermission.deniedForever) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('GPS ruxsati doimiy ravishda bloklangan. Ilova sozlamalaridan ruxsat bering.'),
                backgroundColor: AppTheme.dangerColor,
                behavior: SnackBarBehavior.floating,
                duration: const Duration(seconds: 4),
              ),
            );
          }
          return;
        }

        await BackgroundGpsService.start();
        setState(() => _isOnline = true);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _isOnline ? AppTheme.successColor : AppTheme.textSecondary;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GestureDetector(
        onTap: _busy ? null : _toggle,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.radio, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                _isOnline ? 'ONLINE' : 'OFFLINE',
                style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
