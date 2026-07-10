package com.petpattern.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.WaterLevel;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the Anthropic provider's pure parsing/response handling — no
 * network calls. Mirrors {@link GeminiAiProviderTest}; the point of the new
 * coverage is {@link #parseResult_mapsGenericStarterSpeciesSignals()}, which was
 * impossible before the prompt/schema gained detectedSignals + env trigger.
 */
class AnthropicAiProviderTest {

    private final AnthropicAiProvider provider =
            new AnthropicAiProvider("test-key", "claude-haiku-4-5", new ObjectMapper());

    @Test
    void name_includesModel() {
        assertEquals("anthropic:claude-haiku-4-5", provider.name());
    }

    @Test
    void configured_isTrueWhenConstructedWithKey() {
        assertTrue(provider.configured());
    }

    @Test
    void blankNote_returnsEmptyLowConfidence_withoutNetwork() {
        DailyNoteExtractionResult r = provider.extract("   ");

        assertEquals("LOW", r.confidence());
        assertEquals(StoolState.UNKNOWN, r.stoolState());
        assertNull(r.itchingScore());
        assertFalse(r.vomiting());
        assertFalse(r.warnings().isEmpty());
    }

    @Test
    void extractText_readsFirstTextBlock() throws Exception {
        String body = "{\"content\":[{\"type\":\"text\",\"text\":\"HELLO\"}]}";
        assertEquals("HELLO", provider.extractText(body));
    }

    @Test
    void extractText_throwsWhenNoTextBlock() {
        String body = "{\"content\":[{\"type\":\"tool_use\"}]}";
        assertThrows(RuntimeException.class, () -> provider.extractText(body));
    }

    @Test
    void parseResult_mapsCatFields() throws Exception {
        String json = """
                {
                  "litterBoxUse": "LESS",
                  "hidingBehavior": "MORE",
                  "waterLevel": "HIGHER",
                  "appetiteLevel": "UNKNOWN",
                  "vomiting": false,
                  "confidence": "MEDIUM",
                  "warnings": []
                }""";

        DailyNoteExtractionResult r = provider.parseResult(json);

        assertEquals(LitterBoxUse.LESS, r.litterBoxUse());
        assertEquals(HidingBehavior.MORE, r.hidingBehavior());
        assertEquals(WaterLevel.HIGHER, r.waterLevel());
        assertEquals(AppetiteLevel.UNKNOWN, r.appetiteLevel());
    }

    @Test
    void parseResult_mapsGenericStarterSpeciesSignals() throws Exception {
        String json = """
                {
                  "detectedSignals": [
                    {"key":"appetite_hay","label":"Appetite / hay","value":"less","severity":"mild","confidence":"MEDIUM"},
                    {"key":"visible_change","label":"Visible change","value":"redness noticed","severity":"mild","confidence":"LOW"}
                  ],
                  "possibleEnvironmentTrigger": {"description":"cage moved near a window","confidence":"LOW"},
                  "confidence":"MEDIUM",
                  "warnings":[]
                }""";

        DailyNoteExtractionResult r = provider.parseResult(json);

        assertNotNull(r.detectedSignals());
        assertEquals(2, r.detectedSignals().size());
        assertEquals("appetite_hay", r.detectedSignals().get(0).key());
        assertEquals("visible_change", r.detectedSignals().get(1).key());
        assertEquals("redness noticed", r.detectedSignals().get(1).value());
        assertNotNull(r.possibleEnvironmentTrigger());
        assertEquals("cage moved near a window", r.possibleEnvironmentTrigger().description());
    }

    @Test
    void parseResult_stripsProseAroundJson() throws Exception {
        String messy = "Here is the JSON:\n{\"stoolState\":\"DIARRHEA\",\"vomiting\":false,\"confidence\":\"LOW\",\"warnings\":[]}\nDone.";

        DailyNoteExtractionResult r = provider.parseResult(messy);

        assertEquals(StoolState.DIARRHEA, r.stoolState());
        assertFalse(r.vomiting());
    }

    @Test
    void parseResult_unknownEnumBecomesNull() throws Exception {
        String json = "{\"stoolState\":\"NORMAL\",\"appetiteLevel\":\"BANANAS\","
                + "\"vomiting\":false,\"confidence\":\"LOW\",\"warnings\":[]}";

        DailyNoteExtractionResult r = provider.parseResult(json);

        assertEquals(StoolState.NORMAL, r.stoolState());
        assertNull(r.appetiteLevel(), "an unknown enum value should map to null, not throw");
    }

    @Test
    void parseResult_throwsWhenNoJsonObject() {
        assertThrows(RuntimeException.class, () -> provider.parseResult("sorry, no data available"));
    }
}
