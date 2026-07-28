package com.service.core.service.telephony;

import com.service.core.model.SipAccount;
import java.util.List;
import java.util.UUID;

/**
 * PBX dvigateliga (hozir: Asterisk/ARI, ilgari: FreeSWITCH/ESL) bog'liq
 * bo'lmagan qo'ng'iroq boshqaruvi abstraksiyasi. TelephonyService faqat shu
 * interfeys orqali ishlaydi - qaysi PBX ishlatilayotgani unga ko'rinmaydi.
 */
public interface SIPAdapter {
    void register(SipAccount account);
    void unregister(SipAccount account);

    /**
     * @param callerExtension operatorning ICHKI extension raqami (Device.extensionNumber) -
     *                        UzTelecom trunk hisobi bilan aloqasi yo'q.
     * @param gatewayName     trunk endpoint/gateway identifikatori - bu HAR DOIM
     *                        SipAccount.getId().toString() (UUID), username EMAS
     *                        (AsteriskTrunkConfigWriter shunday yozadi).
     * @param callerIdNumber  UzTelecom'ga KO'RSATILADIGAN chiquvchi caller ID
     *                        (trunk hisob username'i, masalan "101"). MUHIM:
     *                        bo'sh/noto'g'ri caller ID bo'lsa UzTelecom IPBX
     *                        qo'ng'iroqni "503 congestion" bilan RAD ETADI
     *                        (FreeSWITCH implementatsiyasida jonli sinovda
     *                        aniqlangan, carrier'ning o'zi talab qiladi).
     */
    void makeCall(UUID sessionUuid, String callerExtension, String callee, String gatewayName, String callerIdNumber);
    void hangupCall(String channelUuid);

    /**
     * KIRUVCHI qo'ng'iroq: Stasis ilovasida kutib turgan (park qilingan) tashqi
     * qo'ng'iroqni operator(lar)ning ichki extension'iga (brauzer) ulaydi.
     * @param channelUuid      kutib turgan kiruvchi qo'ng'iroqning kanal ID'i.
     * @param extensionNumbers onlayn operatorlarning ichki extension raqamlari
     *                         ro'yxati (masalan ["2001","2002"]) - bir vaqtda
     *                         jiringlaydi, birinchi javob bergan ulanadi. Har bir
     *                         adapter buni o'z PBX'ining dial-string formatiga
     *                         (masalan "PJSIP/2001") o'zi o'giradi - bu qatlam
     *                         hech qanday PBX'ga xos formatni bilmaydi.
     */
    void bridgeIncomingCall(String channelUuid, List<String> extensionNumbers);

    /**
     * Onlayn operator topilmagan kiruvchi qo'ng'iroqni "kutish" holatiga
     * o'tkazadi (musiqa bilan) - darhol uzish o'rniga. Operator bo'shashi
     * bilan {@link #bridgeIncomingCall} shu channelUuid bilan QAYTA
     * chaqiriladi - alohida "navbatdan chiqarish" metodi shart emas, chunki
     * kanalni yangi bridge'ga qo'shish uni eskisidan (kutish bridge'i)
     * avtomatik chiqaradi.
     */
    void holdForQueue(String channelUuid);

    String getAdapterName();

    /**
     * PBX konfiguratsiyasini (endpoint/directory ro'yxati) qayta yuklaydi -
     * masalan yangi ichki extension fayli yozilgandan keyin. Faol
     * qo'ng'iroqlarga ta'sir qilmaydi.
     */
    void reloadDirectory();

    /**
     * Trunk'ning PBX'dagi HAQIQIY ro'yxatdan o'tish holatini
     * ("REGISTERED"/"REGISTERING"/"FAILED"/"UNREGISTERED") to'g'ridan-to'g'ri
     * so'rab qaytaradi (hodisaga bog'liq emas). Aniqlab bo'lmasa null.
     *
     * @param gatewayName SipAccount.getId().toString() (UUID)
     */
    String queryRegistrationStatus(String gatewayName);
}
