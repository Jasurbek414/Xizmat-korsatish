package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.DriverTrip;
import com.service.core.model.GpsLog;
import com.service.core.model.User;
import com.service.core.repository.DriverTripRepository;
import com.service.core.repository.GpsLogRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.telephony.GpsWebSocketHandler;
import com.service.core.tenant.TenantContext;
import com.service.core.util.GeoUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gps")
public class GpsController {

    // Foydalanuvchi bilan kelishilgan chegara: haydovchi korxona markazidan
    // shuncha metrdan uzoqlashsa, safar (DriverTrip) AVTOMATIK boshlanadi;
    // shu radiusga qaytib kirsa - yakunlanadi. GPS noaniqligi (odatda
    // 10-30m) bilan solishtirganda ishonchli, lekin haydovchi haqiqatan
    // uzoqlashganda tezkor ishga tushadigan o'rtacha qiymat.
    private static final double TRIP_RADIUS_METERS = 150.0;

    private final GpsLogRepository gpsLogRepository;
    private final UserRepository userRepository;
    private final DriverTripRepository driverTripRepository;
    private final GpsWebSocketHandler gpsWebSocketHandler;

    public GpsController(GpsLogRepository gpsLogRepository, UserRepository userRepository,
                          DriverTripRepository driverTripRepository, GpsWebSocketHandler gpsWebSocketHandler) {
        this.gpsLogRepository = gpsLogRepository;
        this.userRepository = userRepository;
        this.driverTripRepository = driverTripRepository;
        this.gpsWebSocketHandler = gpsWebSocketHandler;
    }

    // MUHIM (audit'da topilgan): bu endpoint hech qanday @PreAuthorize'siz
    // edi - JWT talab qilinardi (SecurityConfig'dagi umumiy
    // ".anyRequest().authenticated()"), lekin ANIQ 'mobile_gps' huquqi
    // tekshirilmasdi. O'zga foydalanuvchi joylashuvini soxtalashtirib
    // bo'lmasdi (username tokendan olinadi, so'rov tanasidan emas), lekin
    // GPS kuzatuvga umuman ega bo'lmasligi kerak bo'lgan rol (masalan
    // Bugalter) ham o'z joylashuvini yozib, Jamoa xaritasida ko'rinishi
    // mumkin edi - qolgan barcha yozuv endpointlari kabi mos ruxsat talab
    // qilinishi kerak.
    @PostMapping("/log")
    @PreAuthorize("@perm.has('mobile_gps')")
    public ResponseEntity<?> logCoordinates(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Object latObj = request.get("latitude");
        Object lngObj = request.get("longitude");

        if (latObj == null || lngObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Latitude and Longitude are required"));
        }

        Double latitude = Double.parseDouble(latObj.toString());
        Double longitude = Double.parseDouble(lngObj.toString());

        // Mobil ilova nuqta HAQIQATDA qachon o'lchanganini ham yuboradi (oflayn
        // navbatdan keyinroq yuborilgan eski nuqtalar uchun muhim - aks holda
        // ular "hozirgi joylashuv" deb noto'g'ri qabul qilinardi). Yubormasa
        // yoki eski ilova versiyasi bo'lsa - "hozir" deb hisoblaymiz.
        LocalDateTime recordedAt = parseTimestamp(request.get("timestamp"));

        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Save log record - tarixiy iz sifatida har doim saqlanadi.
            GpsLog log = GpsLog.builder()
                    .company(user.getCompany())
                    .user(user)
                    .latitude(latitude)
                    .longitude(longitude)
                    .createdAt(recordedAt)
                    .build();
            gpsLogRepository.save(log);

            // Markazdan chiqib-kirish (safar) kuzatuvi - GPS o'zi bilan bir
            // qatorda, ATAYIN shu yerda (har bir nuqta yozilgandan keyin,
            // bir xil tranzaksiya doirasida) ishlaydi.
            handleTripTracking(user, log, latitude, longitude, recordedAt);

            // Foydalanuvchining "joriy joylashuvi" faqat shu nuqta oldingi
            // saqlangan joylashuvdan KEYINGI bo'lsagina yangilanadi - aks holda
            // tarmoq tiklangach ketma-ket yuborilgan eski (kechikkan) nuqtalar
            // yangiroq/haqiqiy joriy joylashuvni ortga qaytarib qo'yishi mumkin edi.
            if (user.getLastLocationAt() == null || recordedAt.isAfter(user.getLastLocationAt())) {
                user.setLatitude(latitude);
                user.setLongitude(longitude);
                user.setLastLocationAt(recordedAt);
                userRepository.save(user);

                // Real vaqt: xaritani ochib turgan adminlarga DARHOL yuboriladi -
                // foydalanuvchi so'rovi bo'yicha ("bir soniya ham farq qilmasin"),
                // veb-sahifa endi 6s so'rov navbatini kutmaydi. Faqat HAQIQATDA
                // yangi (eski/kechikkan emas) nuqta uchun - yuqoridagi shart bilan
                // bir xil.
                if (user.getCompany() != null) {
                    gpsWebSocketHandler.broadcastGpsUpdate(
                            user.getCompany().getId(), user.getId(), latitude, longitude, recordedAt);
                }
            }

            return ResponseEntity.ok(Map.of("message", "GPS log saved successfully"));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not found"));
    }

