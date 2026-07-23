import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';

class DetailCarpetItemWidget extends StatelessWidget {
  final Order order;
  final List<OrderStatusInfo> statuses;
  final OrderItemInfo item;
  final bool isReadOnly;

  const DetailCarpetItemWidget({
    super.key,
    required this.order,
    required this.statuses,
    required this.item,
    this.isReadOnly = false,
  });

  String _getStatusLabel(String targetStep, String defaultValue) {
    if (statuses.isEmpty) return defaultValue;

    final sorted = [...statuses]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    switch (targetStep) {
      case 'ACCEPTED':
        return sorted.first.nameUz;
      case 'WASHED':
        if (sorted.length >= 3) {
          return sorted[2].nameUz;
        }
        return defaultValue;
      case 'DRIED':
        final found = sorted.firstWhere(
          (s) => s.nameUz.toLowerCase().contains('qurit'),
          orElse: () => sorted.firstWhere(
            (s) => s.nameRu.toLowerCase().contains('суш') || s.nameEn.toLowerCase().contains('dry'),
            orElse: () {
              if (sorted.length >= 5) {
                return sorted[3];
              }
              return OrderStatusInfo(id: '', nameUz: defaultValue, nameRu: '', nameEn: '', colorCode: '', sortOrder: 0);
            }
          ),
        );
        return found.nameUz;
      case 'READY':
        return sorted.last.nameUz;
      default:
        return defaultValue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAreaBased = order.measurementUnit == 'm²' || order.measurementUnit == 'metr';
    final area = item.length * item.width;
    final totalQty = isAreaBased ? (area * item.quantity) : item.quantity.toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                item.name,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
              Text(
                isAreaBased
                    ? "${item.quantity} dona (${item.length.toStringAsFixed(1)}x${item.width.toStringAsFixed(1)} m) = ${totalQty.toStringAsFixed(1)} ${order.measurementUnit}"
                    : "${item.quantity} ${order.measurementUnit}",
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _CheckboxStep(
                label: _getStatusLabel('ACCEPTED', "Qabul"),
                checked: _isAtLeast(item.status, 'ACCEPTED'),
                onChanged: isReadOnly ? null : (val) {
                  if (val == true) {
                    context.read<OrdersCubit>().changeOrderItemStatus(order, item, 'ACCEPTED');
                  }
                },
              ),
              _CheckboxStep(
                label: _getStatusLabel('WASHED', "Yuvildi"),
                checked: _isAtLeast(item.status, 'WASHED'),
                onChanged: isReadOnly ? null : (val) {
                  context.read<OrdersCubit>().changeOrderItemStatus(order, item, val == true ? 'WASHED' : 'ACCEPTED');
                },
              ),
              _CheckboxStep(
                label: _getStatusLabel('DRIED', "Quritish"),
                checked: _isAtLeast(item.status, 'DRIED'),
                onChanged: isReadOnly ? null : (val) {
                  context.read<OrdersCubit>().changeOrderItemStatus(order, item, val == true ? 'DRIED' : 'WASHED');
                },
              ),
              _CheckboxStep(
                label: _getStatusLabel('READY', "Tayyor"),
                checked: _isAtLeast(item.status, 'READY'),
                onChanged: isReadOnly ? null : (val) {
                  context.read<OrdersCubit>().changeOrderItemStatus(order, item, val == true ? 'READY' : 'DRIED');
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool _isAtLeast(String current, String target) {
    const list = ['ACCEPTED', 'WASHED', 'DRIED', 'READY'];
    final cIdx = list.indexOf(current);
    final tIdx = list.indexOf(target);
    return cIdx >= tIdx;
  }
}

class _CheckboxStep extends StatelessWidget {
  final String label;
  final bool checked;
  final ValueChanged<bool?>? onChanged;

  const _CheckboxStep({
    required this.label,
    required this.checked,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 22,
          height: 22,
          child: Checkbox(
            value: checked,
            onChanged: onChanged,
            activeColor: AppTheme.successColor,
            checkColor: Colors.white,
            side: BorderSide(color: Colors.white.withOpacity(0.3), width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            color: checked ? AppTheme.successColor : AppTheme.textSecondary,
            fontSize: 9,
            fontWeight: checked ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
