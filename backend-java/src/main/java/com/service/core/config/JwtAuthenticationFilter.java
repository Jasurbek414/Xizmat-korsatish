package com.service.core.config;

import com.service.core.model.Company;
import com.service.core.repository.CompanyRepository;
import com.service.core.tenant.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, CompanyRepository companyRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.companyRepository = companyRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.validateToken(token)) {
                    String username = jwtTokenProvider.getUsername(token);
                    String role = jwtTokenProvider.getRole(token);
                    String companyId = jwtTokenProvider.getCompanyId(token);

                    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        // Tenant tokeni bloklangan kompaniyaga tegishli bo'lsa - eski token
                        // hali muddati o'tmagan bo'lsa ham darhol rad etiladi (faqat login
                        // paytida emas, HAR bir so'rovda tekshiriladi).
                        if (companyId != null && !companyId.trim().isEmpty() && isCompanyBlocked(companyId)) {
                            writeBlockedResponse(response);
                            return;
                        }

                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);

                        // Set Tenant ID automatically from JWT to prevent tampering
                        if (companyId != null && !companyId.trim().isEmpty()) {
                            TenantContext.setCurrentTenant(companyId);
                        }
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            // Tomcat qayta ishlatadigan thread'larda tenant ma'lumoti keyingi so'rovga
            // sizib qolmasligi uchun har doim tozalanadi.
            TenantContext.clear();
        }
    }

    private boolean isCompanyBlocked(String companyId) {
        try {
            Company company = companyRepository.findById(UUID.fromString(companyId)).orElse(null);
            return company != null && "BLOCKED".equalsIgnoreCase(company.getStatus());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private void writeBlockedResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(
            Map.of("message", "Kompaniya bloklangan. Administrator bilan bog'laning.")
        ));
    }
}
