package com.petpattern.api.dto;

import java.time.LocalDate;

/** Optional date for actions like reintroduction (defaults to today). */
public record TrialDateRequest(LocalDate date) {
}
