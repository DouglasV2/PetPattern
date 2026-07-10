package com.petpattern.observations;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Parses the flexible {@code observations_json} check-in field into typed
 * {@link ObservationSignal}s.
 *
 * <p>The stored shape is {@code {"species": "...", "signals": [ { ... } ],
 * "environment": [ { ... } ] }}. Only the {@code signals} array is read here;
 * malformed or missing JSON yields an empty list and never throws, so a bad
 * payload can never break pattern analysis or a vet summary.
 *
 * <p>This is the single place the observations shape is decoded on the backend
 * — the pattern analyzer, vet summary, and timeline all go through it so the
 * shape can evolve in one spot.
 */
public final class ObservationSignals {

    private ObservationSignals() {
    }

    public static List<ObservationSignal> parse(String observationsJson, ObjectMapper mapper) {
        if (observationsJson == null || observationsJson.isBlank()) {
            return List.of();
        }
        try {
            JsonNode signals = mapper.readTree(observationsJson).path("signals");
            if (!signals.isArray()) {
                return List.of();
            }
            List<ObservationSignal> out = new ArrayList<>();
            for (JsonNode node : signals) {
                out.add(new ObservationSignal(
                        text(node, "key"),
                        text(node, "label"),
                        text(node, "value"),
                        text(node, "severity"),
                        text(node, "status"),
                        text(node, "area"),
                        text(node, "note")));
            }
            return out;
        } catch (Exception ex) {
            // Malformed observations must never crash the caller.
            return List.of();
        }
    }

    /** A value counts as "changed" unless it is explicitly a normal/clear value. */
    public static boolean isChangedValue(String value) {
        if (value == null) {
            return false;
        }
        String v = value.trim().toLowerCase(Locale.ROOT);
        return !(v.isEmpty() || v.equals("normal") || v.equals("clear") || v.equals("unknown") || v.equals("none"));
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText(null);
    }
}
