import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/network/api_client.dart';
import 'core/theme.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/main_dashboard.dart';
import 'features/gps/services/background_gps_service.dart';
import 'features/notifications/services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
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
    // Token muddati tugab, server 401 qaytarsa - qaysi repository so'ragan
    // bo'lishidan qat'i nazar, foydalanuvchini avtomatik chiqarib yuboramiz.
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
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is Authenticated) {
          // FCM tokenini backend'ga ro'yxatdan o'tkazish - shu qurilmaga
          // push bildirishnoma yuborish uchun kerak.
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

          // Barcha qolgan rollar (standart yoki admin panelida yaratilgan
          // maxsus rollar) uchun bitta umumiy dashboard - qaysi bo'limlar
          // ko'rinishi faqat backend'dan kelgan ruxsatlarga bog'liq.
          return MainDashboard(user: user, permissions: state.permissions);
        }

        if (state is AuthInitial) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        // Default to login screen
        return const LoginScreen();
      },
    );
  }
}
