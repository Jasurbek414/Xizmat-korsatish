package com.service.core.service.telephony;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/**
 * Asterisk ARI (Asterisk REST Interface) bilan barcha aloqa shu klass orqali -
 * kanal yaratish/originate, uzish, bridge yaratish/kanal qo'shish, modul qayta
 * yuklash va endpoint holatini so'rash. FreeSWITCH ESL'dagi xom socket va
 * qo'lda matn protokoli parslash o'rniga oddiy HTTP+JSON (Spring RestClient) -
 * shuning uchun TELEFONIYA-XATOLAR.md'da qayd etilgan "bayt/belgi chegarasi"
 * kabi butun xato sinfi bu yerda umuman bo'lishi mumkin emas.
 */
@Component
public class AriClient {

    private static final Logger log = LoggerFactory.getLogger(AriClient.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${asterisk.ari.host:asterisk}")
    private String host;

    @Value("${asterisk.ari.port:8088}")
    private int port;

    @Value("${asterisk.ari.username:asterisk}")
    private String username;

    @Value("${asterisk.ari.password:}")
    private String password;

    private RestClient restClient() {
        String basicAuth = Base64.getEncoder().encodeToString(
                (username + ":" + password).getBytes(StandardCharsets.UTF_8));
        return RestClient.builder()
                .baseUrl("http://" + host + ":" + port + "/ari")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + basicAuth)
                .build();
    }

    /** ARI WebSocket hodisa oqimi manzili - AsteriskEventListener shu yerdan foydalanadi. */
    public String eventsWebSocketUrl(String appName) {
        return "ws://" + host + ":" + port + "/ari/events?app=" + appName + "&subscribeAll=true"
                + "&api_key=" + username + ":" + password;
    }

