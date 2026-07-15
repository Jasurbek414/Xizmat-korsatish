import '../../../core/network/api_client.dart';

class FinanceStats {
  final double totalIncome;
  final double totalExpense;
  final double balance;

  FinanceStats({
    required this.totalIncome,
    required this.totalExpense,
    required this.balance,
  });

  factory FinanceStats.fromJson(Map<String, dynamic> json) {
    return FinanceStats(
      totalIncome: (json['totalIncome'] as num?)?.toDouble() ?? 0.0,
      totalExpense: (json['totalExpense'] as num?)?.toDouble() ?? 0.0,
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class FinanceRepository {
  final ApiClient _api;

  FinanceRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<FinanceStats> fetchStats() async {
    final data = await _api.get('/finance/stats');
    return FinanceStats.fromJson(Map<String, dynamic>.from(data as Map));
  }
}
