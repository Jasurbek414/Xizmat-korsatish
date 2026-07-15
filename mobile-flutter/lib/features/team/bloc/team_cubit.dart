import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../repository/team_repository.dart';

abstract class TeamState {}

class TeamInitial extends TeamState {}

class TeamLoading extends TeamState {}

class TeamLoaded extends TeamState {
  final List<TeamMember> employees;
  final List<TeamMember> activeDrivers;
  TeamLoaded({required this.employees, required this.activeDrivers});
}

class TeamError extends TeamState {
  final String message;
  TeamError(this.message);
}

class TeamCubit extends Cubit<TeamState> {
  final TeamRepository _repository;

  TeamCubit({TeamRepository? repository})
    : _repository = repository ?? TeamRepository(),
      super(TeamInitial());

  Future<void> load() async {
    emit(TeamLoading());
    try {
      final results = await Future.wait([
        _repository.fetchEmployees(),
        _repository.fetchActiveDrivers(),
      ]);
      emit(TeamLoaded(employees: results[0], activeDrivers: results[1]));
    } on ApiException catch (e) {
      emit(TeamError(e.message));
    } catch (_) {
      emit(TeamError("Jamoa ma'lumotlarini yuklashda xatolik"));
    }
  }
}
