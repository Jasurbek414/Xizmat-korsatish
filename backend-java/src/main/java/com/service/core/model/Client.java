package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clients", uniqueConstraints = {
    @UniqueConstraint(name = "unique_company_client_phone", columnNames = {"company_id", "phone"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, length = 50)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
