package com.service.core.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Firebase Cloud Messaging orqali push bildirishnoma yuborish uchun Firebase Admin SDK'ni
 * ishga tushiradi. Agar {@code FIREBASE_SERVICE_ACCOUNT_PATH} environment o'zgaruvchisi
 * o'rnatilmagan yoki fayl mavjud bo'lmasa, push funksiyasi jimgina o'chirilgan holda qoladi -
 * bu ilova qolgan qismining ishlashiga xalaqit bermaydi (push - PermissionKeys.mobile_* dan
 * mustaqil qo'shimcha imkoniyat).
 */
@Component
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${FIREBASE_SERVICE_ACCOUNT_PATH:}")
    private String serviceAccountPath;

    private boolean initialized = false;

    @PostConstruct
    public void init() {
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            log.warn("FIREBASE_SERVICE_ACCOUNT_PATH o'rnatilmagan - push bildirishnomalar o'chirilgan. " +
                    "Yoqish uchun Firebase Console'dan service account JSON kalitini yuklab, " +
                    "yo'lini shu environment o'zgaruvchisiga o'rnating.");
            return;
        }

        Path path = Path.of(serviceAccountPath);
        if (!Files.exists(path)) {
            log.warn("Firebase service account fayli topilmadi: {}. Push bildirishnomalar o'chirilgan.", serviceAccountPath);
            return;
        }

        try (FileInputStream serviceAccount = new FileInputStream(path.toFile())) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
            initialized = true;
            log.info("Firebase Admin SDK muvaffaqiyatli ishga tushirildi.");
        } catch (IOException e) {
            log.error("Firebase Admin SDK'ni ishga tushirishda xatolik: {}", e.getMessage());
        }
    }

    public boolean isInitialized() {
        return initialized;
    }
}
