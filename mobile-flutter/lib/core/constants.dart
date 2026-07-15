class AppConstants {
  /// Backend hostini muhitga (emulator/real qurilma/production) qarab
  /// `--dart-define=API_HOST=...` orqali build vaqtida almashtirish mumkin.
  /// Android emulyatoridan hostning localhost'iga chiqish uchun 10.0.2.2 ishlatiladi.
  static const String _apiHost = String.fromEnvironment(
    'API_HOST',
    defaultValue: '10.0.2.2:8082',
  );
  static const bool _useHttps = bool.fromEnvironment('API_HTTPS');

  static String get baseApiUrl =>
      '${_useHttps ? 'https' : 'http'}://$_apiHost/api/v1';

  // Hive Database Boxes
  static const String settingsBox = 'settings_box';
  static const String offlineQueueBox = 'offline_queue_box';
  static const String cacheBox = 'cache_box';

  // Secure Storage Keys
  static const String keySubdomain = 'subdomain';
  static const String keyTenantId = 'tenant_id';
  static const String keyToken = 'jwt_token';
  static const String keyUser = 'logged_user';
  static const String keyPermissions = 'permissions';
  static const String keyTheme = 'theme_preference';
  static const String keyShiftStatus = 'shift_status'; // ONLINE / OFFLINE
}
