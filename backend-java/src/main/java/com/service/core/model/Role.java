package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Har bir kompaniya o'z rollarini (nomi va ruxsatlarini) mustaqil boshqaradi.
 * {@code key} - kodda ishlatiladigan o'zgarmas identifikator (masalan "ADMIN", "WORKER_DRIVER"
 * yoki maxsus rollar uchun generatsiya qilingan slug). {@code nameUz/nameRu/nameEn} - admin
 * tomonidan istalgan vaqt o'zgartirilishi mumkin bo'lgan ko'rinadigan nom.
 */
@Entity
@Table(name = "roles", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "role_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /**
     * MUHIM (2026-09-09 auditda topilgan, ishlash tezligi): bu maydon avval
     * JSON javobiga ham chiqardi. `GET /api/v1/roles` 7 ta rol qaytaradi va
     * HAR BIRIDA butun Company yozuvi takrorlanardi - jumladan
     * {@code receiptLogoBase64} (chek logotipi, base64 PNG, jonli bazada bir
     * kompaniyada ~64 KB). Ya'ni bitta so'rov ~450 KB bo'lib ketardi.
     *
     * Bu shunchaki sekinlik emas edi: mobil ilova ruxsatlarni AYNAN shu
     * endpoint orqali oladi (login paytida va ilova har ochilganda), Dio
     * receiveTimeout esa 12 soniya. Sekin mobil internetda so'rov muddati
     * tugab, foydalanuvchi ruxsatsiz qolardi va menyu bo'limlari yo'qolib
     * ko'rinardi.
     *
     * Hech bir mijoz (veb "Rollar va Huquqlar" sahifasi ham, mobil ilova ham)
     * rolning company obyektini o'qimaydi - faqat id/key/nomlar/permissions
     * ishlatiladi. Shuning uchun uni javobdan chiqarish xavfsiz.
     */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "role_key", nullable = false, length = 50)
    private String key;

    @Column(name = "name_uz", nullable = false)
    private String nameUz;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Builder.Default
    @Column(name = "is_system")
    private boolean isSystem = false;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @MapKeyColumn(name = "permission_key")
    @Column(name = "enabled")
    private Map<String, Boolean> permissions = new HashMap<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
