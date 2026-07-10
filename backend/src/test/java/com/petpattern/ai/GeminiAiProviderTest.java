package com.petpattern.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.UrinationChange;
import com.petpattern.domain.WaterLevel;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the Gemini provider's pure parsing/response handling — no network
 * calls. The real API is never contacted: {@link GeminiAiProvider#extract} is only
 * exercised on the blank-note short-circuit, and the response helpers
 * ({@code extractText} / {@code parseResult}) are fed canned strings.
 */
class GeminiAiProviderTest {

    private final GeminiAiProvider provider =
            new GeminiAiProvider("test-key", "gemini-2.5-flash-lite", new ObjectMapper());

    @Test
    void name_includesModel() {
        assertEquals("gemini:gemini-2.5-flash-lite", provider.name());
    }

    @Test
    void configured_isTrueWhenConstructedWithKey() {
        assertTrue(provider.configured());
    }

    @Test
    void defaultsModelWhenBlank() {
        GeminiAiProvider p = new GeminiAiProvider("test-key", "  ", new ObjectMapper());
        assertEquals("gemini:gemini-2.5-flash-lite", p.name());
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
    void extractText_readsCandidatePartText() throws Exception {
        String body = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"HELLO\"}]}}]}";
        assertEquals("HELLO", provider.extractText(body));
    }

    @Test
    void extractText_throwsWhenNoTextPart() {
        String blocked = "{\"candidates\":[{\"content\":{\"parts\":[]}}]}";
        assertThrows(RuntimeException.class, () -> provider.extractText(blocked));
    }

    @Test
    void parseResult_mapsFullShape() throws Exception {
        String json = """
                {
                  "itchingScore": 6,
                  "stoolState": "SOFT",
                  "appetiteLevel": "LOWER",
                  "waterLevel": "HIGHER",
                  "energyLevel": "LOW",
                  "vomiting": true,
                  "earRedness": true,
                  "possibleFoodTrigger": {
                    "foodKind": "TREAT",
                    "primaryProtein": "CHICKEN",
                    "description": "new chicken treat"
                  },
                  "confidence": "MEDIUM",
                  "warnings": []
                }""";

        DailyNoteExtractionResult r = provider.parseResult(json);

        assertEquals(6, r.itchingScore());
        assertEquals(StoolState.SOFT, r.stoolState());
        assertEquals(AppetiteLevel.LOWER, r.appetiteLevel());
        assertEquals(WaterLevel.HIGHER, r.waterLevel());
        assertEquals(EnergyLevel.LOW, r.energyLevel());
        assertTrue(r.vomiting());
        assertEquals(Boolean.TRUE, r.earRedness());
        assertNotNull(r.possibleFoodTrigger());
        assertEquals(FoodKind.TREAT, r.possibleFoodTrigger().foodKind());
        assertEquals(Protein.CHICKEN, r.possibleFoodTrigger().primaryProtein());
        assertEquals("MEDIUM", r.confidence());
    }

    @Test
    void parseResult_mapsCatFields() throws Exception {
        // "Milo hid under the bed, used the litter box less, and drank more water."
        String json = """
                {
                  "litterBoxUse": "LESS",
                  "hidingBehavior": "MORE",
                  "waterLevel": "HIGHER",
                  "appetiteLevel": "UNKNOWN",
                  "urinationChange": "UNKNOWN",
                  "straining": null,
                  "weightConcern": null,
                  "vomiting": false,
                  "confidence": "MEDIUM",
                  "warnings": []
                }""";

        DailyNoteExtractionResult r = provider.parseResult(json);

        assertEquals(LitterBoxUse.LESS, r.litterBoxUse());
        assertEquals(HidingBehavior.MORE, r.hidingBehavior());
        assertEquals(WaterLevel.HIGHER, r.waterLevel());
        assertEquals(AppetiteLevel.UNKNOWN, r.appetiteLevel(), "explicit UNKNOWN maps to the enum's UNKNOWN");
        assertEquals(UrinationChange.UNKNOWN, r.urinationChange());
        assertNull(r.straining());
        assertNull(r.weightConcern());
        assertEquals("MEDIUM", r.confidence());
    }

    @Test
    void parseResult_mapsGenericStarterSpeciesSignals() throws Exception {
        String json = """
                {
                  "detectedSignals": [
                    {"key":"appetite_hay","label":"Appetite / hay","value":"less","severity":"mild","confidence":"MEDIUM"},
                    {"key":"droppings","label":"Droppings","value":"less","severity":"mild","confidence":"LOW"}
                  ],
                  "possibleEnvironmentTrigger": {"description":"cage moved near a window","confidence":"LOW"},
                  "confidence":"MEDIUM",
                  "warnings":[]
                }""";

        DailyNoteExtractionResult r = provider.parseResult(json);

        assertNotNull(r.detectedSignals());
        assertEquals(2, r.detectedSignals().size());
        assertEquals("appetite_hay", r.detectedSignals().get(0).key());
        assertEquals("less", r.detectedSignals().get(0).value());
        assertNotNull(r.possibleEnvironmentTrigger());
        assertEquals("cage moved near a window", r.possibleEnvironmentTrigger().description());
    }

    @Test
    void parseResult_stripsMarkdownFencesAndProse() throws Exception {
        String messy = """
                Here is the JSON you asked for:
                ```json
                {"stoolState":"DIARRHEA","vomiting":false,"confidence":"LOW","warnings":[]}
                ```
                Hope that helps!""";

        DailyNoteExtractionResult r = provider.parseResult(messy);

        assertEquals(StoolState.DIARRHEA, r.stoolState());
        assertFalse(r.vomiting());
    }

    @Test
    void parseResult_unknownEnumBecomesNull() throws Exception {
        // READ_UNKNOWN_ENUM_VALUES_AS_NULL: a value outside the allowed set must not throw.
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
