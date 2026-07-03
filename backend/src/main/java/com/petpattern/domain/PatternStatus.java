package com.petpattern.domain;

/**
 * What the owner has decided about a possible pattern. This is the feedback loop
 * that lets PetPattern "remember" a dog: the engine keeps detecting, but the
 * owner's judgement (resolved, not relevant, already told the vet) sticks.
 */
public enum PatternStatus {
    /** Detected, owner has not acted on it yet. */
    NEW,
    /** Owner has seen it and is keeping an eye on it. */
    ACKNOWLEDGED,
    /** Owner brought it to a vet. */
    SHARED_WITH_VET,
    /** Owner considers it no longer a concern. */
    RESOLVED,
    /** Owner dismissed it as noise. */
    NOT_RELEVANT;

    /** Dismissed patterns are demoted and never nag on Bella today. */
    public boolean isDismissed() {
        return this == RESOLVED || this == NOT_RELEVANT;
    }

    public boolean isActive() {
        return !isDismissed();
    }
}
