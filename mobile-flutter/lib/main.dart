import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/network/api_client.dart';
import 'core/services/update_checker.dart';
import 'core/services/update_dialog.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme.dart';
import 'core/theme_notifier.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/main_dashboard.dart';
import 'features/management/management_dashboard.dart';
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

  // Faqat konfiguratsiyani ro'yxatdan o'tkazadi (arzon, native chaqiruv
  // qilmaydi) - xizmatni haqiqatan ISHGA TUSHIRISH endi FAQAT foydalanuvchi
  // ShiftToggleButton'da ONLINE bosganda sodir bo'ladi (quyida avtomatik
  // warmUp/tiklash ATAYLAB olib tashlangan - sababi shu faylning pastki
  // qismidagi izohda tushuntirilgan).
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

  // `Navigator` ostidagi ekrandan qat'i nazar (login, haydovchi, admin)
  // yangilanish oynasini ko'rsatish uchun - alohida BuildContext'ga
  // bog'lanib qolmaslik uchun global kalit ishlatiladi.
  static final _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _authBloc = AuthBloc()..add(AppStartedEvent());
    ApiClient.onUnauthorized = () => _authBloc.add(LogoutEvent());

    // Push orqali "APP_UPDATE" xabari kelganda ham xuddi shu tekshiruvni
    // qayta ishga tushiramiz - superadmin yangi versiya chiqarganda
    // xodimlarga darhol bildirishnoma yuborishi mumkin.
    PushNotificationService.onAppUpdateReceived = () => _checkForUpdate();

    // Ilova ochilishning O'ZIDA (login qilinmagan bo'lsa ham) tekshiradi -
    // bir kadr kutamiz, aks holda birinchi build tugamasdan Navigator
    // hali tayyor bo'lmaydi.
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
  }

  Future<void> _checkForUpdate() async {
    final info = await UpdateChecker.check();
    if (info == null) return;
    final ctx = _navigatorKey.currentContext;
    if (ctx == null || !ctx.mounted) return;
    await showUpdateDialog(ctx, info);
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
            navigatorKey: _navigatorKey,
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
          // MUHIM: fon GPS xizmatiga tegishli HECH QANDAY chaqiruv (warmUp
          // ham, avvalgi ONLINE holatini tiklash ham) endi login/ilova
          // ochilishida AVTOMATIK ishlamaydi - bu ilovani har safar ochilishda
          // yiqilib qolishiga sabab bo'lgan edi. Xizmat FAQAT foydalanuvchi
          // ShiftToggleButton'ni qo'lda bosganda ishga tushadi (u o'zi
          // kerak bo'lsa startService() chaqiradi). Bu haqiqiy sababni
          // (native darajadagi yiqilish) to'liq tashxis qilmasdan qayta
          // yoqmaslik kerak.
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

          // BOSHQARUV rollari (ADMIN, MENEJER va admin panelida yaratilgan
          // istalgan boshqaruv roli) alohida interfeysga yo'naltiriladi.
          //
          // Tekshiruv rol NOMIGA emas, RUXSATLARGA qarab: `clients`,
          // `employees`, `finance`, `salaries`, `settings` kabi admin-panel
          // modullaridan kamida bittasi yoqilgan bo'lsa - bu boshqaruvchi.
          // Shu sabab admin panelida yangi rol (masalan "Bo'lim boshlig'i")
          // yaratilsa, mobil ilova kodini o'zgartirmasdan to'g'ri interfeys
          // beradi.
          //
          // MUHIM: haydovchi, ishchi va sex xodimida bu kalitlarning birortasi
          // ham yo'q (RoleSeedService'da faqat `mobile_*` beriladi), shuning
          // uchun ular AVVALGIDEK [MainDashboard]ga tushadi - ularning
          // interfeysi umuman o'zgarmadi.
          if (state.permissions.hasAnyManagementModule) {
            return ManagementDashboard(user: user, permissions: state.permissions);
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
