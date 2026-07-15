/// Backenddan kelgan yoki tarmoq darajasidagi xatoliklarni foydalanuvchiga
/// tushunarli xabar bilan qayta ifodalaydi.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}
