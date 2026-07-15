import 'package:flutter/widgets.dart';
import '../../../core/permissions/permission_keys.dart';

/// Dashboard qobig'idagi bitta bo'lim (tab). `permissionKey` `null` bo'lsa,
/// bo'lim rolidan qat'i nazar har doim ko'rinadi (masalan "Bosh sahifa",
/// "Profil"). Aks holda faqat shu ruxsat kaliti yoqilgan rollarga ko'rinadi.
class DashboardModule {
  final String id;
  final String label;
  final IconData icon;
  final String? permissionKey;
  final WidgetBuilder builder;

  const DashboardModule({
    required this.id,
    required this.label,
    required this.icon,
    required this.builder,
    this.permissionKey,
  });

  bool isVisibleFor(Permissions permissions) {
    if (permissionKey == null) return true;
    return permissions.has(permissionKey!);
  }
}
