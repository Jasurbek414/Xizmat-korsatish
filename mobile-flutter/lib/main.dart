import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/theme.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/admin_dashboard.dart';
import 'features/dashboard/screens/manager_dashboard.dart';
import 'features/dashboard/screens/driver_dashboard.dart';
import 'features/dashboard/screens/workshop_dashboard.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => AuthBloc(),
      child: MaterialApp(
        title: 'ServiceCore Mobile Console',
        theme: AppTheme.darkTheme,
        debugShowCheckedModeBanner: false,
        home: const AppNavigator(),
      ),
    );
  }
}

class AppNavigator extends StatelessWidget {
  const AppNavigator({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is Authenticated) {
          final user = state.user;
          // Routing depending on the role
          switch (user.role) {
            case 'ADMIN':
              return AdminDashboard(user: user);
            case 'MANAGER':
              return ManagerDashboard(user: user);
            case 'WORKER_SEH':
              return WorkshopDashboard(user: user);
            case 'WORKER_DRIVER':
            default:
              return DriverDashboard(user: user);
          }
        }

        // Default to login screen
        return const LoginScreen();
      },
    );
  }
}
