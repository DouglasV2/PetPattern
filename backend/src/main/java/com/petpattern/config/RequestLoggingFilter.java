package com.petpattern.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Outermost filter: logs any server error (5xx) with method, path, status and
 * duration so failures are visible in the logs. Response semantics are
 * untouched — Spring still produces the response. (Full error tracking / JSON
 * structured logs are a future step.)
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            if (response.getStatus() >= 500) {
                long ms = (System.nanoTime() - start) / 1_000_000L;
                log.error("Server error: {} {} -> {} ({} ms)",
                        request.getMethod(), request.getRequestURI(), response.getStatus(), ms);
            }
        }
    }
}
