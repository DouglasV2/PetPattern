package com.petpattern.patterns;

import com.petpattern.api.dto.WeeklyInsight;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Builds the Today dashboard's compact "this week" card from existing check-ins.
 * Windows are today-anchored (calendar last-7 vs the 7 before it), NOT anchored on
 * the last logged day — a gap in logging must read as "still learning", not as a
 * fresh week. Repository-free: callers pass the check-ins so it unit-tests with new.
 */
@Component
public class WeeklyInsightService {

    static final int WINDOW = 7;
    static final int MIN_LOGS = 3;

    private final BaselineCalculator baseline;
    private final ObjectMapper mapper;
    private final ActivityExposureAnalyzer activityAnalyzer;

    public WeeklyInsightService(BaselineCalculator baseline, ObjectMapper mapper,
                                ActivityExposureAnalyzer activityAnalyzer) {
        this.baseline = baseline;
        this.mapper = mapper;
        this.activityAnalyzer = activityAnalyzer;
    }

    public WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns) {
        return generate(pet, checkIns, java.util.List.of());
    }

    public WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns, List<com.petpattern.domain.ActivityLog> activities) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> recent = baseline.between(checkIns, today.minusDays(WINDOW - 1L), today);
        List<DailyCheckIn> prior =
                baseline.between(checkIns, today.minusDays(2L * WINDOW - 1L), today.minusDays(WINDOW));

        if (recent.size() < MIN_LOGS) {
            return learning(pet);
        }
        // Activity co-occurrence is the highest-priority insight when present.
        var activity = activityAnalyzer.scratchingAroundActivity(pet, checkIns, activities);
        if (activity.isPresent()) {
            return activityInsight(activity.get());
        }
        return bestCandidate(pet, recent, prior)
                .map(c -> insight(pet, c))
                .orElseGet(this::stable);
    }

    /** metric+direction candidate; strength is the comparable magnitude for selection. */
    private record Candidate(String metric, String label, boolean up,
                             int recentDays, int priorDays, int loggedDays, double strength) {
    }

    private java.util.Optional<Candidate> bestCandidate(
            Pet pet, List<DailyCheckIn> recent, List<DailyCheckIn> prior) {
        List<Candidate> candidates = new java.util.ArrayList<>();

        // (a) Itching: average delta, meaningful at >= 1.0 (0-10 scale).
        java.util.OptionalDouble recentItch = baseline.averageItching(recent);
        java.util.OptionalDouble priorItch = baseline.averageItching(prior);
        if (recentItch.isPresent() && priorItch.isPresent()) {
            double delta = recentItch.getAsDouble() - priorItch.getAsDouble();
            if (Math.abs(delta) >= 1.0) {
                candidates.add(new Candidate("itching", null, delta > 0,
                        0, 0, recent.size(), Math.abs(delta) * 1.5));
            }
        }

        // (b) Boolean day-flags: count of days present, meaningful at >= 2 days.
        addDayCount(candidates, "ear_redness", recent, prior, DailyCheckIn::isEarRedness);
        addDayCount(candidates, "paw_licking", recent, prior, DailyCheckIn::isPawLicking);
        addDayCount(candidates, "vomiting", recent, prior, DailyCheckIn::isVomiting);
        addDayCount(candidates, "diarrhea", recent, prior, DailyCheckIn::isDiarrhea);

        // (c) observationsJson changed-days per signal key (starter species).
        java.util.Map<String, Integer> recentChanged = changedDaysByKey(recent);
        java.util.Map<String, Integer> priorChanged = changedDaysByKey(prior);
        java.util.Map<String, String> labels = labelsByKey(recent);
        labelsByKey(prior).forEach(labels::putIfAbsent); // labels for signals that cleared this week
        java.util.Set<String> keys = new java.util.LinkedHashSet<>(recentChanged.keySet());
        keys.addAll(priorChanged.keySet());
        for (String key : keys) {
            int r = recentChanged.getOrDefault(key, 0);
            int p = priorChanged.getOrDefault(key, 0);
            if (Math.abs(r - p) >= 2) {
                candidates.add(new Candidate("observation", labels.get(key),
                        r > p, r, p, recent.size(), Math.abs(r - p)));
            }
        }

        return candidates.stream().max(java.util.Comparator.comparingDouble(Candidate::strength));
    }

    private void addDayCount(List<Candidate> out, String metric,
                             List<DailyCheckIn> recent, List<DailyCheckIn> prior,
                             java.util.function.Predicate<DailyCheckIn> flag) {
        int r = (int) recent.stream().filter(flag).count();
        int p = (int) prior.stream().filter(flag).count();
        if (Math.abs(r - p) >= 2) {
            out.add(new Candidate(metric, null, r > p, r, p, recent.size(), Math.abs(r - p)));
        }
    }

    private java.util.Map<String, Integer> changedDaysByKey(List<DailyCheckIn> window) {
        java.util.Map<String, Integer> changed = new java.util.LinkedHashMap<>();
        for (DailyCheckIn c : window) {
            for (var signal : com.petpattern.observations.ObservationSignals.parse(c.getObservationsJson(), mapper)) {
                if (signal.key() == null || signal.key().isBlank() || !signal.isChanged()) {
                    continue;
                }
                changed.merge(signal.key(), 1, Integer::sum);
            }
        }
        return changed;
    }

    private java.util.Map<String, String> labelsByKey(List<DailyCheckIn> window) {
        java.util.Map<String, String> labels = new java.util.LinkedHashMap<>();
        for (DailyCheckIn c : window) {
            for (var signal : com.petpattern.observations.ObservationSignals.parse(c.getObservationsJson(), mapper)) {
                if (signal.key() != null && !signal.key().isBlank()) {
                    labels.putIfAbsent(signal.key(), signal.displayLabel());
                }
            }
        }
        return labels;
    }

    private WeeklyInsight insight(Pet pet, Candidate c) {
        String eyebrow = Copy.t("THIS WEEK");
        // A symptom going UP is "watch"; easing off is "good".
        String tone = c.up() ? "watch" : "good";
        if ("itching".equals(c.metric())) {
            if (c.up()) {
                return new WeeklyInsight("INSIGHT", tone, eyebrow,
                        Copy.t("{0} scratched more often this week than last week.", pet.getName()),
                        Copy.t("It may be worth keeping an eye on — nothing conclusive on its own."),
                        null);
            }
            return new WeeklyInsight("INSIGHT", tone, eyebrow,
                    Copy.t("{0} seemed calmer this week — less scratching than last week.", pet.getName()),
                    Copy.t("A quieter stretch. Worth noting what's been the same lately."),
                    null);
        }
        // day-count metrics (booleans + observation signals): "X of Y days vs Z last week"
        String label = c.label() != null ? c.label() : dayCountLabel(c.metric());
        String headline = c.up()
                ? Copy.t("{0}: {1} came up more often this week.", pet.getName(), label)
                : Copy.t("{0}: {1} eased off this week.", pet.getName(), label);
        String support = Copy.t("Noted on {0} of {1} days, vs {2} days last week.",
                c.recentDays(), c.loggedDays(), c.priorDays());
        return new WeeklyInsight("INSIGHT", tone, eyebrow, headline,
                Copy.t("Just something the notes surfaced — worth keeping in view."), support);
    }

    private WeeklyInsight activityInsight(ActivityExposureAnalyzer.ActivityCoOccurrence a) {
        String eyebrow = Copy.t("THIS WEEK");
        if (a.type() == com.petpattern.domain.ActivityType.WALK) {
            return new WeeklyInsight("INSIGHT", "watch", eyebrow,
                    Copy.t("Scratching is logged more often on walk days or the day after."),
                    Copy.t("It's a co-occurrence, not a cause — but it's worth keeping an eye on."),
                    Copy.t("Seen on {0} of the last {1} days linked to a walk.",
                            a.coOccurrenceDays(), a.exposureDays()));
        }
        return new WeeklyInsight("INSIGHT", "watch", eyebrow,
                Copy.t("Scratching is logged more often around activity days."),
                Copy.t("It's a co-occurrence, not a cause — but it's worth keeping an eye on."),
                Copy.t("Seen on {0} of the last {1} days linked to an activity.",
                        a.coOccurrenceDays(), a.exposureDays()));
    }

    private String dayCountLabel(String metric) {
        return switch (metric) {
            case "ear_redness" -> Copy.t("ear redness");
            case "paw_licking" -> Copy.t("paw licking");
            case "vomiting" -> Copy.t("vomiting");
            case "diarrhea" -> Copy.t("loose stool");
            default -> Copy.t("a change");
        };
    }

    private WeeklyInsight learning(Pet pet) {
        return new WeeklyInsight(
                "LEARNING",
                "calm",
                null,
                Copy.t("Still getting to know {0}'s rhythm", pet.getName()),
                Copy.t("A few short notes will help useful patterns start to show."),
                null);
    }

    private WeeklyInsight stable() {
        return new WeeklyInsight(
                "STABLE",
                "calm",
                Copy.t("THIS WEEK"),
                Copy.t("This week looks fairly steady"),
                Copy.t("We didn't spot a big change in the logged routines and behaviour."),
                null);
    }
}
