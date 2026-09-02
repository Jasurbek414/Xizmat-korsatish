package com.service.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:3005}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // MUHIM (audit'da topilgan, jiddiy xato): formLogin/httpBasic
            // yoqilmagani uchun Spring Security'ning standart entry point'i
            // Http403ForbiddenEntryPoint - ya'ni autentifikatsiya UMUMAN
            // yo'q/yaroqsiz bo'lgan har bir so'rovga 401 o'rniga 403 qaytarib
            // kelgan. JwtAuthenticationFilter faqat "foydalanuvchi topilmadi"
            // yoki "faol emas" holatlarida ANIQ 401 yozadi (chunki token
            // haqiqiy - shaxs aniq), lekin ODDIY eskirgan/mavjud bo'lmagan
            // token uchun filtr shunchaki autentifikatsiya qo'ymay o'tkazib
            // yuboradi va keyin shu standart 403 ishga tushadi. Natijada
            // mobil/veb mijozning "faqat 401'da yangila" mantig'i (api_client.dart,
            // services/api.js) hech qachon ishga tushmasdi - 10 kunlik access
            // token muddati tugagach foydalanuvchi ilovada "Authenticated"
            // bo'lib qolaverardi-yu, HAR bir so'rov tushunarsiz "403" bilan
            // qaytardi, avtomatik yangilanish yoki chiqish YO'Q edi.
            .exceptionHandling(handling -> handling.authenticationEntryPoint((request, response, authException) -> {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write(new ObjectMapper().writeValueAsString(
                        Map.of("message", "Sessiya tugagan. Iltimos, qaytadan tizimga kiring.")));
            }))
            .authorizeHttpRequests(auth -> auth
                // /auth/refresh ATAYIN ochiq: uni chaqirish paytida access token
                // allaqachon muddati tugagan bo'ladi, ya'ni "authenticated" talab
                // qilinsa yangilash umuman ishlamasdi. Himoya refresh tokenning
                // o'zida - u serverda (auth_sessions) saqlanadi, rotatsiya
                // qilinadi va istalgan payt bekor qilinadi.
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/subdomain/**",
                                 "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
                // /ws/telephony JWT tekshiruvi Spring Security filter zanjirida emas,
                // TelephonyHandshakeInterceptor'da (WebSocket handshake bosqichida) amalga
                // oshiriladi - shuning uchun bu yerda ham ruxsat berilishi kerak, lekin
                // haqiqiy autentifikatsiya interceptor darajasida majburiy.
                .requestMatchers("/ws/telephony", "/ws/telephony/**").permitAll()
                // MUHIM: DELETE uchun aniq rol nomlari URL darajasida QAYTA tekshirilmaydi -
                // buni endi har bir kontrollerning o'z @PreAuthorize("@perm.has(...)")
                // annotatsiyasi (Rollar va Huquqlar sahifasidagi HAQIQIY ruxsatlar asosida,
                // dinamik) bajaradi. Bu yerda qattiq rol ro'yxati qoldirilsa, u pastdagi
                // dinamik tekshiruvdan OLDIN ishlab, har qanday yangi/moslashtirilgan rolni
                // (masalan Bugalter) "o'lik kod"ga aylantirib qo'yardi (avval shunday bo'lgan).
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        // X-TenantID hali frontend tomonidan yuborilishi mumkin, lekin backend endi uni
        // hech qanday xavfsizlik qaroriga asos sifatida ishlatmaydi (tenant faqat JWT'dan olinadi).
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-TenantID"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
