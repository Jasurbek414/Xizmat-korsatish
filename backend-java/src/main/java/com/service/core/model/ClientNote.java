package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mijoz kartasidagi CRM eslatmalari (Clients.jsx "Faoliyat va Eslatmalar").
 *
 * MUHIM (audit'da topilgan xato): avval bu eslatmalar FAQAT frontend
 * React state'ida yashardi - backend'ga umuman yozilmasdi. Admin eslatma
 * yozib "saqlangan"dek ko'rar edi, lekin sahifa yangilansa yoki qayta
 * kirilsa hammasi izsiz yo'qolar edi. Endi haqiqiy jadvalda saqlanadi.
 */
@Entity
@Table(name = "client_notes", indexes = {
    @Index(name = "idx_client_notes_client_created", columnList = "client_id,created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientNote {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
