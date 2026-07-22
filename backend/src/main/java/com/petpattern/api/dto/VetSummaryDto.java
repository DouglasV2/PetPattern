package com.petpattern.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * A calm, owner-reported summary an owner can actually bring to a vet.
 *
 * <p>It organizes stored observations into sections a veterinarian can scan in
 * under a minute. It deliberately contains no diagnosis and no treatment plan;
 * the {@code plainText} field is a ready-to-copy version of the same content.
 */
public record VetSummaryDto(
        LocalDate generatedOn,
        LocalDate rangeStart,
        LocalDate rangeEnd,
        int days,
        Identity pet,
        String mainConcern,
        CheckInSummary checkInSummary,
        StoolSummary stoolSummary,
        CatSignals catSignals,
        WellbeingNotes wellbeing,
        // The pet's current main food right now (spec Part 4 snapshot) — shown even
        // when the diet has been stable and no change falls inside the window. Null
        // if no main food was ever logged.
        FoodChange currentFood,
        List<FoodChange> foodChanges,
        List<MedicationLine> medications,
        List<PatternSummary> patterns,
        List<OwnerNote> ownerNotes,
        ObservationSummary observations,
        VisibleChangeSummary visibleChanges,
        // A short chronological event list merged from the dated items above
        // (spec Part 4) — food changes, medications, notes, visible changes.
        List<TimelineEntry> timeline,
        // The owner's standing questions to raise at the visit (spec Part 4).
        String vetQuestions,
        String disclaimer,
        String plainText
) {

    /** One dated event on the merged vet-summary timeline. */
    public record TimelineEntry(
            LocalDate date,
            String kind,
            String label
    ) {
    }

    public record MedicationLine(
            String name,
            LocalDate startDate,
            LocalDate endDate,
            boolean ongoing
    ) {
    }

    public record Identity(
            String name,
            String species,
            String breed,
            String ageLabel,
            String sex,
            BigDecimal weightKg
    ) {
    }

    public record CheckInSummary(
            int daysLogged,
            int daysInRange,
            Double itchingAverage,
            Double itchingRecentAverage,
            Integer itchingPeak,
            int earRednessDays,
            int vomitingDays,
            String narrative
    ) {
    }

    public record StoolSummary(
            int normalDays,
            int softDays,
            int diarrheaDays,
            String narrative
    ) {
    }

    /** Cat-only signals (litter box, urination, hiding, weight). Null for dogs. */
    public record CatSignals(
            int litterBoxChangedDays,
            int litterBoxNotUsedDays,
            int urinationChangedDays,
            int strainingDays,
            int hidingMoreDays,
            int weightConcernDays,
            String narrative
    ) {
    }

    public record WellbeingNotes(
            int lowerWaterDays,
            int lowerAppetiteDays,
            int lowEnergyDays,
            String narrative
    ) {
    }

    public record FoodChange(
            LocalDate dateStarted,
            String label,
            String foodKind,
            String primaryProtein,
            boolean newFood
    ) {
    }

    public record PatternSummary(
            String type,
            String title,
            // Internal ranking hint only — not a user-facing confidence level and
            // never serialized into the shared/exported summary (spec Part 12).
            @JsonIgnore String confidence,
            String summary,
            String severity,
            String urgentNote
    ) {
    }

    public record OwnerNote(
            LocalDate date,
            String note
    ) {
    }

    /**
     * Species-specific owner-observed signals (from the flexible observations
     * model), for starter species. Null for dog/cat, which use the explicit
     * sections above. Visible changes are reported separately below.
     */
    public record ObservationSummary(
            List<ObservationLine> signals,
            String narrative
    ) {
    }

    public record ObservationLine(
            String key,
            String label,
            int changedDays,
            String latestValue
    ) {
    }

    /**
     * Visible Change / Wound notes over time — universal across species. This is
     * an owner-observed timeline, not a diagnosis; photos, where present, line up
     * by date so a vet can see how a change looked. Null when nothing was logged.
     */
    public record VisibleChangeSummary(
            List<VisibleChangeEntry> entries,
            int photoCount,
            String narrative
    ) {
    }

    public record VisibleChangeEntry(
            LocalDate date,
            String value,
            String status,
            String severity,
            String note,
            int photoCount
    ) {
    }
}
