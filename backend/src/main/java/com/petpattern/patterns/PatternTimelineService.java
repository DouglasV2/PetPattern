package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.api.dto.PatternTimelineDto;
import com.petpattern.api.dto.PatternTimelineEventDto;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Medication;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.WaterLevel;
import com.petpattern.i18n.Copy;
import com.petpattern.observations.ObservationSignal;
import com.petpattern.observations.ObservationSignals;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.MedicationRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Builds the "What changed before this?" timeline for a single pattern.
 *
 * <p>The timeline is deterministic and derived from stored history. It emits a
 * change-point event only when a signal actually shifts (food started, stool
 * softened, scratching rose, water dropped, a note was written) so the result
 * reads like a short story rather than a row-per-day table.
 */
@Service
public class PatternTimelineService {

    private static String medicalDisclaimer() {
        return Copy.t("That is why PetPattern shows this as a possible pattern. Not a diagnosis.");
    }

    private static String emptyMessage() {
        return Copy.t("There is not enough history yet. Keep logging for a few more days.");
    }

    private static final int ITCHING_ELEVATED = 5;

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PatternEngine patternEngine;
    private final MedicationRepository medicationRepository;
    private final ObjectMapper objectMapper;

    public PatternTimelineService(PetRepository petRepository,
                                  DailyCheckInRepository checkInRepository,
                                  FoodLogRepository foodLogRepository,
                                  PatternEngine patternEngine,
                                  MedicationRepository medicationRepository,
                                  ObjectMapper objectMapper) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.patternEngine = patternEngine;
        this.medicationRepository = medicationRepository;
        this.objectMapper = objectMapper;
    }

    /** Timeline for a specific pattern by its stable id (e.g. from the pattern list). */
    public PatternTimelineDto timelineForPatternId(UUID petId, String patternId) {
        Pet pet = findPet(petId);
        PatternCandidate candidate = patternEngine.analyze(petId).stream()
                .filter(c -> c.id().equals(patternId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pattern not found"));
        return build(pet, candidate);
    }

    /**
     * Fallback used by clients that prefer not to round-trip the stable id.
     * Returns the strongest current pattern of the requested type, or an empty
     * timeline if no such pattern is active.
     */
    public PatternTimelineDto timelineForType(UUID petId, PatternType type) {
        Pet pet = findPet(petId);
        return patternEngine.analyze(petId).stream()
                .filter(c -> c.type() == type)
                .findFirst()
                .map(candidate -> build(pet, candidate))
                .orElseGet(() -> emptyTimeline(pet, type));
    }

    private PatternTimelineDto build(Pet pet, PatternCandidate candidate) {
        LocalDate from = LocalDate.now().minusDays(120);
        List<DailyCheckIn> checkIns =
                checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, from);
        List<FoodLog> foodLogs =
                foodLogRepository.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(pet, from);

        if (checkIns.isEmpty()) {
            return emptyTimeline(pet, candidate.type());
        }

        LocalDate latestDate = checkIns.get(checkIns.size() - 1).getCheckInDate();
        Window window = windowFor(candidate, foodLogs, latestDate);

        List<PatternTimelineEventDto> events = new ArrayList<>();
        events.addAll(foodEvents(foodLogs, window));
        events.addAll(medicationEvents(pet, window));
        events.addAll(symptomEvents(checkIns, window));
        events.addAll(observationEvents(checkIns, window));
        events.add(patternDetectedEvent(candidate, window.end()));

        events.sort(Comparator
                .comparing(PatternTimelineEventDto::date)
                .thenComparingInt(event -> ORDER.getOrDefault(event.type(), 50)));

        boolean empty = events.size() <= 1; // only the closing PATTERN_DETECTED marker
        return new PatternTimelineDto(
                candidate.id(),
                candidate.type().name(),
                Copy.t("What happened before it?"),
                Copy.t("PetPattern looks at the days before {0}'s signals changed.", pet.getName()),
                candidate.title(),
                candidate.confidence().name(),
                candidate.summary(),
                ownerExplanation(pet, candidate),
                window.start(),
                window.end(),
                events,
                empty,
                empty ? emptyMessage() : null,
                medicalDisclaimer(),
                candidate.severity().name().toLowerCase(java.util.Locale.ROOT),
                candidate.urgentNote()
        );
    }

    // --- Window selection -------------------------------------------------

    private record Window(LocalDate start, LocalDate end) {
    }

    private Window windowFor(PatternCandidate candidate, List<FoodLog> foodLogs, LocalDate latestDate) {
        return switch (candidate.type()) {
            case POSSIBLE_FOOD_TRIGGER -> {
                FoodLog anchor = findFoodLog(foodLogs, candidate.relatedFoodLogId());
                if (anchor != null && anchor.getDateStarted() != null) {
                    LocalDate start = anchor.getDateStarted().minusDays(5);
                    LocalDate end = min(anchor.getDateStarted().plusDays(14), latestDate);
                    yield new Window(start, max(end, anchor.getDateStarted().plusDays(1)));
                }
                yield new Window(latestDate.minusDays(20), latestDate);
            }
            // Itching and stool windows reach back far enough to include a recent food change.
            case ITCHING_ABOVE_BASELINE -> new Window(latestDate.minusDays(20), latestDate);
            case STOOL_INSTABILITY -> new Window(latestDate.minusDays(16), latestDate);
            case WATER_DROP -> new Window(latestDate.minusDays(10), latestDate);
            case RECURRING_EAR_REDNESS -> new Window(latestDate.minusDays(16), latestDate);
            // Cat and starter patterns: a shared recent window is enough for the "what changed" view.
            case APPETITE_LOW, WATER_CHANGE, LITTER_BOX_CHANGE, HIDING_INCREASED, REPEATED_VOMITING,
                 REPEATED_OBSERVATION ->
                    new Window(latestDate.minusDays(20), latestDate);
            default -> new Window(latestDate.minusDays(20), latestDate);
        };
    }

    // --- Event builders ---------------------------------------------------

    private List<PatternTimelineEventDto> foodEvents(List<FoodLog> foodLogs, Window window) {
        List<PatternTimelineEventDto> events = new ArrayList<>();
        for (FoodLog food : foodLogs) {
            LocalDate started = food.getDateStarted();
            if (started == null || started.isBefore(window.start()) || started.isAfter(window.end())) {
                continue;
            }
            events.add(new PatternTimelineEventDto(
                    started,
                    "FOOD_STARTED",
                    Copy.t("Started {0}", foodLabel(food)),
                    foodSummary(food),
                    "info",
                    "FOOD_LOG",
                    food.getId()
            ));
        }
        return events;
    }

    private List<PatternTimelineEventDto> medicationEvents(Pet pet, Window window) {
        List<PatternTimelineEventDto> events = new ArrayList<>();
        for (Medication med : medicationRepository.findByPetOrderByStartDateDesc(pet)) {
            LocalDate start = med.getStartDate();
            if (start != null && !start.isBefore(window.start()) && !start.isAfter(window.end())) {
                String detail = med.getNotes() != null && !med.getNotes().isBlank()
                        ? med.getNotes()
                        : Copy.t("A medication or care note was logged.");
                events.add(new PatternTimelineEventDto(
                        start, "MEDICATION_STARTED", Copy.t("Started {0}", med.getName()), detail,
                        "info", "MEDICATION", med.getId()));
            }
            LocalDate end = med.getEndDate();
            if (end != null && !end.isBefore(window.start()) && !end.isAfter(window.end())) {
                events.add(new PatternTimelineEventDto(
                        end, "MEDICATION_ENDED", Copy.t("Finished {0}", med.getName()),
                        Copy.t("This medication was marked finished."), "info", "MEDICATION", med.getId()));
            }
        }
        return events;
    }

    /**
     * Walks the in-window check-ins in date order and emits an event whenever a
     * signal transitions. The check-in immediately before the window seeds the
     * "previous" state so the first in-window change is detected correctly.
     */
    private List<PatternTimelineEventDto> symptomEvents(List<DailyCheckIn> checkIns, Window window) {
        List<PatternTimelineEventDto> events = new ArrayList<>();

        DailyCheckIn previous = null;
        for (DailyCheckIn checkIn : checkIns) {
            if (checkIn.getCheckInDate().isBefore(window.start())) {
                previous = checkIn;
                continue;
            }
            if (checkIn.getCheckInDate().isAfter(window.end())) {
                break;
            }

            // Itching
            boolean nowItchy = isElevatedItching(checkIn);
            boolean wasItchy = isElevatedItching(previous);
            if (nowItchy && !wasItchy) {
                events.add(symptom(checkIn, "ITCHING_CHANGE", Copy.t("Scratching increased"),
                        Copy.t("Itching logged at {0}/10, higher than the days before.", checkIn.getItchingScore()),
                        "watch"));
            } else if (!nowItchy && wasItchy && checkIn.getItchingScore() != null) {
                events.add(symptom(checkIn, "ITCHING_CHANGE", Copy.t("Scratching settled"),
                        Copy.t("Itching eased back to {0}/10.", checkIn.getItchingScore()), "calm"));
            }

            // Stool
            boolean nowUnstable = isUnstableStool(checkIn);
            boolean wasUnstable = isUnstableStool(previous);
            if (nowUnstable && !wasUnstable) {
                boolean loose = checkIn.isDiarrhea() || checkIn.getStoolState() == StoolState.DIARRHEA;
                events.add(symptom(checkIn, "STOOL_CHANGE",
                        loose ? Copy.t("Loose stool logged") : Copy.t("Stool became softer"),
                        loose ? Copy.t("Diarrhea was recorded on this day.") : Copy.t("Softer stool than the days before."),
                        loose ? "alert" : "watch"));
            }

            // Water
            if (checkIn.getWaterLevel() == WaterLevel.LOWER
                    && (previous == null || previous.getWaterLevel() != WaterLevel.LOWER)) {
                events.add(symptom(checkIn, "WATER_CHANGE", Copy.t("Drinking less than usual"),
                        Copy.t("Water intake was logged lower than usual."), "watch"));
            }

            // Ear redness onset
            if (checkIn.isEarRedness() && (previous == null || !previous.isEarRedness())) {
                events.add(symptom(checkIn, "CHECK_IN_SYMPTOM", Copy.t("Ear redness noticed"),
                        Copy.t("Redness around the ears was logged."), "watch"));
            }

            // Vomiting onset
            if (checkIn.isVomiting() && (previous == null || !previous.isVomiting())) {
                events.add(symptom(checkIn, "CHECK_IN_SYMPTOM", Copy.t("Vomiting logged"),
                        Copy.t("Vomiting was recorded on this day."), "alert"));
            }

            // Owner note in their own words
            String note = checkIn.getFreeTextNote();
            if (note != null && !note.isBlank()) {
                events.add(symptom(checkIn, "NOTE", Copy.t("Your note"), note.trim(), "info"));
            }

            previous = checkIn;
        }
        return events;
    }

    /**
     * Starter-species equivalent of {@link #symptomEvents}: walks the in-window
     * check-ins and emits an event whenever an owner-observed signal (from
     * observations_json) transitions from not-changed to changed. Visible-change
     * signals get their own event type so they stand out. Works for any species —
     * a dog or cat that logs a visible change gets it on their timeline too.
     */
    private List<PatternTimelineEventDto> observationEvents(List<DailyCheckIn> checkIns, Window window) {
        List<PatternTimelineEventDto> events = new ArrayList<>();
        DailyCheckIn previous = null;
        for (DailyCheckIn checkIn : checkIns) {
            if (checkIn.getCheckInDate().isBefore(window.start())) {
                previous = checkIn;
                continue;
            }
            if (checkIn.getCheckInDate().isAfter(window.end())) {
                break;
            }
            Set<String> changedBefore = changedKeys(previous);
            for (ObservationSignal signal : ObservationSignals.parse(checkIn.getObservationsJson(), objectMapper)) {
                String key = signal.key();
                if (key == null || key.isBlank() || !signal.isChanged() || changedBefore.contains(key)) {
                    continue;
                }
                if (signal.isVisibleChange()) {
                    events.add(symptom(checkIn, "VISIBLE_CHANGE", Copy.t("Visible change noticed"),
                            visibleChangeSummary(signal), "watch"));
                } else {
                    events.add(symptom(checkIn, "OBSERVATION_CHANGE",
                            Copy.t("Change logged: {0}", signal.displayLabel()),
                            observationSummary(signal), "watch"));
                }
            }
            previous = checkIn;
        }
        return events;
    }

    /** The set of signal keys logged as "changed" on a given check-in (empty if none/null). */
    private Set<String> changedKeys(DailyCheckIn checkIn) {
        if (checkIn == null) {
            return Set.of();
        }
        Set<String> keys = new HashSet<>();
        for (ObservationSignal signal : ObservationSignals.parse(checkIn.getObservationsJson(), objectMapper)) {
            if (signal.key() != null && !signal.key().isBlank() && signal.isChanged()) {
                keys.add(signal.key());
            }
        }
        return keys;
    }

    private String observationSummary(ObservationSignal signal) {
        String base = Copy.t("Logged as {0}.", signal.displayValue());
        String note = signal.note();
        return (note == null || note.isBlank()) ? base : base + " " + note.trim();
    }

    private String visibleChangeSummary(ObservationSignal signal) {
        String status = signal.normalizedStatus();
        StringBuilder builder = new StringBuilder(signal.displayValue());
        if (status != null) {
            builder.append(" (").append(status).append(')');
        }
        if (signal.note() != null && !signal.note().isBlank()) {
            builder.append(" — ").append(signal.note().trim());
        }
        return builder.toString();
    }

    private PatternTimelineEventDto symptom(DailyCheckIn checkIn, String type, String title,
                                            String summary, String severity) {
        return new PatternTimelineEventDto(
                checkIn.getCheckInDate(), type, title, summary, severity, "CHECK_IN", checkIn.getId());
    }

    private PatternTimelineEventDto patternDetectedEvent(PatternCandidate candidate, LocalDate date) {
        boolean urgent = candidate.severity() == Severity.URGENT;
        return new PatternTimelineEventDto(
                date,
                "PATTERN_DETECTED",
                candidate.title(),
                urgent
                        ? Copy.t("This is where the days above line up into something worth acting on soon.")
                        : Copy.t("This is where the days above start to look like a pattern — a good thing to raise with your vet."),
                urgent ? "urgent" : "pattern",
                "PATTERN",
                null
        );
    }

    // --- Copy -------------------------------------------------------------

    private String ownerExplanation(Pet pet, PatternCandidate candidate) {
        String name = pet.getName();
        return switch (candidate.type()) {
            case POSSIBLE_FOOD_TRIGGER -> Copy.t("In the days after {0} ate the food below, the signals you track "
                    + "changed more than usual, and this happened in more than one tracked period. "
                    + "It is not a diagnosis, but it may be a pattern worth bringing to your vet.", name);
            case ITCHING_ABOVE_BASELINE -> Copy.t("{0}'s scratching has been higher than the recent normal range. "
                    + "Looking at the days before the rise can help you and your vet spot what changed.", name);
            case STOOL_INSTABILITY -> Copy.t("{0}'s stool has been less stable than usual this week. "
                    + "Recent food changes are worth comparing against these days.", name);
            case WATER_DROP -> Copy.t("{0} has been drinking less than usual. This is context worth watching, "
                    + "especially if it continues or appears with other changes.", name);
            case RECURRING_EAR_REDNESS -> Copy.t("{0}'s ears have been red or irritated on several recent days. "
                    + "Looking at the days around it can help you and your vet see what changed.", name);
            case APPETITE_LOW -> Copy.t("{0}'s appetite has been lower than usual recently. Looking at the days around it "
                    + "can help you and your vet see what changed. This is not a diagnosis.", name);
            case WATER_CHANGE -> Copy.t("{0}'s water intake changed from the recent normal. Worth watching, "
                    + "especially if it continues or appears with other changes.", name);
            case LITTER_BOX_CHANGE -> Copy.t("{0}'s litter box behavior changed recently. Looking at the days around it "
                    + "can help you and your vet. This is not a diagnosis.", name);
            case HIDING_INCREASED -> Copy.t("{0} has been hiding more than usual — worth watching and mentioning to your vet.", name);
            case REPEATED_VOMITING -> Copy.t("{0} vomited on more than one recent day. Worth bringing to your vet "
                    + "if it continues. This is not a diagnosis.", name);
            case REPEATED_OBSERVATION -> Copy.t("You logged this change on more than one day. Looking at the days "
                    + "around it can help you and your vet. This is not a diagnosis.", name);
            // Starter-species rules already build a cautious, owner-facing summary; reuse it
            // so the "what changed" view stays consistent and this switch stays exhaustive-safe.
            default -> candidate.summary();
        };
    }

    private PatternTimelineDto emptyTimeline(Pet pet, PatternType type) {
        LocalDate today = LocalDate.now();
        return new PatternTimelineDto(
                null,
                type.name(),
                Copy.t("What happened before it?"),
                Copy.t("PetPattern looks at the days before {0}'s signals changed.", pet.getName()),
                null,
                null,
                null,
                null,
                today.minusDays(14),
                today,
                List.of(),
                true,
                emptyMessage(),
                medicalDisclaimer(),
                "watch",
                null
        );
    }

    // --- Helpers ----------------------------------------------------------

    private boolean isElevatedItching(DailyCheckIn checkIn) {
        return checkIn != null
                && checkIn.getItchingScore() != null
                && checkIn.getItchingScore() >= ITCHING_ELEVATED;
    }

    private boolean isUnstableStool(DailyCheckIn checkIn) {
        if (checkIn == null) {
            return false;
        }
        if (checkIn.isDiarrhea()) {
            return true;
        }
        StoolState state = checkIn.getStoolState();
        if (state == StoolState.SOFT || state == StoolState.DIARRHEA) {
            return true;
        }
        Integer stoolScore = checkIn.getStoolScore();
        return stoolScore != null && stoolScore <= 2;
    }

    private FoodLog findFoodLog(List<FoodLog> foodLogs, UUID id) {
        if (id == null) {
            return null;
        }
        return foodLogs.stream().filter(food -> id.equals(food.getId())).findFirst().orElse(null);
    }

    private String foodLabel(FoodLog food) {
        if (food.getProductName() != null && !food.getProductName().isBlank()) {
            return food.getProductName();
        }
        if (food.getBrand() != null && !food.getBrand().isBlank()) {
            return food.getBrand();
        }
        return foodKindLabel(food.getFoodKind());
    }

    private String foodSummary(FoodLog food) {
        StringBuilder builder = new StringBuilder(foodKindLabel(food.getFoodKind()));
        Protein protein = food.getPrimaryProtein();
        if (protein != null && protein != Protein.UNKNOWN) {
            builder.append(", ").append(Copy.t("protein: {0}", Copy.protein(protein)));
        }
        if (food.isNewFood()) {
            builder.append(", ").append(Copy.t("new food"));
        }
        builder.append('.');
        return builder.toString();
    }

    private String foodKindLabel(FoodKind kind) {
        FoodKind value = kind == null ? FoodKind.MAIN_FOOD : kind;
        if (value == FoodKind.TREAT) {
            return Copy.t("Treat");
        }
        if (value == FoodKind.MAIN_FOOD) {
            return Copy.t("Main food");
        }
        String lower = value.name().toLowerCase(Locale.ROOT).replace('_', ' ');
        return Copy.t(Character.toUpperCase(lower.charAt(0)) + lower.substring(1));
    }

    private Pet findPet(UUID petId) {
        return petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
    }

    private static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }

    private static LocalDate max(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }

    /** Same-day ordering so a story reads causes (food, meds) first, then symptoms, then notes. */
    private static final Map<String, Integer> ORDER = Map.ofEntries(
            Map.entry("FOOD_STARTED", 0),
            Map.entry("MEDICATION_STARTED", 1),
            Map.entry("ITCHING_CHANGE", 2),
            Map.entry("STOOL_CHANGE", 3),
            Map.entry("WATER_CHANGE", 4),
            Map.entry("CHECK_IN_SYMPTOM", 5),
            Map.entry("OBSERVATION_CHANGE", 5),
            Map.entry("VISIBLE_CHANGE", 5),
            Map.entry("MEDICATION_ENDED", 6),
            Map.entry("NOTE", 7),
            Map.entry("PATTERN_DETECTED", 9)
    );
}
