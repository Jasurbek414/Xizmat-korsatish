package com.service.core.controller;

import com.service.core.model.GpsLog;
import com.service.core.model.User;
import com.service.core.repository.GpsLogRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gps")
public class GpsController {

    private final GpsLogRepository gpsLogRepository;
    private final UserRepository userRepository;

    public GpsController(GpsLogRepository gpsLogRepository, UserRepository userRepository) {
        this.gpsLogRepository = gpsLogRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/log")
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

            // Foydalanuvchining "joriy joylashuvi" faqat shu nuqta oldingi
            // saqlangan joylashuvdan KEYINGI bo'lsagina yangilanadi - aks holda
            // tarmoq tiklangach ketma-ket yuborilgan eski (kechikkan) nuqtalar
            // yangiroq/haqiqiy joriy joylashuvni ortga qaytarib qo'yishi mumkin edi.
            if (user.getLastLocationAt() == null || recordedAt.isAfter(user.getLastLocationAt())) {
                user.setLatitude(latitude);
                user.setLongitude(longitude);
                user.setLastLocationAt(recordedAt);
                userRepository.save(user);
            }

            return ResponseEntity.ok(Map.of("message", "GPS log saved successfully"));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not found"));
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
