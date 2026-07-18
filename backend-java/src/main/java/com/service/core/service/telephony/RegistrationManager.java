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
    private final FreeSwitchGatewayFileWriter gatewayFileWriter;
    private final TelephonyEventBus eventBus;

    private final Map<UUID, String> statusCache = new ConcurrentHashMap<>();

    public RegistrationManager(SipAccountRepository sipAccountRepository,
                               RegistrationRepository registrationRepository,
                               SIPAdapter sipAdapter,
                               FreeSwitchGatewayFileWriter gatewayFileWriter,
                               TelephonyEventBus eventBus) {
        this.sipAccountRepository = sipAccountRepository;
        this.registrationRepository = registrationRepository;
        this.sipAdapter = sipAdapter;
        this.gatewayFileWriter = gatewayFileWriter;
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
            // MUHIM: avval FreeSWITCH'ning HAQIQIY holatini so'raymiz - hodisaga
            // (sofia::gateway_state) tayanmaymiz, chunki gateway listener
            // ulanmasdan oldin ro'yxatdan o'tgan bo'lsa, hech qanday hodisa
            // kelmaydi va cache noto'g'ri "UNREGISTERED"da qolib ketardi (bu
            // esa ishlaydigan trunk'ni har 30 soniyada keraksiz qayta
            // ro'yxatdan o'tkazishga urinishga, ya'ni "registration churn"ga
            // sabab bo'lardi).
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
                try {
                    // Gateway faylini har safar qayta yozamiz (o'z-o'zini tuzatuvchi -
                    // masalan volume tiklanganda yoki fayl SipAccountController orqali
                    // emas, boshqa yo'l bilan yaratilgan hisob uchun hech qachon
                    // yozilmagan bo'lsa ham, shu yerda albatta mavjud bo'lishini
                    // ta'minlaydi - jonli testda aynan shu holat aniqlangan edi).
                    gatewayFileWriter.writeGateway(account);
                    sipAdapter.register(account);
                    updateStatus(account.getId(), "REGISTERING", null);
                } catch (Exception e) {
                    updateStatus(account.getId(), "FAILED", e.getMessage());
                }
            }
        }
    }
}
