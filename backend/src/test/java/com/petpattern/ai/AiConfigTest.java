package com.petpattern.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The provider-selection seam: the hosted provider is chosen only when it is both
 * requested AND has an API key; every other case falls back to the deterministic
 * mock. No network is touched (only construction is verified).
 */
class AiConfigTest {

    private final AiConfig config = new AiConfig();
    private final ObjectMapper mapper = new ObjectMapper();

    private AiProperties props(String provider, String apiKey, String model) {
        AiProperties p = new AiProperties();
        p.setProvider(provider);
        p.setApiKey(apiKey);
        p.setModel(model);
        return p;
    }

    @Test
    void gemini_withKey_selectsGeminiProvider() {
        AiProvider p = config.aiProvider(props("gemini", "test-key", "gemini-2.5-flash-lite"), mapper);

        assertInstanceOf(GeminiAiProvider.class, p);
        assertTrue(p.configured());
        assertEquals("gemini:gemini-2.5-flash-lite", p.name());
    }

    @Test
    void gemini_withoutKey_fallsBackToMock() {
        AiProvider p = config.aiProvider(props("gemini", "   ", "gemini-2.5-flash-lite"), mapper);

        assertInstanceOf(MockAiProvider.class, p);
        assertFalse(p.configured());
    }

    @Test
    void anthropic_withKey_selectsAnthropicProvider() {
        AiProvider p = config.aiProvider(props("anthropic", "test-key", "claude-haiku-4-5"), mapper);

        assertInstanceOf(AnthropicAiProvider.class, p);
    }

    @Test
    void anthropic_withoutKey_fallsBackToMock() {
        AiProvider p = config.aiProvider(props("anthropic", "", "claude-haiku-4-5"), mapper);

        assertInstanceOf(MockAiProvider.class, p);
    }

    @Test
    void mockProvider_isTheDefault() {
        AiProvider p = config.aiProvider(props("mock", "", "gemini-2.5-flash-lite"), mapper);

        assertInstanceOf(MockAiProvider.class, p);
    }

    @Test
    void unknownProvider_fallsBackToMock() {
        AiProvider p = config.aiProvider(props("something-else", "test-key", "x"), mapper);

        assertInstanceOf(MockAiProvider.class, p);
    }
}
