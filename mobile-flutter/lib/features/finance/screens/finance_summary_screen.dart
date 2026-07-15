import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../bloc/finance_cubit.dart';

/// Menejer/admin uchun kompaniyaning joriy moliyaviy balansi xulosasi.
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
              ],
            ),
          );
        },
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
