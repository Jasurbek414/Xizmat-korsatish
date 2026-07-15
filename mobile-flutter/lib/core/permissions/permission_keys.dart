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
}
