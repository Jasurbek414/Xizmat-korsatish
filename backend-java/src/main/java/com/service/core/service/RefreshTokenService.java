package com.service.core.service;

import com.service.core.model.AuthSession;
import com.service.core.model.User;
import com.service.core.repository.AuthSessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Refresh token boshqaruvi: berish, aylantirish (rotatsiya) va bekor qilish.
 *
 * ROTATSIYA: har yangilashda eski token bekor qilinadi va yangisi beriladi.
 * Agar allaqachon ISHLATILGAN token qayta kelsa - demak uni kimdir nusxalab
 * olgan. Bunday holatda butun "oila" bekor qilinadi: haqiqiy foydalanuvchi
 * ham chiqib ketadi (va qayta login qiladi), lekin o'g'ri ham kira olmaydi.
 * Bu tokenni ko'chirib olishning oldini olmaydi - buni umuman iloji yo'q -
 * lekin o'g'irlikni ANIQLAB, oynani yopadi.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Refresh token muddati. Access token bundan ancha qisqa bo'ladi. */
    public static final int REFRESH_DAYS = 30;

    /**
     * Rotatsiyadan keyin shu oynada O'SHA qurilmadan kelgan takror refresh
     * "parallel tab dublikati" deb hisoblanadi, o'g'irlik emas. Qisqa
     * tutilgan - o'g'irlangan token bilan ham shu oynada kirish mumkinligi
     * bu yechimning ongli savdolashuvi (aks holda ikki tabli har bir
     * foydalanuvchi vaqti-vaqti bilan sababsiz chiqarib yuborilardi).
     */
    private static final int ROTATION_GRACE_SECONDS = 30;

    private final AuthSessionRepository sessionRepository;

    public RefreshTokenService(AuthSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    /** Ochiq token qiymati - FAQAT shu yerda va javobda ko'rinadi, bazada emas. */
    public record IssuedToken(String value, AuthSession session) {}

    @Transactional
    public IssuedToken issue(User user, HttpServletRequest request, String deviceId, String clientType) {
        return create(user, UUID.randomUUID(), request, deviceId, clientType);
    }

    /**
     * Yangilash. Token yaroqli bo'lsa - yangisini qaytaradi va eskisini
     * bekor qiladi. Yaroqsiz yoki qayta ishlatilgan bo'lsa - `null`.
     */
    @Transactional
    public IssuedToken rotate(String rawToken, HttpServletRequest request, String deviceId) {
        if (rawToken == null || rawToken.isBlank()) return null;

        AuthSession existing = sessionRepository.findByTokenHash(hash(rawToken)).orElse(null);
        if (existing == null) return null;

        // ALLAQACHON ishlatilgan (rotatsiyada bekor qilingan) token qayta keldi.
        if (existing.isRevoked()) {
            // MUHIM (2026-08-10 auditda topilgan): bu HAR DOIM ham o'g'irlik emas.
            // Veb-panelda IKKI TAB bitta localStorage'dagi bitta refresh tokenni
            // bo'lishadi, lekin har biri alohida JS muhiti - ikkalasi bir vaqtda
            // 401 olsa, ikkinchisi allaqachon aylantirilgan tokenni yuboradi.
            // Avval bu holat "o'g'irlik" deb butun oila yopilardi va foydalanuvchi
            // hech sababsiz login sahifasiga otilardi. (Mobil ilovada bunga qarshi
            // mijoz tomonida himoya bor - api_client.dart'dagi kutish+qayta o'qish -
            // vebda esa tab'lararo bunday sinxronlash yo'q.)
            //
            // Endi rotatsiyadan keyingi QISQA oynada, O'SHA qurilmadan kelgan
            // takror so'rov zararsiz dublikat deb qabul qilinadi va oilaga yangi
            // sessiya ochib beriladi. Oyna tashqarisida yoki boshqa qurilmadan -
            // avvalgidek o'g'irlik rejimi: butun oila yopiladi.
            boolean sameDevice = deviceId == null || existing.getDeviceId() == null
                    || deviceId.equals(existing.getDeviceId());
            boolean withinGrace = existing.getLastUsedAt() != null
                    && existing.getLastUsedAt().isAfter(LocalDateTime.now().minusSeconds(ROTATION_GRACE_SECONDS));
            boolean notExpired = existing.getExpiresAt() != null
                    && existing.getExpiresAt().isAfter(LocalDateTime.now());
            if (sameDevice && withinGrace && notExpired) {
                log.info("Parallel refresh dublikati (grace oynasida) - oila saqlanadi. Foydalanuvchi={}, oila={}",
                        existing.getUser() != null ? existing.getUser().getUsername() : "?", existing.getFamilyId());
                return create(existing.getUser(), existing.getFamilyId(), request,
                        existing.getDeviceId(), existing.getClientType());
            }

            int killed = sessionRepository.revokeFamily(existing.getFamilyId());
            log.warn("Refresh token QAYTA ISHLATILDI (o'g'irlik alomati). Foydalanuvchi={}, oila={}, bekor qilingan sessiyalar={}",
                    existing.getUser() != null ? existing.getUser().getUsername() : "?",
                    existing.getFamilyId(), killed);
            return null;
        }

        if (!existing.isUsable()) return null;

        // Qurilma almashgan bo'lsa ham rad etamiz - token boshqa mashinaga
        // ko'chirilganini ko'rsatadigan eng oddiy va ishonchli belgi.
        if (deviceId != null && existing.getDeviceId() != null
                && !deviceId.equals(existing.getDeviceId())) {
            sessionRepository.revokeFamily(existing.getFamilyId());
            log.warn("Refresh token BOSHQA QURILMADAN keldi. Foydalanuvchi={}, oila={}",
                    existing.getUser() != null ? existing.getUser().getUsername() : "?", existing.getFamilyId());
            return null;
        }

        existing.setRevoked(true);
        existing.setLastUsedAt(LocalDateTime.now());
        sessionRepository.save(existing);

        return create(existing.getUser(), existing.getFamilyId(), request,
                existing.getDeviceId(), existing.getClientType());
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        sessionRepository.findByTokenHash(hash(rawToken)).ifPresent(s -> {
            s.setRevoked(true);
            sessionRepository.save(s);
        });
    }

    @Transactional
    public void revokeAllForUser(UUID userId) {
        sessionRepository.revokeAllForUser(userId);
    }

    @Transactional(readOnly = true)
    public List<AuthSession> activeSessions(UUID userId) {
        return sessionRepository.findByUserIdAndRevokedFalseOrderByLastUsedAtDesc(userId);
    }

    /**
     * Muddati o'tgan sessiyalarni tozalash - aks holda jadval har login uchun
     * bitta qator bilan cheksiz o'sardi (repository'dagi deleteExpired shu
     * paytgacha yozilgan-u, hech qayerdan chaqirilmagan edi). Bekor qilingan
     * lekin muddati tugamagan yozuvlar ATAYIN saqlanadi - qayta ishlatishni
     * (o'g'irlik alomati) aniqlash aynan shu yozuvlarga tayanadi.
     */
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void cleanupExpiredSessions() {
        int removed = sessionRepository.deleteExpired(LocalDateTime.now());
        if (removed > 0) {
            log.info("Muddati o'tgan {} ta auth sessiya tozalandi", removed);
        }
    }

    private IssuedToken create(User user, UUID familyId, HttpServletRequest request,
                               String deviceId, String clientType) {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        AuthSession session = AuthSession.builder()
                .user(user)
                .tokenHash(hash(raw))
                .familyId(familyId)
                .deviceId(deviceId)
                .clientType(clientType)
                .userAgent(trim(header(request, "User-Agent"), 300))
                .ipAddress(trim(clientIp(request), 64))
                .createdAt(LocalDateTime.now())
                .lastUsedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(REFRESH_DAYS))
                .revoked(false)
                .build();

        return new IssuedToken(raw, sessionRepository.save(session));
    }

    /**
     * Haqiqiy mijoz IP'si. Trafik Cloudflare tunnel -> nginx orqali kelgani
     * uchun `getRemoteAddr()` har doim ichki manzilni qaytaradi; nginx esa
     * haqiqiy IP'ni X-Real-IP sarlavhasida uzatadi (proxy-nginx.conf).
     */
    private String clientIp(HttpServletRequest request) {
        String real = header(request, "X-Real-IP");
        if (real != null && !real.isBlank()) return real;
        String fwd = header(request, "X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return request != null ? request.getRemoteAddr() : null;
    }

    private String header(HttpServletRequest request, String name) {
        return request != null ? request.getHeader(name) : null;
    }

    private String trim(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    /** SHA-256, hex. Token qiymati hech qachon bazaga yozilmaydi. */
    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] out = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(out.length * 2);
            for (byte b : out) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 mavjud emas", e);
        }
    }
}
