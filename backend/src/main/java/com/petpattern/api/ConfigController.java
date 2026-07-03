package com.petpattern.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public, unauthenticated runtime config for the frontend. Exposes only flags
 * that are safe for anyone to read — right now, whether the one-click demo seed
 * is available, so the UI can hide the "Load Bella demo" button instead of
 * offering one that would just 404.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${petpattern.demo.enabled:true}")
    private boolean demoEnabled;

    private final GoogleAuthController googleAuth;

    public ConfigController(GoogleAuthController googleAuth) {
        this.googleAuth = googleAuth;
    }

    @GetMapping
    public Map<String, Object> config() {
        return Map.of(
                "demoEnabled", demoEnabled,
                "googleLoginEnabled", googleAuth.enabled());
    }
}
