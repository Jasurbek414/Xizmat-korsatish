import '../../../core/network/api_client.dart';
import '../models/app_notification.dart';

class NotificationRepository {
  final ApiClient _api;

  NotificationRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<void> registerToken(String token) {
    return _api.put('/auth/fcm-token', data: {'token': token});
  }

  Future<List<AppNotificationItem>> fetchList() async {
    final data = await _api.get('/notifications');
    final items = data is Map ? data['items'] : null;
    if (items is! List) return const [];
    return items
        .whereType<Map>()
        .map((e) => AppNotificationItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<int> unreadCount() async {
    final data = await _api.get('/notifications/unread-count');
    if (data is Map) return (data['count'] as num?)?.toInt() ?? 0;
    return 0;
  }

  Future<void> markRead(String id) => _api.post('/notifications/$id/read');

  Future<void> markAllRead() => _api.post('/notifications/read-all');
}
