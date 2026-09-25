package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Entity
// 2026-09-09 ishlash tezligi auditi: company_id har bir tenant-scoped
// so'rovda (findByCompanyId*) filtrlanadi, lekin indeks yo'q edi - katta
// jadvalda bu to'liq skanerlashga olib keladi (xuddi shu naqsh
// GpsLog/DriverTrip'da avval topilib tuzatilgan edi).
@Table(name = "orders", indexes = @Index(name = "idx_orders_company_id", columnList = "company_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Optimistik lock: bir xil buyurtmaga ikkita parallel so'rov (masalan ikki
    // haydovchi "accept" tugmasini bir vaqtda bosishi yoki bitta so'rovning
    // tarmoq xatosi tufayli qayta yuborilishi) natijasida ikkinchi save()
    // ObjectOptimisticLockingFailureException tashlaydi (409 ga aylantiriladi)
    // shart-tekshir-yoz (check-then-act) yorig'idan ikki marta o'tib ketmasin.
    @Version
    private Long version;

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
    @JoinColumn(name = "client_id")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceEntity service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id")
    private OrderStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id")
    private User worker;

    // MUHIM (jonli xato bo'yicha qo'shildi: "worker_id" ham haydovchini, ham
    // sex hodimini bitta joyga yozgani sabab, buyurtma hozir aynan kim
    // qo'lida ekanini faqat status bilan solishtirib aniqlash mumkin edi -
    // bu chalkashib, buyurtma "Boshlash" bosqichida qotib qolgan holatni
    // payqashni qiyinlashtirgan edi. Endi HAR BIR rol o'z alohida, doimiy
    // maydonida saqlanadi - `worker` baribir "hozirgi egasi" sifatida eski
    // mantiq bo'yicha ishlashda davom etadi (endpointlar o'zgarmaydi),
    // lekin bu ikkitasi kim ekanini status bosqichidan qat'iy nazar
    // HECH QACHON adashtirmasdan ko'rsatadi.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sex_worker_id")
    private User sexWorker;

    // 2026-09-09: EAGER'dan LAZY'ga o'zgartirildi - avval har bir order
    // ro'yxati so'rovida (masalan /orders/available) items HAM darhol
    // yuklanardi, hatto ro'yxat ekranida ular ishlatilmasa ham. LAZY +
    // application.properties'dagi hibernate.default_batch_fetch_size
    // birgalikda: items faqat haqiqatan kerak bo'lganda (order detail)
    // yuklanadi, va yuklansa ham N ta alohida so'rov o'rniga guruhlab.
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties("order")
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    private Double latitude;
    private Double longitude;

    @Column(name = "collected_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal collectedPrice = BigDecimal.ZERO;

    @Column(name = "payment_status", length = 50)
    @Builder.Default
    private String paymentStatus = "PENDING"; // PENDING, COLLECTED, HANDED_OVER

    /**
     * Xodim mijozdan naqd/karta pulni QACHON qabul qilgani (paymentStatus
     * "COLLECTED"ga o'tgan payt) - buxgalteriya panelida "xodim qo'lida
     * pul necha soatdan beri turibdi" (kechikish nazorati) shu maydondan
     * hisoblanadi.
     *
     * MUHIM: bu maydon qo'shilishidan OLDIN buni umumiy `updatedAt` orqali
     * taxminlash mumkin edi, lekin `updatedAt` buyurtma HAR safar
     * saqlanganda (masalan admin izohni tahrirlasa) yangilanadi - bu bilan
     * pul QANCHA vaqtdan beri xodim qo'lida ekani noto'g'ri (ko'proq yangi)
     * ko'rsatilib, kechikkan holatlar yashirinib qolishi mumkin edi.
     */
    @Column(name = "payment_collected_at")
    private LocalDateTime paymentCollectedAt;

    // To'lov usuli - haydovchi to'lovni qabul qilganda tanlaydi (naqd/karta/aralash).
    // Kassaga topshirish (confirm-handover) shu ma'lumotni o'zgartirmaydi -
    // faqat qanday olinganini keyinchalik hisobotda ko'rsatish uchun saqlanadi.
    @Column(name = "payment_method", length = 20)
    private String paymentMethod; // CASH, CARD, MIXED

    // MIXED to'lovda naqd va karta ulushi alohida saqlanadi (CASH bo'lsa =
    // collectedPrice, CARD bo'lsa 0 va aksincha) - hisobotda aniq ajratish uchun.
    @Column(name = "cash_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal cashAmount = BigDecimal.ZERO;

    @Column(name = "card_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal cardAmount = BigDecimal.ZERO;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Buyurtma statusi birinchi marta "sex zonasi"ga o'tgan payt (bir marta
    // qayd etiladi, OrderController.stampWorkshopEntryIfNeeded orqali) -
    // sex navbatini HAQIQIY jismoniy kelish tartibi bo'yicha (createdAt -
    // buyurtma yaratilgan payt emas) saralash uchun ishlatiladi.
    @Column(name = "workshop_entered_at")
    private LocalDateTime workshopEnteredAt;

    @PrePersist
    protected void onCreate() {
        // MUHIM: avval bu yerda shartsiz `LocalDateTime.now()` yozilardi, ya'ni
        // buyurtmani O'TGAN SANA bilan kiritish umuman imkonsiz edi - kontroller
        // qanday sana bersa ham JPA uni ustidan yozib yuborardi. Endi faqat
        // BO'SH bo'lsa to'ldiriladi, shuning uchun admin panelidagi kalendar
        // orqali eski kunga buyurtma qo'shish mumkin.
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
