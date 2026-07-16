package com.service.core.config;

import com.service.core.service.telephony.TelephonyHandshakeInterceptor;
import com.service.core.service.telephony.TelephonyWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final TelephonyWebSocketHandler telephonyWebSocketHandler;
    private final TelephonyHandshakeInterceptor telephonyHandshakeInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:3005}")
    private String allowedOrigins;

    public WebSocketConfig(TelephonyWebSocketHandler telephonyWebSocketHandler,
                            TelephonyHandshakeInterceptor telephonyHandshakeInterceptor) {
        this.telephonyWebSocketHandler = telephonyWebSocketHandler;
        this.telephonyHandshakeInterceptor = telephonyHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toArray(String[]::new);

        registry.addHandler(telephonyWebSocketHandler, "/ws/telephony")
                .addInterceptors(telephonyHandshakeInterceptor)
                .setAllowedOriginPatterns(origins);
    }
}
