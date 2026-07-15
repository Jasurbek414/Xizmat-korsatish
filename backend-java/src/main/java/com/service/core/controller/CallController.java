package com.service.core.controller;

import com.service.core.model.Call;
import com.service.core.model.Client;
import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.CallRepository;
import com.service.core.repository.ClientRepository;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/calls")
public class CallController {

    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final CompanyRepository companyRepository;

    public CallController(CallRepository callRepository, UserRepository userRepository,
                          ClientRepository clientRepository, CompanyRepository companyRepository) {
        this.callRepository = callRepository;
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getCalls() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<Call> calls = callRepository.findByCompanyId(UUID.fromString(tenantId));
        List<Map<String, Object>> mapped = calls.stream().map(c -> {
            // Safe helper to avoid mapping issues
            java.util.HashMap<String, Object> map = new java.util.HashMap<>();
            map.put("id", c.getId());
            map.put("direction", c.getDirection());
            map.put("duration", c.getDuration());
            map.put("recording_url", c.getRecordingUrl() != null ? c.getRecordingUrl() : "");
            map.put("created_at", c.getCreatedAt());
            map.put("dispatcher_name", c.getDispatcher() != null ? c.getDispatcher().getFullName() : "Noma'lum");
            map.put("client_name", c.getClient() != null ? c.getClient().getFullName() : "Noma'lum");
            map.put("client_phone", c.getClient() != null ? c.getClient().getPhone() : "");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(mapped);
    }

    @PostMapping
    public ResponseEntity<?> createCall(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyUuid = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyUuid)
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        String dispatcherIdStr = (String) request.get("dispatcher_id");
        String clientPhone = (String) request.get("client_phone");
        String direction = (String) request.get("direction"); // INBOUND, OUTBOUND
        Object durationObj = request.get("duration");
        String recordingUrl = (String) request.get("recording_url");

        User dispatcher = null;
        if (dispatcherIdStr != null) {
            try {
                dispatcher = userRepository.findById(UUID.fromString(dispatcherIdStr)).orElse(null);
            } catch (Exception e) {
                // Ignore
            }
        }

        Client client = null;
        if (clientPhone != null && !clientPhone.trim().isEmpty()) {
            client = clientRepository.findByCompanyIdAndPhone(companyUuid, clientPhone.trim()).orElse(null);
        }

        Integer duration = 0;
        if (durationObj != null) {
            try {
                duration = Integer.parseInt(durationObj.toString());
            } catch (Exception e) {
                // Ignore
            }
        }

        Call call = Call.builder()
                .company(company)
                .dispatcher(dispatcher)
                .client(client)
                .direction(direction != null ? direction.toUpperCase() : "OUTBOUND")
                .duration(duration)
                .recordingUrl(recordingUrl)
                .build();

        Call saved = callRepository.save(call);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
