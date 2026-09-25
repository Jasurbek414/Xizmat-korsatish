package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "salaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salary {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Optimistik lock: "Hammasini to'lash" tugmasini ikki marta bosish yoki
    // parallel so'rovlar bitta xodimga ikkita SALARY xarajat tranzaksiyasi
    // yozib yubormasligi uchun.
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
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "base_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal bonus = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal deductions = BigDecimal.ZERO;

    // Shu oyda xodim ishlashi kerak bo'lgan kunlar soni (odatda oydagi
    // kalendar kunlar, oy o'rtasida ishga kirgan bo'lsa hireDate'dan
    // boshlab hisoblanadi) - kunlik stavka shundan kelib chiqadi.
    @Column(name = "working_days")
    private Integer workingDays;

    // Shu davrda qayd etilgan "ishga kelmagan kun" (Absence) yozuvlari soni.
    @Builder.Default
    @Column(name = "absent_days")
    private Integer absentDays = 0;

    // Kelmagan kunlar uchun avtomatik hisoblangan chegirma (kunlik stavka *
    // absentDays). Qo'lda kiritilgan avans/jarima (`deductions`) dan ALOHIDA
    // saqlanadi - hisobotda ikkalasi aniq ajratib ko'rsatilishi uchun.
    @Builder.Default
    @Column(name = "attendance_deduction", precision = 10, scale = 2)
    private BigDecimal attendanceDeduction = BigDecimal.ZERO;

    @Column(name = "pay_period", nullable = false)
    private LocalDate payPeriod;

    @Builder.Default
    @Column(length = 50)
    private String status = "UNPAID"; // PAID, UNPAID

    // "To'landi" bosilganda yaratilgan xarajat tranzaksiyasi ID'si - xato
    // bilan to'langan deb belgilangan hisobni bekor qilishda (unpay) aynan
    // shu tranzaksiyani topib o'chirish, balansni to'g'ri tiklash uchun.
    @Column(name = "payment_transaction_id")
    private UUID paymentTransactionId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
