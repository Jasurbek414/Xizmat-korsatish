import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme.dart';
import '../repository/notification_repository.dart';
import '../screens/notifications_screen.dart';

/// Ilova tepasidagi qo'ng'iroqcha - o'qilmagan bildirishnomalar soni bilan.
/// `dark` = true bo'lsa oq gradient fon ustida (haydovchi bosh sahifasi),
/// aks holda oddiy fon ustida ishlatiladi.
class NotificationBell extends StatefulWidget {
  final bool dark;
  const NotificationBell({super.key, this.dark = false});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  final _repo = NotificationRepository();
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final count = await _repo.unreadCount();
      if (mounted) setState(() => _unread = count);
    } catch (_) {}
  }

  Future<void> _open() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final iconColor = widget.dark ? Colors.white : AppTheme.textPrimary;
    final bgColor = widget.dark ? Colors.white.withOpacity(0.18) : AppTheme.surfaceAlt;

    return InkWell(
      onTap: _open,
      borderRadius: BorderRadius.circular(14),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
              border: widget.dark
                  ? Border.all(color: Colors.white.withOpacity(0.5), width: 1.5)
                  : Border.all(color: AppTheme.borderColor),
            ),
            child: Icon(LucideIcons.bell, size: 18, color: iconColor),
          ),
          if (_unread > 0)
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                constraints: const BoxConstraints(minWidth: 18),
                decoration: BoxDecoration(
                  color: AppTheme.dangerColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: widget.dark ? Colors.transparent : AppTheme.surface, width: 2),
                ),
                child: Text(
                  _unread > 99 ? '99+' : '$_unread',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
