package com.petpattern.config;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A small in-memory, per-client-IP fixed-window limiter for the abuse-prone
 * endpoints: login/register (brute force, account spam) and the AI parse (cost).
 * Single-instance only — fine for the pilot; a distributed limiter comes with
 * horizontal scaling.
 */
@Component
@Order(0)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final long WINDOW_MS = 60_000L;

    // path -> max requests per window per IP
    private static final Map<String, Integer> LIMITS = Map.of(
            "/api/auth/login", 10,
            "/api/auth/register", 5,
            // Unauthenticated + emails a stranger — cap tightly so it can't be used
            // to spam an inbox or probe which emails have accounts.
            "/api/auth/forgot-password", 5,
            // Redeems a reset token — cap to blunt brute-forcing (tokens are already
            // unguessable; this is defence in depth).
            "/api/auth/reset-password", 10,
            "/api/ai/parse-daily-note", 30,
            // Unauthenticated + heavy (wipes + reseeds the demo pet) — cap it so it
            // can't be used to hammer the DB in production.
            "/api/dev/seed", 5
    );

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    // Only a request whose direct peer (getRemoteAddr) is one of these ranges is
    // allowed to speak for a different client via X-Real-IP. Behind our nginx the
    // peer is the proxy on the private/compose network, so per-client limiting
    // works; a backend accidentally exposed to the public internet sees an
    // untrusted peer and ignores the (now spoofable) header, falling back to the
    // real socket address. Set empty when the backend port is reachable directly
    // (e.g. the dev compose) to trust nobody. Overridable via
    // petpattern.security.trusted-proxies (comma-separated IPs/CIDRs).
    @Value("${petpattern.security.trusted-proxies:127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7}")
    private String trustedProxySpec;

    private final List<Cidr> trustedProxies = new ArrayList<>();

    @PostConstruct
    void parseTrustedProxies() {
        for (String spec : trustedProxySpec.split(",")) {
            String trimmed = spec.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            try {
                trustedProxies.add(Cidr.parse(trimmed));
            } catch (RuntimeException ex) {
                log.warn("Ignoring invalid trusted-proxy entry '{}': {}", trimmed, ex.getMessage());
            }
        }
        log.info("Rate limiter trusts X-Real-IP from {} proxy range(s)", trustedProxies.size());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        int limit;
        String bucket;
        if ("POST".equalsIgnoreCase(request.getMethod()) && LIMITS.containsKey(uri)) {
            limit = LIMITS.get(uri);
            bucket = uri;
        } else if (uri.startsWith("/api/shared/")) {
            // One bucket for all share-link reads from an IP, so trying many tokens
            // still hits the cap (defence-in-depth on top of unguessable tokens).
            limit = 60;
            bucket = "shared";
        } else {
            chain.doFilter(request, response);
            return;
        }

        String key = clientIp(request) + "|" + bucket;
        if (overLimit(key, limit)) {
            log.warn("Rate limit hit: {} {} from {}", request.getMethod(), request.getRequestURI(), clientIp(request));
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests — please slow down and try again in a minute.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean overLimit(String key, int limit) {
        long now = Instant.now().toEpochMilli();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.start > WINDOW_MS) {
                return new Window(now);
            }
            return existing;
        });
        return window.count.incrementAndGet() > limit;
    }

    private String clientIp(HttpServletRequest request) {
        String peer = request.getRemoteAddr();
        // Only honour X-Real-IP when the request actually came from a trusted proxy
        // that we know rewrites it (our nginx sets it to $remote_addr on every
        // request). From any other peer the header is attacker-writable, so
        // trusting it would let a direct caller mint a fresh IP per request and
        // sail past the per-IP limit — use the real socket address instead.
        if (isTrustedProxy(peer)) {
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null) {
                String trimmed = realIp.trim();
                // Accept the forwarded IP only if it's a well-formed literal. Never
                // DNS-resolve an attacker-controlled header, and don't let junk
                // values ("A", "B", ...) each mint a fresh rate-limit bucket and
                // slip past the cap — fall back to the real socket address instead.
                if (isIpLiteral(trimmed)) {
                    return trimmed;
                }
            }
        }
        return peer;
    }

    /** True for a syntactically valid IPv4 or IPv6 literal. No DNS, no exceptions. */
    private static boolean isIpLiteral(String s) {
        if (s.isEmpty() || s.length() > 45) {
            return false;
        }
        if (s.indexOf(':') >= 0) {
            // IPv6 (optionally IPv4-mapped): only hex digits, colons and dots, and
            // at least two colons (the minimum any real IPv6 form has, e.g. "::1").
            int colons = 0;
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                boolean hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (c == ':') {
                    colons++;
                } else if (!hex && c != '.') {
                    return false;
                }
            }
            return colons >= 2;
        }
        // IPv4 dotted quad.
        String[] parts = s.split("\\.", -1);
        if (parts.length != 4) {
            return false;
        }
        for (String part : parts) {
            if (part.isEmpty() || part.length() > 3) {
                return false;
            }
            int value = 0;
            for (int i = 0; i < part.length(); i++) {
                char c = part.charAt(i);
                if (c < '0' || c > '9') {
                    return false;
                }
                value = value * 10 + (c - '0');
            }
            if (value > 255) {
                return false;
            }
        }
        return true;
    }

    private boolean isTrustedProxy(String ip) {
        byte[] addr;
        try {
            addr = InetAddress.getByName(ip).getAddress();
        } catch (UnknownHostException ex) {
            return false;
        }
        for (Cidr cidr : trustedProxies) {
            if (cidr.contains(addr)) {
                return true;
            }
        }
        return false;
    }

    /** Drop windows past their lifetime so the map can't grow without bound. */
    @Scheduled(fixedRate = 600_000L)
    void purgeStaleWindows() {
        long cutoff = Instant.now().toEpochMilli() - WINDOW_MS;
        windows.values().removeIf(window -> window.start < cutoff);
    }

    private static final class Window {
        private final long start;
        private final AtomicInteger count = new AtomicInteger(0);

        private Window(long start) {
            this.start = start;
        }
    }

    /** An IPv4 or IPv6 CIDR range; matches by comparing the leading prefix bits. */
    private static final class Cidr {
        private final byte[] base;
        private final int prefixBits;

        private Cidr(byte[] base, int prefixBits) {
            this.base = base;
            this.prefixBits = prefixBits;
        }

        static Cidr parse(String spec) {
            String[] parts = spec.split("/", 2);
            byte[] base;
            try {
                base = InetAddress.getByName(parts[0].trim()).getAddress();
            } catch (UnknownHostException ex) {
                throw new IllegalArgumentException("not an IP address");
            }
            int bits = base.length * 8;
            int prefix = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : bits;
            if (prefix < 0 || prefix > bits) {
                throw new IllegalArgumentException("prefix out of range");
            }
            return new Cidr(base, prefix);
        }

        boolean contains(byte[] addr) {
            if (addr.length != base.length) {
                return false; // IPv4 vs IPv6 — no match
            }
            int fullBytes = prefixBits / 8;
            for (int i = 0; i < fullBytes; i++) {
                if (addr[i] != base[i]) {
                    return false;
                }
            }
            int remBits = prefixBits % 8;
            if (remBits > 0) {
                int mask = (0xFF << (8 - remBits)) & 0xFF;
                return (addr[fullBytes] & mask) == (base[fullBytes] & mask);
            }
            return true;
        }
    }
}
