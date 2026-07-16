package com.petpattern.patterns;

import com.petpattern.domain.Pet;

import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.IntFunction;

/**
 * One declarative starter-species rule. Each {@code <Species>RuleSet} is just a list of
 * these; all the running, thresholding and candidate-building lives once in
 * {@link StarterRuleEngine}, so no rule needs its own class and no species needs a giant
 * analyzer.
 *
 * @param ruleId       FROZEN stable id fragment (candidate id is {@code petId + ":" + ruleId});
 *                     never derive it from dates or counts.
 * @param tag          the coarse category → {@link PatternType} this rule reports as.
 * @param severity     urgency tier; only genuine cross-signal/vital rules use {@link Severity#URGENT}.
 * @param claimedKeys  observation keys this rule fully consumes; the generic REPEATED_OBSERVATION
 *                     pass skips them so a signal is never reported twice. Claim a key only when
 *                     the rule covers all of its non-normal values.
 * @param minDays      fire once the match has landed on at least this many distinct days.
 * @param match        counts qualifying days (with evidence) from the window; a rule pins its own
 *                     look-back by calling {@code window.within(n)} inside this function.
 * @param confidence   confidence given the number of matched days.
 * @param copy         owner-facing, non-diagnostic title/summary (+ optional urgent note).
 */
public record StarterRule(
        String ruleId,
        RuleTag tag,
        Severity severity,
        Set<String> claimedKeys,
        int minDays,
        Function<SignalWindow, RuleHit> match,
        IntFunction<PatternConfidence> confidence,
        BiFunction<Pet, Integer, RuleCopy> copy
) {

    /** Owner-facing copy for one fired rule. {@code urgentNote} is null for non-urgent rules. */
    public record RuleCopy(String title, String summary, String urgentNote) {

        public static RuleCopy of(String title, String summary) {
            return new RuleCopy(title, summary, null);
        }

        public static RuleCopy urgent(String title, String summary, String urgentNote) {
            return new RuleCopy(title, summary, urgentNote);
        }
    }

    /** Steady-signal confidence: LOW on the minimum days, MEDIUM once it repeats. */
    public static final IntFunction<PatternConfidence> WATCH_CONFIDENCE =
            days -> days >= 3 ? PatternConfidence.MEDIUM : PatternConfidence.LOW;

    /** Urgent cross-signal confidence: MEDIUM on a single co-occurrence, HIGH once it repeats. */
    public static final IntFunction<PatternConfidence> URGENT_CONFIDENCE =
            days -> days >= 2 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;

    /** Context/INFO confidence: always LOW — it is background, not a finding. */
    public static final IntFunction<PatternConfidence> CONTEXT_CONFIDENCE =
            days -> PatternConfidence.LOW;
}
