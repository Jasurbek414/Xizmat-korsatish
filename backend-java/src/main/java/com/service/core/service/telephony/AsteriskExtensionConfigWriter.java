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

        // MUHIM (jonli sinovda aniqlangan xato, tuzatildi): AOR nomi
        // "ext-<extension>-aor" edi - REGISTER so'rovi kelganda Asterisk
        // "AOR '' not found for endpoint '2000'" xatosi bilan rad etardi.
        // Sabab: JsSIP (va aksariyat SIP klientlari) REGISTER'ning
        // Request-URI'sida foydalanuvchi qismini ko'rsatmaydi (faqat domen,
        // RFC 3261 tavsiyasiga muvofiq) - Asterisk'ning registrar moduli bu
        // holatda AOR'ni ENDPOINT NOMI BILAN BIR XIL deb qidiradi. Standart
        // Asterisk PJSIP konvensiyasi ham shunday: aor va endpoint bo'limlari
        // BIR XIL nom ([2000]) bilan yoziladi (turli xil "type=" tufayli
        // to'qnashuv bo'lmaydi - sorcery ularni alohida ob'ekt sifatida
        // ko'radi).
        return "[ext-" + extension + "-auth]\n" +
                "type=auth\n" +
                "auth_type=userpass\n" +
                "username=" + extension + "\n" +
                "password=" + password + "\n" +
                "\n" +
                "[" + extension + "]\n" +
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
                // MUHIM (jonli holatda topilgan ASOSIY xato, tuzatildi): Asterisk'da
                // direct_media standart holatda "yes" va "webrtc=yes" yorlig'i uni
                // O'ZGARTIRMAYDI (u faqat use_avpf/media_encryption/dtls_*/ice_support/
                // rtcp_mux/media_use_received_transport qiymatlarini o'rnatadi).
                // direct_media=yes bo'lsa, ikki tomon javob bergach Asterisk ularni
                // TO'G'RIDAN-TO'G'RI ulashga urinib, brauzerga re-INVITE yuboradi va
                // media'ni trunk manziliga yo'naltiradi. Brauzer buni BAJARA OLMAYDI:
                // WebRTC uchun DTLS-SRTP va ICE shart, UzTelecom trunk esa oddiy RTP
                // ishlatadi va butunlay boshqa tarmoqda. Natijada JsSIP re-INVITE'ni
                // rad etadi ("Call failed: Rejected") va qo'ng'iroq shu zahoti uziladi.
                // Simptom AYNAN shunday edi: trunk javob beradi, ko'prik yaratiladi,
                // "Called 2000" ketadi, brauzer javob berishga urinadi va darhol
                // qulaydi - bazadagi 20 ta call_sessions yozuvining HAMMASI
                // duration=0 bilan (ya'ni ovoz birorta qo'ng'iroqda ham ulanmagan).
                // WebRTC endpoint uchun direct_media HAR DOIM "no" bo'lishi shart -
                // Asterisk media'ni o'zi orqali (B2BUA) o'tkazishi kerak, chunki
                // faqat u DTLS-SRTP <-> oddiy RTP o'zgartirishini bajara oladi.
                "direct_media=no\n" +
                // Brauzer NAT ortida (Cloudflare tunnel + Docker tarmog'i) - RTP
                // haqiqatan kelgan manzilga qaytariladi, SDP'da e'lon qilingan
                // manzilga emas. ICE bilan birga ishlaganda ham bu qo'shimcha
                // ishonchlilik beradi.
                "rtp_symmetric=yes\n" +
                // Operator "Kutish"ga qo'yganda (JsSIP re-INVITE, sendonly SDP)
                // Asterisk BUNI o'zi (B2BUA sifatida) avtomatik boshqaradi -
                // ikkinchi tomon (mijoz/trunk) shu MOH klassini eshitadi.
                // Maxsus ARI/Stasis kodi shart emas.
                "moh_suggest=default\n" +
                "auth=ext-" + extension + "-auth\n" +
                "aors=" + extension + "\n";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("\n", "").replace("\r", "").replace("[", "").replace("]", "");
    }
}
