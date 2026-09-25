package com.service.core.controller;

import com.service.core.service.PushNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Faqat SUPERADMIN uchun - yangi mobil versiya chiqqanda BARCHA
 * kompaniyalar bo'ylab O'RNATILGAN ilovalarga bir zumda bildirishnoma
 * yuborish. `SuperAdminController`dan alohida: u faqat kompaniyalar
 * (/companies) ustidan boshqaruv, bu esa cross-tenant push - semantik
 * jihatdan boshqa maqsad.
 *
 * DIQQAT: bu yerdagi versiya sonini `downloads/version.json` fayli bilan
 * QO'LDA moslashtirish kerak - ular avtomatik sinxronlanmaydi. Mobil
 * ilova haqiqiy tekshiruvni O'SHA fayldan qiladi, bu bildirishnoma faqat
 * "hozir tekshir" signali (foreground push xabari).
 */
@RestController
@RequestMapping("/api/v1/superadmin/broadcast")
@PreAuthorize("hasRole('SUPERADMIN')")
public class SuperAdminBroadcastController {

    private final PushNotificationService pushNotificationService;

    public SuperAdminBroadcastController(PushNotificationService pushNotificationService) {
        this.pushNotificationService = pushNotificationService;
    }

    @PostMapping("/app-update")
    public ResponseEntity<?> broadcastAppUpdate(@RequestBody Map<String, String> request) {
        String version = request.get("version");
        String message = request.get("message");

        boolean sent = pushNotificationService.broadcastAppUpdate(version, message);
        if (!sent) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "message", "Bildirishnoma yuborilmadi - Firebase sozlanmagan yoki xatolik yuz berdi."));
        }
        return ResponseEntity.ok(Map.of("message", "Bildirishnoma barcha qurilmalarga yuborildi."));
    }
}
