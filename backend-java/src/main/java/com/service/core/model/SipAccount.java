package com.service.core.model;

import com.service.core.config.SipPasswordConverter;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sip_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SipAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sip_server", nullable = false, length = 255)
    private String sipServer;

    @Column(name = "sip_port", nullable = false)
    private Integer sipPort;

    @Column(nullable = false, length = 100)
    private String username;

    @Convert(converter = SipPasswordConverter.class)
    @Column(nullable = false, length = 512)
    private String password;

    @Column(name = "auth_username", length = 100)
    private String authUsername;

    @Column(name = "keepalive_interval", nullable = false)
    private Integer keepaliveInterval;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sipPort == null) {
            sipPort = 5060;
        }
        if (keepaliveInterval == null) {
            keepaliveInterval = 60;
        }
    }
}
