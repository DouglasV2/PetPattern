package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The single place starter rules actually run. Each {@code <Species>RuleSet} declares its
 * {@link StarterRule}s and hands them here; this class builds the {@link SignalWindow} once,
 * thresholds each rule, and turns fired rules into {@link PatternCandidate}s.
 *
 * <p>After the specific rules, it appends the pre-existing generic REPEATED_OBSERVATION pass
 * for every changed key NOT claimed by a specific rule — so the specific rules add value on
 * top of today's behaviour and no owner-logged signal is ever dropped or reported twice.
 */
@Component
public class StarterRuleEngine {

    /** The longest look-back any starter rule uses; each rule narrows via {@code window.within(n)}. */
    static final int MAX_WINDOW_DAYS = 21;

    private static final String OBSERVATION_MARKER = ":REPEATED_OBSERVATION:";

    private final BaselineCalculator baselineCalculator;
    private final ObjectMapper mapper;
    private final ObservationPatternAnalyzer observationPatternAnalyzer;

    public StarterRuleEngine(BaselineCalculator baselineCalculator,
                             ObjectMapper mapper,
                             ObservationPatternAnalyzer observationPatternAnalyzer) {
        this.baselineCalculator = baselineCalculator;
        this.mapper = mapper;
        this.observationPatternAnalyzer = observationPatternAnalyzer;
    }

    public List<PatternCandidate> run(RuleContext ctx, List<StarterRule> rules) {
        SignalWindow window = SignalWindow.build(
                baselineCalculator.recentDays(ctx.checkIns(), MAX_WINDOW_DAYS), mapper);

        List<PatternCandidate> out = new ArrayList<>();
        Set<String> claimed = new HashSet<>();
        for (StarterRule rule : rules) {
            RuleHit hit = rule.match().apply(window);
            if (hit.fired(rule.minDays())) {
                // Claim the rule's keys only when it actually reports. A rule with a narrower
                // window than the generic 21-day pass might not fire on days the generic still
                // sees; claiming unconditionally would then suppress the generic candidate too
                // and the recurrence would surface nowhere.
                claimed.addAll(rule.claimedKeys());
                out.add(toCandidate(ctx.pet(), rule, hit));
            }
        }
        for (PatternCandidate generic : observationPatternAnalyzer.analyze(ctx.pet(), ctx.checkIns())) {
            String key = observationKey(generic.id());
            if (key != null && claimed.contains(key)) {
                continue;
            }
            out.add(generic);
        }
        return out;
    }

    private PatternCandidate toCandidate(Pet pet, StarterRule rule, RuleHit hit) {
        int days = hit.days();
        StarterRule.RuleCopy copy = rule.copy().apply(pet, days);
        String id = pet.getId() + ":" + rule.ruleId();
        List<String> evidence = List.of(Copy.t("Days you logged this: {0}", days));
        return new PatternCandidate(
                id,
                pet.getId(),
                rule.tag().patternType(),
                rule.confidence().apply(days),
                copy.title(),
                copy.summary(),
                evidence,
                Instant.now(),
                null,
                hit.checkInIds(),
                rule.severity(),
                copy.urgentNote());
    }

    private static String observationKey(String candidateId) {
        int idx = candidateId.indexOf(OBSERVATION_MARKER);
        return idx < 0 ? null : candidateId.substring(idx + OBSERVATION_MARKER.length());
    }
}
