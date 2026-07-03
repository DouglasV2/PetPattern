package com.petpattern.vet;

import com.petpattern.api.dto.VetSummaryDto;
import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import com.petpattern.domain.Sex;
import com.petpattern.domain.Species;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.UrinationChange;
import com.petpattern.domain.WaterLevel;
import com.petpattern.i18n.Copy;
import com.petpattern.patterns.PatternCandidate;
import com.petpattern.patterns.PatternEngine;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.OptionalDouble;

/**
 * Builds a vet-ready summary from stored, owner-reported history.
 *
 * <p>Everything here is a description of what was logged. The service never
 * produces a diagnosis or a treatment plan; it just organizes observations so a
 * vet conversation starts from a clean record instead of memory.
 */
@Service
public class VetSummaryService {

    private static String disclaimer() {
        return Copy.t("PetPattern does not diagnose or replace veterinary care. This summary is based on "
                + "owner-reported logs and is meant to help organize observations for a veterinarian.");
    }

    private static final int DEFAULT_DAYS = 30;
    private static final int MIN_DAYS = 7;
    private static final int MAX_DAYS = 180;
    private static final int RECENT_WINDOW = 7;
    private static final int ITCHING_ELEVATED = 5;

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PatternEngine patternEngine;
    private final com.petpattern.repository.MedicationRepository medicationRepository;

