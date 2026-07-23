import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/network/api_client.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme.dart';
import 'core/theme_notifier.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/main_dashboard.dart';
import 'features/gps/services/background_gps_service.dart';
import 'features/notifications/services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();

  // Saqlangan tema holatini tiklaymiz
  final storage = SecureStorageService();
  final saved = await storage.readThemeMode();
  if (saved != null) {
    isDarkMode.value = saved;
  }

  await BackgroundGpsService.initialize();
  await PushNotificationService.initialize();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final AuthBloc _authBloc;

  @override
  void initState() {
    super.initState();
    _authBloc = AuthBloc()..add(AppStartedEvent());
    ApiClient.onUnauthorized = () => _authBloc.add(LogoutEvent());
  }

  @override
  void dispose() {
    _authBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _authBloc,
      child: ValueListenableBuilder<bool>(
        valueListenable: isDarkMode,
        builder: (context, dark, _) {
          return MaterialApp(
            title: 'ServiceCore Mobile Console',
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: dark ? ThemeMode.dark : ThemeMode.light,
            debugShowCheckedModeBanner: false,
            home: const AppNavigator(),
          );
        },
      ),
    );
  }
}

class AppNavigator extends StatelessWidget {
  const AppNavigator({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is Authenticated) {
          PushNotificationService.registerTokenWithBackend();
        }
      },
      builder: (context, state) {
        if (state is Authenticated) {
          final user = state.user;

          if (user.role == 'SUPERADMIN') {
            return const Scaffold(
              body: Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    "SUPERADMIN roli uchun mobil ilova mavjud emas.\n"
                    "Iltimos, veb-admin panelidan foydalaning.",
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            );
          }

          return MainDashboard(user: user, permissions: state.permissions);
        }

        if (state is AuthInitial) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        return const LoginScreen();
      },
    );
  }
}
