package com.service.core.config;

import com.service.core.model.Company;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, CompanyRepository companyRepository,
                                   UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.validateToken(token)) {
                    String username = jwtTokenProvider.getUsername(token);
                    String role = jwtTokenProvider.getRole(token);
                    String companyId = jwtTokenProvider.getCompanyId(token);

                    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        // Tenant tokeni bloklangan kompaniyaga tegishli bo'lsa - eski token
                        // hali muddati o'tmagan bo'lsa ham darhol rad etiladi (faqat login
                        // paytida emas, HAR bir so'rovda tekshiriladi).
                        if (companyId != null && !companyId.trim().isEmpty() && isCompanyBlocked(companyId)) {
                            writeBlockedResponse(response);
                            return;
                        }

                        // MUHIM (jonli holatda topilgan xato, tuzatildi): JWT'ning "sub"
                        // maydonida O'ZGARUVCHI foydalanuvchi nomi saqlanadi. Admin panelda
                        // xodimning login nomi o'zgartirilsa (yoki xodim o'chirilsa), o'sha
                        // odamning brauzeridagi token IMZO JIHATIDAN hamon YAROQLI qoladi -
                        // lekin endi mavjud bo'lmagan nomni ko'rsatadi. Natijada
                        // PermissionService.has() foydalanuvchini topolmay "false" qaytarardi
                        // va HAR BIR so'rov 403 "Sizda bu amalni bajarish uchun huquq yo'q"
                        // bilan tugardi. Bu xabar butunlay chalg'ituvchi edi: haqiqiy sabab
                        // ruxsat emas, YAROQSIZ SESSIYA edi - foydalanuvchi esa huquqlarni va
                        // parolni qayta-qayta tekshirib vaqt yo'qotardi (aynan shunday bo'lgan:
                        // parolni tiklash 6 marta 403 bergan). Bundan tashqari frontend 403'da
                        // hech qanday chora ko'rmagani uchun foydalanuvchi shu holatda abadiy
                        // qamalib qolardi - chiqishning yagona yo'li qo'lda logout edi.
                        // Endi aniq 401 qaytaramiz: frontend buni tushunib avtomatik
                        // login sahifasiga qaytaradi.
                        var userOpt = userRepository.findByUsername(username);
                        if (userOpt.isEmpty()) {
                            writeInvalidSessionResponse(response);
                            return;
                        }

                        // MUHIM (xavfsizlik auditida topilgan, 2026-08-03): AuthController
                        // login paytida user.getStatus() ni tekshiradi ("Foydalanuvchi hisobi
                        // faol emas"), lekin bu filtr tekshirmasdi. Natijada admin panelda
                        // xodim BLOKLANSA ham, uning brauzeridagi/telefonidagi eski token
                        // imzo jihatidan yaroqli bo'lgani uchun 10 KUN (token muddati)
                        // davomida ishlayverardi - ya'ni "bloklash" tugmasi amalda darhol
                        // kuchga kirmasdi. Ishdan bo'shatilgan xodim shu muddat ichida
                        // buyurtmalarni, mijoz bazasini va moliyani ko'rishda davom etardi.
                        // Endi kompaniya blokirovkasi bilan bir xil tarzda HAR bir so'rovda
                        // tekshiriladi.
                        String userStatus = userOpt.get().getStatus();
                        if (userStatus != null && !"ACTIVE".equalsIgnoreCase(userStatus)) {
                            writeInactiveUserResponse(response);
                            return;
                        }

                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);

                        // Set Tenant ID automatically from JWT to prevent tampering
                        if (companyId != null && !companyId.trim().isEmpty()) {
                            TenantContext.setCurrentTenant(companyId);
                        }
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            // Tomcat qayta ishlatadigan thread'larda tenant ma'lumoti keyingi so'rovga
            // sizib qolmasligi uchun har doim tozalanadi.
            TenantContext.clear();
        }
    }

    private boolean isCompanyBlocked(String companyId) {
        try {
            Company company = companyRepository.findById(UUID.fromString(companyId)).orElse(null);
            return company != null && "BLOCKED".equalsIgnoreCase(company.getStatus());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private void writeBlockedResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(
            Map.of("message", "Kompaniya bloklangan. Administrator bilan bog'laning.")
        ));
    }

    // ATAYIN 401 (403 emas): 403 "sen kimsan bilaman, lekin bu amalga huquqing
    // yo'q" degani - bu holatda esa aksincha, tokendagi shaxs endi umuman
    // mavjud emas. 401 semantik jihatdan to'g'ri va frontend'ning avtomatik
    // logout mantig'i (services/api.js) aynan shu kodga tayanadi.
    // Bloklangan/faol bo'lmagan xodim. 401 (403 emas) - sabab yuqoridagi
    // writeInvalidSessionResponse izohi bilan bir xil: frontend'ning avtomatik
    // logout mantig'i shu kodga tayanadi, aks holda xodim tushunarsiz 403 bilan
    // ekranda qamalib qolardi.
    private void writeInactiveUserResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(
            Map.of("message", "Foydalanuvchi hisobi faol emas. Administrator bilan bog'laning.")
        ));
    }

    private void writeInvalidSessionResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(
            Map.of("message", "Sessiya yaroqsiz (foydalanuvchi nomi o'zgargan yoki hisob o'chirilgan). "
                + "Iltimos, qaytadan tizimga kiring.")
        ));
    }
}
