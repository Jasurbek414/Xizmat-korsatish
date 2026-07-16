package com.service.core.service.telephony;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class TelephonyEventBus {

    private final List<TelephonyEventListener> listeners = new CopyOnWriteArrayList<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public void register(TelephonyEventListener listener) {
        listeners.add(listener);
    }

    public void unregister(TelephonyEventListener listener) {
        listeners.remove(listener);
    }

    public void publish(TelephonyEvent event) {
        for (TelephonyEventListener listener : listeners) {
            executor.submit(() -> {
                try {
                    listener.onEvent(event);
                } catch (Exception e) {
                    System.err.println("Event dispatch failed for listener: " + e.getMessage());
                }
            });
        }
    }
}
