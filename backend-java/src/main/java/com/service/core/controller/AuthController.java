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
    private final com.service.core.repository.RoleRepository roleRepository;
    private final com.service.core.service.RefreshTokenService refreshTokenService;

    public AuthController(CompanyRepository companyRepository, UserRepository userRepository,
                          JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder,
                          com.service.core.repository.RoleRepository roleRepository,
                          com.service.core.service.RefreshTokenService refreshTokenService) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.roleRepository = roleRepository;
        this.refreshTokenService = refreshTokenService;
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
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest,
                                   jakarta.servlet.http.HttpServletRequest httpRequest) {
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

                if (user.getCompany() != null && "BLOCKED".equalsIgnoreCase(user.getCompany().getStatus())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Kompaniya bloklangan. Administrator bilan bog'laning."));
                }

                // MUHIM (2026-08-04 da topilgan): login formasidagi "Kompaniya kodi"
                // maydoni SERVERDA umuman tekshirilmasdi. Foydalanuvchi bir
                // kompaniya kodini kiritib, BOSHQA kompaniya xodimining login-paroli
                // bilan bemalol kirib ketardi. Ma'lumot sizishi bo'lmagan (JWT
                // ichidagi companyId har doim hisobning O'Z kompaniyasidan olinadi,
                // kiritilgan koddan emas), lekin maydon amalda bezak bo'lib
                // qolgandi va foydalanuvchini chalg'itardi.
                //
                // Tekshiruv kod YUBORILGANDA qo'llanadi: eski mijoz ilovalari
                // (kodni yubormaydigan versiyalar) ishlashda davom etsin. Web va
                // mobil ilova endi kodni yuboradi.
                String companyCode = firstNonBlank(
                        loginRequest.get("company_code"),
                        loginRequest.get("companyCode"),
                        loginRequest.get("subdomain"));

                if (companyCode != null) {
                    String actual = user.getCompany() != null ? user.getCompany().getSubDomain() : null;
                    if (actual == null || !actual.trim().equalsIgnoreCase(companyCode.trim())) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                                "message", "Bu hisob boshqa kompaniyaga tegishli. Kompaniya kodini tekshiring."));
                    }
                }

                // MUHIM (2026-08-04): haydovchi / ishchi / sex xodimi VEB PANELGA
                // kira olmasligi kerak. Avval bu tekshiruv faqat LoginPage.jsx
                // ichida, ya'ni MIJOZ tomonida edi - token allaqachon berilib,
                // localStorage'ga yozilgandan keyin ishlardi.
                //
                // Rol NOMI bo'yicha emas, RUXSATLAR bo'yicha tekshiramiz: admin
                // panelida yaratilgan istalgan yangi rol uchun ham to'g'ri
                // ishlashi kerak. Agar rolda birorta ham veb-panel moduli
                // yoqilmagan bo'lsa - bu odam veb panelda umuman ish qila
                // olmaydi, demak uni kiritishning ma'nosi yo'q.
                if (isWebClient(loginRequest.get("client_type")) && !hasAnyWebModule(user)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "message", "Bu hisob faqat mobil ilova uchun. Veb panelga kirish huquqi yo'q."));
                }

                String companyId = user.getCompany() != null ? user.getCompany().getId().toString() : null;
                String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole(), companyId);

                // companyName/companySubDomain - frontend login sahifasida foydalanuvchi
                // qo'lda kiritgan kompaniya kodini HAQIQIY hisobning kompaniyasi bilan
                // taqqoslab, "boshqa kompaniyaga tegishli hisob bilan kirish" holatini
                // aniqlab bergani uchun kerak (bir nechta kompaniya bitta umumiy domenda
                // ishlagani uchun bunday chalkashish xavfi bor).
                // Refresh token: uzoq muddatli qism ENDI serverda saqlanadi va
                // istalgan payt bekor qilinishi mumkin. Javobga QO'SHIMCHA
                // maydon sifatida qo'shiladi - eski mijoz versiyalari uni
                // e'tiborsiz qoldiradi va avvalgidek ishlayveradi.
                var issued = refreshTokenService.issue(
                        user, httpRequest, loginRequest.get("device_id"),
                        isWebClient(loginRequest.get("client_type")) ? "WEB" : "MOBILE");

                return ResponseEntity.ok(Map.of(
                    "token", token,
                    "refreshToken", issued.value(),
                    "refreshExpiresInDays", com.service.core.service.RefreshTokenService.REFRESH_DAYS,
                    "user", Map.of(
                        "id", user.getId().toString(),
                        "username", user.getUsername(),
                        "fullName", user.getFullName(),
                        "phone", user.getPhone() != null ? user.getPhone() : "",
                        "role", user.getRole(),
                        "status", user.getStatus(),
                        "companyName", user.getCompany() != null ? user.getCompany().getName() : "",
                        "companySubDomain", user.getCompany() != null ? user.getCompany().getSubDomain() : ""
                    )
                ));
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi nomi yoki parol xato!"));
    }

    /**
     * Access tokenni yangilash. Mijoz refresh tokenni yuboradi, yangi access
     * token VA yangi refresh token oladi (rotatsiya).
     *
     * Bu endpoint autentifikatsiyasiz ochiq bo'lishi SHART: uni chaqirish
     * paytida access token allaqachon muddati tugagan bo'ladi. Himoya
     * refresh tokenning o'zida - u serverda saqlanadi va bekor qilinadi.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request,
                                     jakarta.servlet.http.HttpServletRequest httpRequest) {
        String raw = firstNonBlank(request.get("refresh_token"), request.get("refreshToken"));
        if (raw == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Refresh token yuborilmadi"));
        }

        var issued = refreshTokenService.rotate(raw, httpRequest, request.get("device_id"));
        if (issued == null) {
            // Yaroqsiz, muddati o'tgan, bekor qilingan yoki QAYTA ISHLATILGAN.
            // Sabab ATAYIN aniqlashtirilmaydi - o'g'riga foydali ma'lumot
            // bermaslik uchun. Mijoz login sahifasiga qaytaradi.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Sessiya tugagan. Iltimos, qaytadan kiring."));
        }

        User user = issued.session().getUser();
        if (user == null || !user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Sessiya tugagan. Iltimos, qaytadan kiring."));
        }

        // MUHIM (2026-08-10 auditda topilgan): login kompaniya BLOCKED holatini
        // tekshiradi, lekin bu yerda tekshirilmasdi - superadmin kompaniyani
        // bloklasa ham, xodimlar refresh orqali 30 kungacha yangi access token
        // olishda davom etardi. Xuddi shu sinf xatosi avval xodim darajasida
        // (JwtAuthenticationFilter'da) topilib tuzatilgan edi - bu uning
        // kompaniya darajasidagi ekvivalenti.
        if (user.getCompany() != null && "BLOCKED".equalsIgnoreCase(user.getCompany().getStatus())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Sessiya tugagan. Iltimos, qaytadan kiring."));
        }

        // MUHIM (audit'da topilgan): login paytida isWebClient(...) &&
        // !hasAnyWebModule(user) tekshiriladi, lekin /refresh buni QAYTA
        // tekshirmasdi - administrator biror rolning "web_login"ini
        // o'chirsa ham, o'sha rolda allaqachon ochiq turgan brauzer sahifasi
        // hech qachon /login ga qaytmagani uchun REFRESH_DAYS (30 kun)
        // davomida yangi access token olishda davom etardi. Sessiya
        // yaratilganda saqlangan clientType (issue()/rotate()da "WEB"/
        // "MOBILE" deb yozilgan) orqali - bu yerda ham xuddi login bilan bir
        // xil qoidani qo'llaymiz.
        if ("WEB".equalsIgnoreCase(issued.session().getClientType()) && !hasAnyWebModule(user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Sessiya tugagan. Iltimos, qaytadan kiring."));
        }

        String companyId = user.getCompany() != null ? user.getCompany().getId().toString() : null;
        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole(), companyId);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "refreshToken", issued.value()
        ));
    }

    /** Chiqish - refresh tokenni serverda bekor qiladi (shu qurilma uchun). */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> request) {
        if (request != null) {
            refreshTokenService.revoke(firstNonBlank(request.get("refresh_token"), request.get("refreshToken")));
        }
        return ResponseEntity.ok(Map.of("message", "Chiqildi"));
    }

    /**
     * So'rov veb paneldan kelganmi? Mijoz `client_type: "WEB"` yuboradi.
     *
     * Mobil ilova bu maydonni yubormaydi (yoki "MOBILE" yuboradi), shuning
     * uchun haydovchilar ilovaga avvalgidek kiraveradi. Eski veb versiyalari
     * ham maydonsiz yuboradi - ular blokdan o'tib ketmasligi uchun web
     * frontend darhol yangilanadi (bu tekshiruv ish siyosati, kriptografik
     * chegara emas).
     */
    private boolean isWebClient(String clientType) {
        return clientType != null && "WEB".equalsIgnoreCase(clientType.trim());
    }

    /**
     * Foydalanuvchining rolida kamida bitta VEB-PANEL moduli yoqilganmi.
     * Mobil kalitlar (`mobile_*`) va alohida amallar hisobga olinmaydi -
     * ular veb panelda hech qanday bo'lim ochmaydi.
     */
    private boolean hasAnyWebModule(User user) {
        // SUPERADMIN kompaniya rollari jadvalida bo'lmaydi (va ko'pincha
        // hech qanday kompaniyaga bog'lanmagan), lekin veb panel aynan
        // unga kerak - kompaniya tekshiruvidan OLDIN alohida o'tkazamiz.
        if (user.getRole() != null && "SUPERADMIN".equalsIgnoreCase(user.getRole())) return true;

        if (user.getCompany() == null || user.getRole() == null) return false;

        var role = roleRepository.findByCompanyIdAndKey(user.getCompany().getId(), user.getRole()).orElse(null);
        if (role == null || role.getPermissions() == null) return false;

        // Asosiy manba - "Rollar va Huquqlar" bo'limidagi `web_login` kaliti.
        // Administrator uni har bir rol uchun o'zi yoqib/o'chirib qo'yadi.
        Boolean explicit = role.getPermissions().get(com.service.core.service.PermissionKeys.WEB_LOGIN);
        if (explicit != null) {
            return explicit;
        }

        // ZAXIRA YO'L (migratsiya xavfsizligi): `web_login` kaliti YANGI, shuning
        // uchun bazadagi eski rollarning saqlangan xaritasida u UMUMAN yo'q.
        // Agar bunda darhol "false" desak, administrator ham o'z panelidan
        // qulflanib qolardi va uni ochishning yo'li qolmasdi. Kalit hali
        // yozilmagan bo'lsa - eski xatti-harakat: veb-panel moduli bo'lsa,
        // kirishga ruxsat. Administrator rolni bir marta saqlagach, kalit
        // aniq yoziladi va yuqoridagi shart ishlay boshlaydi.
        for (String key : java.util.List.of(
                com.service.core.service.PermissionKeys.CLIENTS,
                com.service.core.service.PermissionKeys.EMPLOYEES,
                com.service.core.service.PermissionKeys.ORDERS,
                com.service.core.service.PermissionKeys.FINANCE,
                com.service.core.service.PermissionKeys.SALARIES,
                com.service.core.service.PermissionKeys.SETTINGS,
                com.service.core.service.PermissionKeys.MAP,
                com.service.core.service.PermissionKeys.TELEPHONY)) {
            if (Boolean.TRUE.equals(role.getPermissions().get(key))) return true;
        }
        return false;
    }

    /**
     * Bir nechta mumkin bo'lgan maydon nomidan birinchi to'ldirilganini qaytaradi.
     * Kompaniya kodi mijozlarda turlicha nomlanadi (web `company_code`, eski
     * mobil versiyalarda `subdomain`), shuning uchun hammasi qabul qilinadi.
     */
    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) {
                return v;
            }
        }
        return null;
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
        // MUHIM (audit'da topilgan, xavfsizlik): EmployeeController.resetPassword'dagi
        // bilan bir xil sabab - agar parol o'g'irlangan sessiyaga javoban
        // o'zgartirilayotgan bo'lsa, o'g'irlangan refresh token bekor
        // qilinmasa yana 30 kun o'zini yangilashda davom etardi. Joriy
        // brauzer/qurilma o'z access tokeni muddati tugagunicha ishlayveradi,
        // lekin keyingi safar /refresh chaqirganda qayta login talab qilinadi.
        refreshTokenService.revokeAllForUser(user.getId());
        return ResponseEntity.ok(Map.of("message", "Parol muvaffaqiyatli o'zgartirildi"));
    }
}
