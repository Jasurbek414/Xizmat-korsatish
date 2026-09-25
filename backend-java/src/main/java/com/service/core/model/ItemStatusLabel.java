package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/**
 * Gilam (OrderItem) ishlov bosqichi - nomi, rangi, TARTIBI va yakunlovchimi -
 * har bir kompaniya uchun alohida.
 *
 * Boshida (jonli tizimda) bu ATAYIN qattiq 4 ta bosqich edi - ACCEPTED ->
 * WASHED -> DRIED -> READY - chunki yuvish jarayoni chiziqli deb
 * hisoblangan. Keyinchalik jonli so'rov bo'yicha ADMIN o'zi bosqich
 * qo'shishi/o'chirishi/tartibini o'zgartirishi SHART bo'lib qoldi (har bir
 * kompaniyaning ishlov jarayoni har xil bo'lishi mumkin - masalan
 * "Kimyoviy tozalash" degan qo'shimcha bosqich). Shu sabab bu endi
 * {@link OrderStatus} bilan BIR XIL erkin CRUD arxitekturaga ega: standart
 * 4 tasi (ACCEPTED/WASHED/DRIED/READY) faqat BOSHLANG'ICH SEED sifatida
 * qoladi (yangi kompaniya shulardan boshlanadi, tanish bo'lishi uchun),
 * lekin ular ham xuddi qo'shimcha yaratilganlar kabi tahrirlanadi/o'chiriladi.
 *
 * MUHIM: {@code itemKey} - {@code OrderItem.status}ga to'g'ridan-to'g'ri
 * yoziladigan qiymat (FK EMAS, oddiy String ustun) - shu sabab bu label
 * o'chirilsa ham mavjud gilamlar bazada saqlanib qoladi, faqat ko'rinadigan
 * nomi topilmay qoladi (mobil ilova bunda xom kalitni ko'rsatadi - buzilmaydi).
 */
@Entity
@Table(name = "item_status_labels", uniqueConstraints = {
    @UniqueConstraint(name = "unique_company_item_key", columnNames = {"company_id", "item_key"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemStatusLabel {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /**
     * Standart seedda ACCEPTED/WASHED/DRIED/READY, admin qo'shgan yangi
     * bosqichlarda avtomatik generatsiya qilingan noyob kalit (masalan
     * "ST3F2A91B4") - {@code OrderItem.status}ga to'g'ridan-to'g'ri yoziladi.
     */
    @Column(name = "item_key", nullable = false, length = 40)
    private String itemKey;

    @Column(name = "name_uz", nullable = false)
    private String nameUz;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Builder.Default
    @Column(name = "color_code", length = 20)
    private String colorCode = "#3b82f6";

    /**
     * Bosqichlar ro'yxatidagi ketma-ket tartib raqami (1 dan boshlab).
     *
     * MUHIM (jonli xato, DARHOL tuzatildi): bu ustun avval `nullable = false`
     * edi. Bu maydon YANGI qo'shilgani uchun (avval jadval mavjud, kompaniya
     * boshiga standart 4 ta bosqich allaqachon yaratilgan edi) Hibernate
     * "ALTER TABLE ... ADD COLUMN sort_order integer NOT NULL" (DEFAULTsiz)
     * generatsiya qilgan - Postgres buni MAVJUD (bo'sh bo'lmagan) jadvalga
     * qo'llay olmay, backend UMUMAN ishga tushmay qolgan edi ("contains null
     * values" xatosi). `OrderStatus.isFinal`/`ownerRoleKey` bilan BIR XIL,
     * ishlab chiqarishda sinovdan o'tgan qoida qo'llanildi: DB ustuni
     * NULLABLE, Java tomonida esa `@Builder.Default` orqali YANGI yozuvlar
     * doim to'ldiriladi. Eski (migratsiyadan oldingi) yozuvlar bir martalik
     * SQL orqali qo'lda to'ldirildi (backfill).
     */
    @Builder.Default
    @Column(name = "sort_order")
    private Integer sortOrder = 1;

    /**
     * Gilam shu bosqichga yetsa "tugallangan" hisoblanadimi (mobil ilovada
     * buyurtmani "hammasi tayyor" deb belgilash uchun). Standart seedda
     * faqat READY - {@code true}. Admin bosqich qo'shsa/o'chirsa/tartibini
     * o'zgartirsa ham, yakunlovchi bosqich ANIQ shu bayroq orqali
     * aniqlanadi - oxirgi o'rinda turgani AVTOMATIK yakunlovchi deb
     * hisoblanmaydi (masalan admin oxiriga izoh uchun qo'shimcha bosqich
     * qo'shishi mumkin).
     */
    @Builder.Default
    @JsonProperty("isFinal")
    @Column(name = "is_final")
    private Boolean isFinal = false;
}
