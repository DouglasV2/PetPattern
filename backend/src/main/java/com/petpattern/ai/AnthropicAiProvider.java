package com.petpattern.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Hosted-model implementation of {@link AiProvider} using the Anthropic Messages
 * API over plain HTTP (JDK {@code java.net.http} + Jackson — no extra
 * dependency). It asks a small, cheap model to return strict JSON matching
 * {@link DailyNoteExtractionResult} and parses that.
 *
 * <p>It still extracts only — never diagnoses, and the result is still shown to
 * the owner for confirmation before anything is saved. Network or parse failures
 * surface as a {@link RuntimeException}, which {@link AiExtractionService}
 * catches and turns into a safe empty suggestion.
 */
public class AnthropicAiProvider implements AiProvider {

    private static final String ENDPOINT = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 1024;

    private static final String SYSTEM_PROMPT = """
            You extract structured fields from a dog owner's free-text daily note for a
            longitudinal pet-health tracker. Return ONLY a JSON object, no prose, no code
            fences, matching exactly this shape:
            {
              "itchingScore": integer 0-10 or null,
              "stoolState": "NORMAL" | "SOFT" | "DIARRHEA" | "NO_STOOL" | "UNKNOWN",
              "appetiteLevel": "NORMAL" | "LOWER" | "HIGHER" | "REFUSED" | "UNKNOWN",
              "waterLevel": "LOWER" | "NORMAL" | "HIGHER" | "UNKNOWN",
              "energyLevel": "LOW" | "NORMAL" | "RESTLESS" | "HIGH" | "UNKNOWN",
              "vomiting": boolean,
              "earRedness": boolean or null,
              "possibleFoodTrigger": null or {
                "foodKind": "MAIN_FOOD" | "TREAT" | "SUPPLEMENT" | "OTHER",
                "primaryProtein": "CHICKEN" | "BEEF" | "LAMB" | "SALMON" | "TURKEY" | "DUCK" | "PORK" | "EGG" | "DAIRY" | "OTHER" | "UNKNOWN",
                "description": string
              },
              "confidence": "LOW" | "MEDIUM" | "HIGH",
              "warnings": array of short strings
            }
            Use UNKNOWN or null whenever the note does not clearly state a field. Do not
            guess. Do not diagnose, name a disease, or recommend treatment.""";

    private final String apiKey;
    private final String model;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;

    public AnthropicAiProvider(String apiKey, String model, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = (model == null || model.isBlank()) ? "claude-haiku-4-5" : model;
        this.mapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL, true);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public String name() {
        return "anthropic:" + model;
    }

    @Override
    public boolean configured() {
        return true;
    }

    @Override
    public DailyNoteExtractionResult extract(String note) {
        if (note == null || note.isBlank()) {
            List<String> warnings = new ArrayList<>();
            warnings.add(Copy.t("The note was empty, so no fields could be suggested."));
            return new DailyNoteExtractionResult(
                    null, StoolState.UNKNOWN, null, null, null, false, null, null, "LOW", warnings);
        }
        try {
            String requestBody = mapper.writeValueAsString(buildRequest(note));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ENDPOINT))
                    .timeout(Duration.ofSeconds(30))
                    .header("content-type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new IllegalStateException("Anthropic API returned HTTP " + response.statusCode());
            }
            return parseResult(extractText(response.body()));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("AI extraction was interrupted", ex);
        } catch (IOException | RuntimeException ex) {
            throw new RuntimeException("AI extraction call failed", ex);
        }
    }

    private Map<String, Object> buildRequest(String note) {
        return Map.of(
                "model", model,
                "max_tokens", MAX_TOKENS,
                "system", SYSTEM_PROMPT,
                "messages", List.of(Map.of("role", "user", "content", note))
        );
    }

    /** Pull the first text block out of the Messages API response. */
    private String extractText(String responseBody) throws IOException {
        JsonNode root = mapper.readTree(responseBody);
        for (JsonNode block : root.path("content")) {
            if ("text".equals(block.path("type").asText())) {
                return block.path("text").asText();
            }
        }
        throw new IllegalStateException("AI response contained no text block");
    }

    private DailyNoteExtractionResult parseResult(String text) throws IOException {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end < start) {
            throw new IllegalStateException("AI response was not JSON");
        }
        return mapper.readValue(text.substring(start, end + 1), DailyNoteExtractionResult.class);
    }
}
