package com.service.core.config;

import com.service.core.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
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
}
