import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/permissions/permission_keys.dart';
import '../../../models/user.dart';
import '../repository/auth_repository.dart';

// --- Events ---
abstract class AuthEvent {}

class AppStartedEvent extends AuthEvent {}

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
  final String companyId;
  final String companyName;
  SubdomainValid({
    required this.subdomain,
    required this.companyId,
    required this.companyName,
  });
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
  final Permissions permissions;
  Authenticated({
    required this.user,
    required this.token,
    required this.subdomain,
    required this.permissions,
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
  final AuthRepository _repository;

  AuthBloc({AuthRepository? repository})
    : _repository = repository ?? AuthRepository(),
      super(AuthInitial()) {
    on<AppStartedEvent>(_onAppStarted);
    on<CheckSubdomainEvent>(_onCheckSubdomain);
    on<LoginWithCredentialsEvent>(_onLoginWithCredentials);
    on<ResetSubdomainEvent>((event, emit) => emit(Unauthenticated(subdomain: null)));
    on<LogoutEvent>(_onLogout);
  }

  Future<void> _onAppStarted(AppStartedEvent event, Emitter<AuthState> emit) async {
    final restored = await _repository.restoreSession();
    if (restored != null) {
      emit(
        Authenticated(
          user: restored.user,
          token: restored.token,
          subdomain: '',
          permissions: restored.permissions,
        ),
      );
    } else {
      final subdomain = await _repository.readSavedSubdomain();
      if (subdomain != null && subdomain.isNotEmpty) {
        try {
          final info = await _repository.checkSubdomain(subdomain);
          if (info.status == 'ACTIVE') {
            emit(
              SubdomainValid(
                subdomain: info.subdomain,
                companyId: info.companyId,
                companyName: info.companyName,
              ),
            );
            return;
          }
        } catch (_) {}
      }
      emit(Unauthenticated(subdomain: null));
    }
  }

  Future<void> _onCheckSubdomain(
    CheckSubdomainEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(SubdomainChecking());
    final subdomain = event.subdomain.trim().toLowerCase();

    try {
      final info = await _repository.checkSubdomain(subdomain);
      if (info.status != 'ACTIVE') {
        emit(SubdomainInvalid("Ushbu kompaniya hisobi faol emas."));
        return;
      }
      emit(
        SubdomainValid(
          subdomain: info.subdomain,
          companyId: info.companyId,
          companyName: info.companyName,
        ),
      );
    } on ApiException catch (e) {
      emit(SubdomainInvalid(e.message));
    } catch (_) {
      emit(SubdomainInvalid("Kompaniya kodini tekshirishda xatolik yuz berdi."));
    }
  }

  Future<void> _onLoginWithCredentials(
    LoginWithCredentialsEvent event,
    Emitter<AuthState> emit,
  ) async {
    final currentState = state;
    if (currentState is! SubdomainValid) {
      emit(AuthError('Avval kompaniya kodini kiriting!'));
      return;
    }

    emit(AuthLoading());
    try {
      final result = await _repository.login(
        username: event.username.trim(),
        password: event.password,
        subdomain: currentState.subdomain,
        companyId: currentState.companyId,
      );

      emit(
        Authenticated(
          user: result.user,
          token: result.token,
          subdomain: currentState.subdomain,
          permissions: result.permissions,
        ),
      );
    } on ApiException catch (e) {
      emit(AuthError(e.message));
      emit(currentState);
    } catch (_) {
      emit(AuthError("Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring."));
      emit(currentState);
    }
  }

  Future<void> _onLogout(LogoutEvent event, Emitter<AuthState> emit) async {
    await _repository.logout();
    final subdomain = await _repository.readSavedSubdomain();
    if (subdomain != null && subdomain.isNotEmpty) {
      try {
        final info = await _repository.checkSubdomain(subdomain);
        if (info.status == 'ACTIVE') {
          emit(
            SubdomainValid(
              subdomain: info.subdomain,
              companyId: info.companyId,
              companyName: info.companyName,
            ),
          );
          return;
        }
      } catch (_) {}
    }
    emit(Unauthenticated(subdomain: null));
  }
}
