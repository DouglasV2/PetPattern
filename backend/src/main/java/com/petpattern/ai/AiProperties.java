package com.petpattern.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI configuration. Defaults keep the deterministic local reader active so the
 * app runs with zero setup; set {@code provider=anthropic} and an API key to
 * switch on a hosted model.
 */
@Component
@ConfigurationProperties(prefix = "petpattern.ai")
public class AiProperties {

    /** "mock" (default, deterministic local reader) or "anthropic". */
    private String provider = "mock";

    /** API key for the hosted provider. Empty means "not configured". */
    private String apiKey = "";

    /** Hosted model id. Haiku is a good cheap/fast default for extraction. */
    private String model = "claude-haiku-4-5";

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
