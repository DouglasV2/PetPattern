package com.petpattern.auth;

import com.petpattern.domain.Owner;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Populates {@link OwnerContext} from the session cookie on every request. It
 * never blocks — enforcement happens per-endpoint (controllers call the owner
 * guard), so /api/auth/** and the demo seed stay open.
 */
@Component
@Order(1)
public class SessionAuthFilter extends OncePerRequestFilter {

    private final AuthService authService;

    public SessionAuthFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            String token = readCookie(request);
            if (token != null) {
                Owner owner = authService.resolve(token);
                if (owner != null) {
                    OwnerContext.set(owner);
                }
            }
            chain.doFilter(request, response);
        } finally {
            OwnerContext.clear();
        }
    }

    private String readCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (AuthService.COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
