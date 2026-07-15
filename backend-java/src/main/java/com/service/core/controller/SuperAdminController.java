package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.RoleSeedService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Faqat SUPERADMIN uchun - barcha kompaniyalar (tenantlar) ustidan platforma darajasidagi
 * boshqaruv. Boshqa hech qanday controller cross-tenant ro'yxat qaytarmaydi - bu yagona,
 * ataylab ochilgan istisno.
 */
@RestController
@RequestMapping("/api/v1/superadmin/companies")
@PreAuthorize("hasRole('SUPERADMIN')")
public class SuperAdminController {

    private static final String ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private final SecureRandom random = new SecureRandom();

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final RoleSeedService roleSeedService;
    private final PasswordEncoder passwordEncoder;

    public SuperAdminController(CompanyRepository companyRepository, UserRepository userRepository,
                                RoleSeedService roleSeedService, PasswordEncoder passwordEncoder) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.roleSeedService = roleSeedService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public ResponseEntity<?> listCompanies() {
        List<Company> companies = companyRepository.findAll();
        return ResponseEntity.ok(companies);
    }

    @PostMapping
    public ResponseEntity<?> createCompany(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String subDomain = request.get("sub_domain");

        if (name == null || name.isBlank() || subDomain == null || subDomain.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kompaniya nomi va subdomain kiritilishi shart"));
        }

        String cleanSubDomain = subDomain.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        if (companyRepository.findBySubDomain(cleanSubDomain).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Ushbu subdomain allaqachon band"));
        }
        if (userRepository.findByUsername(cleanSubDomain + "_admin").isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Admin foydalanuvchi nomi band, boshqa subdomain tanlang"));
        }

        Company company = Company.builder()
                .name(name.trim())
                .subDomain(cleanSubDomain)
                .status("ACTIVE")
                .build();
        Company savedCompany = companyRepository.save(company);

        // Standart rollarni (Admin, Menejer, Haydovchi, Ishchi, Sex hodimi, Dispetcher) yaratish.
        roleSeedService.seedDefaultRolesIfMissing(savedCompany);

        // Kompaniya uchun boshlang'ich ADMIN xodimi - tasodifiy parol bilan, faqat shu javobda ko'rsatiladi.
        String adminUsername = cleanSubDomain + "_admin";
        String generatedPassword = generatePassword();

        User adminUser = User.builder()
                .company(savedCompany)
                .username(adminUsername)
                .password(passwordEncoder.encode(generatedPassword))
                .fullName(name.trim() + " Administrator")
                .role("ADMIN")
                .status("ACTIVE")
                .build();
        userRepository.save(adminUser);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "company", savedCompany,
                "adminUsername", adminUsername,
                "adminPassword", generatedPassword
        ));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> toggleStatus(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        Company company = companyRepository.findById(id).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        String status = request.get("status");
        if (!"ACTIVE".equals(status) && !"BLOCKED".equals(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status ACTIVE yoki BLOCKED bo'lishi shart"));
        }

        company.setStatus(status);
        Company saved = companyRepository.save(company);
        return ResponseEntity.ok(saved);
    }

    private String generatePassword() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            sb.append(ALPHANUMERIC.charAt(random.nextInt(ALPHANUMERIC.length())));
        }
        return sb.toString();
    }
}
