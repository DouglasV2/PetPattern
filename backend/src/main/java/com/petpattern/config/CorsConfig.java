package com.petpattern.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter(@Value("${petpattern.cors.allowed-origins}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                // A trailing slash makes the origin never match the browser's Origin
                // header (which has none), silently breaking all cross-origin calls.
                .map(s -> s.endsWith("/") ? s.substring(0, s.length() - 1) : s)
                .filter(s -> !s.isBlank())
                .toList();

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // Explicit list: with allowCredentials=true, "*" is not honoured for
        // non-simple headers. These are the only custom headers the app sends.
        config.setAllowedHeaders(List.of("Content-Type", "X-Share-Token", "Accept-Language", "Authorization",
                "X-PetPattern-Client", "X-PetPattern-Platform", "X-PetPattern-App-Version"));
        // Mobile clients request the raw session token in this response header
        // and then send it back as Authorization: Bearer <token>. The web app
        // still uses the HttpOnly cookie and never needs to read this header.
        config.setExposedHeaders(List.of("X-Session-Token"));
        // Needed so the browser sends/stores the session cookie on API calls.
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
