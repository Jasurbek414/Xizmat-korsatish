class User {
  final String id;
  final String companyId;
  final String username;
  final String fullName;
  final String phone;
  final String role; // Role.key qiymati - masalan ADMIN, MANAGER, WORKER_DRIVER
  final String status; // ACTIVE, BLOCKED
  final double baseSalary;
  final double kpiBonusPercent;

  User({
    required this.id,
    required this.companyId,
    required this.username,
    required this.fullName,
    required this.phone,
    required this.role,
    required this.status,
    this.baseSalary = 0,
    this.kpiBonusPercent = 0,
  });

  /// Backend `/auth/login` va `/auth/me` javoblaridan (camelCase maydonlar).
  factory User.fromApiJson(Map<String, dynamic> json, {String? companyId}) {
    return User(
      id: json['id'] ?? '',
      companyId: companyId ?? json['companyId'] ?? '',
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      baseSalary: (json['salary'] as num?)?.toDouble() ?? 0.0,
      kpiBonusPercent: (json['kpiBonusPercent'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'companyId': companyId,
      'username': username,
      'fullName': fullName,
      'phone': phone,
      'role': role,
      'status': status,
      'salary': baseSalary,
      'kpiBonusPercent': kpiBonusPercent,
    };
  }
}
