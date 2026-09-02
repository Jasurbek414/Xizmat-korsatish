import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme.dart';
import '../../../ui/app_ui.dart';
import '../models/app_notification.dart';
import '../repository/notification_repository.dart';

/// Qo'ng'iroqcha (bell) ikonkasi orqali ochiladigan bildirishnomalar tarixi -
/// buyurtma tayinlanganda yoki yangi ilova versiyasi chiqqanda yuborilgan
/// push xabarlarning barchasi shu yerda saqlanadi (OS bildirishnoma panelidan
/// yo'qolib ketsa ham).
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _repo = NotificationRepository();
  List<AppNotificationItem> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _repo.fetchList();
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _repo.markAllRead();
      if (!mounted) return;
      setState(() {
        _items = _items
            .map((n) => AppNotificationItem(
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  type: n.type,
                  read: true,
                  createdAt: n.createdAt,
                ))
            .toList();
      });
    } catch (_) {}
  }

  Future<void> _openItem(AppNotificationItem n) async {
    if (!n.read) {
      setState(() {
        final i = _items.indexWhere((e) => e.id == n.id);
        if (i != -1) {
          _items[i] = AppNotificationItem(
            id: n.id,
            title: n.title,
            body: n.body,
            type: n.type,
            read: true,
            createdAt: n.createdAt,
          );
        }
      });
      _repo.markRead(n.id).catchError((_) {});
    }
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _NotificationDetailSheet(item: n),
    );
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'ORDER_ASSIGNED':
        return LucideIcons.packagePlus;
      case 'APP_UPDATE':
        return LucideIcons.download;
      default:
        return LucideIcons.bell;
    }
  }

  Color _colorFor(String type) {
    switch (type) {
      case 'ORDER_ASSIGNED':
        return AppTheme.blue;
      case 'APP_UPDATE':
        return AppTheme.amber;
      default:
        return AppTheme.primary;
    }
  }

  String _timeLabel(DateTime? d) {
    if (d == null) return '';
    final local = d.toLocal();
    final now = DateTime.now();
    final diff = now.difference(local);
    if (diff.inMinutes < 1) return 'hozirgina';
    if (diff.inMinutes < 60) return '${diff.inMinutes} daqiqa oldin';
    if (diff.inHours < 24) return '${diff.inHours} soat oldin';
    if (diff.inDays < 7) return '${diff.inDays} kun oldin';
    return '${local.day.toString().padLeft(2, '0')}.${local.month.toString().padLeft(2, '0')}.${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items.any((n) => !n.read);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bildirishnomalar'),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: _markAllRead,
              child: const Text("Hammasini o'qilgan qilish", style: TextStyle(fontSize: 12.5)),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: _load,
        child: _loading
            ? const OrderListSkeleton()
            : _error != null
                ? ListView(children: [
                    const SizedBox(height: 80),
                    EmptyState(icon: LucideIcons.alertTriangle, message: _error!),
                  ])
                : _items.isEmpty
                    ? ListView(children: const [
                        SizedBox(height: 80),
                        EmptyState(icon: LucideIcons.bellOff, message: 'Hozircha bildirishnoma yo\'q'),
                      ])
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                        itemCount: _items.length,
                        itemBuilder: (_, i) {
                          final n = _items[i];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: AppCard(
                              onTap: () => _openItem(n),
                              railColor: n.read ? null : _colorFor(n.type),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: _colorFor(n.type).withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(11),
                                    ),
                                    child: Icon(_iconFor(n.type), size: 18, color: _colorFor(n.type)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(n.title,
                                            style: AppTheme.text(13.5,
                                                weight: n.read ? FontWeight.w600 : FontWeight.w800,
                                                color: AppTheme.textPrimaryOf(context))),
                                        const SizedBox(height: 3),
                                        Text(
                                          n.body,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTheme.text(12.5, color: AppTheme.textSecondaryOf(context)),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(_timeLabel(n.createdAt),
                                            style: AppTheme.text(11, color: AppTheme.textMutedOf(context))),
                                      ],
                                    ),
                                  ),
                                  if (!n.read)
                                    Container(
                                      width: 8,
                                      height: 8,
                                      margin: const EdgeInsets.only(top: 4, left: 6),
                                      decoration: BoxDecoration(
                                          color: _colorFor(n.type), shape: BoxShape.circle),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}

class _NotificationDetailSheet extends StatelessWidget {
  final AppNotificationItem item;
  const _NotificationDetailSheet({required this.item});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppTheme.rLg),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.title, style: AppTheme.display(16, weight: FontWeight.w800, color: AppTheme.textPrimaryOf(context))),
            const SizedBox(height: 10),
            Text(item.body, style: AppTheme.text(13.5, color: AppTheme.textSecondaryOf(context))),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: AppButton('Yopish', onTap: () => Navigator.pop(context)),
            ),
          ],
        ),
      ),
    );
  }
}