    public VetSummaryService(PetRepository petRepository,
                             DailyCheckInRepository checkInRepository,
                             FoodLogRepository foodLogRepository,
                             PatternEngine patternEngine,
                             com.petpattern.repository.MedicationRepository medicationRepository) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.patternEngine = patternEngine;
        this.medicationRepository = medicationRepository;
    }

    public VetSummaryDto build(java.util.UUID petId, Integer requestedDays) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));

        int days = clampDays(requestedDays);
        LocalDate today = LocalDate.now();
        LocalDate rangeEnd = today;
        LocalDate rangeStart = today.minusDays(days - 1L);

        List<DailyCheckIn> allCheckIns =
                checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, rangeStart);
        List<DailyCheckIn> checkIns = allCheckIns.stream()
                .filter(c -> !c.getCheckInDate().isAfter(rangeEnd))
                .toList();

        List<FoodLog> foodLogs =
                foodLogRepository.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(pet, rangeStart).stream()
                        .filter(f -> f.getDateStarted() != null && !f.getDateStarted().isAfter(rangeEnd))
                        .toList();

        List<PatternCandidate> patterns = patternEngine.analyze(petId);

        VetSummaryDto.Identity identity = identity(pet);
        VetSummaryDto.CheckInSummary checkInSummary = checkInSummary(pet, checkIns, days, rangeEnd);
        VetSummaryDto.StoolSummary stoolSummary = stoolSummary(pet, checkIns);
        VetSummaryDto.CatSignals catSignals = pet.getSpecies() == Species.CAT ? catSignals(pet, checkIns) : null;
        VetSummaryDto.WellbeingNotes wellbeing = wellbeing(pet, checkIns);
        List<VetSummaryDto.FoodChange> foodChanges = foodChanges(foodLogs);
        List<VetSummaryDto.MedicationLine> medications = medications(pet, rangeStart, rangeEnd);
        List<VetSummaryDto.PatternSummary> patternSummaries = patternSummaries(patterns);
        List<VetSummaryDto.OwnerNote> ownerNotes = ownerNotes(checkIns);
        String mainConcern = mainConcern(pet, patterns, checkInSummary, stoolSummary);

        String plainText = plainText(identity, today, rangeStart, rangeEnd, days, mainConcern,
                checkInSummary, stoolSummary, catSignals, wellbeing, foodChanges, medications, patternSummaries, ownerNotes);

        return new VetSummaryDto(
                today,
                rangeStart,
                rangeEnd,
                days,
                identity,
                mainConcern,
                checkInSummary,
                stoolSummary,
                catSignals,
                wellbeing,
                foodChanges,
                medications,
                patternSummaries,
                ownerNotes,
                disclaimer(),
                plainText
        );
    }

    // --- Sections ---------------------------------------------------------

    private VetSummaryDto.Identity identity(Pet pet) {
        return new VetSummaryDto.Identity(
                pet.getName(),
                Copy.t(titleCase(pet.getSpecies() == null ? "DOG" : pet.getSpecies().name())),
                pet.getBreed(),
                ageLabel(pet.getBirthDate()),
                (pet.getSex() == null || pet.getSex() == Sex.UNKNOWN) ? null : Copy.t(titleCase(pet.getSex().name())),
                pet.getCurrentWeightKg()
        );
    }

    private VetSummaryDto.CheckInSummary checkInSummary(Pet pet, List<DailyCheckIn> checkIns, int days, LocalDate rangeEnd) {
        OptionalDouble avg = averageItching(checkIns);
        LocalDate recentFrom = rangeEnd.minusDays(RECENT_WINDOW - 1L);
        List<DailyCheckIn> recent = checkIns.stream()
                .filter(c -> !c.getCheckInDate().isBefore(recentFrom))
                .toList();
        OptionalDouble recentAvg = averageItching(recent);
        Integer peak = checkIns.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(null);
        int earDays = (int) checkIns.stream().filter(DailyCheckIn::isEarRedness).count();
        int vomitDays = (int) checkIns.stream().filter(DailyCheckIn::isVomiting).count();

        StringBuilder narrative = new StringBuilder();
        narrative.append(Copy.t("{0} was logged on {1} of the last {2} days.",
                pet.getName(), checkIns.size(), days));
        if (avg.isPresent()) {
            narrative.append(Copy.t(" Average scratching was {0}/10", oneDecimal(avg.getAsDouble())));
            if (recentAvg.isPresent()) {
                narrative.append(Copy.t(", with the most recent week around {0}/10",
                        oneDecimal(recentAvg.getAsDouble())));
            }
            narrative.append('.');
        }
        if (earDays > 0) {
            narrative.append(Copy.t(" Ear redness was noted on {0}.", Copy.days(earDays)));
        }
        if (vomitDays > 0) {
            narrative.append(Copy.t(" Vomiting was noted on {0}.", Copy.days(vomitDays)));
        }

        return new VetSummaryDto.CheckInSummary(
                checkIns.size(),
                days,
                avg.isPresent() ? round1(avg.getAsDouble()) : null,
                recentAvg.isPresent() ? round1(recentAvg.getAsDouble()) : null,
                peak,
                earDays,
                vomitDays,
                narrative.toString()
        );
    }

    private VetSummaryDto.StoolSummary stoolSummary(Pet pet, List<DailyCheckIn> checkIns) {
        int normal = 0;
        int soft = 0;
        int diarrhea = 0;
        for (DailyCheckIn checkIn : checkIns) {
            StoolState state = checkIn.getStoolState();
            boolean loose = checkIn.isDiarrhea() || state == StoolState.DIARRHEA;
            if (loose) {
                diarrhea++;
            } else if (state == StoolState.SOFT || (checkIn.getStoolScore() != null && checkIn.getStoolScore() <= 2)) {
                soft++;
            } else if (state == StoolState.NORMAL) {
                normal++;
            }
        }

        String narrative;
        if (soft + diarrhea == 0) {
            narrative = Copy.t("Stool stayed mostly normal across the logged days.");
        } else {
            narrative = Copy.t("{0} had softer stool on {1} and loose stool or diarrhea on {2} in this period.",
                    pet.getName(), Copy.days(soft), Copy.days(diarrhea));
        }
        return new VetSummaryDto.StoolSummary(normal, soft, diarrhea, narrative);
    }

    /** Cat-only: litter box, urination, hiding and weight observations, described plainly. */
    private VetSummaryDto.CatSignals catSignals(Pet pet, List<DailyCheckIn> checkIns) {
        int litterChanged = (int) checkIns.stream()
                .filter(c -> c.getLitterBoxUse() == LitterBoxUse.LESS || c.getLitterBoxUse() == LitterBoxUse.MORE)
                .count();
        int litterNone = (int) checkIns.stream().filter(c -> c.getLitterBoxUse() == LitterBoxUse.NONE).count();
        int urinationChanged = (int) checkIns.stream()
                .filter(c -> c.getUrinationChange() == UrinationChange.LESS || c.getUrinationChange() == UrinationChange.MORE)
                .count();
        int straining = (int) checkIns.stream().filter(DailyCheckIn::isStraining).count();
        int hidingMore = (int) checkIns.stream().filter(c -> c.getHidingBehavior() == HidingBehavior.MORE).count();
        int weightConcern = (int) checkIns.stream().filter(DailyCheckIn::isWeightConcern).count();

        List<String> parts = new ArrayList<>();
        if (litterChanged > 0) {
            parts.add(Copy.t("used the litter box less or more than usual on {0}", Copy.days(litterChanged)));
        }
        if (litterNone > 0) {
            parts.add(Copy.t("did not use the litter box on {0}", Copy.days(litterNone)));
        }
        if (urinationChanged > 0) {
            parts.add(Copy.t("had a noticed urination change on {0}", Copy.days(urinationChanged)));
        }
        if (straining > 0) {
            parts.add(Copy.t("strained on {0}", Copy.days(straining)));
        }
        if (hidingMore > 0) {
            parts.add(Copy.t("hid more than usual on {0}", Copy.days(hidingMore)));
        }
        if (weightConcern > 0) {
            parts.add(Copy.t("had a weight concern noted on {0}", Copy.days(weightConcern)));
        }

        // The HR wrapper drops the name (avoids declining it) — that's deliberate.
        String narrative = parts.isEmpty()
                ? Copy.t("Litter box use and behavior stayed close to usual across the logged days.")
                : Copy.t("{0} {1} in this period.", pet.getName(), String.join(", ", parts));
        return new VetSummaryDto.CatSignals(
                litterChanged, litterNone, urinationChanged, straining, hidingMore, weightConcern, narrative);
    }

    private VetSummaryDto.WellbeingNotes wellbeing(Pet pet, List<DailyCheckIn> checkIns) {
        int lowerWater = (int) checkIns.stream().filter(c -> c.getWaterLevel() == WaterLevel.LOWER).count();
        int lowerAppetite = (int) checkIns.stream()
                .filter(c -> c.getAppetiteLevel() == AppetiteLevel.LOWER
                        || c.getAppetiteLevel() == AppetiteLevel.REFUSED)
                .count();
        int lowEnergy = (int) checkIns.stream()
                .filter(c -> c.getEnergyLevel() == EnergyLevel.LOW || c.getEnergyLevel() == EnergyLevel.RESTLESS)
                .count();

        List<String> parts = new ArrayList<>();
        if (lowerWater > 0) {
            parts.add(Copy.t("drank less than usual on {0}", Copy.days(lowerWater)));
        }
        if (lowerAppetite > 0) {
            parts.add(Copy.t("ate less than usual on {0}", Copy.days(lowerAppetite)));
        }
        if (lowEnergy > 0) {
            parts.add(Copy.t("had low or restless energy on {0}", Copy.days(lowEnergy)));
        }

        String narrative = parts.isEmpty()
                ? Copy.t("Water, appetite, and energy stayed close to normal in this period.")
                : Copy.t("{0} {1}.", pet.getName(), String.join(", ", parts));
        return new VetSummaryDto.WellbeingNotes(lowerWater, lowerAppetite, lowEnergy, narrative);
    }

    private List<VetSummaryDto.FoodChange> foodChanges(List<FoodLog> foodLogs) {
        List<VetSummaryDto.FoodChange> changes = new ArrayList<>();
        for (FoodLog food : foodLogs) {
            Protein protein = food.getPrimaryProtein();
            changes.add(new VetSummaryDto.FoodChange(
                    food.getDateStarted(),
                    foodLabel(food),
                    Copy.t(titleCase(food.getFoodKind() == null ? FoodKind.MAIN_FOOD.name() : food.getFoodKind().name())),
                    (protein == null || protein == Protein.UNKNOWN) ? null : Copy.proteinLabel(protein),
                    food.isNewFood()
            ));
        }
        return changes;
    }

    private List<VetSummaryDto.MedicationLine> medications(Pet pet, LocalDate rangeStart, LocalDate rangeEnd) {
        return medicationRepository.findByPetOrderByStartDateDesc(pet).stream()
                .filter(m -> m.getStartDate() != null && !m.getStartDate().isAfter(rangeEnd)
                        && (m.getEndDate() == null || !m.getEndDate().isBefore(rangeStart)))
                .map(m -> new VetSummaryDto.MedicationLine(
                        m.getName(), m.getStartDate(), m.getEndDate(), m.getEndDate() == null))
                .toList();
    }

    private List<VetSummaryDto.PatternSummary> patternSummaries(List<PatternCandidate> patterns) {
        return patterns.stream()
                .map(c -> new VetSummaryDto.PatternSummary(
                        c.type().name(), c.title(), c.confidence().name(), c.summary()))
                .toList();
    }

    private List<VetSummaryDto.OwnerNote> ownerNotes(List<DailyCheckIn> checkIns) {
        List<VetSummaryDto.OwnerNote> notes = new ArrayList<>();
        for (DailyCheckIn checkIn : checkIns) {
            String note = checkIn.getFreeTextNote();
            if (note != null && !note.isBlank()) {
                notes.add(new VetSummaryDto.OwnerNote(checkIn.getCheckInDate(), note.trim()));
            }
        }
        return notes;
    }

    private String mainConcern(Pet pet,
                               List<PatternCandidate> patterns,
                               VetSummaryDto.CheckInSummary checkInSummary,
                               VetSummaryDto.StoolSummary stoolSummary) {
        if (!patterns.isEmpty()) {
            PatternCandidate top = patterns.get(0);
            return switch (top.type()) {
                case POSSIBLE_FOOD_TRIGGER -> Copy.t("Possible food-related pattern: more itching and stool changes "
                        + "were logged after certain foods. The owner would like to review this with a vet.");
                case ITCHING_ABOVE_BASELINE -> Copy.t("Recurring scratching above {0}'s normal range that the owner "
                        + "wants to understand.", pet.getName());
                case STOOL_INSTABILITY -> Copy.t("Recurring soft stool or diarrhea that the owner wants to review.");
                case WATER_DROP -> Copy.t("A recent drop in water intake the owner wants to check.");
                case RECURRING_EAR_REDNESS -> Copy.t("Recurring ear redness that the owner wants to review.");
                case APPETITE_LOW -> Copy.t("{0}'s appetite has been lower than usual, which the owner wants to review.", pet.getName());
                case WATER_CHANGE -> Copy.t("A recent change in water intake from {0}'s normal that the owner wants to check.", pet.getName());
                case LITTER_BOX_CHANGE -> Copy.t("A recent change in litter box behavior that the owner wants to review.");
                case HIDING_INCREASED -> Copy.t("{0} has been hiding more than usual, which the owner wants to review.", pet.getName());
                case REPEATED_VOMITING -> Copy.t("{0} vomited on more than one recent day, which the owner wants to review.", pet.getName());
            };
        }
        if (stoolSummary.softDays() + stoolSummary.diarrheaDays() > 0
                || (checkInSummary.itchingRecentAverage() != null
                && checkInSummary.itchingRecentAverage() >= ITCHING_ELEVATED)) {
            return Copy.t("Some itching and stool changes the owner is tracking; no single clear pattern yet.");
        }
        return Copy.t("Nothing specific stood out yet. The owner is keeping a daily record so any change is easy to catch early and bring to you.");
    }

    // --- Plain text (for one-click copy / print) --------------------------

    private String plainText(VetSummaryDto.Identity pet,
                             LocalDate generatedOn,
                             LocalDate rangeStart,
                             LocalDate rangeEnd,
                             int days,
                             String mainConcern,
                             VetSummaryDto.CheckInSummary checkInSummary,
                             VetSummaryDto.StoolSummary stoolSummary,
                             VetSummaryDto.CatSignals catSignals,
                             VetSummaryDto.WellbeingNotes wellbeing,
                             List<VetSummaryDto.FoodChange> foodChanges,
                             List<VetSummaryDto.MedicationLine> medications,
                             List<VetSummaryDto.PatternSummary> patterns,
                             List<VetSummaryDto.OwnerNote> ownerNotes) {
        StringBuilder out = new StringBuilder();
        out.append(Copy.t("PetPattern — Vet Visit Summary")).append('\n');
        out.append(Copy.t("Generated {0}", rangeEnd)).append("\n\n");

        out.append(Copy.t("PET")).append('\n');
        out.append(join(" · ", pet.name(), pet.breed(), pet.ageLabel(), pet.sex(),
                pet.weightKg() == null ? null : pet.weightKg() + " kg")).append("\n\n");

        out.append(Copy.t("DATE RANGE")).append('\n');
        out.append(Copy.t("{0} to {1} ({2} days)", rangeStart, rangeEnd, days)).append("\n\n");

        out.append(Copy.t("OWNER-OBSERVED CONCERN")).append('\n');
        out.append(mainConcern).append("\n\n");

        out.append(Copy.t("RECENT CHECK-IN SUMMARY")).append('\n');
        out.append("- ").append(checkInSummary.narrative()).append("\n\n");

        out.append(Copy.t("FOOD EXPOSURE HISTORY")).append('\n');
        if (foodChanges.isEmpty()) {
            out.append("- ").append(Copy.t("No food changes logged in this period.")).append('\n');
        } else {
            for (VetSummaryDto.FoodChange food : foodChanges) {
                out.append("- ").append(food.dateStarted()).append(": ").append(food.label())
                        .append(" (").append(food.foodKind());
                if (food.primaryProtein() != null) {
                    out.append(", ").append(food.primaryProtein());
                }
                out.append(food.newFood() ? ", " + Copy.t("new food") + ")" : ")").append("\n");
            }
        }
        out.append("\n");

        out.append(Copy.t("MEDICATIONS & TREATMENTS")).append('\n');
        if (medications.isEmpty()) {
            out.append("- ").append(Copy.t("None logged in this period.")).append('\n');
        } else {
            for (VetSummaryDto.MedicationLine med : medications) {
                out.append("- ").append(med.name()).append(": ").append(med.startDate())
                        .append(med.ongoing() ? " – " + Copy.t("ongoing") : " – " + med.endDate()).append("\n");
            }
        }
        out.append("\n");

        // Stool is a dog signal; cats get their own litter box & behavior section.
        if (catSignals != null) {
            out.append(Copy.t("LITTER BOX & BEHAVIOR")).append('\n');
            out.append("- ").append(catSignals.narrative()).append("\n");
            out.append("- ").append(Copy.t("Litter box changed")).append(": ").append(catSignals.litterBoxChangedDays())
                    .append(" · ").append(Copy.t("Not used")).append(": ").append(catSignals.litterBoxNotUsedDays())
                    .append(" · ").append(Copy.t("Urination change")).append(": ").append(catSignals.urinationChangedDays())
                    .append(" · ").append(Copy.t("Straining")).append(": ").append(catSignals.strainingDays())
                    .append(" · ").append(Copy.t("Hiding more")).append(": ").append(catSignals.hidingMoreDays())
                    .append(" · ").append(Copy.t("Weight concern")).append(": ").append(catSignals.weightConcernDays()).append("\n\n");
        } else {
            out.append(Copy.t("STOOL CHANGES")).append('\n');
            out.append("- ").append(stoolSummary.narrative()).append("\n");
            out.append("- ").append(Copy.t("Normal")).append(": ").append(stoolSummary.normalDays())
                    .append(" · ").append(Copy.t("Soft")).append(": ").append(stoolSummary.softDays())
                    .append(" · ").append(Copy.t("Loose/diarrhea")).append(": ").append(stoolSummary.diarrheaDays()).append("\n\n");
        }

        out.append(Copy.t("WATER / APPETITE / ENERGY")).append('\n');
        out.append("- ").append(wellbeing.narrative()).append("\n\n");

        out.append(Copy.t("POSSIBLE PATTERNS")).append('\n');
        if (patterns.isEmpty()) {
            out.append("- ").append(Copy.t("No single clear pattern stood out in this period.")).append('\n');
        } else {
            for (VetSummaryDto.PatternSummary pattern : patterns) {
                out.append("- [").append(Copy.t(titleCase(pattern.confidence()))).append("] ")
                        .append(pattern.title()).append(": ").append(pattern.summary()).append("\n");
            }
        }
        out.append("\n");

        out.append(Copy.t("NOTES WORTH DISCUSSING")).append('\n');
        if (ownerNotes.isEmpty()) {
            out.append("- ").append(Copy.t("No free-text notes in this period.")).append('\n');
        } else {
            for (VetSummaryDto.OwnerNote note : ownerNotes) {
                out.append("- ").append(note.date()).append(": ").append(note.note()).append("\n");
            }
        }
        out.append("\n");

        out.append(Copy.t("DISCLAIMER")).append('\n');
        out.append(disclaimer()).append("\n");
        return out.toString();
    }

    // --- Helpers ----------------------------------------------------------

    private int clampDays(Integer requestedDays) {
        if (requestedDays == null) {
            return DEFAULT_DAYS;
        }
        return Math.max(MIN_DAYS, Math.min(MAX_DAYS, requestedDays));
    }

    private OptionalDouble averageItching(List<DailyCheckIn> checkIns) {
        return checkIns.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();
    }

    private String foodLabel(FoodLog food) {
        String label = join(" - ", food.getBrand(), food.getProductName());
        if (label.isBlank()) {
            return titleCase(food.getFoodKind() == null ? FoodKind.MAIN_FOOD.name() : food.getFoodKind().name());
        }
        return label;
    }

    private String ageLabel(LocalDate birthDate) {
        if (birthDate == null) {
            // Unknown stays unknown — a vet document must not guess ("Adult" for a
            // pet whose birth date was simply never entered would be fabricated).
            return null;
        }
        int years = Period.between(birthDate, LocalDate.now()).getYears();
        return years > 0 ? Copy.years(years) : Copy.t("Under 1 year");
    }

    private static Double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static String oneDecimal(double value) {
        return String.format(Locale.US, "%.1f", value);
    }

    private static String titleCase(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        String lower = value.toLowerCase(Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private static String join(String separator, String... parts) {
        List<String> kept = new ArrayList<>();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                kept.add(part.trim());
            }
        }
        return String.join(separator, kept);
    }
}
