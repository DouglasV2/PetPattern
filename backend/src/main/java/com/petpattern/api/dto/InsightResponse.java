package com.petpattern.api.dto;

import java.util.List;

public record InsightResponse(
        String type,
        String severity,
        String title,
        String body,
        String confidence,
        List<String> evidence,
        String medicalBoundary
) {
}
