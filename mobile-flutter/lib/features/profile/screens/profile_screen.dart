import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/user.dart';
import '../../auth/bloc/auth_bloc.dart';

/// Barcha rollar uchun umumiy profil ekrani: xodim ma'lumotlari, ish haqi
/// (agar ruxsat berilgan bo'lsa) va tizimdan chiqish.
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
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        CircleAvatar(
          radius: 36,
          backgroundColor: AppTheme.primaryColor.withOpacity(0.15),
          child: Text(
            user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            user.fullName,
            style: const TextStyle(
              fontFamily: 'Outfit',
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
        ),
        Center(
          child: Text(
            '@${user.username}',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
        ),
        const SizedBox(height: 24),
        _InfoTile(icon: LucideIcons.phone, label: 'Telefon', value: user.phone),
        _InfoTile(
          icon: LucideIcons.shield,
          label: 'Status',
          value: user.status == 'ACTIVE' ? 'Faol' : 'Bloklangan',
        ),
        if (canViewSalary)
          _InfoTile(
            icon: LucideIcons.wallet,
            label: 'Asosiy ish haqi',
            value: '${user.baseSalary.toStringAsFixed(0)} so\'m',
          ),
        const SizedBox(height: 32),
        OutlinedButton.icon(
          onPressed: () => context.read<AuthBloc>().add(LogoutEvent()),
          icon: const Icon(LucideIcons.logOut, color: AppTheme.dangerColor),
          label: const Text(
            'Tizimdan chiqish',
            style: TextStyle(color: AppTheme.dangerColor),
          ),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            side: const BorderSide(color: AppTheme.dangerColor),
          ),
        ),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.cardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.textSecondary),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
