package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "sub_domain", unique = true, nullable = false, length = 100)
    private String subDomain;

    @Builder.Default
    @Column(length = 50)
    private String status = "ACTIVE"; // ACTIVE, BLOCKED, TRIAL

    @Column(length = 50)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(length = 500)
    private String address;

    /**
     * Korxonaning aniq GPS markazi - "Xarita" bo'limida boshlang'ich nuqta
     * sifatida ishlatiladi (avval qattiq yozilgan Toshkent koordinatasi
     * o'rniga). Admin panelda joriy brauzer joylashuvidan yoki xaritada
     * qo'lda bosib belgilanadi (CompanyController.updateCompanySettings).
     */
    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Builder.Default
    @Column(name = "min_order_price")
    private Integer minOrderPrice = 15000;

    @Builder.Default
    @Column(name = "driver_kpi_percent")
    private Integer driverKpiPercent = 10;

    @Builder.Default
    @Column(name = "work_start_time", length = 10)
    private String workStartTime = "08:00";

    @Builder.Default
    @Column(name = "work_end_time", length = 10)
    private String workEndTime = "22:00";

    @Builder.Default
    @Column(name = "sms_enabled")
    private Boolean smsEnabled = true;

    // Token qiymati hech qachon API javobida qaytarilmaydi (faqat qabul qilinadi/yoziladi) -
    // shuning uchun frontend uni oshkor qilmasdan "mavjud/mavjud emas" holatini bilishi uchun
    // pastdagi hisoblanadigan `smsApiTokenConfigured` maydonidan foydalanadi.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "sms_api_token", length = 255)
    private String smsApiToken;

    @JsonProperty("smsApiTokenConfigured")
    public boolean isSmsApiTokenConfigured() {
        return smsApiToken != null && !smsApiToken.isBlank();
    }

    @Column(name = "sms_template_created", length = 500)
    private String smsTemplateCreated;

    @Column(name = "sms_template_assigned", length = 500)
    private String smsTemplateAssigned;

    @Column(name = "sms_template_completed", length = 500)
    private String smsTemplateCompleted;

    // Xizmatlar katalogida (ServiceEntity.measurementUnit) tanlash uchun ishlatiladigan,
    // kompaniya o'zi boshqaradigan o'lchov birliklari ro'yxati (masalan: dona, kv. metr, kg).
    @ElementCollection
    @CollectionTable(name = "company_measurement_units", joinColumns = @JoinColumn(name = "company_id"))
    @Column(name = "unit", length = 50)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<String> measurementUnits = new ArrayList<>(List.of("dona", "kv. metr", "kg", "litr", "metr"));

    // Buxgalteriya > Yangi tranzaksiya oynasidagi standart kategoriyalar
    // (SALARY, OFFICE_EXPENSE, ...) ustiga kompaniya o'zi qo'shgan qo'shimcha
    // kirim/chiqim kategoriyalari - measurementUnits bilan bir xil naqsh.
    @ElementCollection
    @CollectionTable(name = "company_expense_categories", joinColumns = @JoinColumn(name = "company_id"))
    @Column(name = "category", length = 100)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<String> customExpenseCategories = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "company_income_categories", joinColumns = @JoinColumn(name = "company_id"))
    @Column(name = "category", length = 100)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<String> customIncomeCategories = new ArrayList<>();

    // Haydovchi mobil ilovada to'lov qabul qilgach Bluetooth termal
    // printerga chek chiqarish funksiyasi - admin panelidan yoqiladi/
    // o'chiriladi va cheк tarkibi/o'lchami shu yerdan boshqariladi.
    @Column(name = "receipt_enabled")
    @Builder.Default
    private Boolean receiptEnabled = false;

    // "58" yoki "80" (mm) - qog'oz kengligi, generator shunga qarab
    // formatlaydi (esc_pos_utils_plus PaperSize).
    @Column(name = "receipt_paper_size", length = 10)
    @Builder.Default
    private String receiptPaperSize = "58";

    @Column(name = "receipt_show_address")
    @Builder.Default
    private Boolean receiptShowAddress = true;

    @Column(name = "receipt_show_phone")
    @Builder.Default
    private Boolean receiptShowPhone = true;

    @Column(name = "receipt_footer_text", length = 500)
    @Builder.Default
    private String receiptFooterText = "Xizmatimizdan foydalanganingiz uchun rahmat!";

    // Chekning yuqori qismidagi sarlavha - bo'sh bo'lsa mobil ilova
    // kompaniya nomini (name) ishlatadi, admin xohlasa alohida chek
    // sarlavhasi (masalan qisqartirilgan brend nomi) kiritishi mumkin.
    @Column(name = "receipt_header_text", length = 200)
    private String receiptHeaderText;

    // Chekda buyurtma tarkibi (gilamlar/mahsulotlar ro'yxati) chiqsinmi -
    // ba'zi xizmatlar uchun (masalan bitta umumiy xizmat) bu ortiqcha
    // bo'lishi mumkin.
    @Column(name = "receipt_show_items")
    @Builder.Default
    private Boolean receiptShowItems = true;

    // Chekda to'lov usuli (Naqd/Karta/Aralash) qatori ko'rsatilsinmi.
    @Column(name = "receipt_show_payment_method")
    @Builder.Default
    private Boolean receiptShowPaymentMethod = true;

    // Chekda buyurtma raqami (UUID'ning oxirgi 8 ta belgisi, mobil tomonda
    // hosil qilinadi - backendda alohida qisqa raqamlash tizimi yo'q).
    @Column(name = "receipt_show_order_number")
    @Builder.Default
    private Boolean receiptShowOrderNumber = true;

    // Chekda to'lovni qabul qilgan haydovchi/xodim ismi ko'rsatilsinmi.
    @Column(name = "receipt_show_employee_name")
    @Builder.Default
    private Boolean receiptShowEmployeeName = true;

    // Bir bosishda nechta nusxa chop etilsin (masalan 1-mijoz, 1-kompaniya
    // arxivi uchun). 1-5 oralig'ida - mobil tomonda ham cheklanadi.
    @Column(name = "receipt_copies")
    @Builder.Default
    private Integer receiptCopies = 1;

    // "normal" yoki "large" - chek matnining asosiy qatorlari (Xizmat/Mijoz/
    // Manzil/Sana/tarkib) qanday shriftda chop etilishi.
    @Column(name = "receipt_font_size", length = 10)
    @Builder.Default
    private String receiptFontSize = "normal";

    // Kompaniya logotipi - base64 PNG (admin panelda kichraytirilib
    // yuklanadi). Mobil tomon buni dekodlab, chek yuqorisiga rasm sifatida
    // bosib chiqaradi (esc_pos_utils_plus Generator.image()).
    // MUHIM: bu yerda @Lob ISHLATILMAYDI - Hibernate @Lob'ni String bilan
    // birga PostgreSQL "Large Object" (oid, alohida pg_largeobject
    // jadvali) sifatida talqin qiladi va uni o'qish avto-commit rejimida
    // ishlamaydi ("Large Objects may not be used in auto-commit mode") -
    // bu deyarli BARCHA so'rovlarni (User->Company orqali) 500 xato bilan
    // buzib qo'ygan jonli xato edi. columnDefinition="TEXT" o'zi
    // yetarli - oddiy matn ustuni sifatida saqlanadi.
    @Column(name = "receipt_logo_base64", columnDefinition = "TEXT")
    private String receiptLogoBase64;

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
