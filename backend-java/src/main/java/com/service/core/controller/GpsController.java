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

        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Save log record
            GpsLog log = GpsLog.builder()
                    .company(user.getCompany())
                    .user(user)
                    .latitude(latitude)
                    .longitude(longitude)
                    .build();
            gpsLogRepository.save(log);

            // Update user current position
            user.setLatitude(latitude);
            user.setLongitude(longitude);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "GPS log saved successfully"));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not found"));
    }

    @GetMapping("/drivers")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
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
