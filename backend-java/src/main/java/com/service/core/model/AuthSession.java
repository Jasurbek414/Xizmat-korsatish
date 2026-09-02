package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bitta qurilmadagi bitta kirish sessiyasi (refresh token).
 *
 * NEGA KERAK: access token o'zi bekor qilinmaydi - imzosi to'g'ri bo'lsa,
 * muddati tugagunicha ishlayveradi. Shuning uchun "o'g'irlangan tokenni
 * to'xtatish" uchun alohida, SERVERDA saqlanadigan va bekor qilinadigan
 * qatlam kerak. Access token qisqa umrli bo'ladi, uzoq muddatli qism esa
 * aynan shu jadvalda yashaydi va istalgan payt o'chirilishi mumkin.
 *
 * XAVFSIZLIK: token QIYMATI saqlanmaydi, faqat SHA-256 hash'i. Bazaga kirish
 * huquqi bo'lgan odam ham tayyor tokenni o'g'irlab ketolmaydi.
 */
@Entity
@Table(name = "auth_sessions", indexes = {
        @Index(name = "idx_auth_sessions_hash", columnList = "token_hash"),
        @Index(name = "idx_auth_sessions_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthSession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Refresh tokenning SHA-256 hash'i (hex). Token qiymatining o'zi emas. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /**
     * Sessiya "oilasi". Rotatsiyada har safar YANGI yozuv yaratiladi, lekin
     * familyId o'zgarmaydi. Eski (allaqachon ishlatilgan) token qayta
     * kelsa - bu o'g'irlik alomati va BUTUN oila bekor qilinadi, ya'ni
     * haqiqiy egasi ham, o'g'ri ham chiqarib yuboriladi.
     */
    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    /** Mijoz generatsiya qilib, doimiy saqlaydigan qurilma identifikatori. */
    @Column(name = "device_id", length = 64)
    private String deviceId;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    /** WEB yoki MOBILE - foydalanuvchiga "qayerdan kirilgan"ni ko'rsatish uchun. */
    @Column(name = "client_type", length = 16)
    private String clientType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Rotatsiyada eskisi, chiqishda yoki o'g'irlik aniqlanganda hammasi. */
    @Column(name = "revoked", nullable = false)
    private boolean revoked;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public boolean isUsable() {
        return !revoked && expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
    }
}
