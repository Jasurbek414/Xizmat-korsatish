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
 * Har bir SipAccount uchun FreeSWITCH'ning "external" Sofia profili avtomatik
 * o'qiydigan gateway XML faylini yozadi/o'chiradi.
 *
 * Nima uchun mod_xml_curl emas: mod_xml_curl orqali dinamik konfiguratsiya
 * qilish uchun FreeSWITCH'ga "external" profilning TO'LIQ tuzilishini (kodeklar,
 * RTP-IP va h.k.) qaytarish kerak bo'ladi - bu tuzilma FreeSWITCH Docker
 * image'idagi "vanilla" konfiguratsiya ichida, shu repo tarkibida emas, shuning
 * uchun uni bu yerda taxmin qilib qayta yozish xato ehtimolini oshiradi (11-qoida).
 *
 * Buning o'rniga FreeSWITCH'ning standart, hujjatlashtirilgan xatti-harakatidan
 * foydalanamiz: vanilla "external" profili o'zining "external/" papkasidagi
 * barcha *.xml fayllarni avtomatik "include" qiladi (X-PRE-PROCESS include
 * direktivasi orqali). Shuning uchun bu yerga alohida, kichik gateway fayli
 * yozish va keyin mavjud "sofia profile external rescan" buyrug'ini yuborish
 * (FreeSwitchAdapter.register() allaqachon shuni qiladi) orqali haqiqiy
 * trunk'ni ro'yxatdan o'tkazish/olib tashlash mumkin.
 *
 * ⚠️ VALIDATION REQUIRED:
 *  1. docker-compose.yml'da backend va freeswitch konteynerlari o'rtasida bu
 *     papka umumiy Docker volume sifatida ulangan bo'lishi SHART (Bosqich 9'da
 *     qo'shildi) - aks holda yozilgan fayl FreeSWITCH'ga ko'rinmaydi.
 *  2. Quyidagi &lt;param&gt; ro'yxati odatiy FreeSWITCH gateway parametrlariga
 *     asoslangan - UzTelecom yoki boshqa aniq operatorning talab qiladigan
 *     qo'shimcha parametrlari jonli sinovda tekshirilib, kerak bo'lsa
 *     qo'shilishi kerak.
 */
@Component
public class FreeSwitchGatewayFileWriter {

    private static final Logger log = LoggerFactory.getLogger(FreeSwitchGatewayFileWriter.class);

    @Value("${freeswitch.gateways.dir:/freeswitch-gateways}")
    private String gatewaysDir;

    public void writeGateway(SipAccount account) {
        Path path = gatewayPath(account);
        String xml = buildGatewayXml(account);
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, xml, StandardCharsets.UTF_8);
            log.info("FreeSWITCH gateway fayli yozildi: {}", path);
        } catch (IOException e) {
            log.error("FreeSWITCH gateway faylini yozib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    public void deleteGateway(SipAccount account) {
        Path path = gatewayPath(account);
        try {
            Files.deleteIfExists(path);
            log.info("FreeSWITCH gateway fayli o'chirildi: {}", path);
        } catch (IOException e) {
            log.error("FreeSWITCH gateway faylini o'chirib bo'lmadi ({}): {}", path, e.getMessage());
        }
    }

    private Path gatewayPath(SipAccount account) {
        // Fayl nomi sifatida hisob ID'sidan foydalanamiz - username o'zgarishi
        // fayl yo'lini buzmasligi uchun.
        return Paths.get(gatewaysDir, account.getId().toString() + ".xml");
    }

    private String buildGatewayXml(SipAccount account) {
        String gatewayName = escape(account.getId().toString());
        String username = escape(account.getUsername());
        String password = escape(account.getPassword());
        String authUsername = account.getAuthUsername() != null && !account.getAuthUsername().isBlank()
                ? escape(account.getAuthUsername()) : username;
        String realm = escape(account.getSipServer());
        String proxy = escape(account.getSipServer() + ":" + account.getSipPort());

        return "<include>\n" +
                "  <gateway name=\"" + gatewayName + "\">\n" +
                "    <param name=\"username\" value=\"" + username + "\"/>\n" +
                "    <param name=\"password\" value=\"" + password + "\"/>\n" +
                "    <param name=\"auth-username\" value=\"" + authUsername + "\"/>\n" +
                "    <param name=\"realm\" value=\"" + realm + "\"/>\n" +
                "    <param name=\"proxy\" value=\"" + proxy + "\"/>\n" +
                "    <param name=\"register\" value=\"true\"/>\n" +
                "    <param name=\"expire-seconds\" value=\"" + account.getKeepaliveInterval() + "\"/>\n" +
                "    <param name=\"retry-seconds\" value=\"30\"/>\n" +
                "    <param name=\"caller-id-in-from\" value=\"true\"/>\n" +
                "  </gateway>\n" +
                "</include>\n";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("\"", "&quot;")
                .replace("<", "&lt;").replace(">", "&gt;");
    }
}
