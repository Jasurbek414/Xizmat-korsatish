package com.service.core.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * SipAccount.password'ni bazada shifrlangan holda saqlash uchun. Bu HASH emas -
 * QAYTARILADIGAN (AES/GCM) shifrlash, chunki backend FreeSWITCH ESL/SIP
 * autentifikatsiyasi uchun haqiqiy parolni bilishi shart (bir tomonlama hash
 * bu yerda ishlamaydi).
 */
@Component
@Converter
public class SipPasswordConverter implements AttributeConverter<String, String> {

    private static final Logger log = LoggerFactory.getLogger(SipPasswordConverter.class);
    private static final String DEV_FALLBACK_KEY =
            "dev-only-insecure-fallback-sip-key-change-me-in-production-1234567890";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private final SecretKey secretKey;

    public SipPasswordConverter(@Value("${SIP_CREDENTIALS_KEY:}") String configuredKey) {
        String secret = (configuredKey == null || configuredKey.isBlank()) ? DEV_FALLBACK_KEY : configuredKey;
        if (secret.equals(DEV_FALLBACK_KEY)) {
            log.warn("SIP_CREDENTIALS_KEY environment o'zgaruvchisi o'rnatilmagan! Standart " +
                    "(nostandart-xavfsiz) dev kalit ishlatilmoqda. Productionda SIP_CREDENTIALS_KEY albatta o'rnatilishi shart.");
        }
        this.secretKey = deriveKey(secret);
    }

    private static SecretKey deriveKey(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("SIP parol shifrlash kaliti tayyorlanmadi", e);
        }
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] cipherText = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("SIP parolni shifrlashda xatolik", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(dbData);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // Eski (migratsiyadan oldingi, hali shifrlanmagan) qiymatlar bilan orqaga
            // moslik uchun - deshifrlash muvaffaqiyatsiz bo'lsa, ochiq matn sifatida
            // qabul qilinadi (keyingi saqlashda avtomatik shifrlanadi).
            log.warn("SIP parolni deshifrlab bo'lmadi, ochiq matn sifatida qabul qilinmoqda: {}", e.getMessage());
            return dbData;
        }
    }
}
