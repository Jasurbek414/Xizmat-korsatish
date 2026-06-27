class Transaction {
  final String id;
  final String code; // e.g. TX-2026-00329
  final String type; // INCOME / EXPENSE
  final double amount;
  final String category; // SALARY, ORDER_PAYMENT, OFFICE_EXPENSE, FUEL, etc.
  final String description;
  final String walletId; // cash, card, driver_u1_wallet, etc.
  final String createdAt;

  Transaction({
    required this.id,
    required this.code,
    required this.type,
    required this.amount,
    required this.category,
    required this.description,
    required this.walletId,
    required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] ?? '',
      code: json['code'] ?? 'TX-00000',
      type: json['type'] ?? 'INCOME',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      category: json['category'] ?? '',
      description: json['description'] ?? '',
      walletId: json['wallet_id'] ?? 'cash',
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'type': type,
      'amount': amount,
      'category': category,
      'description': description,
      'wallet_id': walletId,
      'created_at': createdAt,
    };
  }
}
