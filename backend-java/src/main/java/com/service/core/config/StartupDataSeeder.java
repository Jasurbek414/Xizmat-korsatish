package com.service.core.config;

import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.RoleSeedService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Ilova ishga tushganda:
 * 1) hali "roles" jadvalida hech qanday yozuvga ega bo'lmagan (masalan, ushbu funksiya
 *    qo'shilishidan oldin yaratilgan) kompaniyalarga standart rollarni avtomatik yaratib beradi;
 * 2) agar tizimda birorta ham SUPERADMIN foydalanuvchisi bo'lmasa, bitta boshlang'ich
 *    hisobni tasodifiy parol bilan yaratadi (parol faqat shu safar konsolga chiqariladi -
 *    Spring Security'ning o'zi ham default parolni xuddi shunday e'lon qiladi).
 */
@Component
public class StartupDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupDataSeeder.class);
    private static final String ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final RoleSeedService roleSeedService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public StartupDataSeeder(CompanyRepository companyRepository, UserRepository userRepository,
                              RoleSeedService roleSeedService, PasswordEncoder passwordEncoder) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.roleSeedService = roleSeedService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        companyRepository.findAll().forEach(company -> {
            try {
                roleSeedService.seedDefaultRolesIfMissing(company);
            } catch (Exception e) {
                log.error("Kompaniya {} uchun standart rollarni yaratishda xatolik: {}", company.getId(), e.getMessage());
            }
        });

        seedSuperAdminIfMissing();
    }

    private void seedSuperAdminIfMissing() {
        boolean hasSuperAdmin = userRepository.findByUsername("superadmin").isPresent();
        if (hasSuperAdmin) {
            return;
        }

        String generatedPassword = generatePassword();
        User superAdmin = User.builder()
                .company(null)
                .username("superadmin")
                .password(passwordEncoder.encode(generatedPassword))
                .fullName("Platform Super Administrator")
                .role("SUPERADMIN")
                .status("ACTIVE")
                .build();
        userRepository.save(superAdmin);

        log.warn("======================================================================");
        log.warn("Boshlang'ich SUPERADMIN hisobi yaratildi.");
        log.warn("Foydalanuvchi nomi: superadmin");
        log.warn("Parol: {}", generatedPassword);
        log.warn("Bu parol faqat shu safar ko'rsatiladi - darhol tizimga kirib, o'zgartiring.");
        log.warn("======================================================================");
    }

    private String generatePassword() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            sb.append(ALPHANUMERIC.charAt(random.nextInt(ALPHANUMERIC.length())));
        }
        return sb.toString();
    }
}
