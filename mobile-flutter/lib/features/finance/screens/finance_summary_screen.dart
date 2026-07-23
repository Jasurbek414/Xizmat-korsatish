import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../bloc/finance_cubit.dart';

class FinanceSummaryScreen extends StatelessWidget {
  const FinanceSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => FinanceCubit()..load(),
      child: BlocBuilder<FinanceCubit, FinanceState>(
        builder: (context, state) {
          if (state is FinanceLoading || state is FinanceInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is FinanceError) {
            return Center(
              child: Text(state.message, style: const TextStyle(color: AppTheme.dangerColor)),
            );
          }

          final stats = (state as FinanceLoaded).stats;
          return RefreshIndicator(
            onRefresh: () => context.read<FinanceCubit>().load(),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _BalanceCard(
                  label: 'Joriy balans',
                  amount: stats.balance,
                  icon: LucideIcons.wallet,
                  color: AppTheme.primaryColor,
                  large: true,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _BalanceCard(
                        label: 'Tushum',
                        amount: stats.totalIncome,
                        icon: LucideIcons.trendingUp,
                        color: AppTheme.successColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _BalanceCard(
                        label: 'Chiqim',
                        amount: stats.totalExpense,
                        icon: LucideIcons.trendingDown,
                        color: AppTheme.dangerColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Text(
                  "Tranzaksiya qo'shish",
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _showAddTransactionDialog(context, 'INCOME'),
                        icon: const Icon(LucideIcons.plusCircle, size: 16),
                        label: const Text('Kirim qilish', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successColor,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _showAddTransactionDialog(context, 'EXPENSE'),
                        icon: const Icon(LucideIcons.minusCircle, size: 16),
                        label: const Text('Chiqim qilish', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.dangerColor,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showAddTransactionDialog(BuildContext context, String type) {
    final amountController = TextEditingController();
    final descriptionController = TextEditingController();
    final financeCubit = context.read<FinanceCubit>();

    final categories = type == 'INCOME'
        ? ['ORDER_PAYMENT', 'OTHER']
        : ['FUEL', 'SALARY', 'CAR_REPAIR', 'OTHER'];
        
    String selectedCategory = categories.first;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xff1f2937),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            type == 'INCOME' ? "Kirim qo'shish" : "Chiqim qo'shish",
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: "Summa (so'm)",
                    labelStyle: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  dropdownColor: const Color(0xff1f2937),
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: "Kategoriya",
                    labelStyle: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                  items: categories.map((cat) {
                    return DropdownMenuItem<String>(
                      value: cat,
                      child: Text(cat == 'ORDER_PAYMENT'
                          ? "Buyurtma to'lovi"
                          : cat == 'FUEL'
                              ? "Yoqilg'i"
                              : cat == 'SALARY'
                                  ? "Ish haqi"
                                  : cat == 'CAR_REPAIR'
                                      ? "Mashina ta'mirlash"
                                      : "Boshqa"),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() {
                        selectedCategory = val;
                      });
                    }
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: descriptionController,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: "Tavsif / Izoh",
                    labelStyle: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text("Bekor qilish", style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            ),
            ElevatedButton(
              onPressed: () {
                final amount = double.tryParse(amountController.text) ?? 0.0;
                if (amount <= 0) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(content: Text("Iltimos, to'g'ri summa kiriting")),
                  );
                  return;
                }
                Navigator.pop(dialogContext);
                
                financeCubit.addTransaction(
                  type: type,
                  amount: amount,
                  category: selectedCategory,
                  description: descriptionController.text.trim(),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: type == 'INCOME' ? AppTheme.successColor : AppTheme.dangerColor,
              ),
              child: const Text("Qo'shish", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final String label;
  final double amount;
  final IconData icon;
  final Color color;
  final bool large;

  const _BalanceCard({
    required this.label,
    required this.amount,
    required this.icon,
    required this.color,
    this.large = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.cardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: large ? 26 : 20),
          const SizedBox(height: 10),
          Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          const SizedBox(height: 4),
          Text(
            '${amount.toStringAsFixed(0)} so\'m',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontFamily: 'Outfit',
              fontWeight: FontWeight.bold,
              fontSize: large ? 24 : 16,
            ),
          ),
        ],
      ),
    );
  }
}
