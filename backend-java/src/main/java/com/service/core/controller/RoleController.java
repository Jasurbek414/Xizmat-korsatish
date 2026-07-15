package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Role;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.RoleRepository;
import com.service.core.service.PermissionKeys;
import com.service.core.service.RoleSeedService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {

    private final RoleRepository roleRepository;
    private final CompanyRepository companyRepository;
    private final RoleSeedService roleSeedService;

    public RoleController(RoleRepository roleRepository, CompanyRepository companyRepository,
                           RoleSeedService roleSeedService) {
        this.roleRepository = roleRepository;
        this.companyRepository = companyRepository;
        this.roleSeedService = roleSeedService;
    }

    @GetMapping("/permission-keys")
    public ResponseEntity<?> getAvailablePermissionKeys() {
        return ResponseEntity.ok(PermissionKeys.ALL);
    }

    @GetMapping
    public ResponseEntity<?> getRoles() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        roleSeedService.seedDefaultRolesIfMissing(company);
        return ResponseEntity.ok(roleRepository.findByCompanyId(companyId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> createRole(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        String nameUz = (String) request.get("name_uz");
        String nameRu = (String) request.get("name_ru");
        String nameEn = (String) request.get("name_en");
        if (nameUz == null || nameRu == null || nameEn == null || nameUz.isBlank() || nameRu.isBlank() || nameEn.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Barcha tillarda rol nomi kiritilishi shart"));
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        String key = "ROLE_" + System.currentTimeMillis();
        Role role = Role.builder()
                .company(company)
                .key(key)
                .nameUz(nameUz.trim())
                .nameRu(nameRu.trim())
                .nameEn(nameEn.trim())
                .isSystem(false)
                .permissions(extractPermissions(request))
                .build();

        Role saved = roleRepository.save(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null || !role.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Rol topilmadi"));
        }
        if (role.isSystem()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Tizim rolini o'zgartirib bo'lmaydi"));
        }

        if (request.containsKey("name_uz")) role.setNameUz((String) request.get("name_uz"));
        if (request.containsKey("name_ru")) role.setNameRu((String) request.get("name_ru"));
        if (request.containsKey("name_en")) role.setNameEn((String) request.get("name_en"));
        if (request.containsKey("permissions")) role.setPermissions(extractPermissions(request));

        Role saved = roleRepository.save(role);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> deleteRole(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null || !role.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Rol topilmadi"));
        }
        if (role.isSystem()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Tizim rolini o'chirib bo'lmaydi"));
        }

        roleRepository.delete(role);
        return ResponseEntity.ok(Map.of("message", "Rol o'chirildi"));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Boolean> extractPermissions(Map<String, Object> request) {
        Object raw = request.get("permissions");
        if (!(raw instanceof Map)) {
            return Map.of();
        }
        Map<String, Object> rawMap = (Map<String, Object>) raw;
        return rawMap.entrySet().stream()
                .filter(e -> PermissionKeys.ALL.contains(e.getKey()))
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> Boolean.TRUE.equals(e.getValue())));
    }
}
