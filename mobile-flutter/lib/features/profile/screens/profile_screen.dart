import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme.dart';
import '../../../core/theme_notifier.dart';
import '../../../models/user.dart';
import '../../auth/bloc/auth_bloc.dart';

/// Barcha rollar uchun umumiy profil ekrani: xodim ma'lumotlari, dark mode
/// toggle, ish haqi (agar ruxsat berilgan bo'lsa) va tizimdan chiqish.
class ProfileScreen extends StatelessWidget {
  final User user;
  final bool canViewSalary;

  const ProfileScreen({
    super.key,
    required this.user,
    this.canViewSalary = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // --- Avatar ---
        Container(
          width: 80,
          height: 80,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              colors: [AppTheme.primary, Color(0xFF0A7A56)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primary.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Text(
            user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ).animate().fadeIn().scaleXY(begin: 0.5),
        const SizedBox(height: 16),
        Center(
          child: Text(
            user.fullName,
            style: AppTheme.display(20, weight: FontWeight.w800),
          ),
        ),
        Center(
          child: Text(
            '@${user.username}',
            style: AppTheme.text(13,
                color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary),
          ),
        ),
        const SizedBox(height: 24),

        // --- Info cards ---
        InfoTile(icon: LucideIcons.shield, label: 'Lavozim', value: _formatRole(user.role)),
        InfoTile(icon: LucideIcons.phone, label: 'Telefon', value: user.phone),
        InfoTile(
          icon: LucideIcons.circleDot,
          label: 'Status',
          value: user.status == 'ACTIVE' ? 'Faol' : 'Bloklangan',
        ),
        if (canViewSalary)
          InfoTile(
            icon: LucideIcons.wallet,
            label: 'Asosiy ish haqi',
            value: '${user.baseSalary.toStringAsFixed(0)} so\'m',
          ),
        const SizedBox(height: 20),

        // --- Sozlamalar bo'limi ---
        _sectionHeader('Sozlamalar'),
        const SizedBox(height: 12),
        _darkModeTile(context, isDark),
        const SizedBox(height: 32),

        // --- Chiqish ---
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _confirmLogout(context),
            icon: const Icon(LucideIcons.logOut, color: AppTheme.dangerColor),
            label: const Text(
              'Tizimdan chiqish',
              style: TextStyle(color: AppTheme.dangerColor, fontWeight: FontWeight.w600),
            ),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: AppTheme.dangerColor),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  String _formatRole(String role) {
    if (role.contains('DRIVER')) return 'Haydovchi';
    if (role.contains('MANAGER')) return 'Menejer';
    if (role.contains('ADMIN')) return 'Admin';
    // DRIVER bo'lmagan barcha rollar (WORKER, FACTORY, SEX va h.k.)
    return 'Sex xodimi';
  }

  Widget _sectionHeader(String title) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 16,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(title,
            style: AppTheme.display(15, weight: FontWeight.w700)),
      ],
    );
  }

  Widget _darkModeTile(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor),
      ),
      child: SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF21262D)
                    : AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isDark ? LucideIcons.moon : LucideIcons.sun,
                size: 16,
                color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              isDark ? 'Tungi rejim' : 'Kunduzgi rejim',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        subtitle: Text(
          isDark ? 'Tungi ko\'rinish' : 'Yorug\' ko\'rinish',
          style: TextStyle(
            fontSize: 12,
            color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary,
          ),
        ),
        value: isDark,
        activeColor: AppTheme.primary,
        onChanged: (val) {
          isDarkMode.value = val;
          SecureStorageService().saveThemeMode(val);
        },
      ),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1);
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text("Tizimdan chiqish",
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        content: const Text("Haqiqatan ham tizimdan chiqmoqchimisiz?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: Text('Bekor',
                style: TextStyle(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.textSecondary)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.dangerColor),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Chiqish'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      context.read<AuthBloc>().add(LogoutEvent());
    }
  }
}

class InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const InfoTile({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.cardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Text(label,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark
                      ? AppTheme.darkTextSecondaryColor
                      : AppTheme.textSecondary)),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
