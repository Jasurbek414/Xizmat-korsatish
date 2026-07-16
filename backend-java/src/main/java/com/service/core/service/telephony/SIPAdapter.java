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
     */
    void makeCall(UUID sessionUuid, String callerExtension, String callee, String gatewayName);
    void hangupCall(String channelUuid);
    String getAdapterName();

    /**
     * FreeSWITCH XML konfiguratsiyasini (directory, dialplan, profillar
     * ro'yxati) qayta yuklaydi - masalan yangi ichki extension fayli
     * yozilgandan keyin. Faol qo'ng'iroqlarga ta'sir qilmaydi.
     */
    void reloadDirectory();
}
