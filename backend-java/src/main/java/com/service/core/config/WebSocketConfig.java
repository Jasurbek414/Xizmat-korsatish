package com.service.core.config;

import com.service.core.service.gps.GpsHandshakeInterceptor;
import com.service.core.service.gps.GpsWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GpsWebSocketHandler gpsWebSocketHandler;
    private final GpsHandshakeInterceptor gpsHandshakeInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:3005}")
    private String allowedOrigins;

    public WebSocketConfig(GpsWebSocketHandler gpsWebSocketHandler,
                           GpsHandshakeInterceptor gpsHandshakeInterceptor) {
        this.gpsWebSocketHandler = gpsWebSocketHandler;
        this.gpsHandshakeInterceptor = gpsHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toArray(String[]::new);

        // /ws/gps - "Xodimlar Monitoringi" xaritasi uchun real vaqt kanali
        registry.addHandler(gpsWebSocketHandler, "/ws/gps")
                .addInterceptors(gpsHandshakeInterceptor)
                .setAllowedOriginPatterns(origins);
    }
}
