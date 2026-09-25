package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.service.core.config.SipPasswordConverter;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sip_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SipAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // 2026-09-10 (jonli tizimda o'lchangan, ishlash tezligi): bu maydon JSON
    // javobiga ham chiqardi. Har bir yozuv ichida BUTUN Company obyekti
    // takrorlanardi - jumladan `receiptLogoBase64` (chek logotipi, base64,
    // bir kompaniyada ~64 KB). Buyurtma ichida esa u BIR NECHA marta:
    // order.company + client.company + worker.company + status.company +
    // service.company. Natijada mobil ilovaning /orders/completed so'rovi
    // o'rtacha 13 MB, /orders/available 9 MB bo'lib ketgan edi va ilova buni
    // HAR 20 SONIYADA qayta yuklardi (nginx access.log dan o'lchandi).
    // Sekin mobil internetda so'rov 12 soniyalik muddatga sig'may uzilardi -
    // ro'yxat yangilanmay, allaqachon yakunlangan buyurtmalar ekranda
    // qolib ketardi. Hech bir mijoz (veb panel ham, mobil ilova ham) bu
    // maydonni o'qimaydi: superadmin ekranlari kompaniyani ALOHIDA
    // ("company" kaliti bilan) oladi, tenant esa JWT ichidan aniqlanadi.
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sip_server", nullable = false, length = 255)
    private String sipServer;

    @Column(name = "sip_port", nullable = false)
    private Integer sipPort;

    @Column(nullable = false, length = 100)
    private String username;

    // Himoya qatlami: bu entity hech qachon to'g'ridan-to'g'ri qaytarilmasligi kerak
    // (SipAccountController doim DTO вЂ” SipAccountResponse/SipCredentialsResponse вЂ” orqali
    // qaytaradi), lekin @JsonIgnore kelajakda kimdir shu qoidani unutib entity'ni bevosita
    // serialize qilib qo'yishidan mudofaa qiladi.
    @JsonIgnore
    @Convert(converter = SipPasswordConverter.class)
    @Column(nullable = false, length = 512)
    private String password;

    @Column(name = "auth_username", length = 100)
    private String authUsername;

    @Column(name = "keepalive_interval", nullable = false)
    private Integer keepaliveInterval;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sipPort == null) {
            sipPort = 5060;
        }
        if (keepaliveInterval == null) {
            keepaliveInterval = 60;
        }
    }
}
