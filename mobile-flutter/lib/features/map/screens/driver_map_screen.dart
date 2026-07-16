import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../../orders/bloc/orders_cubit.dart';

/// Haydovchining joriy joylashuvi va faol buyurtma mijozining manzilini
/// OpenStreetMap xaritasida ko'rsatadi. Eslatma: bu to'g'ri chiziq (havo
/// yo'nalishi) ko'rsatadi - haqiqiy yo'l marshruti uchun alohida routing
/// server (masalan OSRM) kerak bo'ladi, u hozircha ulanmagan.
class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> {
  latlong.LatLng? _myPosition;
  StreamSubscription<Position>? _positionSub;

  @override
  void initState() {
    super.initState();
    _startLocationUpdates();
  }

  Future<void> _startLocationUpdates() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final requested = await Geolocator.requestPermission();
      if (requested == LocationPermission.denied ||
          requested == LocationPermission.deniedForever) {
        return;
      }
    }

    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,
      ),
    ).listen((position) {
      if (!mounted) return;
      setState(() {
        _myPosition = latlong.LatLng(position.latitude, position.longitude);
      });
    });
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        latlong.LatLng? destination;
        if (state is OrdersLoaded && state.orders.isNotEmpty) {
          final active = state.orders.first;
          if (active.latitude != null && active.longitude != null) {
            destination = latlong.LatLng(active.latitude!, active.longitude!);
          }
        }

        final center = _myPosition ?? destination ?? const latlong.LatLng(41.311081, 69.240562);

        return Stack(
          children: [
            FlutterMap(
              options: MapOptions(initialCenter: center, initialZoom: 14),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.service.core.mobile_flutter',
                ),
                if (_myPosition != null && destination != null)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: [_myPosition!, destination],
                        strokeWidth: 3,
                        color: AppTheme.primaryColor,
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    if (_myPosition != null)
                      Marker(
                        point: _myPosition!,
                        child: const Icon(
                          LucideIcons.navigation,
                          color: AppTheme.primaryColor,
                          size: 32,
                        ),
                      ),
                    if (destination != null)
                      Marker(
                        point: destination,
                        child: const Icon(
                          LucideIcons.mapPin,
                          color: AppTheme.dangerColor,
                          size: 36,
                        ),
                      ),
                  ],
                ),
                const RichAttributionWidget(
                  alignment: AttributionAlignment.bottomLeft,
                  attributions: [
                    TextSourceAttribution('© OpenStreetMap contributors'),
                  ],
                ),
              ],
            ),
            if (_myPosition == null)
              const Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: _LocationBanner(),
              ),
          ],
        );
      },
    );
  }
}

class _LocationBanner extends StatelessWidget {
  const _LocationBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.warningColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.warningColor.withOpacity(0.3)),
      ),
      child: const Row(
        children: [
          Icon(LucideIcons.alertTriangle, color: AppTheme.warningColor, size: 18),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              "Joylashuv aniqlanmoqda... GPS ruxsatini tekshiring.",
              style: TextStyle(color: AppTheme.warningColor, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
