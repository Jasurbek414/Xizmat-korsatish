import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme.dart';
import '../bloc/team_cubit.dart';
import '../widgets/team_member_tile.dart';
import 'team_map_screen.dart';

/// Menejer/admin uchun jamoa bo'limi: xodimlar ro'yxati va faol
/// haydovchilarning xaritadagi joriy joylashuvi.
class TeamScreen extends StatelessWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => TeamCubit()..load(),
      child: DefaultTabController(
        length: 2,
        child: Column(
          children: [
            const TabBar(
              tabs: [
                Tab(text: 'Xodimlar'),
                Tab(text: 'Xarita'),
              ],
              labelColor: AppTheme.primaryColor,
              unselectedLabelColor: AppTheme.textSecondary,
            ),
            Expanded(
              child: BlocBuilder<TeamCubit, TeamState>(
                builder: (context, state) {
                  if (state is TeamLoading || state is TeamInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state is TeamError) {
                    return Center(
                      child: Text(state.message, style: const TextStyle(color: AppTheme.dangerColor)),
                    );
                  }

                  final loaded = state as TeamLoaded;
                  return TabBarView(
                    children: [
                      RefreshIndicator(
                        onRefresh: () => context.read<TeamCubit>().load(),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: loaded.employees.length,
                          itemBuilder: (context, index) =>
                              TeamMemberTile(member: loaded.employees[index]),
                        ),
                      ),
                      TeamMapScreen(drivers: loaded.activeDrivers),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
