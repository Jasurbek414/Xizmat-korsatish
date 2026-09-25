import '../../../core/network/api_client.dart';

/// Bitta xodimning bitta davr uchun ish haqi hisobi.
/// Backend `Salary` entity'sini qaytaradi, `user` ichma-ich obyekt.
class SalaryRecord {
  final String id;
  final String employeeName;
  final String employeeRole;
  final double baseSalary;
  final double bonus;
  final double deductions;
  final String payPeriod;
  final String status; // PAID | UNPAID

  const SalaryRecord({
    required this.id,
    required this.employeeName,
    required this.employeeRole,
    required this.baseSalary,
    required this.bonus,
    required this.deductions,
    required this.payPeriod,
    required this.status,
  });

  double get net => baseSalary + bonus - deductions;
  bool get isPaid => status.toUpperCase() == 'PAID';

  factory SalaryRecord.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return SalaryRecord(
      id: json['id']?.toString() ?? '',
      employeeName: user is Map ? (user['fullName']?.toString() ?? '') : '',
      employeeRole: user is Map ? (user['role']?.toString() ?? '') : '',
      baseSalary: (json['baseSalary'] as num?)?.toDouble() ?? 0,
      bonus: (json['bonus'] as num?)?.toDouble() ?? 0,
      deductions: (json['deductions'] as num?)?.toDouble() ?? 0,
      payPeriod: json['payPeriod']?.toString() ?? '',
      status: json['status']?.toString() ?? 'UNPAID',
    );
  }
}

class SalariesRepository {
  final ApiClient _api;

  SalariesRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<List<SalaryRecord>> fetchAll() async {
    final data = await _api.get('/salaries') as List;
    final list = data.cast<Map<String, dynamic>>().map(SalaryRecord.fromJson).toList();
    // To'lanmaganlar yuqorida - administratorga birinchi navbatda ular kerak.
    list.sort((a, b) {
      if (a.isPaid != b.isPaid) return a.isPaid ? 1 : -1;
      return a.employeeName.compareTo(b.employeeName);
    });
    return list;
  }

  /// Tanlangan oy uchun barcha xodimga hisob yaratadi.
  /// `payPeriod` formati backend tomonidan qat'iy: YYYY-MM.
  Future<String> generate(String payPeriod) async {
    final data = await _api.post('/salaries/generate', data: {'pay_period': payPeriod});
    if (data is Map && data['message'] != null) return data['message'].toString();
    return 'Hisoblar yaratildi';
  }

  Future<void> pay(String id) => _api.put('/salaries/$id/pay');

  Future<void> addDeduction(String id, double amount, String reason) =>
      _api.put('/salaries/$id/deduction', data: {'amount': amount, 'description': reason});
}
