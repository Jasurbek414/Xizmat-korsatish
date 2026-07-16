package com.service.core.model;

import com.service.core.config.SipPasswordConverter;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Operatorning FreeSWITCH "internal" profilidagi ICHKI SIP extension'i -
 * brauzer JsSIP orqali shu bilan ro'yxatdan o'tadi (UzTelecom trunk hisobi
 * - SipAccount - bilan ALOQASI YO'Q, bular butunlay boshqa FreeSWITCH
 * katalogi: directory/default/, "external" gateway'lardan farqli).
 */
@Entity
@Table(name = "operator_devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "device_type", nullable = false, length = 50)
    private String deviceType; // WEBRTC, SOFTPHONE, IP_PHONE

    @Column(nullable = false, length = 50)
    private String status; // ONLINE, OFFLINE

    @Column(name = "extension_number", unique = true, length = 20)
    private String extensionNumber;

    @Convert(converter = SipPasswordConverter.class)
    @Column(length = 512)
    private String password;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
