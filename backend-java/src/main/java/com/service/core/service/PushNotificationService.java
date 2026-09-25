package com.service.core.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.service.core.config.FirebaseConfig;
import com.service.core.model.AppNotification;
import com.service.core.model.Order;
import com.service.core.model.User;
import com.service.core.repository.AppNotificationRepository;
import com.service.core.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Xodimlarga (haydovchi/ishchi) yangi buyurtma tayinlanganda yoki boshqa muhim
 * hodisalarda push bildirishnoma yuborish uchun ishlatiladi. Firebase sozlanmagan
 * bo'lsa (dev muhit), chaqiruvlar jimgina o'tkazib yuboriladi.
 */
@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    // mobile-flutter/lib/features/notifications/services/push_notification_service.dart
    // dagi _ordersChannel bilan BIR XIL bo'lishi shart - aks holda Android bu xabarni
    // "Miscellaneous" degan avtomatik kanalga tushirib, foydalanuvchiga ovozsiz ko'rsatadi.
    private static final String ORDERS_CHANNEL_ID = "orders_channel";

    private final FirebaseConfig firebaseConfig;
    private final AppNotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public PushNotificationService(FirebaseConfig firebaseConfig,
                                    AppNotificationRepository notificationRepository,
                                    UserRepository userRepository) {
        this.firebaseConfig = firebaseConfig;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /**
     * Buyurtma xodimga tayinlanganda - mijoz ismi, xizmat turi, manzil va narxni
     * aniq ko'rsatadigan bildirishnoma yuboradi (xodim ekranga qaramasdan ham
     * nima uchun chaqirilganini bilishi uchun).
     */
    public void notifyOrderAssigned(Order order) {
        User worker = order.getWorker();
        if (worker == null) {
            return;
        }

        String serviceName = order.getService() != null ? order.getService().getNameUz() : null;
        String clientName = order.getClient() != null ? order.getClient().getFullName() : null;
        String clientPhone = order.getClient() != null ? order.getClient().getPhone() : null;

        String title = (serviceName != null && !serviceName.isBlank())
                ? "Yangi buyurtma — " + serviceName
                : "Yangi buyurtma tayinlandi";

        StringBuilder body = new StringBuilder();
        if (clientName != null && !clientName.isBlank()) {
            body.append(clientName);
            if (clientPhone != null && !clientPhone.isBlank()) {
                body.append(" (").append(clientPhone).append(")");
            }
            body.append("\n");
        }
        body.append(order.getAddress());
        if (order.getPrice() != null) {
            body.append(" • ").append(order.getPrice()).append(" so'm");
        }

        sendToToken(worker.getFcmToken(), title, body.toString());
        saveNotification(worker, title, body.toString(), "ORDER_ASSIGNED");
    }

    /** Push jo'natilsin-jo'natilmasin (token yo'q/xato) - ilova ichidagi tarix baribir saqlanadi. */
    private void saveNotification(User user, String title, String body, String type) {
        try {
            notificationRepository.save(AppNotification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type(type)
                    .build());
        } catch (Exception e) {
            log.warn("Bildirishnoma tarixga yozilmadi: {}", e.getMessage());
        }
    }

    /**
     * Yangi mobil versiya chiqqanda BARCHA qurilmalarga (barcha kompaniyalar
     * bo'ylab) bir vaqtda yuboriladi - `app_updates` MAVZUSIGA (topic).
     * Alohida-alohida token bo'ylab yubormaydi (bu yuzlab so'rov degani),
     * FCM o'zi obuna bo'lgan barcha qurilmalarga tarqatadi.
     *
     * Ma'lumot (data) turida yuboriladi, `notification` bloki YO'Q - aks
     * holda Android xabarni O'ZI ko'rsatib qo'yardi (sarlavha/matn
     * mobil ilova nazorat qilmagan holda), ilova esa mijoz kodida
     * (`push_notification_service.dart`) `data['type']=='APP_UPDATE'` ni
     * tekshirib, HAQIQIY yangilanish oynasini (majburiy bo'lishi mumkin)
     * o'zi ko'rsatadi.
     */
    public boolean broadcastAppUpdate(String version, String message) {
        if (!firebaseConfig.isInitialized()) {
            log.warn("Firebase sozlanmagan - yangilanish bildirishnomasi yuborilmadi.");
            return false;
        }

        Message fcmMessage = Message.builder()
                .setTopic("app_updates")
                .putData("type", "APP_UPDATE")
                .putData("version", version == null ? "" : version)
                .putData("message", message == null ? "" : message)
                .build();

        try {
            String messageId = FirebaseMessaging.getInstance().send(fcmMessage);
            log.info("Yangilanish bildirishnomasi 'app_updates' mavzusiga yuborildi (messageId={})", messageId);

            // Mavzu (topic) obunasi FCM'ning o'zida - backend kim obuna bo'lganini
            // bilmaydi, shuning uchun ilova ichidagi tarixga BARCHA faol
            // foydalanuvchilar uchun yozamiz (superadmin bundan mustasno emas).
            String title = version == null || version.isBlank() ? "Yangilanish mavjud" : "Yangilanish mavjud — " + version;
            String body = message == null || message.isBlank() ? "Ilovaning yangi versiyasi chiqdi." : message;
            for (User u : userRepository.findByStatus("ACTIVE")) {
                saveNotification(u, title, body, "APP_UPDATE");
            }
            return true;
        } catch (Exception e) {
            log.warn("Yangilanish bildirishnomasini yuborishda xatolik: {} (sabab: {})",
                    e.getMessage(), e.getCause() != null ? e.getCause().getMessage() : "yo'q", e);
            return false;
        }
    }

    /**
     * Kompaniya administratori/menejeri o'z xodimlariga (haydovchi, ishchi,
     * sex xodimi va h.k.) qisqa xabar yuborishi uchun - masalan ish jadvali
     * o'zgarishi yoki muhim e'lon haqida. Faqat SHU kompaniya xodimlariga
     * yetadi (superadmin'ning `broadcastAppUpdate`si esa BARCHA kompaniyalar
     * bo'ylab - ikkisi ataylab alohida, chalkashmasin).
     */
    public int broadcastToCompany(UUID companyId, UUID senderId, String title, String body) {
        int count = 0;
        for (User u : userRepository.findByCompanyId(companyId)) {
            if (u.getId().equals(senderId)) continue;
            if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) continue;
            if (u.getFcmToken() != null && !u.getFcmToken().isBlank()) {
                sendToToken(u.getFcmToken(), title, body);
            }
            saveNotification(u, title, body, "COMPANY_ANNOUNCEMENT");
            count++;
        }
        return count;
    }

    private void sendToToken(String token, String title, String body) {
        // MUHIM (audit'da topilgan, tuzatildi): avval bu tekshiruv
        // notifyOrderAssigned'ning ENG boshida turardi va FCM token yo'q
        // bo'lsa saveNotification'gacha yetib bormasdi butunlay qaytib
        // ketardi - shu holda ilova ichidagi bildirishnoma tarixi HAM
        // yozilmasdi, garchi saveNotification'ning o'z izohi "push
        // jo'natilsin-jo'natilmasin tarix baribir saqlanadi" deb va'da
        // qilsa ham. Endi bu tekshiruv shu yerga (faqat push yuborishni
        // o'chiradigan joyga) ko'chirildi - chaqiruvchi endi doim
        // saveNotification'gacha yetib boradi.
        if (token == null || token.isBlank() || !firebaseConfig.isInitialized()) {
            return;
        }

        Message message = Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                // MUHIM: android.notification bloki mavjud bo'lsa, Android klienti title/body'ni
                // undan o'qiydi va yuqoridagi umumiy "notification"dan MEROS OLMAYDI - shu sabab
                // faqat channelId qo'yilganda xabar matni bo'sh ko'rinardi. Shuning uchun
                // title/body shu yerda ham AYNAN takrorlanishi SHART.
                .setAndroidConfig(AndroidConfig.builder()
                        .setNotification(AndroidNotification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .setChannelId(ORDERS_CHANNEL_ID)
                                .build())
                        .build())
                .build();

        try {
            FirebaseMessaging.getInstance().send(message);
        } catch (FirebaseMessagingException e) {
            log.warn("Push bildirishnoma yuborilmadi (token: {}...): {}",
                    token.substring(0, Math.min(8, token.length())), e.getMessage());
        }
    }
}
