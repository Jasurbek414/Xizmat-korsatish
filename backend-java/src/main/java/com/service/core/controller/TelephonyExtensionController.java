package com.service.core.controller;

import com.service.core.model.Device;
import com.service.core.model.User;
import com.service.core.repository.UserRepository;
import com.service.core.service.telephony.ExtensionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Brauzerning FreeSWITCH "internal" profiliga (ichki SIP extension sifatida)
 * ro'yxatdan o'tishi uchun kerak bo'lgan hisob ma'lumotlarini beradi.
 * UzTelecom trunk (SipAccount) bilan aloqasi yo'q - bu operatorning shaxsiy
 * ichki extension'i.
 */
@RestController
@RequestMapping("/api/v1/telephony")
public class TelephonyExtensionController {

    private final ExtensionService extensionService;
    private final UserRepository userRepository;

    public TelephonyExtensionController(ExtensionService extensionService, UserRepository userRepository) {
        this.extensionService = extensionService;
        this.userRepository = userRepository;
    }

    // Har bir foydalanuvchi FAQAT o'zining extension'ini oladi - JWT'dan
    // olingan username orqali (path/query parametr emas - IDOR oldini olish
    // uchun; boshqa birovning extension/parolini so'rab bo'lmaydi).
    @GetMapping("/my-extension")
    public ResponseEntity<?> getMyExtension() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        Device device = extensionService.getOrCreateExtension(user);
        return ResponseEntity.ok(Map.of(
                "extension", device.getExtensionNumber(),
                "password", device.getPassword()
        ));
    }
}
