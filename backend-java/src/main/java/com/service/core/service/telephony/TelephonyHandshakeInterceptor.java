package com.service.core.service.telephony;

import com.service.core.config.JwtTokenProvider;
import com.service.core.model.User;
import com.service.core.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.Optional;

/**
 * /ws/telephony ulanishini JWT bilan tekshiradi. Bu handshake bosqichida ishlaydi
 * (Spring Security'ning oddiy filter zanjiri WebSocket upgrade so'roviga ta'sir
 * qilmagani uchun), shuning uchun mavjud JwtTokenProvider'ni shu yerda qo'lda
 * qayta ishlatamiz. Brauzer token'ni Authorization sarlavhasi orqali emas,
 * query parametri orqali yuboradi (WebSocket API'da custom header yo'q).
 */
@Component
public class TelephonyHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(TelephonyHandshakeInterceptor.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public TelephonyHandshakeInterceptor(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = UriComponentsBuilder.fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst("token");

        if (token == null || token.isBlank() || !jwtTokenProvider.validateToken(token)) {
            log.warn("Telephony WebSocket handshake rad etildi: token yo'q yoki yaroqsiz");
            response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return false;
        }

        String username = jwtTokenProvider.getUsername(token);
        String companyId = jwtTokenProvider.getCompanyId(token);
        String role = jwtTokenProvider.getRole(token);

        if (companyId == null || companyId.isBlank()) {
            log.warn("Telephony WebSocket handshake rad etildi: tokenda companyId yo'q (username={})", username);
            response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return false;
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            log.warn("Telephony WebSocket handshake rad etildi: foydalanuvchi topilmadi (username={})", username);
            response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return false;
        }

        attributes.put("userId", userOpt.get().getId());
        attributes.put("companyId", companyId);
        attributes.put("role", role);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // Hech narsa qilish shart emas.
    }
}
