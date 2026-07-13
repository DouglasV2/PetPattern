package com.petpattern.config;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Regression guard for the demo-seed rate-limit gap: LIMITS used to have an exact
 * entry only for /api/dev/seed, so /api/dev/seed-cat and /api/dev/seed-rabbit
 * (DevSeedController) fell through unlimited. Drives doFilterInternal directly —
 * this test lives in the same package, so the protected method is visible without
 * any production-code refactor. No trusted-proxy setup is needed: the filter is
 * constructed the same way Spring would before @PostConstruct runs, so
 * trustedProxies stays empty, isTrustedProxy() is always false, and clientIp()
 * simply returns request.getRemoteAddr() — exactly what a request hitting the
 * backend directly (e.g. in the dev compose) would see.
 */
class RateLimitFilterTest {

    private final RateLimitFilter filter = new RateLimitFilter();

    @Test
    void seedCat_pastItsLimit_returns429AndStopsReachingTheChain() throws Exception {
        String ip = "203.0.113.10";
        AtomicInteger chainCalls = new AtomicInteger();
        FilterChain chain = (req, res) -> chainCalls.incrementAndGet();

        // LIMITS caps /api/dev/seed-cat at 5 requests/window, same as /api/dev/seed.
        for (int i = 1; i <= 5; i++) {
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilterInternal(seedCatRequest(ip), res, chain);
            assertEquals(200, res.getStatus(), "request " + i + " is within the limit and should pass through");
        }
        assertEquals(5, chainCalls.get(), "all 5 in-limit requests must reach the chain");

        MockHttpServletResponse sixth = new MockHttpServletResponse();
        filter.doFilterInternal(seedCatRequest(ip), sixth, chain);

        assertEquals(429, sixth.getStatus(), "the 6th request from the same IP must be rate-limited");
        assertEquals(5, chainCalls.get(), "the rate-limited request must NOT reach the chain");
    }

    @Test
    void seedRabbit_underItsLimit_passesThroughTheChain() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/dev/seed-rabbit");
        request.setRemoteAddr("203.0.113.11");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicInteger chainCalls = new AtomicInteger();
        FilterChain chain = (req, res) -> chainCalls.incrementAndGet();

        filter.doFilterInternal(request, response, chain);

        assertEquals(1, chainCalls.get(), "a single request under the limit must reach the chain");
        assertEquals(200, response.getStatus());
    }

    @Test
    void seedCat_and_seedRabbit_areSeparatelyBucketed_fromEachOtherAndFromSeed() throws Exception {
        // Different URIs are different LIMITS keys, so a client already at the cap
        // for one seed endpoint can still call the others (each pet is reset
        // independently by DevSeedController) — this only guards against the fix
        // accidentally collapsing all three onto one shared bucket/key.
        String ip = "203.0.113.12";
        AtomicInteger chainCalls = new AtomicInteger();
        FilterChain chain = (req, res) -> chainCalls.incrementAndGet();

        for (int i = 1; i <= 5; i++) {
            filter.doFilterInternal(seedCatRequest(ip), new MockHttpServletResponse(), chain);
        }
        assertEquals(5, chainCalls.get());

        MockHttpServletRequest rabbitRequest = new MockHttpServletRequest("POST", "/api/dev/seed-rabbit");
        rabbitRequest.setRemoteAddr(ip);
        MockHttpServletResponse rabbitResponse = new MockHttpServletResponse();

        filter.doFilterInternal(rabbitRequest, rabbitResponse, chain);

        assertEquals(200, rabbitResponse.getStatus(), "seed-rabbit has its own bucket, unaffected by seed-cat's cap");
        assertEquals(6, chainCalls.get());
    }

    private MockHttpServletRequest seedCatRequest(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/dev/seed-cat");
        request.setRemoteAddr(ip);
        return request;
    }
}
