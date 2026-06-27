class Shift {
  final String id;
  final String userId;
  final String clockInTime;
  final String? clockOutTime;
  final double clockInLatitude;
  final double clockInLongitude;
  final double? clockOutLatitude;
  final double? clockOutLongitude;
  final int lateMinutes;
  final bool isActive;

  Shift({
    required this.id,
    required this.userId,
    required this.clockInTime,
    this.clockOutTime,
    required this.clockInLatitude,
    required this.clockInLongitude,
    this.clockOutLatitude,
    this.clockOutLongitude,
    required this.lateMinutes,
    required this.isActive,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      clockInTime: json['clock_in_time'] ?? '',
      clockOutTime: json['clock_out_time'],
      clockInLatitude: (json['clock_in_latitude'] as num?)?.toDouble() ?? 0.0,
      clockInLongitude: (json['clock_in_longitude'] as num?)?.toDouble() ?? 0.0,
      clockOutLatitude: (json['clock_out_latitude'] as num?)?.toDouble(),
      clockOutLongitude: (json['clock_out_longitude'] as num?)?.toDouble(),
      lateMinutes: json['late_minutes'] ?? 0,
      isActive: json['is_active'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'clock_in_time': clockInTime,
      'clock_out_time': clockOutTime,
      'clock_in_latitude': clockInLatitude,
      'clock_in_longitude': clockInLongitude,
      'clock_out_latitude': clockOutLatitude,
      'clock_out_longitude': clockOutLongitude,
      'late_minutes': lateMinutes,
      'is_active': isActive,
    };
  }
}
