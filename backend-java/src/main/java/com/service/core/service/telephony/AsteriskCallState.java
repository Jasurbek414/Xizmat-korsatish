package com.service.core.service.telephony;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * AsteriskAdapter (ARI orqali originate/bridge so'raydi) va AsteriskEventListener
 * (ARI hodisalariga javob beradi) o'rtasida ulashiladigan, faqat xotirada
 * saqlanadigan qo'ng'iroq orkestratsiya holati.
 *
 * MUHIM (arxitektura): bu klass ataylab alohida ajratilgan - agar AsteriskAdapter
 * to'g'ridan-to'g'ri AsteriskEventListener'ga bog'liq bo'lganida, Spring'da
 * DOIRAVIY BOG'LIQLIK paydo bo'lardi (TelephonyService -> SIPAdapter/AsteriskAdapter
 * -> AsteriskEventListener -> TelephonyService), bu esa konstruktor in'ektsiyasi
 * bilan yechilmaydi (ilova ishga tushmay qoladi). Ikkalasi ham shu bitta neytral
 * holat komponentiga bog'lanadi - doiraviylik yo'q.
 */
@Component
public class AsteriskCallState {

    record ChannelRole(String type, String extra) {}

    // channelId -> rol ma'lumoti (StasisStart'da yozilib, StasisEnd'da tozalanadi).
    private final Map<String, ChannelRole> channelRoles = new ConcurrentHashMap<>();

    // bridgeId -> shu bridge uchun bir vaqtda jiringlayotgan operator kanallari
    // ro'yxati (ring group) - birontasi javob bersa, qolganlari uziladi.
    private final Map<String, List<String>> ringGroups = new ConcurrentHashMap<>();

    void putRole(String channelId, String type, String extra) {
        channelRoles.put(channelId, new ChannelRole(type, extra));
    }

    ChannelRole getRole(String channelId) {
        return channelRoles.get(channelId);
    }

    ChannelRole removeRole(String channelId) {
        return channelRoles.remove(channelId);
    }

    void registerRingGroup(String bridgeId, List<String> operatorChannelIds) {
        ringGroups.put(bridgeId, new CopyOnWriteArrayList<>(operatorChannelIds));
    }

    List<String> removeRingGroup(String bridgeId) {
        return ringGroups.remove(bridgeId);
    }

    List<String> getRingGroup(String bridgeId) {
        return ringGroups.get(bridgeId);
    }
}
