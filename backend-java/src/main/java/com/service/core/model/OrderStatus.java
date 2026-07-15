package com.service.core.model;

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
}
