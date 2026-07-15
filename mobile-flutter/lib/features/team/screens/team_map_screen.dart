import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../repository/team_repository.dart';

/// Menejer/dispetcher uchun: barcha faol haydovchilarning joriy joylashuvi.
class TeamMapScreen extends StatelessWidget {
  final List<TeamMember> drivers;
  const TeamMapScreen({super.key, required this.drivers});

  @override
  Widget build(BuildContext context) {
    final withLocation = drivers
        .where((d) => d.latitude != null && d.longitude != null)
        .toList();

    final center = withLocation.isNotEmpty
        ? latlong.LatLng(withLocation.first.latitude!, withLocation.first.longitude!)
        : const latlong.LatLng(41.311081, 69.240562);

    return FlutterMap(
      options: MapOptions(initialCenter: center, initialZoom: 12),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.service.core.mobile_flutter',
        ),
        MarkerLayer(
          markers: withLocation
              .map(
                (d) => Marker(
                  point: latlong.LatLng(d.latitude!, d.longitude!),
                  width: 130,
                  height: 60,
                  child: Column(
                    children: [
                      const Icon(LucideIcons.truck, color: AppTheme.primaryColor, size: 28),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.darkSurface,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          d.fullName,
                          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 10),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}
