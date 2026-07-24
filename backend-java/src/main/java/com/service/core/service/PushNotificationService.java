package com.service.core.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.service.core.config.FirebaseConfig;
import com.service.core.model.Order;
import com.service.core.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

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

    public PushNotificationService(FirebaseConfig firebaseConfig) {
        this.firebaseConfig = firebaseConfig;
    }

    /**
     * Buyurtma xodimga tayinlanganda - mijoz ismi, xizmat turi, manzil va narxni
     * aniq ko'rsatadigan bildirishnoma yuboradi (xodim ekranga qaramasdan ham
     * nima uchun chaqirilganini bilishi uchun).
     */
    public void notifyOrderAssigned(Order order) {
        User worker = order.getWorker();
        if (worker == null || worker.getFcmToken() == null || worker.getFcmToken().isBlank()) {
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
    }

    private void sendToToken(String token, String title, String body) {
        if (!firebaseConfig.isInitialized()) {
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
