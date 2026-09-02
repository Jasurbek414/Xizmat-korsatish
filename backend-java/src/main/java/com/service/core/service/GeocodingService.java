package com.service.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Locale;

/**
 * Koordinatani (lat/lng) o'qiladigan manzil matniga aylantiradi (teskari
 * geokodlash) - OpenStreetMap'ning bepul Nominatim xizmati orqali. Haydovchi
 * buyurtma joyiga borib GPS orqali "Joylashuvni belgilash"ni bosganda
 * (OrderController.updateOrderLocation) ishlatiladi: mijozning matn manzili
 * ("address") shu aniq nuqtadan HISOBLANADI - qo'lda yozilgan, ko'pincha
 * noaniq/adashtiruvchi manzil o'rniga.
 *
 * MUHIM: Nominatim foydalanish siyosati (https://operations.osmfoundation.org/policies/nominatim/)
 * aniq User-Agent talab qiladi va OG'IR (bulk) so'rovlarni taqiqlaydi - bu
 * yerda faqat HAYDOVCHI amalidan (kamdan-kam, bitta so'rov) chaqirilgani
 * uchun xavfsiz.
 */
@Component
public class GeocodingService {

    private static final Logger log = LoggerFactory.getLogger(GeocodingService.class);

    private final RestClient restClient = buildClient();

    // MUHIM: standart RestClient'ning HTTP so'rov fabrikasida TIMEOUT yo'q -
    // tashqi xizmat (Nominatim) sekinlashsa yoki osilib qolsa, buyurtma
    // saqlash so'rovi (Tomcat oqimi) CHEKSIZ kutib qolar edi. Qat'iy, qisqa
    // muddat qo'yilgan - bu ikkinchi darajali (best-effort) boyitish, asosiy
    // amal (koordinatani saqlash) buni kutmasligi kerak.
    private static RestClient buildClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(4000);
        return RestClient.builder()
                .baseUrl("https://nominatim.openstreetmap.org")
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.USER_AGENT, "XizmatKorsatishApp/1.0 (servicecore.ecos.uz)")
                .build();
    }

    /**
     * Koordinataga mos o'qiladigan manzil qatorini qaytaradi, topa olmasa
     * yoki xizmat javob bermasa `null` (chaqiruvchi shu holatda eski
     * manzilni o'zgartirmasdan qoldirishi kerak - "hech narsa" "bo'sh
     * manzil"dan yaxshiroq).
     */
    public String reverseGeocode(double latitude, double longitude) {
        try {
            JsonNode response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/reverse")
                            .queryParam("format", "jsonv2")
                            .queryParam("lat", latitude)
                            .queryParam("lon", longitude)
                            .queryParam("accept-language", "uz")
                            .queryParam("zoom", 18)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) return null;
            JsonNode displayName = response.get("display_name");
            if (displayName == null || displayName.isNull()) return null;
            String address = displayName.asText().trim();
            return address.isEmpty() ? null : address;
        } catch (Exception e) {
            // Tarmoq xatosi/limit/xizmat vaqtincha ishlamasligi - manzilni
            // ANIQLASHTIRISHNI XOHLAGAN foydalanuvchi uchun buni ISHNI
            // TO'XTATADIGAN xato qilib bo'lmaydi (koordinata baribir
            // saqlanadi, faqat matn manzil yangilanmaydi).
            log.warn(String.format(Locale.ROOT,
                    "Teskari geokodlash muvaffaqiyatsiz (lat=%s, lng=%s): %s",
                    latitude, longitude, e.getMessage()));
            return null;
        }
    }
}
