package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "order_statuses", uniqueConstraints = {
    @UniqueConstraint(name = "unique_company_status_order", columnNames = {"company_id", "sort_order"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatus {

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

    @Column(name = "name_uz", nullable = false)
    private String nameUz;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Builder.Default
    @Column(name = "color_code", length = 20)
    private String colorCode = "#3b82f6";

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Builder.Default
    @Column(name = "is_system")
    private Boolean isSystem = false;

    /**
     * Shu bosqichni QAYSI ROL bajaradi - {@code Role.key} qiymati (masalan
     * "WORKER_DRIVER", "WORKER_SEH" yoki admin panelida yaratilgan maxsus
     * rolning kaliti). Mobil ilova shunga qarab buyurtmani kimga
     * ko'rsatishini va kim keyingi bosqichga o'tkaza olishini aniqlaydi.
     *
     * NEGA QO'SHILDI: avval bu butunlay TARTIB RAQAMIGA bog'langan edi - eng
     * birinchi va eng oxirgi status haydovchiniki, oradagi hammasi sex
     * hodiminiki deb qattiq hisoblanardi. Administrator buni boshqara
     * olmasdi: yangi bosqich qo'shsa u avtomatik "sex"ga tushardi,
     * "Yakunlandi" kabi status qo'shishning esa iloji yo'q edi - u oxirgi
     * o'rinni egallab, haydovchining yetkazish ro'yxatini o'g'irlab qo'yardi.
     *
     * NULL = sozlanmagan. Bunday holda ilova AVVALGIDEK tartib raqami
     * bo'yicha ishlaydi, ya'ni mavjud kompaniyalarda hech narsa buzilmaydi.
     */
    @Column(name = "owner_role_key", length = 50)
    private String ownerRoleKey;

    /**
     * Buyurtma shu bosqichga yetsa YAKUNLANGAN hisoblanadimi. Yakunlangan
     * buyurtma "Buyurtmalar" ro'yxatidan chiqib "Tarix"ga o'tadi.
     *
     * Bir nechta status yakunlovchi bo'lishi mumkin (masalan "Yakunlandi" va
     * "Bekor qilindi"). Bitta ham belgilanmagan bo'lsa avvalgi qoida
     * ishlaydi: buyurtma to'lov qayd etilganda yakunlanadi.
     */
    @Builder.Default
    @JsonProperty("isFinal")
    @Column(name = "is_final")
    private Boolean isFinal = false;
}
