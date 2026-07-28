package com.service.core.service.telephony;

import com.service.core.model.Device;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Har bir operatorning ICHKI SIP/WebRTC extension'i (Device) uchun Asterisk
 * PJSIP aor+auth+endpoint (webrtc=yes) blokini yozadi/o'chiradi -
 * FreeSwitchExtensionFileWriter'ni almashtiradi. AsteriskTrunkConfigWriter
 * bilan bir xil "pjsip.d/*.conf" avtomatik include mexanizmiga tayanadi.
 *
 * MUHIM FARQ: bu trunk (SipAccount) EMAS - bu ichki extension, brauzerning
 * "transport-ws" orqali ro'yxatdan o'tishi uchun. Fayl nomi extension raqami
 * (masalan "2001.conf") - trunk fayllaridan (UUID nomli) alohida.
 */
@Component
public class AsteriskExtensionConfigWriter {

    private static final Logger log = LoggerFactory.getLogger(AsteriskExtensionConfigWriter.class);

    @Value("${asterisk.pjsip-config.dir:/asterisk-pjsip-config}")
    private String configDir;

    public void writeConfig(Device device) {
        Path path = configPath(device);
        String conf = buildConf(device);
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, conf, StandardCharsets.UTF_8);
            log.info("Asterisk ichki extension konfiguratsiya fayli yozildi: {}", path);
        } catch (IOException e) {
            log.error("Asterisk ichki extension konfiguratsiya faylini yozib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    /** Fayl haqiqatan diskda mavjudligini tekshiradi (o'z-o'zini tiklash uchun - ExtensionService.getOrCreateExtension'ga qarang). */
    public boolean exists(Device device) {
        return Files.exists(configPath(device));
    }

    public void deleteConfig(Device device) {
        Path path = configPath(device);
        try {
            Files.deleteIfExists(path);
            log.info("Asterisk ichki extension konfiguratsiya fayli o'chirildi: {}", path);
        } catch (IOException e) {
            log.error("Asterisk ichki extension konfiguratsiya faylini o'chirib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    private Path configPath(Device device) {
        return Paths.get(configDir, "ext-" + device.getExtensionNumber() + ".conf");
    }

    private String buildConf(Device device) {
        String extension = escape(device.getExtensionNumber());
        String password = escape(device.getPassword());

        return "[ext-" + extension + "-auth]\n" +
                "type=auth\n" +
                "auth_type=userpass\n" +
                "username=" + extension + "\n" +
                "password=" + password + "\n" +
                "\n" +
                "[ext-" + extension + "-aor]\n" +
                "type=aor\n" +
                "max_contacts=1\n" +
                "remove_existing=yes\n" +
                "\n" +
                "[" + extension + "]\n" +
                "type=endpoint\n" +
                "transport=transport-ws\n" +
                "context=from-internal\n" +
                "disallow=all\n" +
                "allow=ulaw,alaw,opus\n" +
                "webrtc=yes\n" +
                "dtls_auto_generate_cert=yes\n" +
                "use_avpf=yes\n" +
                "media_encryption=dtls\n" +
                "auth=ext-" + extension + "-auth\n" +
                "aors=ext-" + extension + "-aor\n";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("\n", "").replace("\r", "").replace("[", "").replace("]", "");
    }
}
