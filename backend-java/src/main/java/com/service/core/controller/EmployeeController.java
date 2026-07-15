package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.RoleRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private static final List<String> NON_ASSIGNABLE_ROLES = List.of("SUPERADMIN");

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeController(UserRepository userRepository, CompanyRepository companyRepository,
                               RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Rol qiymati SUPERADMIN bo'lmasligi (API orqali imtiyoz ko'tarishning oldini olish) va
     * shu kompaniyada haqiqatan mavjud bo'lgan rolga ishora qilishi shart.
     */
    private String validateAssignableRole(String tenantId, String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        String normalized = role.trim().toUpperCase();
        if (NON_ASSIGNABLE_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("Bu rolni tayinlash mumkin emas");
        }
        boolean exists = roleRepository.existsByCompanyIdAndKey(UUID.fromString(tenantId), normalized);
        if (!exists) {
            throw new IllegalArgumentException("Ko'rsatilgan rol ushbu kompaniyada topilmadi");
        }
        return normalized;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> getEmployees() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<User> employees = userRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/drivers")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> getDrivers() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<User> drivers = userRepository.findByCompanyIdAndRole(UUID.fromString(tenantId), "WORKER_DRIVER");
        return ResponseEntity.ok(drivers);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> createEmployee(@RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String username = request.get("username");
        String password = request.get("password");
        String fullName = request.get("full_name");
        String phone = request.get("phone");
        String role = request.get("role");

        if (username == null || password == null || fullName == null || role == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Barcha majburiy maydonlarni to'ldiring"));
        }

        if (userRepository.findByUsername(username.trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Foydalanuvchi nomi allaqachon mavjud"));
        }

        String validatedRole;
        try {
            validatedRole = validateAssignableRole(tenantId, role);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        String salaryStr = request.get("salary");
        String salaryType = request.get("salary_type");

        User employee = User.builder()
                .company(company)
                .username(username.trim())
                .password(passwordEncoder.encode(password))
                .fullName(fullName.trim())
                .phone(phone)
                .role(validatedRole)
                .status("ACTIVE")
                .salary(salaryStr != null && !salaryStr.trim().isEmpty() ? Double.parseDouble(salaryStr.trim()) : null)
                .salaryType(salaryType != null && !salaryType.trim().isEmpty() ? salaryType.trim().toUpperCase() : null)
                .build();

        User saved = userRepository.save(employee);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> updateEmployee(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User employee = userRepository.findById(id).orElse(null);
        if (employee == null || !employee.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xodim topilmadi"));
        }

        if (request.containsKey("username")) employee.setUsername(request.get("username").trim());
        if (request.containsKey("full_name")) employee.setFullName(request.get("full_name").trim());
        if (request.containsKey("phone")) employee.setPhone(request.get("phone"));
        if (request.containsKey("role")) {
            try {
                employee.setRole(validateAssignableRole(tenantId, request.get("role")));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
            }
        }
        if (request.containsKey("status")) employee.setStatus(request.get("status").toUpperCase());
        if (request.containsKey("salary")) {
            String s = request.get("salary");
            employee.setSalary(s != null && !s.trim().isEmpty() ? Double.parseDouble(s.trim()) : null);
        }
        if (request.containsKey("salary_type")) {
            String s = request.get("salary_type");
            employee.setSalaryType(s != null && !s.trim().isEmpty() ? s.trim().toUpperCase() : null);
        }

        User saved = userRepository.save(employee);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> deleteEmployee(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User employee = userRepository.findById(id).orElse(null);
        if (employee == null || !employee.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xodim topilmadi"));
        }

        userRepository.delete(employee);
        return ResponseEntity.ok(Map.of("message", "Xodim muvaffaqiyatli o'chirildi"));
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> resetPassword(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String password = request.get("password");
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Yangi parol kiritilishi shart"));
        }

        User employee = userRepository.findById(id).orElse(null);
        if (employee == null || !employee.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xodim topilmadi"));
        }

        employee.setPassword(passwordEncoder.encode(password.trim()));
        userRepository.save(employee);
        return ResponseEntity.ok(Map.of("message", "Parol muvaffaqiyatli o'zgartirildi"));
    }
}
