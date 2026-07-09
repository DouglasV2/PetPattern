package com.petpattern.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Hosted-model implementation of {@link AiProvider} using the Google Gemini
 * Developer API over plain HTTP (JDK {@code java.net.http} + Jackson — no extra
 * dependency, same shape as {@link AnthropicAiProvider}). It asks a small, cheap
 * model to return strict JSON matching {@link DailyNoteExtractionResult}.
 *
 * <p>Like the other providers it extracts only — never diagnoses, never
 * recommends treatment, and nothing is saved until the owner confirms. Network
 * or parse failures surface as a {@link RuntimeException}, which
 * {@link AiExtractionService} catches and turns into a safe empty suggestion.
 *
 * <p>The API key travels in the {@code ?key=} query parameter (the Developer API
 * convention). To keep it out of logs, the request URI is never logged, and
 * errors carry only the HTTP status + provider name — never the URL and never the
 * response body (which can echo the owner's private note).
 */
public class GeminiAiProvider implements AiProvider {

    private static final String ENDPOINT_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final int MAX_OUTPUT_TOKENS = 512;

    private static final String SYSTEM_PROMPT = """
            You extract structured fields from a dog OR cat owner's free-text daily note
            for a longitudinal pet-health tracker. Return ONLY a single JSON object — no
            prose, no explanation, no markdown, no code fences — matching exactly this shape:
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
            The note may describe a dog or a cat, in English or Croatian. The same fields
            apply to both species (scratching, stool, appetite, water, energy, vomiting,
            ear redness, and any food or treat change).
            Rules:
            - Use UNKNOWN or null whenever the note does not clearly state a field.
            - Do not guess. Report only what the owner actually wrote.
            - Do not diagnose, do not name any disease, do not recommend medication or
              treatment, and never mention emergencies or triage.
            - You are only an input helper: the owner reviews and confirms every field
              before anything is saved.""";

    private final String apiKey;
    private final String model;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;

    public GeminiAiProvider(String apiKey, String model, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = (model == null || model.isBlank()) ? "gemini-2.5-flash-lite" : model;
        this.mapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL, true);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public String name() {
        return "gemini:" + model;
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
                    .uri(endpointUri())
                    .timeout(Duration.ofSeconds(30))
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                // Status only — never the URL (holds the key) or body (may echo the note).
                throw new IllegalStateException("Gemini API returned HTTP " + response.statusCode());
            }
            return parseResult(extractText(response.body()));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("AI extraction was interrupted", ex);
        } catch (IOException | RuntimeException ex) {
            throw new RuntimeException("AI extraction call failed", ex);
        }
    }

    /** Endpoint with the key in the query string; kept private so it is never logged. */
    private URI endpointUri() {
        String encodedKey = URLEncoder.encode(apiKey, StandardCharsets.UTF_8);
        return URI.create(ENDPOINT_TEMPLATE.formatted(model, encodedKey));
    }

    private Map<String, Object> buildRequest(String note) {
        return Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", SYSTEM_PROMPT))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", note)))),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "topP", 0.8,
                        "maxOutputTokens", MAX_OUTPUT_TOKENS,
                        "responseMimeType", "application/json")
        );
    }

    /** Pull the model's text out of candidates[0].content.parts[*].text. */
    String extractText(String responseBody) throws IOException {
        JsonNode root = mapper.readTree(responseBody);
        JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
        for (JsonNode part : parts) {
            String text = part.path("text").asText(null);
            if (text != null && !text.isBlank()) {
                return text;
            }
        }
        throw new IllegalStateException("Gemini response contained no text");
    }

    /**
     * Map the model's text into a result, tolerating a stray fence or prose by
     * slicing to the first {@code &#123;} and last {@code &#125;}. Unknown fields
     * and unknown enum values become null rather than failing.
     */
    DailyNoteExtractionResult parseResult(String text) throws IOException {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end < start) {
            throw new IllegalStateException("Gemini response was not JSON");
        }
        return mapper.readValue(text.substring(start, end + 1), DailyNoteExtractionResult.class);
    }
}