    /**
     * Haydovchi korxona markazidan {@link #TRIP_RADIUS_METERS} dan uzoqroqda
     * bo'lsa - faol safarni davom ettiradi (yoki yangisini boshlaydi), shu
     * safarga tegishli GPS nuqtalari orasidagi masofani DriverTrip.distanceMeters
     * ga qo'shib boradi. Markaz ichiga qaytsa - faol safar (agar bo'lsa)
     * yakunlanadi. Korxona markazi hali belgilanmagan bo'lsa (Company.latitude
     * null) - hech narsa qilinmaydi, oddiy GPS jurnali baribir saqlanadi.
     */
    private void handleTripTracking(User user, GpsLog gpsLog, double lat, double lng, LocalDateTime recordedAt) {
        Company company = user.getCompany();
        if (company == null || company.getLatitude() == null || company.getLongitude() == null) {
            return;
        }

        double distanceFromCenter = GeoUtils.distanceMeters(company.getLatitude(), company.getLongitude(), lat, lng);
        Optional<DriverTrip> activeTripOpt = driverTripRepository.findByUserIdAndEndedAtIsNull(user.getId());

        if (distanceFromCenter > TRIP_RADIUS_METERS) {
            DriverTrip trip = activeTripOpt.orElseGet(() -> DriverTrip.builder()
                    .company(company)
                    .user(user)
                    .startedAt(recordedAt)
                    .distanceMeters(0.0)
                    .build());
            addSegmentDistance(trip, lat, lng);
            driverTripRepository.save(trip);
            gpsLog.setTrip(trip);
            gpsLogRepository.save(gpsLog);
        } else if (activeTripOpt.isPresent()) {
            // Markazga qaytdi - oxirgi (qaytish) nuqtasigacha bo'lgan
            // masofani ham qo'shib, safarni yakunlaymiz.
            DriverTrip trip = activeTripOpt.get();
            addSegmentDistance(trip, lat, lng);
            trip.setEndedAt(recordedAt);
            driverTripRepository.save(trip);
            gpsLog.setTrip(trip);
            gpsLogRepository.save(gpsLog);
        }
        // else: markaz ichida va faol safar yo'q - odatiy holat, hech narsa qilinmaydi.
    }

    /** Safarning ENG OXIRGI nuqtasidan yangi nuqtagacha bo'lgan masofani trip.distanceMeters ga qo'shadi. */
    private void addSegmentDistance(DriverTrip trip, double lat, double lng) {
        if (trip.getId() == null) return; // hali saqlanmagan (yangi safar) - oldingi nuqta yo'q
        gpsLogRepository.findTopByTripIdOrderByCreatedAtDesc(trip.getId()).ifPresent(lastPoint -> {
            double segment = GeoUtils.distanceMeters(lastPoint.getLatitude(), lastPoint.getLongitude(), lat, lng);
            trip.setDistanceMeters(trip.getDistanceMeters() + segment);
        });
    }

