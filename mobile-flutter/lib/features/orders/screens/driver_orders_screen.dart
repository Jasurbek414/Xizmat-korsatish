import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../../models/order.dart';
import '../bloc/orders_cubit.dart';
import '../widgets/order_card.dart';

/// Haydovchi/ishchi/sex hodimiga tayinlangan buyurtmalar ro'yxati.
/// Har bir buyurtmani keyingi bosqichga o'tkazish yoki rad etish mumkin.
class DriverOrdersScreen extends StatefulWidget {
  const DriverOrdersScreen({super.key});

  @override
  State<DriverOrdersScreen> createState() => _DriverOrdersScreenState();
}

class _DriverOrdersScreenState extends State<DriverOrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OrdersCubit, OrdersState>(
      listener: (context, state) {
        if (state is OrdersError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.dangerColor,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is OrdersLoading || state is OrdersInitial) {
          return const Center(child: CircularProgressIndicator());
        }

        final orders = state is OrdersLoaded ? state.orders : const <Order>[];

        // Qidiruv filtrlash
        final filteredOrders = orders.where((o) {
          final query = _searchQuery.toLowerCase();
          return o.client.fullName.toLowerCase().contains(query) ||
              o.client.phone.toLowerCase().contains(query) ||
              o.address.toLowerCase().contains(query) ||
              o.serviceName.toLowerCase().contains(query) ||
              o.description.toLowerCase().contains(query);
        }).toList();

        return Column(
          children: [
            // Qidiruv paneli
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                  });
                },
                decoration: InputDecoration(
                  hintText: "Mijoz nomi, telefon yoki manzil bo'yicha qidirish...",
                  hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                  prefixIcon: const Icon(LucideIcons.search, size: 16, color: Colors.white54),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(LucideIcons.x, size: 16, color: Colors.white54),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchQuery = "";
                            });
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: AppTheme.cardColor.withOpacity(0.3),
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.accentColor, width: 1),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
                  ),
                ),
              ),
            ),

            // Buyurtmalar ro'yxati
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => context.read<OrdersCubit>().load(),
                child: filteredOrders.isEmpty
                    ? ListView(
                        children: [
                          const SizedBox(height: 120),
                          Center(
                            child: Text(
                              _searchQuery.isNotEmpty
                                  ? "Qidiruv bo'yicha buyurtma topilmadi"
                                  : "Hozircha sizga tayinlangan buyurtma yo'q",
                              style: const TextStyle(color: AppTheme.textSecondary),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredOrders.length,
                        itemBuilder: (context, index) {
                          final order = filteredOrders[index];
                          final statuses = state is OrdersLoaded ? state.statuses : const <OrderStatusInfo>[];
                          return OrderCard(
                            order: order,
                            statuses: statuses,
                          );
                        },
                      ),
              ),
            ),
          ],
        );
      },
    );
  }
}
