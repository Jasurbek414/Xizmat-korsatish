package com.service.core.controller;

import com.service.core.model.AppNotification;
import com.service.core.model.User;
import com.service.core.repository.AppNotificationRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.PushNotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Har bir foydalanuvchining o'z bildirishnomalar tarixi - mobil ilovadagi
 * qo'ng'iroqcha (bell) bo'limi shu yerdan o'qiydi. Push (FCM) xabarning o'zi
 * ekrandan yo'qolib ketishi mumkin, bu yozuvlar esa doim ilova ichida qoladi.
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final AppNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;

    public NotificationController(AppNotificationRepository notificationRepository, UserRepository userRepository,
                                   PushNotificationService pushNotificationService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.pushNotificationService = pushNotificationService;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "30") int size) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }
        var result = notificationRepository.findByUserIdOrderByCreatedAtDesc(
                user.getId(), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> items = result.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "totalPages", result.getTotalPages()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }
        return ResponseEntity.ok(Map.of("count", notificationRepository.countByUserIdAndReadFalse(user.getId())));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable UUID id) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }
        AppNotification n = notificationRepository.findById(id).orElse(null);
        if (n == null || n.getUser() == null || !n.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Bildirishnoma topilmadi"));
        }
        n.setRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(Map.of("message", "OK"));
    }

    /**
     * Kompaniya administratori/menejeri o'z xodimlariga qisqa e'lon yuborishi
     * uchun - superadmin'ning `/superadmin/broadcast/app-update`si BARCHA
     * kompaniyalarga tarqaladi, bu esa faqat yuboruvchining o'z kompaniyasiga.
     */
    @PostMapping("/broadcast")
    @PreAuthorize("@perm.has('employees')")
    public ResponseEntity<?> broadcastToCompany(@RequestBody Map<String, String> request) {
        User user = getCurrentUser();
        if (user == null || user.getCompany() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }
        String title = request.get("title");
        String body = request.get("body");
        if (title == null || title.isBlank() || body == null || body.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sarlavha va xabar matni kiritilishi shart"));
        }
        int count = pushNotificationService.broadcastToCompany(user.getCompany().getId(), user.getId(), title.trim(), body.trim());
        return ResponseEntity.ok(Map.of("message", "Yuborildi", "recipientCount", count));
    }

    // MUHIM (audit'da topilgan xato, tuzatildi): @Modifying so'rov (repository'da)
    // FAOL YOZISH TRANZAKSIYASI bo'lmasa ishlamaydi - Spring Data JPA buni avtomatik
    // bermaydi (standart faqat readOnly=true). @Transactional'siz bu chaqiruv
    // TransactionRequiredException bilan 500 qaytarardi; mobil ilova esa xatoni
    // JIMGINA yutib yuborgani uchun (NotificationRepository.markAllRead catchError)
    // foydalanuvchi hech qanday xabar ko'rmasdan, tugma shunchaki "ishlamayotgandek"
    // ko'rinardi.
    @PostMapping("/read-all")
    @Transactional
    public ResponseEntity<?> markAllRead() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }
        notificationRepository.markAllRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "OK"));
    }

    private Map<String, Object> toDto(AppNotification n) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", n.getId());
        map.put("title", n.getTitle());
        map.put("body", n.getBody());
        map.put("type", n.getType());
        map.put("read", n.isRead());
        map.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null);
        return map;
    }
}
