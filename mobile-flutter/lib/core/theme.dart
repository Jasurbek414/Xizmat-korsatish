import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Ilova dizayn tizimi - FULL DARK/LIGHT MODE qo'llab-quvvatlash bilan.
///
/// *** MUHIM: Legacy color'lar `static const` bo'lishi kerak! ***
/// Butun loyiha bo'ylab `const TextStyle(color: AppTheme.textPrimary)`
/// kabi ishlatilgani uchun ularni getter qilish mumkin emas.
class AppTheme {
  // --- Brend / asosiy ranglar (ikkala mode'da bir xil) ---
  static const Color primary = Color(0xFF0B6B4F);
  static const Color primaryDark = Color(0xFF08543E);
  static const Color primarySoft = Color(0xFFDBF0E6);

  // --- Semantik ranglar ---
  static const Color blue = Color(0xFF2563EB);
  static const Color blueSoft = Color(0xFFE1EBFD);
  static const Color amber = Color(0xFFD9852B);
  static const Color amberSoft = Color(0xFFFBECD6);
  static const Color purple = Color(0xFF6D5BD0);
  static const Color purpleSoft = Color(0xFFE7E3FB);
  static const Color green = Color(0xFF0B6B4F);
  static const Color greenSoft = Color(0xFFDBF0E6);
  static const Color teal = Color(0xFF0E9488);
  static const Color tealSoft = Color(0xFFD6F1EE);
  static const Color orange = Color(0xFFC2643A);
  static const Color orangeSoft = Color(0xFFF6E6DC);
  static const Color navy = Color(0xFF182534);
  static const Color dangerColor = Color(0xFFD2513F);

  // --- Masofa / radius tokenlari (const) ---
  static const double gapXs = 4, gapSm = 8, gapMd = 12, gapLg = 16, gapXl = 24;
  static const double rSm = 10, rMd = 14, rLg = 18, rXl = 24;

  // ====================================================================
  //  LEGACY COLOR'LAR (static const) - ESKI KOD BILAN MOSLIK UCHUN
  //  const konstruktorlarda ishlatish mumkin:
  //    const TextStyle(color: AppTheme.textPrimary) ✓
  // ====================================================================
  static const Color bg = Color(0xFFF4F6F4);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceAlt = Color(0xFFF7F9F7);
  static const Color borderColor = Color(0xFFE4E9E5);
  static const Color cardColor = Color(0xFFFFFFFF);
  static const Color primaryColor = Color(0xFF0B6B4F);
  static const Color accentColor = Color(0xFF0B6B4F);
  static const Color successColor = Color(0xFF0B6B4F);
  static const Color warningColor = Color(0xFFD9852B);
  static const Color textPrimary = Color(0xFF141E1A);
  static const Color textSecondary = Color(0xFF5C6B64);
  static const Color textMuted = Color(0xFF8A988F);
  static const Color darkBackground = Color(0xFFF4F6F4);
  static const Color darkSurface = Color(0xFFFFFFFF); // old mapping: dark = light

  // ====================================================================
  //  DARK MODE COLOR'LAR (yangilari - public, const)
  //  `Dark` suffix bilan chaqiriladi: AppTheme.darkBgColor
  // ====================================================================
  static const Color darkBgColor = Color(0xFF0D1117);
  static const Color darkSurfaceColor = Color(0xFF161B22);
  static const Color darkSurfaceAltColor = Color(0xFF21262D);
  static const Color darkBorderColor = Color(0xFF30363D);
  static const Color darkTextPrimaryColor = Color(0xFFE6EDF3);
  static const Color darkTextSecondaryColor = Color(0xFF8B949E);
  static const Color darkTextMutedColor = Color(0xFF6E7681);

  // --- Private dark const'lar (_buildTheme va ichki ishlatish uchun) ---
  static const Color _darkBg = Color(0xFF0D1117);
  static const Color _darkSurface = Color(0xFF161B22);
  static const Color _darkSurfaceAlt = Color(0xFF21262D);
  static const Color _darkBorder = Color(0xFF30363D);
  static const Color _darkTextPrimary = Color(0xFFE6EDF3);
  static const Color _darkTextSecondary = Color(0xFF8B949E);
  static const Color _darkTextMuted = Color(0xFF6E7681);

  /// Light Mode ThemeData
  static ThemeData get lightTheme => _buildTheme(Brightness.light,
    bg: bg,
    surface: surface,
    surfaceAlt: surfaceAlt,
    border: borderColor,
    textPrimary: textPrimary,
    textSecondary: textSecondary,
    textMuted: textMuted,
    cardShadow: [
      BoxShadow(color: const Color(0xFF141E1A).withOpacity(0.07), blurRadius: 22, offset: const Offset(0, 10), spreadRadius: -12),
      BoxShadow(color: const Color(0xFF141E1A).withOpacity(0.04), blurRadius: 2, offset: const Offset(0, 1)),
    ],
  );

