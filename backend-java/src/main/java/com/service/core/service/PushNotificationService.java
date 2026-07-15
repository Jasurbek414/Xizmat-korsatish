package com.service.core.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.service.core.config.FirebaseConfig;
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

    private final FirebaseConfig firebaseConfig;

    public PushNotificationService(FirebaseConfig firebaseConfig) {
        this.firebaseConfig = firebaseConfig;
    }

    public void notifyOrderAssigned(User worker, String orderAddress, String servicePrice) {
        if (worker == null || worker.getFcmToken() == null || worker.getFcmToken().isBlank()) {
            return;
        }
        sendToToken(
                worker.getFcmToken(),
                "Yangi buyurtma tayinlandi",
                "Manzil: " + orderAddress + (servicePrice != null ? " • " + servicePrice + " so'm" : "")
        );
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
                .build();

        try {
            FirebaseMessaging.getInstance().send(message);
        } catch (FirebaseMessagingException e) {
            log.warn("Push bildirishnoma yuborilmadi (token: {}...): {}",
                    token.substring(0, Math.min(8, token.length())), e.getMessage());
        }
    }
}
