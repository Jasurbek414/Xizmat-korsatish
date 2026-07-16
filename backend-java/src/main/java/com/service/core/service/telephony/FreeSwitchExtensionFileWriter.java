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
 * Har bir operatorning ICHKI SIP extension'i (Device) uchun FreeSWITCH
 * "internal" profili avtomatik o'qiydigan katalog (directory) foydalanuvchi
 * XML faylini yozadi/o'chiradi.
 *
 * Bu FreeSwitchGatewayFileWriter bilan bir xil, jonli sinovda tasdiqlangan
 * mexanizmga tayanadi: vanilla directory/default.xml o'zining "default/"
 * papkasidagi barcha *.xml fayllarni avtomatik "include" qiladi
 * (X-PRE-PROCESS direktivasi orqali - directory/default.xml'da tekshirilgan).
 *
 * MUHIM FARQ: bu gateway (SipAccount/UzTelecom trunk) EMAS - bu ichki
 * extension, brauzerning "internal" profilga ro'yxatdan o'tishi uchun.
 * Ikkalasi FreeSWITCH'da butunlay alohida kataloglarda yashaydi.
 */
@Component
public class FreeSwitchExtensionFileWriter {

    private static final Logger log = LoggerFactory.getLogger(FreeSwitchExtensionFileWriter.class);

    @Value("${freeswitch.extensions.dir:/freeswitch-extensions}")
    private String extensionsDir;

    public void writeExtension(Device device) {
        Path path = extensionPath(device);
        String xml = buildExtensionXml(device);
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, xml, StandardCharsets.UTF_8);
            log.info("FreeSWITCH ichki extension fayli yozildi: {}", path);
        } catch (IOException e) {
            log.error("FreeSWITCH ichki extension faylini yozib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    /**
     * Fayl haqiqatan diskda mavjudligini tekshiradi (audit: 12-band,
     * "o'z-o'zini tiklash" uchun kerak - DB'da Device yozuvi bor bo'lsa ham,
     * FreeSWITCH volume tozalangan/almashtirilgan bo'lishi mumkin).
     */
    public boolean exists(Device device) {
        return Files.exists(extensionPath(device));
    }

    public void deleteExtension(Device device) {
        Path path = extensionPath(device);
        try {
            Files.deleteIfExists(path);
            log.info("FreeSWITCH ichki extension fayli o'chirildi: {}", path);
        } catch (IOException e) {
            log.error("FreeSWITCH ichki extension faylini o'chirib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    private Path extensionPath(Device device) {
        return Paths.get(extensionsDir, device.getExtensionNumber() + ".xml");
    }

    private String buildExtensionXml(Device device) {
        String extension = escape(device.getExtensionNumber());
        String password = escape(device.getPassword());
        String callerName = device.getUser() != null && device.getUser().getFullName() != null
                ? escape(device.getUser().getFullName()) : extension;

        return "<include>\n" +
                "  <user id=\"" + extension + "\">\n" +
                "    <params>\n" +
                "      <param name=\"password\" value=\"" + password + "\"/>\n" +
                "    </params>\n" +
                "    <variables>\n" +
                "      <variable name=\"user_context\" value=\"default\"/>\n" +
                "      <variable name=\"effective_caller_id_name\" value=\"" + callerName + "\"/>\n" +
                "      <variable name=\"effective_caller_id_number\" value=\"" + extension + "\"/>\n" +
                "    </variables>\n" +
                "  </user>\n" +
                "</include>\n";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("\"", "&quot;")
                .replace("<", "&lt;").replace(">", "&gt;");
    }
}
