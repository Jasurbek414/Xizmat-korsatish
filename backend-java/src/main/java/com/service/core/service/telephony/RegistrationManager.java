package com.service.core.service.telephony;

import com.service.core.model.Registration;
import com.service.core.model.SipAccount;
import com.service.core.repository.RegistrationRepository;
import com.service.core.repository.SipAccountRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RegistrationManager {

    private final SipAccountRepository sipAccountRepository;
    private final RegistrationRepository registrationRepository;
    private final SIPAdapter sipAdapter;
    private final AsteriskTrunkConfigWriter trunkConfigWriter;
    private final TelephonyEventBus eventBus;

    private final Map<UUID, String> statusCache = new ConcurrentHashMap<>();

    /**
     * Trunk ro'yxatdan o'tmagan holatda konfiguratsiya o'zgarmagan bo'lsa ham
     * res_pjsip'ni majburan qayta yuklash oralig'i (zaxira "o'z-o'zini tuzatish"
     * uchun) - har 30 s emas, 10 daqiqada bir marta.
     */
    private static final long FORCED_RELOAD_INTERVAL_MS = 10 * 60 * 1000L;
    private final Map<UUID, Long> lastForcedReload = new ConcurrentHashMap<>();

    public RegistrationManager(SipAccountRepository sipAccountRepository,
                               RegistrationRepository registrationRepository,
                               SIPAdapter sipAdapter,
                               AsteriskTrunkConfigWriter trunkConfigWriter,
                               TelephonyEventBus eventBus) {
        this.sipAccountRepository = sipAccountRepository;
        this.registrationRepository = registrationRepository;
        this.sipAdapter = sipAdapter;
        this.trunkConfigWriter = trunkConfigWriter;
        this.eventBus = eventBus;
    }

    public String getStatus(UUID sipAccountId) {
        return statusCache.getOrDefault(sipAccountId, "UNREGISTERED");
    }

    public void updateStatus(UUID sipAccountId, String status, String errorMessage) {
        statusCache.put(sipAccountId, status);
        
        SipAccount account = sipAccountRepository.findById(sipAccountId).orElse(null);
        if (account == null) return;

        List<Registration> active = registrationRepository.findBySipAccountId(sipAccountId);
        Registration reg;
        if (active.isEmpty()) {
            reg = Registration.builder()
                    .sipAccount(account)
                    .status(status)
                    .build();
        } else {
            reg = active.get(0);
            reg.setStatus(status);
        }

        if ("REGISTERED".equals(status)) {
            reg.setLastRegisteredAt(LocalDateTime.now());
            reg.setNextRegisterDue(LocalDateTime.now().plusSeconds(account.getKeepaliveInterval()));
            reg.setErrorMessage(null);
        } else {
            reg.setErrorMessage(errorMessage);
        }

        registrationRepository.save(reg);

        // Trunk status o'zgarganini real-time ravishda frontendga xabar qilamiz -
        // shunda UI'dagi "Trunk aloqa" statusi darhol yangilanadi (polling kerak emas).
        eventBus.publish(new TelephonyEvent("TRUNK_STATUS",
                Map.of("sipAccountId", sipAccountId.toString(), "status", status),
                account.getCompany().getId()));
    }

    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void checkAndRegisterTrunks() {
        List<SipAccount> accounts = sipAccountRepository.findAll();
        for (SipAccount account : accounts) {
            // MUHIM: avval PBX'ning HAQIQIY holatini so'raymiz (ARI endpoint
            // holati orqali) - hodisaga tayanmaymiz, aks holda cache noto'g'ri
            // "UNREGISTERED"da qolib ketardi (bu esa ishlaydigan trunk'ni har
            // 30 soniyada keraksiz qayta ro'yxatdan o'tkazishga urinishga,
            // ya'ni "registration churn"ga sabab bo'lardi - TELEFONIYA-XATOLAR.md
            // 19-band).
            String realStatus = sipAdapter.queryRegistrationStatus(account.getId().toString());
            if (realStatus != null && !realStatus.equals(getStatus(account.getId()))) {
                // Haqiqiy holat cache'dagidan FARQ qilsagina yozamiz - aks holda
                // har 30 soniyada keraksiz DB yozuvi va TRUNK_STATUS hodisasi
                // yuborilardi (UI shuni ko'radi, o'zgarmagan holat qayta-qayta
                // yuborilishi shart emas).
                updateStatus(account.getId(), realStatus, null);
            }

            String effectiveStatus = realStatus != null ? realStatus : getStatus(account.getId());

            // Faqat HAQIQATDA ro'yxatdan o'tmagan/xato bo'lgan trunk uchun qayta
            // urinAMIZ - REGED/REGISTERING holatidagi ishlaydigan ulanishga
            // tegmaymiz.
            if ("UNREGISTERED".equals(effectiveStatus) || "FAILED".equals(effectiveStatus)) {
                // MUHIM (2026-10-05 audit, JONLI loglarda tasdiqlangan): avval trunk
                // ro'yxatdan o'tmagan har 30 soniyada fayl QAYTA YOZILIB, butun
                // res_pjsip moduli qayta yuklanardi (10 kunda ~29 500 marta). Bu:
                //  - ishlab turgan barcha brauzer extension'lari va faol qo'ng'iroqlar
                //    turgan PJSIP stekini har 30 s da "silkitardi";
                //  - Asterisk'ning o'z qayta urinish taymerini (retry_interval /
                //    fatal_retry_interval, [id-reg] bo'limida) har safar nolga qaytarib,
                //    uni amalda ishlatmay qo'yardi;
                //  - holat FAILED -> REGISTERING -> FAILED bo'lib aylanib, har 30 s da
                //    2 ta DB yozuvi va UI'ga 2 ta TRUNK_STATUS hodisasi yuborardi;
                //  - asterisk.log'ni ~35 daqiqada 50 MB ga to'ldirardi.
                // Endi: fayl faqat mazmuni o'zgargan/yo'qolgan bo'lsa yoziladi va
                // modul faqat shunda (yoki zaxira sifatida FORCED_RELOAD_INTERVAL'da
                // bir marta) qayta yuklanadi. Qolgan paytda qayta urinishni
                // Asterisk o'zi bajaradi.
                try {
                    boolean configChanged = trunkConfigWriter.writeConfigIfChanged(account);
                    Long lastReload = lastForcedReload.get(account.getId());
                    long now = System.currentTimeMillis();
                    boolean reloadDue = lastReload == null || now - lastReload >= FORCED_RELOAD_INTERVAL_MS;
                    if (configChanged || reloadDue) {
                        lastForcedReload.put(account.getId(), now);
                        sipAdapter.register(account);
                        updateStatus(account.getId(), "REGISTERING", null);
                    }
                } catch (Exception e) {
                    updateStatus(account.getId(), "FAILED", e.getMessage());
                }
            }
        }
    }
}
