import '../../../core/network/api_client.dart';

/// Kassa yozuvi. Backend `Transaction` entity'sini camelCase qaytaradi;
/// `worker` va `order` ichma-ich obyekt bo'lib kelishi mumkin (yoki null).
class TxRecord {
  final String id;
  final String type; // INCOME | EXPENSE
  final double amount;
  final String category;
  final String description;
  final String status; // PENDING | CONFIRMED
  final String? workerName;
  final DateTime? createdAt;

  const TxRecord({
    required this.id,
    required this.type,
    required this.amount,
    required this.category,
    required this.description,
    required this.status,
    this.workerName,
    this.createdAt,
  });

  bool get isIncome => type.toUpperCase() == 'INCOME';
  bool get isPending => status.toUpperCase() == 'PENDING';

  factory TxRecord.fromJson(Map<String, dynamic> json) {
    final worker = json['worker'];
    return TxRecord(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'EXPENSE',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      category: json['category']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'CONFIRMED',
      workerName: worker is Map ? worker['fullName']?.toString() : null,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}

class FinanceStats {
  final double income;
  final double expense;
  final double balance;

  const FinanceStats({required this.income, required this.expense, required this.balance});

  factory FinanceStats.fromJson(Map<String, dynamic> json) {
    final inc = (json['totalIncome'] as num?)?.toDouble() ?? 0;
    final exp = (json['totalExpense'] as num?)?.toDouble() ?? 0;
    return FinanceStats(
      income: inc,
      expense: exp,
      balance: (json['balance'] as num?)?.toDouble() ?? (inc - exp),
    );
  }
}

class DebtRecord {
  final String id;
  final String type; // RECEIVABLE (mijoz qarzi) | PAYABLE (biz qarzimiz)
  final String counterparty;
  final double amount;
  final String status; // ACTIVE | PAID (backend Debt.java - qisman to'lov tushunchasi yo'q)

  const DebtRecord({
    required this.id,
    required this.type,
    required this.counterparty,
    required this.amount,
    required this.status,
  });

  bool get isPaid => status.toUpperCase() == 'PAID';

  factory DebtRecord.fromJson(Map<String, dynamic> json) {
    return DebtRecord(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'RECEIVABLE',
      // MUHIM (audit'da topilgan xato, tuzatildi): backend maydoni "person"
      // (Debt.java) - avval "counterparty"/"personName"/"name" o'qilardi,
      // bunday maydonlar umuman yo'q edi, shuning uchun HAR bir qarz
      // "(nomsiz)" bo'lib ko'rinardi.
      counterparty: (json['person'] ?? '').toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status']?.toString() ?? 'ACTIVE',
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

  Future<List<TxRecord>> fetchTransactions() async {
    final data = await _api.get('/finance/transactions') as List;
    final list = data.cast<Map<String, dynamic>>().map(TxRecord.fromJson).toList();
    list.sort((a, b) {
      final ad = a.createdAt, bd = b.createdAt;
      if (ad == null && bd == null) return 0;
      if (ad == null) return 1;
      if (bd == null) return -1;
      return bd.compareTo(ad);
    });
    return list;
  }

  Future<List<TxRecord>> fetchPending() async {
    final data = await _api.get('/finance/pending-transactions') as List;
    return data.cast<Map<String, dynamic>>().map(TxRecord.fromJson).toList();
  }

  Future<List<DebtRecord>> fetchDebts() async {
    final data = await _api.get('/finance/debts') as List;
    return data.cast<Map<String, dynamic>>().map(DebtRecord.fromJson).toList();
  }

  /// Yangi kirim/chiqim. Backend snake_case kutadi (FinanceController).
  ///
  /// `backdate` berilsa yozuv O'SHA SANAGA yoziladi - eski oyga kirim/chiqim
  /// kiritish uchun (backend 2026-08-06 da qo'llab-quvvatlaydigan qilindi,
  /// Order'dagi bilan bir xil naqsh). Berilmasa joriy vaqt qo'yiladi.
  Future<void> createTransaction({
    required String type,
    required double amount,
    required String category,
    required String description,
    DateTime? backdate,
  }) {
    String two(int v) => v.toString().padLeft(2, '0');
    return _api.post('/finance/transactions', data: {
      'type': type,
      'amount': amount,
      'category': category,
      'description': description,
      if (backdate != null)
        'created_at': '${backdate.year}-${two(backdate.month)}-${two(backdate.day)}',
    });
  }

  /// Haydovchi topshirgan naqd pulni kassaga qabul qilish (tasdiqlash).
  Future<void> confirmTransaction(String id) => _api.put('/finance/transactions/$id/confirm');

  Future<void> payDebt(String id, double amount) =>
      _api.put('/finance/debts/$id/pay', data: {'amount': amount});
}
