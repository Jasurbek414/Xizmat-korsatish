package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatcher_id")
    private User dispatcher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @Column(nullable = false, length = 20)
    private String direction; // INBOUND, OUTBOUND

    @Column(nullable = false)
    private Integer duration; // in seconds

    @Column(name = "recording_url", length = 512)
    private String recordingUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
