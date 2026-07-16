package com.petpattern.patterns;

/**
 * How much an owner-logged pattern may matter, orthogonal to {@link PatternConfidence}
 * (how sure the detector is that the pattern is real).
 *
 * <p>Only explicit cross-signal or vital-sign rules set {@link #URGENT}, and only from
 * a plain, countable same-day combination the owner actually logged — never an
 * inference, never a diagnosis, never a named condition.
 */
public enum Severity {

    /** Context worth noting, e.g. an enclosure change around a behaviour change. */
    INFO,

    /** Worth keeping an eye on. The default for every pre-existing pattern. */
    WATCH,

    /** An owner-logged combination many vets say not to wait on. */
    URGENT
}
