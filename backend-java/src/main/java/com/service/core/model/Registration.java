package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sip_registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sip_account_id", nullable = false)
    private SipAccount sipAccount;

    @Column(nullable = false, length = 50)
    private String status; // REGISTERING, REGISTERED, UNREGISTERED, FAILED, RECONNECTING

    @Column(name = "last_registered_at")
    private LocalDateTime lastRegisteredAt;

    @Column(name = "next_register_due")
    private LocalDateTime nextRegisterDue;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
