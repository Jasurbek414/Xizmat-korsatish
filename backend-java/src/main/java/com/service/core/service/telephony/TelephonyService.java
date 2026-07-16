package com.service.core.service.telephony;

import com.service.core.model.CallSession;
import com.service.core.model.Device;
import com.service.core.model.SipAccount;
import com.service.core.model.User;
import com.service.core.repository.CallSessionRepository;
import com.service.core.repository.DeviceRepository;
import com.service.core.repository.SipAccountRepository;
import com.service.core.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class TelephonyService {

    private final SIPAdapter sipAdapter;
    private final RegistrationManager registrationManager;
    private final SessionManager sessionManager;
    private final PresenceManager presenceManager;
    private final TelephonyEventBus eventBus;
    private final CallSessionRepository callSessionRepository;
    private final SipAccountRepository sipAccountRepository;
    private final FreeSwitchGatewayFileWriter gatewayFileWriter;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;

    public TelephonyService(SIPAdapter sipAdapter,
                            RegistrationManager registrationManager,
                            SessionManager sessionManager,
                            PresenceManager presenceManager,
                            TelephonyEventBus eventBus,
                            CallSessionRepository callSessionRepository,
                            SipAccountRepository sipAccountRepository,
                            FreeSwitchGatewayFileWriter gatewayFileWriter,
                            DeviceRepository deviceRepository,
                            UserRepository userRepository) {
        this.sipAdapter = sipAdapter;
        this.registrationManager = registrationManager;
        this.sessionManager = sessionManager;
        this.presenceManager = presenceManager;
        this.eventBus = eventBus;
        this.callSessionRepository = callSessionRepository;
        this.sipAccountRepository = sipAccountRepository;
        this.gatewayFileWriter = gatewayFileWriter;
        this.deviceRepository = deviceRepository;
        this.userRepository = userRepository;
    }

    // Chaqiruvchi/chaqirilayotgan raqamlarda faqat raqamlar va SIP uchun odatiy
    // maxsus belgilarga ruxsat beriladi - bu qiymatlar keyinroq ESL "api"
    // buyrug'iga qo'yiladi, shuning uchun bu yerda qat'iy tekshirilishi shart
    // (buyruqqa in'ektsiya oldini olish).
    private static final java.util.regex.Pattern PHONE_PATTERN =
            java.util.regex.Pattern.compile("^[0-9+*#]{1,20}$");

    public void registerSipAccount(SipAccount account) {
        registrationManager.updateStatus(account.getId(), "REGISTERING", null);
        // Haqiqiy FreeSWITCH gateway faylini yozamiz - shundan keyingina "rescan"
        // buyrug'i ma'noli bo'ladi (aks holda FreeSWITCH bu hisob haqida bilmaydi).
        gatewayFileWriter.writeGateway(account);
        try {
            sipAdapter.register(account);
            // Haqiqiy "REGISTERED" holati endi FreeSwitchEventListener orqali
            // FreeSWITCH'ning o'z sofia::gateway_state hodisasi kelganda
            // tasdiqlanadi - bu yerda muvaffaqiyat oldindan taxmin qilinmaydi.
            eventBus.publish(new TelephonyEvent("REGISTRATION", account.getId(), account.getCompany().getId()));
        } catch (Exception e) {
            registrationManager.updateStatus(account.getId(), "FAILED", e.getMessage());
        }
    }

    /**
     * Mavjud SipAccount sozlamalari o'zgartirilganda (audit: "Dublikat trunk
     * yaratilishi" xatosi - frontend har safar sozlamani saqlashda YANGI
     * SipAccount yaratardi, chunki yangilash uchun alohida endpoint yo'q edi).
     * Gateway fayli nomi hisob ID'siga bog'liq bo'lgani uchun (ID o'zgarmaydi),
     * faylni yangi qiymatlar bilan qayta yozib, eski ro'yxatdan o'tishni
     * "killgw" bilan tugatib, keyin "rescan" orqali yangi fayl yuklanadi.
     */
    public void updateSipAccount(SipAccount account) {
        registrationManager.updateStatus(account.getId(), "REGISTERING", null);
        gatewayFileWriter.writeGateway(account);
        try {
            sipAdapter.unregister(account);
            sipAdapter.register(account);
            eventBus.publish(new TelephonyEvent("REGISTRATION", account.getId(), account.getCompany().getId()));
        } catch (Exception e) {
            registrationManager.updateStatus(account.getId(), "FAILED", e.getMessage());
        }
    }

    public void unregisterSipAccount(SipAccount account) {
        try {
            sipAdapter.unregister(account);
            gatewayFileWriter.deleteGateway(account);
            registrationManager.updateStatus(account.getId(), "UNREGISTERED", null);
        } catch (Exception e) {
            // Ignore
        }
    }

    /**
     * Mijoz (brauzer, /ws/telephony orqali) chaqiruvni boshlashni so'raganda ishlatiladi.
     * requestingCompanyId - ulanishni tasdiqlagan JWT'dan olingan kompaniya (IDOR/toll-fraud'ni
     * oldini olish uchun so'ralgan sipAccountId shu kompaniyaga tegishli ekanligi tekshiriladi).
     * requestingUserId - JWT'dan olingan HAQIQIY operator. "caller" (extension)
     * MIJOZDAN OLINMAYDI - audit'da topilgan xavfsizlik xatosi: mijoz o'zgacha
     * extension yuborib, boshqa operatorning qurilmasini chaqirib, uni tashqi
     * raqamga ulab qo'yishi mumkin edi. Endi extension har doim so'rovchi
     * foydalanuvchining O'Z Device yozuvidan serverda aniqlanadi.
     */
    public UUID initiateCall(UUID sipAccountId, String callee, UUID requestingCompanyId, UUID requestingUserId) {
        if (callee == null || !PHONE_PATTERN.matcher(callee).matches()) {
            throw new IllegalArgumentException("Noto'g'ri raqam formati");
        }

        SipAccount account = sipAccountRepository.findById(sipAccountId).orElse(null);
        if (account == null) {
            throw new RuntimeException("SIP Account topilmadi");
        }
        if (!account.getCompany().getId().equals(requestingCompanyId)) {
            throw new SecurityException("Bu SIP hisobidan foydalanishga ruxsatingiz yo'q");
        }

        Device device = deviceRepository.findFirstByUserIdAndDeviceType(requestingUserId, "WEBRTC")
                .orElseThrow(() -> new RuntimeException("Sizga hali ichki SIP extension biriktirilmagan"));
        String caller = device.getExtensionNumber();

        UUID sessionUuid = UUID.randomUUID();
        ActiveSession session = ActiveSession.builder()
                .callUuid(sessionUuid)
                .caller(caller)
                .callee(callee)
                .companyId(account.getCompany().getId())
                .sipAccountId(account.getId())
                .userId(requestingUserId)
                .state("INITIATED")
                .startTime(LocalDateTime.now())
                .build();

        sessionManager.startSession(session);

        try {
            // Gateway nomi har doim SipAccount.getId() (UUID) - FreeSwitchGatewayFileWriter
            // shunday yozadi (username emas).
            sipAdapter.makeCall(sessionUuid, caller, callee, account.getId().toString());
            eventBus.publish(new TelephonyEvent("INVITE", session, session.getCompanyId()));
        } catch (Exception e) {
            session.setState("FAILED");
            sessionManager.removeSession(sessionUuid);
            throw new RuntimeException("Qo'ng'iroq boshlanmadi: " + e.getMessage());
        }

        return sessionUuid;
    }

    /** ESL hodisa tinglovchisi (ishonchli, ichki manba) tomonidan chaqiriladi. */
    public void answerCall(UUID sessionUuid) {
        ActiveSession session = sessionManager.getSession(sessionUuid);
        // Idempotent: answerTime faqat BIRINCHI marta o'rnatiladi. Aks holda
        // avtoritativ CHANNEL_BRIDGE vaqtidan KEYIN mijozdan kelgan ANSWER
        // xabari haqiqiy javob vaqtini qayta yozib, davomiylik hisobini
        // buzishi mumkin edi.
        if (session != null && session.getAnswerTime() == null) {
            session.setState("CONNECTED");
            session.setAnswerTime(LocalDateTime.now());
            eventBus.publish(new TelephonyEvent("ANSWER", session, session.getCompanyId()));
        }
    }

    /** Mijoz (/ws/telephony) tomonidan so'ralganda - avval egalik tekshiriladi. */
    public void answerCall(UUID sessionUuid, UUID requestingCompanyId) {
        ActiveSession session = sessionManager.getSession(sessionUuid);
        if (session == null || !session.getCompanyId().equals(requestingCompanyId)) {
            return;
        }
        answerCall(sessionUuid);
    }

    /** ESL hodisa tinglovchisi (ishonchli, ichki manba) tomonidan chaqiriladi. */
    public void endCall(UUID sessionUuid, String reason) {
        ActiveSession session = sessionManager.getSession(sessionUuid);
        if (session != null) {
            session.setState("ENDED");
            session.setEndTime(LocalDateTime.now());

            // MUHIM (audit'da topilgan xato): avval "startTime" (raqam terilgan
            // payt)dan hisoblangani uchun jiringlash vaqti ham davomiylikka
            // qo'shilib ketardi. Endi faqat HAQIQIY javob berilgan vaqtdan
            // (answerTime) hisoblanadi - javob berilmagan bo'lsa 0.
            int seconds = 0;
            if (session.getAnswerTime() != null) {
                seconds = (int) java.time.Duration.between(session.getAnswerTime(), session.getEndTime()).getSeconds();
            }
            session.setDuration(seconds);

            // Kanalni FreeSWITCH darajasida ham tugatamiz - agar brauzer/tarmoq
            // uzilib qolgan bo'lsa ham tashqi liniya band bo'lib qolmasligi uchun
            // (audit: "hangupCall() hech qayerdan chaqirilmaydi" xatosi).
            sipAdapter.hangupCall(sessionUuid.toString());

            User dispatcher = session.getUserId() != null
                    ? userRepository.findById(session.getUserId()).orElse(null)
                    : null;

            CallSession dbSession = CallSession.builder()
                    .sipAccount(sipAccountRepository.findById(session.getSipAccountId()).orElse(null))
                    .dispatcher(dispatcher)
                    .clientPhone(session.getCallee())
                    .direction("OUTBOUND")
                    .status(reason != null ? reason : "SUCCESS")
                    .duration(seconds)
                    .build();

            callSessionRepository.save(dbSession);
            sessionManager.removeSession(sessionUuid);
            eventBus.publish(new TelephonyEvent("BYE", session, session.getCompanyId()));
        }
    }

    /** Mijoz (/ws/telephony) tomonidan so'ralganda - avval egalik tekshiriladi. */
    public void endCall(UUID sessionUuid, String reason, UUID requestingCompanyId) {
        ActiveSession session = sessionManager.getSession(sessionUuid);
        if (session == null || !session.getCompanyId().equals(requestingCompanyId)) {
            return;
        }
        endCall(sessionUuid, reason);
    }

    /**
     * Javobsiz qolib ketgan sessiyalarni tozalash. FreeSwitchAdapter ESL
     * buyrug'ini alohida oqimda (asinxron) yuboradi - agar ESL ulanishi
     * jimgina xato bersa (masalan FreeSWITCH vaqtincha ishlamay tursa),
     * hech qanday CHANNEL_* hodisa kelmaydi va sessiya xotirada abadiy
     * "INITIATED" holatda qolib ketardi. Operator qo'ng'iroqlari odatda
     * ~60 soniyada javobsiz deb tugatiladi, shuning uchun 3 daqiqadan oshgan
     * javobsiz sessiya aniq o'lik - uni tugatamiz (kanal hali tirik bo'lsa
     * uzib qo'yish ham to'g'ri: tashqi liniyani band qilib turmasin).
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void expireStaleSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(3);
        for (ActiveSession session : sessionManager.getAllActiveSessions().values()) {
            if (session.getAnswerTime() == null
                    && session.getStartTime() != null
                    && session.getStartTime().isBefore(cutoff)) {
                endCall(session.getCallUuid(), "TIMEOUT");
            }
        }
    }
}
