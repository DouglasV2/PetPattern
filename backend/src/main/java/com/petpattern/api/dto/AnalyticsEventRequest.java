package com.petpattern.api.dto;

import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * A client-reported analytics event (used by the mobile clients — the web funnel is recorded
 * server-side). Only {@code type} is required; everything else is optional and heavily
 * filtered server-side. {@code meta} accepts only allow-listed categorical keys/values.
 */
public record AnalyticsEventRequest(
        @Size(max = 40) String type,
        @Size(max = 10) String platform,
        @Size(max = 20) String appVersion,
        Integer schemaVersion,
        Map<String, String> meta
) {
}
