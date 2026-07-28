package com.service.core.service.telephony;

import com.service.core.model.SipAccount;
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
 * Har bir SipAccount (UzTelecom trunk hisobi) uchun Asterisk PJSIP
 * registration+auth+aor+endpoint+identify blokini yozadi/o'chiradi -
 * FreeSwitchGatewayFileWriter'ni almashtiradi.
 *
 * Asterisk'ning asosiy pjsip.conf fayli (asterisk-config/pjsip.conf) oxirida
 * "#include pjsip.d/*.conf" direktivasi bor - shu papkadagi barcha .conf
 * fayllar avtomatik qo'shiladi (FreeSWITCH'ning X-PRE-PROCESS include'iga
 * ekvivalent, standart Asterisk xatti-harakati).
 *
 * MUHIM (invariant, TELEFONIYA-XATOLAR.md'dagi saboqqa mos): barcha ob'ekt
 * nomlari HAR DOIM SipAccount.getId() (UUID) asosida - username EMAS. Bu
 * invariant AsteriskAdapter (originate/queryRegistrationStatus) va shu klass
 * o'rtasida izchil bo'lishi SHART, aks holda operatsiyalar jimgina no-op
 * bo'lib qoladi (ilgari FreeSWITCH'da xuddi shu sabab bilan yuzaga kelgan
 * ikkita xato - killgw va sofia::gateway_state qidiruvi).
 */
@Component
public class AsteriskTrunkConfigWriter {

    private static final Logger log = LoggerFactory.getLogger(AsteriskTrunkConfigWriter.class);

    @Value("${asterisk.pjsip-config.dir:/asterisk-pjsip-config}")
    private String configDir;

    public void writeConfig(SipAccount account) {
        Path path = configPath(account);
        String conf = buildConf(account);
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, conf, StandardCharsets.UTF_8);
            log.info("Asterisk trunk konfiguratsiya fayli yozildi: {}", path);
        } catch (IOException e) {
            log.error("Asterisk trunk konfiguratsiya faylini yozib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    public void deleteConfig(SipAccount account) {
        Path path = configPath(account);
        try {
            Files.deleteIfExists(path);
            log.info("Asterisk trunk konfiguratsiya fayli o'chirildi: {}", path);
        } catch (IOException e) {
            log.error("Asterisk trunk konfiguratsiya faylini o'chirib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    private Path configPath(SipAccount account) {
        return Paths.get(configDir, account.getId().toString() + ".conf");
    }

    private String buildConf(SipAccount account) {
        String id = account.getId().toString();
        String username = escape(account.getUsername());
        String password = escape(account.getPassword());
        String authUsername = account.getAuthUsername() != null && !account.getAuthUsername().isBlank()
                ? escape(account.getAuthUsername()) : username;
        String server = escape(account.getSipServer());
        int port = account.getSipPort();

        return "[" + id + "-auth]\n" +
                "type=auth\n" +
                "auth_type=userpass\n" +
                "username=" + authUsername + "\n" +
                "password=" + password + "\n" +
                "\n" +
                "[" + id + "-aor]\n" +
                "type=aor\n" +
                "contact=sip:" + username + "@" + server + ":" + port + "\n" +
                "qualify_frequency=60\n" +
                "\n" +
                "[" + id + "]\n" +
                "type=endpoint\n" +
                "transport=transport-udp\n" +
                "context=from-uztelecom\n" +
                "disallow=all\n" +
                "allow=ulaw,alaw\n" +
                "outbound_auth=" + id + "-auth\n" +
                "aors=" + id + "-aor\n" +
                "from_user=" + username + "\n" +
                "from_domain=" + server + "\n" +
                "direct_media=no\n" +
                "rtp_symmetric=yes\n" +
                "force_rport=yes\n" +
                "rewrite_contact=yes\n" +
                // Operator qo'ng'iroqni "Kutish"ga qo'yganda mijoz (trunk orqali)
                // MOH eshitishi uchun - ikkala tomonga ham qo'yilgan (Asterisk'ning
                // aniq qaysi endpoint tomonini "held" deb hisoblashi jonli sinovda
                // tekshirilishi kerak, shuning uchun ikkala endpoint konfiguratsiyasida
                // ham mavjud - ext-*.conf'dagi moh_suggest'ga qarang).
                "moh_suggest=default\n" +
                "\n" +
                // MUHIM (xavfsizlik): FreeSWITCH'da "trunk_inbound" ACL bilan faqat
                // UzTelecom'ning HAQIQIY IP'sidan (sip_server) kelgan INVITE qabul
                // qilingan edi - aks holda skanerlar "username"ga mos INVITE yuborib
                // onlayn operatorlarni jiringlatishi mumkin edi. PJSIP'da ekvivalent -
                // "identify" ob'ekti.
                "[" + id + "-identify]\n" +
                "type=identify\n" +
                "endpoint=" + id + "\n" +
                "match=" + server + "\n" +
                "\n" +
                "[" + id + "-reg]\n" +
                "type=registration\n" +
                "transport=transport-udp\n" +
                "outbound_auth=" + id + "-auth\n" +
                "server_uri=sip:" + server + "\n" +
                "client_uri=sip:" + username + "@" + server + "\n" +
                "contact_user=" + username + "\n" +
                "retry_interval=30\n" +
                "forbidden_retry_interval=120\n" +
                "expiration=" + account.getKeepaliveInterval() + "\n";
    }

    private String escape(String value) {
        // PJSIP .conf formatida INI uslubi ishlatiladi - qatorlarni buzishi mumkin
        // bo'lgan yangi qator/qavs belgilarini olib tashlaymiz (buyruqqa in'ektsiya
        // FreeSWITCH ESL'dagi kabi mumkin emas, lekin fayl formatini saqlash uchun).
        if (value == null) return "";
        return value.replace("\n", "").replace("\r", "").replace("[", "").replace("]", "");
    }
}
