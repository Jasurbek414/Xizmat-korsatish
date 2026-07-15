import '../../../core/network/api_client.dart';

class TeamMember {
  final String id;
  final String fullName;
  final String phone;
  final String role;
  final String status;
  final double? latitude;
  final double? longitude;

  TeamMember({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.role,
    required this.status,
    this.latitude,
    this.longitude,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      id: json['id'] ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }
}

class TeamRepository {
  final ApiClient _api;

  TeamRepository({ApiClient? api}) : _api = api ?? ApiClient();

  Future<List<TeamMember>> fetchEmployees() async {
    final data = await _api.get('/employees') as List;
    return data.cast<Map<String, dynamic>>().map(TeamMember.fromJson).toList();
  }

  Future<List<TeamMember>> fetchActiveDrivers() async {
    final data = await _api.get('/gps/drivers') as List;
    return data.cast<Map<String, dynamic>>().map(TeamMember.fromJson).toList();
  }
}
