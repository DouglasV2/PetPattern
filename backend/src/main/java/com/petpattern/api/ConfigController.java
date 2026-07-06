package com.petpattern.api;

import com.petpattern.ai.AiProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public, unauthenticated runtime config for the frontend. Exposes only flags
 * that are safe for anyone to read — whether the one-click demo seed is
 * available, whether Google login is wired up, and whether the note "Suggest
 * fields" helper should be offered. Each lets the UI hide a control instead of
 * offering one that would 404 or mislead.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${petpattern.demo.enabled:true}")
    private boolean demoEnabled;

    // Max pets per account (server-enforced in PetController). Exposed so the UI
    // can hide "Add pet" at the limit instead of letting the create 409.
    @Value("${petpattern.pets.max:20}")
    private int maxPets;

    private final GoogleAuthController googleAuth;
    private final AiProvider aiProvider;

    public ConfigController(GoogleAuthController googleAuth, AiProvider aiProvider) {
        this.googleAuth = googleAuth;
        this.aiProvider = aiProvider;
    }

    @GetMapping
    public Map<String, Object> config() {
        return Map.of(
                "demoEnabled", demoEnabled,
                "maxPets", maxPets,
                "googleLoginEnabled", googleAuth.enabled(),
                // Only offer the note "Suggest fields" helper when a real AI provider
                // is configured. The default keyword mock is English-only with no
                // negation handling, so it stays hidden for launch (see AiProvider).
                "aiSuggestEnabled", aiProvider.configured());
    }
}
