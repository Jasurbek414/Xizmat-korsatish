package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/**
 * Har bir buyurtma mahsuloti (OrderItem - "gilam")ning sex ichidagi ishlov
 * bosqichi. Avval bu OrderItem.status maydonida QATTIQ KODLANGAN 4 ta qiymat
 * (ACCEPTED/WASHED/DRIED/READY) edi - hech qanday sozlash imkoni yo'q edi,
 * bundan tashqari mobil ilova bu nomlarni "Buyurtma Statuslari"
 * (OrderStatus) ro'yxatidan TAXMINIY (pozitsiya/so'z qidirish orqali)
 * olardi - admin o'sha ro'yxatni o'zgartirsa, bu taxmin buzilib, bosqich
 * nomlari chalkashib ketardi. Endi OrderStatus'dan MUSTAQIL, har bir
 * kompaniya uchun to'liq sozlanadigan (qo'shish/o'chirish/nomini
 * o'zgartirish/tartiblash - Sozlamalar -> Gilam bosqichlari) ro'yxat.
 *
 * `stageKey` - Role.key naqshi bo'yicha: standart bosqichlar uchun
 * ACCEPTED/WASHED/DRIED/READY (OrderItem.status'da ALLAQACHON saqlangan
 * qiymatlar bilan AYNAN mos - shu sabab eski ma'lumotlarni migratsiya
 * qilish shart emas), maxsus bosqichlar uchun ItemStageController'da
 * "STAGE_"+timestamp shaklida generatsiya qilinadi.
 */
@Entity
@Table(name = "item_stages", uniqueConstraints = {
    @UniqueConstraint(name = "unique_company_stage_key", columnNames = {"company_id", "stage_key"}),
    @UniqueConstraint(name = "unique_company_stage_order", columnNames = {"company_id", "sort_order"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemStage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "stage_key", nullable = false, length = 50)
    private String stageKey;

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
}
