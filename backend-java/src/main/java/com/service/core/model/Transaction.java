package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
// 2026-09-09: TransactionRepository company_id/order_id/worker_id bo'yicha
// filtrlaydi - uchalasiga ham indeks.
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transactions_company_id", columnList = "company_id"),
    @Index(name = "idx_transactions_order_id", columnList = "order_id"),
    @Index(name = "idx_transactions_worker_id", columnList = "worker_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(nullable = false, length = 50)
    private String type; // INCOME, EXPENSE

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 100)
    private String category; // SALARY, ORDER_PAYMENT, OFFICE_EXPENSE, etc.

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String status; // PENDING, CONFIRMED

    // ORDER_PAYMENT tranzaksiyalari uchun: kassaga topshirishda buyurtmaning
    // to'lov usuli (CASH/CARD/MIXED) shu yerga ko'chiriladi - Buxgalteriyada
    // "qancha naqd, qancha karta orqali tushdi" hisobotini Order jadvalini
    // qayta JOIN qilmasdan to'g'ridan-to'g'ri tranzaksiyalar ro'yxatidan
    // hisoblash uchun.
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "cash_amount", precision = 12, scale = 2)
    private BigDecimal cashAmount;

    @Column(name = "card_amount", precision = 12, scale = 2)
    private BigDecimal cardAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id")
    private User worker;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Bu yozuvni KIM kiritgani/YARATGANI - to'liq ism, DENORMALIZED
     * (User obyektiga FK emas, oddiy matn). Buxgalteriya moliyaviy audit
     * (kompaniya egasi "bu yozuvni kim kiritdi" deb bilishi kerak) uchun
     * qo'shildi. Matn sifatida saqlanishining sababi: (1) User'ga to'liq
     * relation qo'shish JSON javobiga boshqa xodimning maosh/telefon kabi
     * keraksiz ma'lumotlarini olib kirardi (Company/Order'da avval xuddi
     * shunday sabab bilan @JsonIgnore qo'yilgan edi - bu yerda esa umuman
     * FK yo'q, muammoning oldi olindi); (2) xodim keyinchalik ishdan
     * bo'shatilsa/o'chirilsa ham audit yozuvi (ism) saqlanib qoladi.
     */
    @Column(name = "created_by_name", length = 150)
    private String createdByName;

    /**
     * Bu yozuvni KIM tasdiqlagani (ishchi PENDING kiritgan bo'lsa, keyin
     * buxgalter tasdiqlaganda; yoki to'g'ridan-to'g'ri CONFIRMED yaratilgan
     * bo'lsa - yaratuvchining o'zi). Batafsil izoh uchun {@code createdByName}ga
     * qarang.
     */
    @Column(name = "confirmed_by_name", length = 150)
    private String confirmedByName;

    @PrePersist
    protected void onCreate() {
        // MUHIM: avval bu yerda shartsiz `LocalDateTime.now()` yozilardi -
        // eski oyga kirim/chiqim kiritish (2026-08-06 da so'ralgan, hisobotlar
        // ekranida) UMUMAN imkonsiz edi. Xuddi shu tuzatish Order.java'da
        // 2026-08-04 da qilingan edi. Endi faqat BO'SH bo'lsa to'ldiriladi.
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