  /// Dark Mode ThemeData
  static ThemeData get darkTheme => _buildTheme(Brightness.dark,
    bg: darkBgColor,
    surface: darkSurfaceColor,
    surfaceAlt: darkSurfaceAltColor,
    border: darkBorderColor,
    textPrimary: darkTextPrimaryColor,
    textSecondary: darkTextSecondaryColor,
    textMuted: darkTextMutedColor,
    cardShadow: [
      BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 22, offset: const Offset(0, 10)),
      BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 2, offset: const Offset(0, 1)),
    ],
  );

  static ThemeData _buildTheme(
    Brightness brightness, {
    required Color bg,
    required Color surface,
    required Color surfaceAlt,
    required Color border,
    required Color textPrimary,
    required Color textSecondary,
    required Color textMuted,
    required List<BoxShadow> cardShadow,
  }) {
    final isDark = brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: bg,
      primaryColor: primary,
      cardColor: surface,
      fontFamily: GoogleFonts.inter().fontFamily,
      colorScheme: isDark
          ? ColorScheme.dark(
              primary: primary,
              secondary: primary,
              surface: _darkSurface,
              error: dangerColor,
              onPrimary: Colors.white,
              onSurface: _darkTextPrimary,
            )
          : ColorScheme.light(
              primary: primary,
              secondary: primary,
              surface: surface,
              error: dangerColor,
              onPrimary: Colors.white,
              onSurface: textPrimary,
            ),
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        elevation: 0,
        foregroundColor: textPrimary,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          fontFamily: 'Outfit',
          fontSize: 19,
          fontWeight: FontWeight.w800,
          color: textPrimary,
          letterSpacing: -0.4,
        ),
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        headlineMedium: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w800, color: textPrimary, letterSpacing: -0.4),
        titleLarge: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.3),
        titleMedium: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: textPrimary),
        bodyLarge: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: textPrimary),
        bodyMedium: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w400, color: textSecondary),
        labelSmall: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: textSecondary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceAlt,
        hintStyle: TextStyle(color: textMuted, fontSize: 13),
        labelStyle: TextStyle(color: textSecondary, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: BorderSide(color: border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: BorderSide(color: border)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.outfit(fontSize: 14.5, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 0),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      dividerColor: border,
    );
  }

  // ------------------------------------------------------------------
  //  KONTEKSTAN RANG OLISH UCHUN YORDAMCHILAR
  // ------------------------------------------------------------------
  static Color bgOf(BuildContext context) => Theme.of(context).scaffoldBackgroundColor;
  static Color surfaceOf(BuildContext context) => Theme.of(context).cardColor;
  static Color borderOf(BuildContext context) => Theme.of(context).dividerColor;
  static Color textPrimaryOf(BuildContext context) => Theme.of(context).textTheme.bodyLarge!.color!;
  static Color textSecondaryOf(BuildContext context) => Theme.of(context).textTheme.bodyMedium!.color!;
  static Color textMutedOf(BuildContext context) => Theme.of(context).textTheme.labelSmall!.color!;

  // --- Soyalar ---
  static List<BoxShadow> get cardShadow => [
    BoxShadow(color: const Color(0xFF141E1A).withOpacity(0.07), blurRadius: 22, offset: const Offset(0, 10), spreadRadius: -12),
    BoxShadow(color: const Color(0xFF141E1A).withOpacity(0.04), blurRadius: 2, offset: const Offset(0, 1)),
  ];

  /// Hex (#RRGGBB) -> Color
  static Color hex(String code, {double opacity = 1}) {
    try {
      final clean = code.replaceFirst('#', '');
      final full = clean.length == 6 ? 'ff$clean' : clean;
      return Color(int.parse(full, radix: 16)).withOpacity(opacity);
    } catch (_) {
      return primary.withOpacity(opacity);
    }
  }

  /// Outfit sarlavha stili
  static TextStyle display(double size, {FontWeight weight = FontWeight.w800, Color? color, double? height, double spacing = -0.4}) =>
      GoogleFonts.outfit(fontSize: size, fontWeight: weight, color: color ?? textPrimary, height: height, letterSpacing: spacing);
  /// Inter matn stili
  static TextStyle text(double size, {FontWeight weight = FontWeight.w500, Color? color, double? height}) =>
      GoogleFonts.inter(fontSize: size, fontWeight: weight, color: color ?? textPrimary, height: height);
}
