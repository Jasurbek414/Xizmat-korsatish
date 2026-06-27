class AppConstants {
  static const String baseApiUrl =
      'http://localhost:8006/api/v1'; // Will be replaced by server config

  // Hive Database Boxes
  static const String settingsBox = 'settings_box';
  static const String offlineQueueBox = 'offline_queue_box';
  static const String cacheBox = 'cache_box';

  // Settings Keys
  static const String keySubdomain = 'subdomain';
  static const String keyToken = 'jwt_token';
  static const String keyUser = 'logged_user';
  static const String keyTheme = 'theme_preference';
  static const String keyShiftStatus = 'shift_status'; // ONLINE / OFFLINE
}
