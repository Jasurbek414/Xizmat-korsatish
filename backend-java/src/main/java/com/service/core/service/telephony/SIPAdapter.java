package com.service.core.service.telephony;

import com.service.core.model.SipAccount;
import java.util.UUID;

public interface SIPAdapter {
    void register(SipAccount account);
    void unregister(SipAccount account);

    /**
     * @param callerExtension operatorning FreeSWITCH "internal" profilidagi ICHKI
     *                        extension raqami (Device.extensionNumber) - UzTelecom
     *                        trunk hisobi bilan aloqasi yo'q.
     * @param gatewayName     "external" profildagi gateway nomi - bu HAR DOIM
     *                        SipAccount.getId().toString() (UUID), username EMAS
     *                        (FreeSwitchGatewayFileWriter shunday yozadi).
     * @param callerIdNumber  UzTelecom'ga KO'RSATILADIGAN chiquvchi caller ID
     *                        (trunk hisob username'i, masalan "101"). MUHIM:
     *                        bo'sh/noto'g'ri caller ID bo'lsa UzTelecom IPBX
     *                        qo'ng'iroqni "503 congestion" (Q.850 cause 34) bilan
     *                        RAD ETADI (jonli sinovda aniqlangan asosiy sabab).
     */
    void makeCall(UUID sessionUuid, String callerExtension, String callee, String gatewayName, String callerIdNumber);
    void hangupCall(String channelUuid);

    /**
     * KIRUVCHI qo'ng'iroq: "public" kontekstда park qilingan (ushlangan) tashqi
     * qo'ng'iroqni operator(lar)ning ichki extension'iga (brauzer) ulaydi.
     * @param channelUuid  park qilingan kiruvchi qo'ng'iroqning kanal UUID'i
     *                     (CHANNEL_PARK hodisasidagi Unique-ID).
     * @param bridgeTarget FreeSWITCH bridge dial-string, masalan
     *                     "user/2001,user/2002" (bir nechta operatorni bir vaqtda
     *                     jiringlatadi - birinchi javob bergan ulanadi).
     */
    void bridgeIncomingCall(String channelUuid, String bridgeTarget);
    String getAdapterName();

    /**
     * FreeSWITCH XML konfiguratsiyasini (directory, dialplan, profillar
     * ro'yxati) qayta yuklaydi - masalan yangi ichki extension fayli
     * yozilgandan keyin. Faol qo'ng'iroqlarga ta'sir qilmaydi.
     */
    void reloadDirectory();

    /**
     * Trunk gateway'ning FreeSWITCH'dagi HAQIQIY ro'yxatdan o'tish holatini
     * ("REGISTERED"/"REGISTERING"/"FAILED"/"UNREGISTERED") to'g'ridan-to'g'ri
     * so'rab qaytaradi (hodisaga bog'liq emas). Aniqlab bo'lmasa null.
     *
     * @param gatewayName SipAccount.getId().toString() (UUID)
     */
    String queryRegistrationStatus(String gatewayName);
}
