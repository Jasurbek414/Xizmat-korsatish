import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../repository/team_repository.dart';

/// Menejer/dispetcher uchun: barcha faol haydovchilarning joriy joylashuvi.
class TeamMapScreen extends StatelessWidget {
  final List<TeamMember> drivers;

  /// Belgi (marker) bosilganda chaqiriladi - tafsilot panelini ochish uchun.
  /// `null` bo'lsa belgilar oddiy ko'rinishda qoladi (eski xatti-harakat).
  final void Function(TeamMember)? onDriverTap;

  const TeamMapScreen({super.key, required this.drivers, this.onDriverTap});

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
                (d) {
                  // Uzoq vaqt (2 daqiqadan ortiq) signal kelmagan haydovchi
                  // xaritada hozir HAQIQATDA o'sha yerda ekaniga ishonch
                  // bo'lmagani uchun kulrang/xira ko'rsatiladi.
                  final stale = d.isLocationStale;
                  final markerColor = stale ? AppTheme.textSecondary : AppTheme.primaryColor;
                  return Marker(
                    point: latlong.LatLng(d.latitude!, d.longitude!),
                    width: 130,
                    height: 60,
                    child: GestureDetector(
                    onTap: onDriverTap == null ? null : () => onDriverTap!(d),
                    child: Column(
                      children: [
                        Icon(LucideIcons.truck, color: markerColor, size: 28),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            // ATAYLAB tema-mustaqil (har doim OQ): bu xarita
                            // ustidagi yorliq (marker label) - agar tungi
                            // rejimda matn/fon boshqa joylardagi kabi
                            // avtomatik almashsa, xarita plitkalari (har doim
                            // yorug') ustida qorong'i matn o'qib bo'lmay
                            // qoladi. Shu sabab quyidagi matn rangi ham
                            // ATAYLAB qattiq (AppTheme.textPrimary/Secondary)
                            // qoldirilgan - ikkalasi bir-biriga mos kelishi shart.
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(6),
                            border: stale ? Border.all(color: AppTheme.textSecondary.withOpacity(0.5)) : null,
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                d.fullName,
                                style: TextStyle(
                                  color: stale ? AppTheme.textSecondary : AppTheme.textPrimary,
                                  fontSize: 10,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (stale)
                                const Text(
                                  'aloqa uzilgan',
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 8, fontStyle: FontStyle.italic),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    ),
                  );
                },
              )
              .toList(),
        ),
        const RichAttributionWidget(
          alignment: AttributionAlignment.bottomLeft,
          attributions: [
            TextSourceAttribution('© OpenStreetMap contributors'),
          ],
        ),
      ],
    );
  }
}
