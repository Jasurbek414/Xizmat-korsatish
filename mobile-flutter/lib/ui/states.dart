import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../core/theme.dart';

/// Bo'sh holat - ikonka + izoh (buyurtma yo'q, natija topilmadi).
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const EmptyState({super.key, required this.icon, required this.message});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(color: AppTheme.surfaceAlt, shape: BoxShape.circle),
              child: Icon(icon, size: 30, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 14),
            Text(message, textAlign: TextAlign.center, style: AppTheme.text(13.5, weight: FontWeight.w500, color: AppTheme.textSecondary)),
          ]),
        ),
      );
}

/// Yuklanish skeleton - shimmer bilan buyurtma kartalari o'rniga.
class OrderListSkeleton extends StatelessWidget {
  final int count;
  const OrderListSkeleton({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.surfaceAlt,
      highlightColor: AppTheme.surface,
      period: const Duration(milliseconds: 1300),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        itemCount: count,
        itemBuilder: (_, __) => Container(
          height: 116,
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.rLg)),
        ),
      ),
    );
  }
}