    /**
     * Yangi kanal yaratadi va darhol Stasis ilovasiga kiritadi (ochilishi bilan
     * StasisStart hodisasi keladi). Trunk chiquvchi oyog'i uchun
     * ("PJSIP/&lt;callee&gt;@&lt;gatewayEndpoint&gt;") va operator ichki
     * extension oyog'i uchun ("PJSIP/&lt;extension&gt;") ikkalasida ham ishlatiladi.
     *
     * @param channelId  bu kanalga biriktiriladigan aniq identifikator (odatda
     *                   sessionUuid yoki shundan hosila qator) - keyinchalik
     *                   hodisalarda AYNAN shu ID orqali kanal aniqlanadi.
     * @param appArgs    Stasis ilovasiga uzatiladigan argument(lar) - qaysi
     *                   turdagi oyoq ekanini (masalan "outbound-trunk",
     *                   "operator-leg,&lt;bridgeId&gt;") bildiradi, ilgari
     *                   FreeSWITCH dialplan fayllaridagi kontekst nomiga o'xshash.
     */
    public void originate(String channelId, String endpoint, String app, String appArgs,
                           String callerId, Map<String, String> variables) {
        try {
            restClient().post().uri(uriBuilder -> {
                        var b = uriBuilder.path("/channels")
                                .queryParam("endpoint", endpoint)
                                .queryParam("app", app)
                                .queryParam("appArgs", appArgs)
                                .queryParam("channelId", channelId);
                        if (callerId != null && !callerId.isBlank()) {
                            b = b.queryParam("callerId", callerId);
                        }
                        return b.build();
                    })
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("variables", variables != null ? variables : Map.of()))
                    .retrieve()
                    .toBodilessEntity();

            log.info("ARI originate yuborildi: channelId={}, endpoint={}, appArgs={}", channelId, endpoint, appArgs);
        } catch (Exception e) {
            log.error("ARI originate xatosi (channelId={}, endpoint={}): {}", channelId, endpoint, e.getMessage());
            throw new RuntimeException("Qo'ng'iroq boshlanmadi: " + e.getMessage(), e);
        }
    }

    public void hangup(String channelId) {
        try {
            restClient().delete().uri("/channels/{id}", channelId).retrieve().toBodilessEntity();
            log.info("ARI hangup: channelId={}", channelId);
        } catch (Exception e) {
            // Kanal allaqachon tugagan bo'lishi mumkin (masalan raqib avval trubkani
            // qo'yganda) - bu normal holat, xato sifatida ko'tarilmaydi.
            log.debug("ARI hangup (allaqachon tugagan bo'lishi mumkin, channelId={}): {}", channelId, e.getMessage());
        }
    }

    public void createBridge(String bridgeId) {
        try {
            restClient().post().uri(uriBuilder -> uriBuilder.path("/bridges")
                            .queryParam("bridgeId", bridgeId)
                            .queryParam("type", "mixing")
                            .build())
                    .retrieve().toBodilessEntity();
            log.info("ARI bridge yaratildi: bridgeId={}", bridgeId);
        } catch (Exception e) {
            log.error("ARI bridge yaratishda xato (bridgeId={}): {}", bridgeId, e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public void addChannelToBridge(String bridgeId, String channelId) {
        try {
            restClient().post().uri(uriBuilder -> uriBuilder.path("/bridges/{bridgeId}/addChannel")
                            .queryParam("channel", channelId)
                            .build(bridgeId))
                    .retrieve().toBodilessEntity();
            log.info("ARI kanal bridge'ga qo'shildi: bridgeId={}, channelId={}", bridgeId, channelId);
        } catch (Exception e) {
            log.error("ARI kanalni bridge'ga qo'shishda xato (bridgeId={}, channelId={}): {}",
                    bridgeId, channelId, e.getMessage());
        }
    }

    /**
     * "holding" turidagi bridge - navbatda kutayotgan qo'ng'iroq uchun
     * (mixing bridge'dan farqli, faqat bitta kanalni "ushlab turish" uchun
     * mo'ljallangan, MOH bilan birga ishlatiladi).
     */
    public void createHoldingBridge(String bridgeId) {
        try {
            restClient().post().uri(uriBuilder -> uriBuilder.path("/bridges")
                            .queryParam("bridgeId", bridgeId)
                            .queryParam("type", "holding")
                            .build())
                    .retrieve().toBodilessEntity();
            log.info("ARI kutish (holding) bridge yaratildi: bridgeId={}", bridgeId);
        } catch (Exception e) {
            log.error("ARI kutish bridge yaratishda xato (bridgeId={}): {}", bridgeId, e.getMessage());
            throw new RuntimeException(e);
        }
    }

    /** Bridge'dagi barcha kanallarga musiqa (music-on-hold) chalishni boshlaydi. */
    public void startMoh(String bridgeId, String mohClass) {
        try {
            restClient().post().uri(uriBuilder -> uriBuilder.path("/bridges/{bridgeId}/moh")
                            .queryParam("mohClass", mohClass)
                            .build(bridgeId))
                    .retrieve().toBodilessEntity();
            log.info("ARI MOH boshlandi: bridgeId={}, mohClass={}", bridgeId, mohClass);
        } catch (Exception e) {
            log.warn("ARI MOH boshlashda xato (bridgeId={}): {}", bridgeId, e.getMessage());
        }
    }

    public void destroyBridge(String bridgeId) {
        try {
            restClient().delete().uri("/bridges/{id}", bridgeId).retrieve().toBodilessEntity();
        } catch (Exception e) {
            // Barcha kanallar chiqib ketganda Asterisk bridge'ni o'zi ham
            // yo'q qiladi - shuning uchun "topilmadi" xatosi kutilgan holat.
            log.debug("ARI bridge yo'q qilish (allaqachon yo'q bo'lishi mumkin, bridgeId={}): {}", bridgeId, e.getMessage());
        }
    }

    /**
     * PJSIP fayllarini (AsteriskTrunkConfigWriter/AsteriskExtensionConfigWriter
     * yozgan) qayta o'qitadi - FreeSWITCH'dagi "reloadxml" ekvivalenti. ARI'ning
     * o'zida modul qayta yuklash imkoniyati bor - alohida AMI ulanishi kerak emas.
     */
    public void reloadModule(String moduleName) {
        try {
            restClient().put().uri("/asterisk/modules/{name}", moduleName).retrieve().toBodilessEntity();
            log.info("Asterisk moduli qayta yuklandi: {}", moduleName);
        } catch (Exception e) {
            log.warn("Asterisk modulini qayta yuklab bo'lmadi ({}): {}", moduleName, e.getMessage());
        }
    }

    /**
     * PJSIP endpoint holatini so'raydi - trunk ro'yxatdan o'tish holatining
     * (registration) proksisi sifatida ishlatiladi. MUHIM: ARI to'g'ridan-to'g'ri
     * "registration" ob'ektining holatini bermaydi (bu AMI'ning
     * PJSIPShowRegistrationsInboundContactStatus'iga ekvivalent alohida ARI
     * resursi yo'q), lekin shu registration natijasida paydo bo'ladigan
     * endpoint/AOR "state" maydoni (online/offline/unknown) amalda bir xil
     * ma'lumotni beradi - contact muvaffaqiyatli ro'yxatdan o'tgan bo'lsa
     * "online" qaytadi (1-bosqichda "pjsip show endpoints" bilan tasdiqlangan).
     */
    public String getEndpointState(String resource) {
        try {
            String json = restClient().get().uri("/endpoints/PJSIP/{resource}", resource)
                    .retrieve().body(String.class);
            JsonNode node = MAPPER.readTree(json);
            String state = Optional.ofNullable(node.path("state").asText(null)).orElse("");
            return switch (state) {
                case "online" -> "REGISTERED";
                case "offline" -> "FAILED";
                default -> "UNREGISTERED";
            };
        } catch (Exception e) {
            log.warn("ARI endpoint holatini so'rashda xato ({}): {}", resource, e.getMessage());
            return null;
        }
    }

    /** Kanalning bitta o'zgaruvchisini o'qiydi (masalan operator_ext) - originate paytida yozilgan. */
    public String getChannelVariable(String channelId, String variableName) {
        try {
            String json = restClient().get().uri(uriBuilder -> uriBuilder.path("/channels/{id}/variable")
                            .queryParam("variable", variableName)
                            .build(channelId))
                    .retrieve().body(String.class);
            JsonNode node = MAPPER.readTree(json);
            return node.path("value").asText(null);
        } catch (Exception e) {
            log.warn("ARI kanal o'zgaruvchisini o'qishda xato (channelId={}, variable={}): {}",
                    channelId, variableName, e.getMessage());
            return null;
        }
    }
}
