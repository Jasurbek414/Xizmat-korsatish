package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties("items")
    private Order order;

    @Column(nullable = false, length = 255)
    @Builder.Default
    private String name = "Gilam";

    @Column(precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal length = BigDecimal.ZERO;

    @Column(precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal width = BigDecimal.ZERO;

    // MUHIM: avval Integer edi - "kg", "litr", "metr" kabi uzluksiz
    // o'lchov birliklarida kasr miqdor (masalan 2.5 kg) kiritish UMUMAN
    // imkonsiz edi (butun songa yaxlitlanib/yo'qolib, narx noto'g'ri
    // chiqardi). Endi BigDecimal - "dona"/maydon asosli (m², kv. metr)
    // birliklarda hamon butun son sifatida ishlatiladi, lekin kg/litr/metr
    // uchun aniq kasr qiymatga ruxsat beradi.
    @Column(nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    // Har bir gilam sex xodimi tomonidan ALOHIDA narxlanishi mumkin (masalan
    // yuvish/tozalash murakkabligiga qarab). Bo'sh/0 bo'lsa, buyurtma narxini
    // hisoblashda shu gilam uchun xizmat narxi x o'lchov (eni*bo'yi*soni yoki
    // soni) bo'yicha avtomatik hisoblanadi - OrderItemController.recalculatePrice'ga q.
    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    // ItemStage.stageKey'ga ishora qiladi (2026-09-12: gilam bosqichlarini
    // to'liq sozlanadigan qilish - com.service.core.model.ItemStage). Qattiq
    // kodlangan FK emas, String saqlanadi - standart bosqichlar
    // (ACCEPTED/WASHED/DRIED/READY) uchun ItemStageSeedService AYNAN shu
    // qiymatlar bilan seed qilingani sabab hech qanday migratsiya kerak emas.
    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "ACCEPTED";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
