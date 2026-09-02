package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.AppNotificationRepository;
import com.service.core.repository.AuthSessionRepository;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.RoleRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.RefreshTokenService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
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
    private final AuthSessionRepository authSessionRepository;
    private final AppNotificationRepository appNotificationRepository;
    private final RefreshTokenService refreshTokenService;

    public EmployeeController(UserRepository userRepository, CompanyRepository companyRepository,
                               RoleRepository roleRepository, PasswordEncoder passwordEncoder,
                               AuthSessionRepository authSessionRepository,
                               AppNotificationRepository appNotificationRepository,
                               RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authSessionRepository = authSessionRepository;
        this.appNotificationRepository = appNotificationRepository;
        this.refreshTokenService = refreshTokenService;
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof String username)) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }

    /**
     * Rol qiymati SUPERADMIN bo'lmasligi (API orqali imtiyoz ko'tarishning oldini olish) va
     * shu kompaniyada haqiqatan mavjud bo'lgan rolga ishora qilishi shart.
     *
     * MUHIM (KRITIK, audit'da topilgan xato, tuzatildi): avval faqat
     * "SUPERADMIN" bloklanardi - "ADMIN" (kompaniya ichida BARCHA huquqqa
     * ega rol) ni tayinlashga hech qanday to'sqinlik yo'q edi. Bu
     * 'employees' ruxsati standart holatda MENEJER roliga ham berilgani
     * (RoleSeedService.managerPermissions()) sabab - istalgan Menejer
     * o'zini (yoki boshqa xodimni) PUT /employees/{id} orqali to'g'ridan
     * to'g'ri ADMIN qilib qo'ya olar edi (to'liq imtiyoz ko'tarish). Endi
     * ADMIN rolini FAQAT allaqachon ADMIN bo'lgan foydalanuvchi tayinlashi
     * mumkin.
     */
    private String validateAssignableRole(String tenantId, String role, User currentUser) {
        if (role == null || role.isBlank()) {
            return null;
        }
        String normalized = role.trim().toUpperCase();
        if (NON_ASSIGNABLE_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("Bu rolni tayinlash mumkin emas");
        }
        if ("ADMIN".equals(normalized) && (currentUser == null || !"ADMIN".equals(currentUser.getRole()))) {
            throw new IllegalArgumentException("Faqat administrator ADMIN rolini tayinlashi mumkin");
        }
        boolean exists = roleRepository.existsByCompanyIdAndKey(UUID.fromString(tenantId), normalized);
        if (!exists) {
            throw new IllegalArgumentException("Ko'rsatilgan rol ushbu kompaniyada topilmadi");
        }
        return normalized;
    }

    /**
     * MUHIM (KRITIK, audit'da topilgan xato, tuzatildi): ADMIN hisobini
     * o'zgartirish/o'chirish/parolini tiklash faqat boshqa ADMIN'ga
     * ruxsat etiladi - aks holda Menejer (yoki 'employees' huquqiga ega
     * istalgan boshqa rol) ADMIN'ning parolini almashtirib hisobini
     * egallab olishi yoki uni o'chirib yuborishi mumkin edi.
     */
    private boolean canModifyTarget(User target, User currentUser) {
        if (!"ADMIN".equals(target.getRole())) {
            return true;
        }
        return currentUser != null && "ADMIN".equals(currentUser.getRole());
    }

    // MUHIM (audit'da topilgan xato, tuzatildi): avval faqat 'employees'
    // (veb-admin) ruxsati tekshirilardi - mobil "Jamoa" ekrani (TeamCubit)
    // ham aynan shu endpoint'ni chaqiradi, lekin mobil rollarga hech qachon
    // 'employees' berilmaydi (faqat 'mobile_team_view') - natijada "Jamoa"
    // bo'limi mobil_team_view huquqi berilgan xodimlar uchun ham doim 403
    // bilan ishlamas edi. 'salaries' ham qo'shildi - Buxgalter (faqat
    // 'salaries' huquqiga ega) davomat belgilash uchun xodimlar ro'yxatini
    // ko'ra olishi kerak (Oyliklar > Davomat oynasi).
    @GetMapping
    @PreAuthorize("@perm.has('employees','mobile_team_view','salaries')")
    public ResponseEntity<?> getEmployees() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<User> employees = userRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/drivers")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> getDrivers() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<User> drivers = userRepository.findByCompanyIdAndRole(UUID.fromString(tenantId), "WORKER_DRIVER");
        return ResponseEntity.ok(drivers);
    }

    @PostMapping
    @PreAuthorize("@perm.has('employees')")
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
            validatedRole = validateAssignableRole(tenantId, role, getCurrentUser());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        String salaryStr = request.get("salary");
        String salaryType = request.get("salary_type");
        String hireDateStr = request.get("hire_date");
        LocalDate hireDate;
        try {
            hireDate = (hireDateStr != null && !hireDateStr.trim().isEmpty()) ? LocalDate.parse(hireDateStr.trim()) : null;
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "hire_date formati noto'g'ri (YYYY-MM-DD kutilgan)"));
        }

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
                .hireDate(hireDate)
                .build();

        User saved = userRepository.save(employee);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('employees')")
    public ResponseEntity<?> updateEmployee(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User employee = userRepository.findById(id).orElse(null);
        if (employee == null || !employee.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xodim topilmadi"));
        }

        User currentUser = getCurrentUser();
        if (!canModifyTarget(employee, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Faqat administrator boshqa administratorni o'zgartira oladi"));
        }

        if (request.containsKey("username")) {
            String newUsername = request.get("username").trim();
            // Username butun tizim bo'ylab unikal (users.username unique constraint) -
            // oldindan tekshirmasak, boshqa foydalanuvchining nomi kiritilganda
            // DB constraint xatosi 500 sifatida qaytardi.
            if (!newUsername.equalsIgnoreCase(employee.getUsername())
                    && userRepository.findByUsername(newUsername).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Foydalanuvchi nomi allaqachon mavjud"));
            }
            employee.setUsername(newUsername);
        }
        if (request.containsKey("full_name")) employee.setFullName(request.get("full_name").trim());
        if (request.containsKey("phone")) employee.setPhone(request.get("phone"));
        if (request.containsKey("role")) {
            try {
                employee.setRole(validateAssignableRole(tenantId, request.get("role"), currentUser));
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
        if (request.containsKey("hire_date")) {
            String s = request.get("hire_date");
            try {
                employee.setHireDate(s != null && !s.trim().isEmpty() ? LocalDate.parse(s.trim()) : null);
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "hire_date formati noto'g'ri (YYYY-MM-DD kutilgan)"));
            }
        }

        User saved = userRepository.save(employee);
        return ResponseEntity.ok(saved);
    }

    // MUHIM (audit'da topilgan): auth_sessions va app_notifications
    // jadvallari user_id'ga NOT NULL FK bilan bog'langan, cascade'siz. Login
    // qilgan (auth_sessions yozuvi bor) YOKI kamida bitta bildirishnoma
    // olgan HAR bir xodimni o'chirishga urinish avval DataIntegrityViolationException
    // bilan barbod bo'lardi - bu deyarli HAR bir xodim, chunki bildirishnoma
    // yozuvi buyurtma biriktirilganda ham yaratiladi. @Transactional - uch
    // o'chirish amali BIR yaxlit tranzaksiyada bo'lishi kerak.
    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('employees')")
    @Transactional
    public ResponseEntity<?> deleteEmployee(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User employee = userRepository.findById(id).orElse(null);
        if (employee == null || !employee.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xodim topilmadi"));
        }

        if (!canModifyTarget(employee, getCurrentUser())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Faqat administrator boshqa administratorni o'chira oladi"));
        }

        authSessionRepository.deleteByUserId(id);
        appNotificationRepository.deleteByUserId(id);
        userRepository.delete(employee);
        return ResponseEntity.ok(Map.of("message", "Xodim muvaffaqiyatli o'chirildi"));
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("@perm.has('employees')")
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

        if (!canModifyTarget(employee, getCurrentUser())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Faqat administrator boshqa administratorning parolini tiklashi mumkin"));
        }

        employee.setPassword(passwordEncoder.encode(password.trim()));
        userRepository.save(employee);
        // MUHIM (audit'da topilgan, xavfsizlik): RefreshTokenService.revokeAllForUser
        // mavjud edi, lekin hech qayerdan chaqirilmasdi. Parol admin tomonidan
        // shubhali holat sabab (masalan qurilma o'g'irlangan) tiklansa, eski
        // refresh token 30 kun davomida hamon o'zini yangilab, yangi access
        // token olishda davom etardi - parolni tiklash amalda hech narsani
        // to'xtatmasdi.
        refreshTokenService.revokeAllForUser(id);
        return ResponseEntity.ok(Map.of("message", "Parol muvaffaqiyatli o'zgartirildi"));
    }
}
