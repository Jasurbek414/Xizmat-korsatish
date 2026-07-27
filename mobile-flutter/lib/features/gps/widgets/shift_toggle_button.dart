import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../services/background_gps_service.dart';

/// Haydovchi/ishchi ish smenasini ONLINE/OFFLINE holatga o'tkazadi.
/// ONLINE bo'lganda fon GPS xizmati ishga tushadi va joylashuvni yubora
/// boshlaydi (ilova yopilgan holatda ham).
///
/// MUHIM: bu widget bir nechta joyda (AppBar'da va Bosh sahifa sarlavhasida)
/// alohida-alohida ishlatiladi - shu sabab holat mahalliy (local) saqlanmaydi,
/// balki `BackgroundGpsService.isOnline` umumiy notifier'idan o'qiladi, aks
/// holda ikkala nusxa bir-biridan bexabar, mos kelmaydigan holat ko'rsatardi.
class ShiftToggleButton extends StatefulWidget {
  const ShiftToggleButton({super.key});

  @override
  State<ShiftToggleButton> createState() => _ShiftToggleButtonState();
}

class _ShiftToggleButtonState extends State<ShiftToggleButton> {
  bool _busy = false;

  Future<void> _toggle() async {
    setState(() => _busy = true);
    try {
      if (BackgroundGpsService.isOnline.value) {
        await BackgroundGpsService.stop();
        return;
      }

      // GPS ruxsatini tekshirish va so'rash
      var permission = await Geolocator.checkPermission();
      var justRequested = false;
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        justRequested = true;
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
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

      // MUHIM: Geolocator faqat "ilova ochiq turganda" (whileInUse) yoki
      // "doim" (always) ruxsatini qaytaradi. Fon xizmati ilova YOPIQ bo'lganda
      // ham ishlashi uchun aynan "always" kerak - lekin Android buni ikkinchi
      // in-app dialog orqali so'rashga UMUMAN yo'l qo'ymaydi (foydalanuvchi
      // buni faqat tizim Sozlamalaridan qo'lda o'zgartirishi mumkin). Shu
      // sabab bu holatni aniqlab, foydalanuvchini ANIQ shu yerga yo'naltiramiz -
      // aks holda tugma "ONLINE" ko'rsatib tursa ham, ilova yopilgach kuzatuv
      // jimgina to'xtab qolishi mumkin edi, buni hech kim bilmasdi.
      if (permission == LocationPermission.whileInUse && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Ilova yopiq holatda ham joylashuv yuborilishi uchun "Doim ruxsat berish" tanlang.',
            ),
            backgroundColor: AppTheme.warningColor,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
            action: SnackBarAction(
              label: 'Sozlamalar',
              textColor: Colors.white,
              onPressed: () => Geolocator.openAppSettings(),
            ),
          ),
        );
        // Davom etamiz - hech bo'lmasa ilova ochiq turgan vaqtda GPS ishlaydi.
      }

      if (justRequested) {
        // Android'da ruxsat dialogi yopilgandan DARHOL keyin foreground GPS
        // xizmatini ishga tushirish xavfli - OS ba'zan ilovani hali ham
        // "fonda" deb noto'g'ri hisoblab, xizmatni boshlashni butunlay rad
        // etib native darajada halokatga uchratishi mumkin (Android 12+,
        // ForegroundServiceStartNotAllowedException). UI barqarorlashishi
        // uchun qisqa pauza berib, shu xavfni kamaytiramiz.
        await Future.delayed(const Duration(milliseconds: 400));
      }

      try {
        await BackgroundGpsService.start();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('GPS xizmatini ishga tushirib bo\'lmadi: $e'),
              backgroundColor: AppTheme.dangerColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: BackgroundGpsService.isOnline,
      builder: (context, isOnline, _) {
        final color = isOnline ? AppTheme.successColor : AppTheme.textSecondary;
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
                    isOnline ? 'ONLINE' : 'OFFLINE',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
