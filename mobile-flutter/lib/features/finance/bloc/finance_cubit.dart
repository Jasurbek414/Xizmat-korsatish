import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../repository/finance_repository.dart';

abstract class FinanceState {}

class FinanceInitial extends FinanceState {}

class FinanceLoading extends FinanceState {}

class FinanceLoaded extends FinanceState {
  final FinanceStats stats;
  FinanceLoaded(this.stats);
}

class FinanceError extends FinanceState {
  final String message;
  FinanceError(this.message);
}

class FinanceCubit extends Cubit<FinanceState> {
  final FinanceRepository _repository;

  FinanceCubit({FinanceRepository? repository})
    : _repository = repository ?? FinanceRepository(),
      super(FinanceInitial());

  Future<void> load() async {
    emit(FinanceLoading());
    try {
      final stats = await _repository.fetchStats();
      emit(FinanceLoaded(stats));
    } on ApiException catch (e) {
      emit(FinanceError(e.message));
    } catch (_) {
      emit(FinanceError("Moliyaviy ma'lumotlarni yuklashda xatolik"));
    }
  }

  Future<void> addTransaction({
    required String type,
    required double amount,
    required String category,
    required String description,
  }) async {
    try {
      await _repository.createTransaction(
        type: type,
        amount: amount,
        category: category,
        description: description,
      );
      await load();
    } on ApiException catch (e) {
      emit(FinanceError(e.message));
    } catch (_) {
      emit(FinanceError("Tranzaksiyani saqlashda xatolik"));
    }
  }
}
