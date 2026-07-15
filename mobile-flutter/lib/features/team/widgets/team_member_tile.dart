import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../repository/team_repository.dart';

class TeamMemberTile extends StatelessWidget {
  final TeamMember member;
  const TeamMemberTile({super.key, required this.member});

  @override
  Widget build(BuildContext context) {
    final isActive = member.status == 'ACTIVE';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.cardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppTheme.primaryColor.withOpacity(0.15),
            child: Text(
              member.fullName.isNotEmpty ? member.fullName[0].toUpperCase() : '?',
              style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.fullName,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                Text(
                  member.role,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                ),
              ],
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isActive ? LucideIcons.checkCircle : LucideIcons.xCircle,
                size: 14,
                color: isActive ? AppTheme.successColor : AppTheme.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                isActive ? 'Faol' : 'Bloklangan',
                style: TextStyle(
                  color: isActive ? AppTheme.successColor : AppTheme.textSecondary,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
