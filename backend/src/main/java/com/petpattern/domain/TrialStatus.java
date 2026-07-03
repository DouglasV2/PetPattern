package com.petpattern.domain;

/**
 * Lifecycle of a food-elimination trial. Kept deliberately small: a trial is
 * running, the food has been brought back to watch the response, it has been
 * wrapped up, or it was stopped early.
 */
public enum TrialStatus {
    ACTIVE,
    REINTRODUCED,
    COMPLETED,
    ABANDONED
}
