package com.petpattern.api.dto;

import com.petpattern.domain.PatternStatus;
import jakarta.validation.constraints.NotNull;

public record PatternStatusRequest(
        @NotNull PatternStatus status
) {
}
