/// Backend'dagi `com.service.core.service.PermissionKeys` bilan bir xil kalitlar.
/// Admin panelida rolga ruxsat berilgan/berilmagan modullar shu kalitlar orqali
/// aniqlanadi va mobil ilova UI'sini shularga qarab ko'rsatadi/yashiradi.
class PermissionKeys {
  static const String mobileOrders = 'mobile_orders';
  static const String mobileGps = 'mobile_gps';
  static const String mobileFinanceView = 'mobile_finance_view';
  static const String mobileTeamView = 'mobile_team_view';
  static const String mobileChat = 'mobile_chat';
  static const String mobileSalaryView = 'mobile_salary_view';

  static const List<String> mobileKeys = [
    mobileOrders,
    mobileGps,
    mobileFinanceView,
    mobileTeamView,
    mobileChat,
    mobileSalaryView,
  ];

  // ---------------------------------------------------------------------------
  // BOSHQARUV (admin panel) modul kalitlari.
  //
  // Bular yangi kalitlar EMAS - backend'da (`PermissionKeys.java`) va admin
  // panelida ANIQ shu nomlar bilan allaqachon mavjud, shunchaki mobil ilova
  // ilgari ulardan foydalanmasdi (haydovchi/sex xodimiga faqat `mobile_*`
  // kerak edi). Endi ADMIN va MENEJER mobil interfeysi shu kalitlarga tayanadi,
  // shuning uchun admin panelida rolga modul yoqilsa/o'chirilsa mobil ilova
  // kod o'zgarishisiz moslashadi - mavjud arxitektura falsafasi bilan bir xil.
  // ---------------------------------------------------------------------------
  static const String clients = 'clients';
  static const String employees = 'employees';
  static const String orders = 'orders';
  static const String finance = 'finance';
  static const String salaries = 'salaries';
  static const String settings = 'settings';
  static const String map = 'map';
  static const String telephony = 'telephony';
}

/// Joriy foydalanuvchining roliga tayinlangan ruxsatlar to'plami.
/// Backend `/api/v1/roles` javobidagi `permissions` xaritasidan quriladi.
class Permissions {
  final Map<String, bool> _values;

  const Permissions(this._values);

  factory Permissions.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const Permissions({});
    return Permissions(json.map((key, value) => MapEntry(key, value == true)));
  }

  Map<String, dynamic> toJson() => _values;

  bool has(String key) => _values[key] == true;

  bool get canViewOrders => has(PermissionKeys.mobileOrders);
  bool get canTrackGps => has(PermissionKeys.mobileGps);
  bool get canViewFinance => has(PermissionKeys.mobileFinanceView);
  bool get canViewTeam => has(PermissionKeys.mobileTeamView);
  bool get canChat => has(PermissionKeys.mobileChat);
  bool get canViewSalary => has(PermissionKeys.mobileSalaryView);

  // Boshqaruv (ADMIN / MENEJER) modullari - `management` paketidagi ekranlar
  // shu getter'lar orqali ko'rinadi/yashiriladi.
  bool get canManageClients => has(PermissionKeys.clients);
  bool get canManageEmployees => has(PermissionKeys.employees);
  bool get canManageOrders => has(PermissionKeys.orders);
  bool get canManageFinance => has(PermissionKeys.finance);
  bool get canManageSalaries => has(PermissionKeys.salaries);
  bool get canManageSettings => has(PermissionKeys.settings);
  bool get canViewMap => has(PermissionKeys.map);

  /// Foydalanuvchi kamida bitta boshqaruv moduliga ega bo'lsa - unga
  /// haydovchi/sex interfeysi emas, BOSHQARUV interfeysi ko'rsatiladi.
  bool get hasAnyManagementModule =>
      canManageClients ||
      canManageEmployees ||
      canManageOrders ||
      canManageFinance ||
      canManageSalaries ||
      canManageSettings;
}
