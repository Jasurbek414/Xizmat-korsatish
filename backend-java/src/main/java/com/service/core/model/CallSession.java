package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "call_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sip_account_id")
    private SipAccount sipAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatcher_id")
    private User dispatcher;

    @Column(name = "client_phone", nullable = false, length = 50)
    private String clientPhone;

    @Column(nullable = false, length = 20)
    private String direction; // INBOUND, OUTBOUND

    @Column(nullable = false, length = 50)
    private String status; // SUCCESS, NO_ANSWER, BUSY, FAILED, etc.

    @Column(nullable = false)
    private Integer duration;

    @Column(name = "recording_url", length = 512)
    private String recordingUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (duration == null) {
            duration = 0;
        }
    }
}
