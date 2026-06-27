class User {
  final String id;
  final String companyId;
  final String username;
  final String fullName;
  final String phone;
  final String role; // SUPERADMIN, ADMIN, MANAGER, WORKER_DRIVER, WORKER_SEH
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
    required this.baseSalary,
    required this.kpiBonusPercent,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      companyId: json['company_id'] ?? '',
      username: json['username'] ?? '',
      fullName: json['full_name'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'WORKER_DRIVER',
      status: json['status'] ?? 'ACTIVE',
      baseSalary: (json['base_salary'] as num?)?.toDouble() ?? 0.0,
      kpiBonusPercent: (json['kpi_bonus_percent'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      'username': username,
      'full_name': fullName,
      'phone': phone,
      'role': role,
      'status': status,
      'base_salary': baseSalary,
      'kpi_bonus_percent': kpiBonusPercent,
    };
  }
}
