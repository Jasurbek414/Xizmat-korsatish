package com.service.core.service.telephony;

import com.service.core.model.Device;
import com.service.core.model.User;
import com.service.core.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Optional;

/**
 * Har bir operator uchun Asterisk PJSIP "transport-ws" orqali ro'yxatdan
 * o'tadigan ICHKI SIP/WebRTC extension'ni ta'minlaydi (brauzer JsSIP shu
 * bilan ro'yxatdan o'tadi). Bu UzTelecom trunk hisobi (SipAccount) bilan
 * hech qanday aloqasi yo'q - butunlay alohida, ichki extensionlar uchun.
 */
@Service
public class ExtensionService {

    private static final String DEVICE_TYPE_WEBRTC = "WEBRTC";
    private static final int STARTING_EXTENSION = 2000;
    private static final String PASSWORD_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int PASSWORD_LENGTH = 24;

    private final DeviceRepository deviceRepository;
    private final AsteriskExtensionConfigWriter extensionConfigWriter;
    private final SIPAdapter sipAdapter;
    private final SecureRandom secureRandom = new SecureRandom();

    public ExtensionService(DeviceRepository deviceRepository,
                             AsteriskExtensionConfigWriter extensionConfigWriter,
                             SIPAdapter sipAdapter) {
        this.deviceRepository = deviceRepository;
        this.extensionConfigWriter = extensionConfigWriter;
        this.sipAdapter = sipAdapter;
    }

    /**
     * Foydalanuvchi uchun mavjud ichki SIP extension'ni qaytaradi; yo'q
     * bo'lsa yangisini (raqam + kuchli tasodifiy parol) yaratadi, FreeSWITCH
     * katalogiga yozadi va konfiguratsiyani qayta yuklaydi.
     *
     * "synchronized" - extension raqamlari ketma-ket (2000, 2001, ...)
     * hisoblanadi; bir vaqtda ikki foydalanuvchi birinchi marta so'rasa ham
     * bir xil raqam berilib qolmasligi uchun. Bu operatsiya kamdan-kam
     * (har foydalanuvchi uchun bir marta) chaqirilgani uchun butun
     * backend darajasida serializatsiya qilish amaliy jihatdan muammo emas.
     */
    public synchronized Device getOrCreateExtension(User user) {
        Optional<Device> existing = deviceRepository.findFirstByUserIdAndDeviceType(user.getId(), DEVICE_TYPE_WEBRTC);
        if (existing.isPresent()) {
            Device device = existing.get();
            // MUHIM (audit: 12-band, "o'z-o'zini tiklash") - DB'da Device
            // yozuvi bor bo'lishi konfiguratsiya fayli HALI HAM diskda
            // borligini kafolatlamaydi (masalan Asterisk konteyneri/volume
            // qayta qurilgan bo'lsa) - bunday holatda foydalanuvchi hech
            // qachon sababini bilmasdan ro'yxatdan o'ta olmay qolardi. Endi
            // har safar qaytarishdan oldin fayl mavjudligi tekshiriladi, yo'q
            // bo'lsa xuddi shu ma'lumotlar bilan avtomatik qayta yoziladi.
            if (!extensionConfigWriter.exists(device)) {
                extensionConfigWriter.writeConfig(device);
                sipAdapter.reloadDirectory();
            }
            return device;
        }

        Device device = Device.builder()
                .user(user)
                .deviceType(DEVICE_TYPE_WEBRTC)
                .status("OFFLINE")
                .extensionNumber(generateNextExtensionNumber())
                .password(generatePassword())
                .build();

        Device saved = deviceRepository.save(device);
        extensionConfigWriter.writeConfig(saved);
        sipAdapter.reloadDirectory();
        return saved;
    }

    private String generateNextExtensionNumber() {
        int last = deviceRepository.findAllExtensionNumbers().stream()
                .mapToInt(ext -> parseExtensionOrDefault(ext, STARTING_EXTENSION - 1))
                .max()
                .orElse(STARTING_EXTENSION - 1);
        return String.valueOf(Math.max(last + 1, STARTING_EXTENSION));
    }

    private int parseExtensionOrDefault(String extension, int defaultValue) {
        try {
            return Integer.parseInt(extension);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private String generatePassword() {
        StringBuilder sb = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            sb.append(PASSWORD_CHARS.charAt(secureRandom.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }
}
