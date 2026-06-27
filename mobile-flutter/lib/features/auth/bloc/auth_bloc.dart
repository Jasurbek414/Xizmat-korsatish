import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../models/user.dart';

// --- Events ---
abstract class AuthEvent {}

class CheckSubdomainEvent extends AuthEvent {
  final String subdomain;
  CheckSubdomainEvent(this.subdomain);
}

class LoginWithCredentialsEvent extends AuthEvent {
  final String username;
  final String password;
  LoginWithCredentialsEvent({required this.username, required this.password});
}

class ResetSubdomainEvent extends AuthEvent {}

class LogoutEvent extends AuthEvent {}

// --- States ---
abstract class AuthState {}

class AuthInitial extends AuthState {}

class SubdomainChecking extends AuthState {}

class SubdomainValid extends AuthState {
  final String subdomain;
  final String companyName;
  SubdomainValid({required this.subdomain, required this.companyName});
}

class SubdomainInvalid extends AuthState {
  final String message;
  SubdomainInvalid(this.message);
}

class AuthLoading extends AuthState {}

class Authenticated extends AuthState {
  final User user;
  final String token;
  final String subdomain;
  Authenticated({
    required this.user,
    required this.token,
    required this.subdomain,
  });
}

class Unauthenticated extends AuthState {
  final String? subdomain;
  Unauthenticated({this.subdomain});
}

class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
}

// --- BLoC ---
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc() : super(AuthInitial()) {
    on<CheckSubdomainEvent>((event, emit) async {
      emit(SubdomainChecking());
      await Future.delayed(const Duration(seconds: 1)); // Simulate API Check

      final cleanSub = event.subdomain.trim().toLowerCase();
      // Mock validation: only allows "expressmail" or "cleanshine"
      if (cleanSub == 'expressmail') {
        emit(
          SubdomainValid(
            subdomain: cleanSub,
            companyName: 'Express Mail Tashkent',
          ),
        );
      } else if (cleanSub == 'cleanshine') {
        emit(
          SubdomainValid(subdomain: cleanSub, companyName: 'Clean & Shine LLC'),
        );
      } else {
        emit(
          SubdomainInvalid(
            'Kompaniya kodi topilmadi. Qaytadan urinib ko\'ring.',
          ),
        );
      }
    });

    on<LoginWithCredentialsEvent>((event, emit) async {
      final currentState = state;
      if (currentState is! SubdomainValid) {
        emit(AuthError('Avval kompaniya kodini kiriting!'));
        return;
      }

      emit(AuthLoading());
      await Future.delayed(const Duration(seconds: 1)); // Simulate API Call

      final username = event.username.trim();
      final password = event.password;

      // Mock Credentials validating depending on role:
      // admin, manager, driver, worker
      if (password == 'admin') {
        User? user;
        if (username == 'admin') {
          user = User(
            id: 'u_admin',
            companyId: 'c1',
            username: 'admin',
            fullName: 'Asosiy Administrator',
            phone: '+998 99 999 99 99',
            role: 'ADMIN',
            status: 'ACTIVE',
            baseSalary: 12000000,
            kpiBonusPercent: 5,
          );
        } else if (username == 'manager') {
          user = User(
            id: 'u_manager',
            companyId: 'c1',
            username: 'manager',
            fullName: 'Aziza Qodirova',
            phone: '+998 90 456 78 90',
            role: 'MANAGER',
            status: 'ACTIVE',
            baseSalary: 8000000,
            kpiBonusPercent: 2,
          );
        } else if (username == 'driver' || username == 'driver1') {
          user = User(
            id: 'u1',
            companyId: 'c1',
            username: 'driver1',
            fullName: 'Alisher Qodirov',
            phone: '+998 90 123 45 67',
            role: 'WORKER_DRIVER',
            status: 'ACTIVE',
            baseSalary: 3000000,
            kpiBonusPercent: 10,
          );
        } else if (username == 'worker') {
          user = User(
            id: 'u_seh',
            companyId: 'c1',
            username: 'worker',
            fullName: 'Doston Axmedov',
            phone: '+998 93 111 22 33',
            role: 'WORKER_SEH',
            status: 'ACTIVE',
            baseSalary: 4500000,
            kpiBonusPercent: 3,
          );
        }

        if (user != null) {
          emit(
            Authenticated(
              user: user,
              token: 'mock_jwt_token_for_${user.username}',
              subdomain: currentState.subdomain,
            ),
          );
        } else {
          emit(AuthError('Foydalanuvchi nomi yoki parol xato!'));
          emit(currentState); // Return to credential form
        }
      } else {
        emit(AuthError('Foydalanuvchi nomi yoki parol xato!'));
        emit(currentState); // Return to credential form
      }
    });

    on<ResetSubdomainEvent>((event, emit) {
      emit(AuthInitial());
    });

    on<LogoutEvent>((event, emit) {
      emit(Unauthenticated());
    });
  }
}
