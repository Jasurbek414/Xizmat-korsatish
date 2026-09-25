class AppConstants {
  /// Backend hostini muhitga (emulator/real qurilma/production) qarab
  /// `--dart-define=API_HOST=...` orqali build vaqtida almashtirish mumkin.
  /// PRODUCTION: servicecore-api.ecos.uz (2026-08-10 dan - eski
  /// namifor-api.ecos.uz endi o'lik, shu sabab so'rovlar butunlay
  /// muvaffaqiyatsiz/juda sekin bo'lib qolgan edi - build-vaqtidagi
  /// almashtirish skripti hech qachon bo'lmagan, shuning uchun standart
  /// qiymatning o'zi haqiqiy productionga mos bo'lishi SHART).
  static const String _apiHost = String.fromEnvironment(
    'API_HOST',
    defaultValue: 'servicecore-api.ecos.uz',
  );
  static const bool _useHttps = bool.fromEnvironment(
    'API_HTTPS',
    defaultValue: true,
  );

  static String get baseApiUrl =>
      '${_useHttps ? 'https' : 'http'}://$_apiHost/api/v1';

  /// Kompaniya subdomenlari joylashgan asosiy domen (login ekranida
  /// "subdomen.ecos.uz" ko'rinishida ko'rsatish uchun).
  static const String companyDomainSuffix = 'ecos.uz';

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
  // Refresh token va qurilma identifikatori (2026-08-05, sessiya xavfsizligi).
  static const String keyRefreshToken = 'refresh_token';
  static const String keyDeviceId = 'device_id';
  static const String keyTheme = 'theme_preference';
  static const String keyShiftStatus = 'shift_status'; // ONLINE / OFFLINE

  /// Dark mode (true) yoki light mode (false)
  static const String keyDarkMode = 'dark_mode';
}
