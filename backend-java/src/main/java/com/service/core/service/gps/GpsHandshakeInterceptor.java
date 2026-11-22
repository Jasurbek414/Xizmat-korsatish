package com.service.core.service.gps;

import com.service.core.config.JwtTokenProvider;
import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * /ws/gps WebSocket handshake interceptor - query param orqali uzatilgan JWT tokenni tekshiradi.
 */
@Component
public class GpsHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(GpsHandshakeInterceptor.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public GpsHandshakeInterceptor(JwtTokenProvider jwtTokenProvider, UserRepository userRepository,
                                   CompanyRepository companyRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = UriComponentsBuilder.fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst("token");

        if (token == null || token.isBlank() || !jwtTokenProvider.validateToken(token)) {
            log.warn("GPS WebSocket handshake rad etildi: token yo'q yoki yaroqsiz");
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        String username = jwtTokenProvider.getUsername(token);
        String companyId = jwtTokenProvider.getCompanyId(token);
        String role = jwtTokenProvider.getRole(token);

        if (companyId == null || companyId.isBlank()) {
            log.warn("GPS WebSocket handshake rad etildi: tokenda companyId yo'q (username={})", username);
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            log.warn("GPS WebSocket handshake rad etildi: foydalanuvchi topilmadi (username={})", username);
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        User user = userOpt.get();
        if (!user.isEnabled()) {
            log.warn("GPS WebSocket handshake rad etildi: foydalanuvchi faol emas (username={})", username);
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }
        if (isCompanyBlocked(companyId)) {
            log.warn("GPS WebSocket handshake rad etildi: kompaniya bloklangan (companyId={})", companyId);
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }

        attributes.put("userId", user.getId());
        attributes.put("companyId", companyId);
        attributes.put("role", role);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
    }

    private boolean isCompanyBlocked(String companyId) {
        try {
            Company company = companyRepository.findById(UUID.fromString(companyId)).orElse(null);
            return company != null && "BLOCKED".equalsIgnoreCase(company.getStatus());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
