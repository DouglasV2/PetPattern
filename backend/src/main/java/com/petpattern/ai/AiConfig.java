package com.petpattern.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Picks the active {@link AiProvider} from configuration. The hosted provider is
 * used only when explicitly selected AND an API key is present; otherwise the
 * deterministic mock is used. This is the drop-in seam: a new provider type
 * means a new branch here, nothing else changes.
 */
@Configuration
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    @Bean
    public AiProvider aiProvider(AiProperties properties, ObjectMapper objectMapper) {
        String provider = properties.getProvider() == null ? "" : properties.getProvider().trim();
        boolean hasKey = properties.getApiKey() != null && !properties.getApiKey().isBlank();

        // Never log the API key — only the provider name and model.
        if ("anthropic".equalsIgnoreCase(provider)) {
            if (hasKey) {
                log.info("AI provider: Anthropic (model {})", properties.getModel());
                return new AnthropicAiProvider(properties.getApiKey(), properties.getModel(), objectMapper);
            }
            log.warn("AI provider 'anthropic' requested but no API key configured; using the local mock reader.");
            return new MockAiProvider();
        }

        if ("gemini".equalsIgnoreCase(provider)) {
            if (hasKey) {
                log.info("AI provider: Gemini (model {})", properties.getModel());
                return new GeminiAiProvider(properties.getApiKey(), properties.getModel(), objectMapper);
            }
            log.warn("AI provider 'gemini' requested but no API key configured; using the local mock reader.");
            return new MockAiProvider();
        }

        if (!"mock".equalsIgnoreCase(provider)) {
            log.warn("Unknown AI provider '{}'; using the local mock reader.", provider);
        } else {
            log.info("AI provider: local mock reader (deterministic).");
        }
        return new MockAiProvider();
    }
}
