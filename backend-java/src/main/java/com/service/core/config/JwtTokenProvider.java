package com.service.core.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final long EXPIRATION_TIME_MS = 864_000_000L; // 10 kun
    private static final String DEV_FALLBACK_SECRET =
            "dev-only-insecure-fallback-secret-change-me-in-production-env-1234567890";

    private final Key signingKey;

    public JwtTokenProvider(@Value("${JWT_SECRET:}") String configuredSecret) {
        String secret = (configuredSecret == null || configuredSecret.isBlank())
                ? DEV_FALLBACK_SECRET
                : configuredSecret;

        if (secret.equals(DEV_FALLBACK_SECRET)) {
            log.warn("JWT_SECRET environment o'zgaruvchisi o'rnatilmagan! Standart (nostandart-xavfsiz) " +
                    "dev kalit ishlatilmoqda. Productionda JWT_SECRET albatta o'rnatilishi shart.");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username, String role, String companyId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + EXPIRATION_TIME_MS);

        var builder = Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry);

        if (companyId != null && !companyId.isBlank()) {
            builder.claim("companyId", companyId);
        }

        return builder.signWith(signingKey).compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public String getRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public String getCompanyId(String token) {
        return parseClaims(token).get("companyId", String.class);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
