package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true) // Nullable for system SUPERADMIN
    private Company company;

    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(length = 50)
    private String phone;

    private Double latitude;

    private Double longitude;

    // Oxirgi marta GPS koordinatasi qachon kelganini bildiradi - shu orqali
    // web-admin xaritasida haydovchi haqiqatan ONLINE (yaqinda signal yuborgan)
    // yoki uzoq vaqt signal kelmagani uchun OFFLINE ekanligi aniqlanadi.
    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    @Column(nullable = false, length = 50)
    private String role; // SUPERADMIN, ADMIN, DISPATCHER, MANAGER, WORKER_DRIVER

    private Double salary;

    @Column(name = "salary_type")
    private String salaryType;

    @Column(name = "fcm_token", length = 255)
    private String fcmToken;

    @Builder.Default
    @Column(length = 50)
    private String status = "ACTIVE";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"BLOCKED".equalsIgnoreCase(status);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return "ACTIVE".equalsIgnoreCase(status);
    }
}
