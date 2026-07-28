package com.service.core.service.telephony;

import com.service.core.model.SipAccount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * SIPAdapter'ning Asterisk (ARI) implementatsiyasi - FreeSwitchAdapter'ni
 * almashtiradi. UzTelecom trunk FreeSWITCH orqali ro'yxatdan o'tishni rad etib,
 * faqat Asterisk integratsiyasini talab qilgani uchun migratsiya qilingan.
 */
@Service
public class AsteriskAdapter implements SIPAdapter {

    private static final Logger log = LoggerFactory.getLogger(AsteriskAdapter.class);

    // TelephonyService allaqachon tekshiradi, lekin FreeSwitchAdapter'dagi kabi
    // himoya qatlami (defense-in-depth) sifatida bu yerda ham qayta tekshiramiz.
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[0-9+*#]{1,20}$");
    private static final Pattern EXTENSION_PATTERN = PHONE_PATTERN;
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private final AriClient ariClient;
    private final AsteriskCallState callState;

    public AsteriskAdapter(AriClient ariClient, AsteriskCallState callState) {
        this.ariClient = ariClient;
        this.callState = callState;
    }

    @Override
    public void register(SipAccount account) {
        // Fayl AsteriskTrunkConfigWriter tomonidan allaqachon yozilgan (TelephonyService
        // shuni birinchi chaqiradi) - shu yerda faqat res_pjsip modulini qayta yuklab,
        // Asterisk yangi registration/endpoint/aor/auth ob'ektlarini o'qishini
        // ta'minlaymiz (FreeSWITCH'dagi "sofia profile external rescan" ekvivalenti).
        ariClient.reloadModule("res_pjsip.so");
    }

    @Override
    public void unregister(SipAccount account) {
        // Fayl allaqachon o'chirilgan (AsteriskTrunkConfigWriter.deleteConfig,
        // TelephonyService.unregisterSipAccount tomonidan chaqiriladi) - shu yerda
        // faqat qayta yuklaymiz, shundagina Asterisk o'chirilgan trunk uchun
        // ro'yxatdan o'tishga urinishni to'xtatadi.
        ariClient.reloadModule("res_pjsip.so");
    }

    @Override
    public void makeCall(UUID sessionUuid, String callerExtension, String callee, String gatewayName, String callerIdNumber) {
        if (callerExtension == null || !EXTENSION_PATTERN.matcher(callerExtension).matches()
                || callee == null || !PHONE_PATTERN.matcher(callee).matches()) {
            throw new IllegalArgumentException("Noto'g'ri raqam formati: originate yuborilmadi");
        }
        if (gatewayName == null || !UUID_PATTERN.matcher(gatewayName).matches()) {
            throw new IllegalArgumentException("Noto'g'ri gateway nomi: originate yuborilmadi");
        }

        // MUHIM (FreeSWITCH implementatsiyasidan meros - bu UzTelecom carrier'ning
        // HAQIQIY talabi, PBX dvigateliga bog'liq emas, shuning uchun Asterisk'da ham
        // AYNAN shu tartib saqlanishi SHART): trunk oyog'i BIRINCHI originate qilinadi.
        // Agar operator (brauzer) oyog'i trunk hali javob bermasdan bridge qilinsa,
        // UzTelecom "503 Service Unavailable" bilan qo'ng'iroqni darhol rad etadi
        // (ilgari FreeSwitchAdapter.makeCall'da 2026-07-18 jonli sinovda bosqichma-bosqich
        // aniqlangan). Operator oyog'i faqat AsteriskEventListener trunk kanalining
        // "Up" holatga o'tganini ko'rgandan KEYIN originate qilinadi - ilgari FreeSWITCH
        // "trunk_answered" dialplan konteksti bajargan ishni endi shu orkestratsiya
        // (AsteriskAdapter + AsteriskCallState + AsteriskEventListener) bajaradi.
        callState.putRole(sessionUuid.toString(), "outbound-trunk", callerExtension);

        String endpoint = "PJSIP/" + callee + "@" + gatewayName;
        ariClient.originate(sessionUuid.toString(), endpoint, "telephony-app", "outbound-trunk",
                callerIdNumber, Map.of("operator_ext", callerExtension));
    }

    @Override
    public void hangupCall(String channelUuid) {
        ariClient.hangup(channelUuid);
    }

    @Override
    public void bridgeIncomingCall(String channelUuid, List<String> extensionNumbers) {
        if (channelUuid == null || channelUuid.isBlank()) {
            throw new IllegalArgumentException("Noto'g'ri kanal ID: bridge yuborilmadi");
        }
        List<String> validExtensions = extensionNumbers == null ? List.of() : extensionNumbers.stream()
                .filter(ext -> ext != null && EXTENSION_PATTERN.matcher(ext).matches())
                .toList();
        if (validExtensions.isEmpty()) {
            log.warn("Kiruvchi qo'ng'iroq uchun to'g'ri extension topilmadi (channel={}) - bridge yuborilmadi", channelUuid);
            return;
        }

        String bridgeId = channelUuid + "-bridge";
        ariClient.createBridge(bridgeId);
        // Park qilingan (Stasis'da kutib turgan) kiruvchi trunk kanalini darhol
        // bridge'ga qo'shamiz - operator oyoqlari javob berishi bilanoq ovoz oqishi uchun.
        ariClient.addChannelToBridge(bridgeId, channelUuid);

        // Bir nechta operator bo'lsa - bir vaqtda jiringlaydi (ring group). Birinchi
        // javob bergan bridge'ga qo'shiladi, qolganlari AsteriskEventListener
        // tomonidan avtomatik uziladi (FreeSWITCH'ning "bridge:user/A,user/B" -
        // birinchi javob bergan g'olib bo'lish xatti-harakatiga ekvivalent).
        List<String> operatorChannelIds = new ArrayList<>();
        for (String ext : validExtensions) {
            operatorChannelIds.add(channelUuid + "-op-" + ext);
        }
        callState.registerRingGroup(bridgeId, operatorChannelIds);

        for (int i = 0; i < validExtensions.size(); i++) {
            String ext = validExtensions.get(i);
            String opChannelId = operatorChannelIds.get(i);
            callState.putRole(opChannelId, "operator-leg", bridgeId);
            ariClient.originate(opChannelId, "PJSIP/" + ext, "telephony-app", "operator-leg," + bridgeId, null, Map.of());
        }
    }

    @Override
    public void holdForQueue(String channelUuid) {
        if (channelUuid == null || channelUuid.isBlank()) {
            return;
        }
        // MUHIM: nomi ATAYIN "bridgeIncomingCall"dagi mixing bridge nomidan
        // ("<channelUuid>-bridge") FARQLI ("-queue-bridge") - operator
        // bo'shashi bilan bridgeIncomingCall YANGI mixing bridge yaratadi va
        // kanalni shu yerga ko'chiradi, bu esa kanalni ushbu kutish
        // bridge'idan AVTOMATIK chiqaradi (ARI: bir kanal bir vaqtda faqat
        // bitta bridge'da bo'ladi) - shu bilan MOH ham o'z-o'zidan to'xtaydi.
        String bridgeId = channelUuid + "-queue-bridge";
        ariClient.createHoldingBridge(bridgeId);
        ariClient.addChannelToBridge(bridgeId, channelUuid);
        ariClient.startMoh(bridgeId, "default");
    }

    @Override
    public String getAdapterName() {
        return "Asterisk ARI Adapter";
    }

    @Override
    public void reloadDirectory() {
        ariClient.reloadModule("res_pjsip.so");
    }

    @Override
    public String queryRegistrationStatus(String gatewayName) {
        if (gatewayName == null || !UUID_PATTERN.matcher(gatewayName).matches()) {
            return null;
        }
        return ariClient.getEndpointState(gatewayName);
    }
}
