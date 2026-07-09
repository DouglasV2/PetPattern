package com.petpattern.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI configuration. Defaults keep the deterministic local reader active so the
 * app runs with zero setup; set {@code provider=anthropic} or {@code provider=gemini}
 * and an API key to switch on a hosted model.
 */
@Component
@ConfigurationProperties(prefix = "petpattern.ai")
public class AiProperties {

    /** "mock" (default, deterministic local reader), "anthropic" or "gemini". */
    private String provider = "mock";

    /**
     * API key for the hosted provider. Empty means "not configured". Resolved in
     * application.yml from the generic {@code PETPATTERN_AI_API_KEY} first, then the
     * provider-specific {@code ANTHROPIC_API_KEY} / {@code GEMINI_API_KEY}.
     */
    private String apiKey = "";

    /** Hosted model id. Gemini Flash-Lite is a good cheap/fast default for extraction. */
    private String model = "gemini-2.5-flash-lite";

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }
}
