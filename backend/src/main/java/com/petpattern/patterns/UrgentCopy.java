package com.petpattern.patterns;

import com.petpattern.i18n.Copy;

/**
 * The shared safety tails for the urgent-care tier, in the same non-diagnostic voice as
 * {@code PatternExplanationBuilder.catBoundary()}. Centralised so the boundary never
 * drifts across rules.
 *
 * <p>Two hard rules the urgent tier holds to:
 * <ul>
 *   <li>it NEVER names a condition — internal names like "wet tail" or "GI stasis" live
 *       only in {@code ruleId}s, never in owner-facing copy;</li>
 *   <li>it only ever restates facts the owner logged, then negates inference and hands off
 *       to a real vet — it never triages, diagnoses, or estimates a cause.</li>
 * </ul>
 */
public final class UrgentCopy {

    private UrgentCopy() {
    }

    /**
     * Boundary line for a non-urgent (WATCH/INFO) summary. Reuses the exact string the cat
     * analyzer already uses, so it inherits the existing Croatian translation.
     */
    public static String watchBoundary() {
        return Copy.t("This is not a diagnosis, but it may be worth discussing with your vet.");
    }

    /** Boundary line for an urgent summary: no diagnosis, no cause, no named condition. */
    public static String boundary() {
        return Copy.t("This is not a diagnosis and PetPattern cannot tell you the cause.");
    }

    /** The shared vet-handoff tail for an urgent note. */
    public static String vetHandoff(String name) {
        return Copy.t("PetPattern cannot examine {0} — if this is happening now, "
                + "please call your vet right away.", name);
    }
}