    // MUHIM: driverId'ning HAQIQATDA joriy kompaniyaga tegishli ekanini
    // tekshiramiz - aks holda boshqa kompaniyaning haydovchi ID'sini bilib
    // olgan admin uning safarlar tarixini ko'rib olishi mumkin edi (IDOR).
    @GetMapping("/trips")
    @PreAuthorize("@perm.has('map','settings')")
    public ResponseEntity<?> getDriverTrips(@RequestParam UUID driverId) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        User driver = userRepository.findById(driverId).orElse(null);
        if (driver == null || driver.getCompany() == null
                || !driver.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Haydovchi topilmadi"));
        }

        List<DriverTrip> trips = driverTripRepository.findByUserIdOrderByStartedAtDesc(driverId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (DriverTrip t : trips) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("startedAt", t.getStartedAt());
            m.put("endedAt", t.getEndedAt());
            m.put("distanceMeters", t.getDistanceMeters());
            m.put("durationSeconds", t.getEndedAt() == null
                    ? Duration.between(t.getStartedAt(), LocalDateTime.now()).getSeconds()
                    : Duration.between(t.getStartedAt(), t.getEndedAt()).getSeconds());
            m.put("active", t.getEndedAt() == null);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/trips/{tripId}/path")
    @PreAuthorize("@perm.has('map','settings')")
    public ResponseEntity<?> getTripPath(@PathVariable UUID tripId) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        DriverTrip trip = driverTripRepository.findByIdAndCompanyId(tripId, UUID.fromString(tenantId)).orElse(null);
        if (trip == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Safar topilmadi"));
        }

        List<GpsLog> points = gpsLogRepository.findByTripIdOrderByCreatedAtAsc(tripId);
        List<Map<String, Object>> path = new ArrayList<>();
        for (GpsLog p : points) {
            Map<String, Object> m = new HashMap<>();
            m.put("latitude", p.getLatitude());
            m.put("longitude", p.getLongitude());
            m.put("createdAt", p.getCreatedAt());
            path.add(m);
        }
        return ResponseEntity.ok(path);
    }

    private LocalDateTime parseTimestamp(Object raw) {
        if (raw == null) {
            return LocalDateTime.now();
        }
        String value = raw.toString();
        try {
            // Dart `DateTime.toIso8601String()` UTC bo'lsa "Z" bilan tugaydi.
            return LocalDateTime.ofInstant(Instant.parse(value), ZoneId.systemDefault());
        } catch (Exception ignoredUtcParse) {
            try {
                // Zonasiz (naive) ISO-8601 format bo'lsa.
                return LocalDateTime.parse(value);
            } catch (Exception ignoredLocalParse) {
                return LocalDateTime.now();
            }
        }
    }

    // MUHIM (audit'da topilgan xato, tuzatildi): avval faqat 'map' (veb-admin
    // xaritasi) ruxsati tekshirilardi - mobil "Jamoa" ekrani (TeamCubit)
    // ham aynan shu endpoint'ni chaqiradi, lekin mobil rollarga hech qachon
    // 'map' berilmaydi (faqat 'mobile_team_view') - natijada "Jamoa"
    // bo'limidagi onlayn haydovchilar ro'yxati doim 403 bilan ishlamas edi.
    @GetMapping("/drivers")
    @PreAuthorize("@perm.has('map','mobile_team_view')")
    public ResponseEntity<?> getActiveDrivers() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        // Return latest active kuryer drivers list within company
        List<User> drivers = userRepository.findByCompanyIdAndRole(UUID.fromString(tenantId), "WORKER_DRIVER");
        return ResponseEntity.ok(drivers);
    }
}
