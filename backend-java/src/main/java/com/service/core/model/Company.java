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
