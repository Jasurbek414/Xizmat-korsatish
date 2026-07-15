import '../../../core/network/api_client.dart';

class NotificationRepository {
  final ApiClient _api;

  NotificationRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<void> registerToken(String token) {
    return _api.put('/auth/fcm-token', data: {'token': token});
  }
}
