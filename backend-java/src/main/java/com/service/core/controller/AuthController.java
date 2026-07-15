package com.service.core.controller;

import com.service.core.config.JwtTokenProvider;
import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthController(CompanyRepository companyRepository, UserRepository userRepository,
                          JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/subdomain/{subdomain}")
    public ResponseEntity<?> checkSubdomain(@PathVariable String subdomain) {
        Optional<Company> companyOpt = companyRepository.findBySubDomain(subdomain.trim().toLowerCase());
        if (companyOpt.isPresent()) {
            Company company = companyOpt.get();
            return ResponseEntity.ok(Map.of(
                "id", company.getId().toString(),
                "name", company.getName(),
                "subDomain", company.getSubDomain(),
                "status", company.getStatus()
            ));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Kompaniya kodi topilmadi. Qaytadan urinib ko'ring."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Foydalanuvchi nomi va parol yuborilishi shart"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (verifyAndMigratePassword(user, password)) {
                if (!user.isEnabled()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Foydalanuvchi hisobi faol emas"));
                }

                String companyId = user.getCompany() != null ? user.getCompany().getId().toString() : null;
                String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole(), companyId);

                return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", Map.of(
                        "id", user.getId().toString(),
                        "username", user.getUsername(),
                        "fullName", user.getFullName(),
                        "phone", user.getPhone() != null ? user.getPhone() : "",
                        "role", user.getRole(),
                        "status", user.getStatus()
                    )
                ));
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi nomi yoki parol xato!"));
    }

    /**
     * Eski (BCrypt'dan oldingi) ma'lumotlar bazasida ba'zi foydalanuvchi parollari ochiq matnda
     * saqlangan bo'lishi mumkin. BCrypt hash'lar har doim "$2" bilan boshlanadi, shuning uchun
     * shu belgi bo'yicha ikki holatni ajratamiz va muvaffaqiyatli oddiy-matn login'dan so'ng
     * parolni darhol qayta BCrypt bilan hash qilib saqlaymiz.
     */
    private boolean verifyAndMigratePassword(User user, String rawPassword) {
        String stored = user.getPassword();
        if (stored != null && stored.startsWith("$2")) {
            return passwordEncoder.matches(rawPassword, stored);
        }

        boolean legacyMatch = stored != null && stored.equals(rawPassword);
        if (legacyMatch) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
        return legacyMatch;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return ResponseEntity.ok(Map.of(
                "id", user.getId().toString(),
                "username", user.getUsername(),
                "fullName", user.getFullName(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "role", user.getRole(),
                "status", user.getStatus(),
                "companyId", user.getCompany() != null ? user.getCompany().getId().toString() : ""
            ));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
    }

    @PutMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@RequestBody Map<String, String> request) {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String token = request.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token kiritilishi shart"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        User user = userOpt.get();
        user.setFcmToken(token.trim());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "FCM token saqlandi"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Joriy va yangi parollar kiritilishi shart"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Joriy parol noto'g'ri"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Parol muvaffaqiyatli o'zgartirildi"));
    }
}
