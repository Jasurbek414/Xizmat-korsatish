package com.service.core.util;

/**
 * Ikki koordinata orasidagi masofani (metrda) Haversine formulasi bo'yicha
 * hisoblaydi - Yer sharining egriligini hisobga oladi (oddiy Pifagor
 * masofasidan farqli, uzoq masofalarda aniqroq). Safar (DriverTrip)
 * kuzatuvida haydovchi korxona markazidan qanchalik uzoqlashganini va
 * bosib o'tgan yo'l uzunligini hisoblash uchun ishlatiladi.
 */
public final class GeoUtils {

    private static final double EARTH_RADIUS_METERS = 6371000;

    private GeoUtils() {
    }

    public static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }
}
