package com.petpattern.api;

import com.petpattern.api.dto.*;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import com.petpattern.domain.Sex;
import com.petpattern.domain.Species;
import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;
import com.petpattern.patterns.PatternMemoryService;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets")
public class PetController {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PatternMemoryService patternMemoryService;
    private final PetCaregiverRepository caregiverRepository;
    private final PetAccess petAccess;

    public PetController(PetRepository petRepository,
                         DailyCheckInRepository checkInRepository,
                         FoodLogRepository foodLogRepository,
                         PatternMemoryService patternMemoryService,
                         PetCaregiverRepository caregiverRepository,
                         PetAccess petAccess) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.patternMemoryService = patternMemoryService;
        this.caregiverRepository = caregiverRepository;
        this.petAccess = petAccess;
    }

    @GetMapping
    public List<PetResponse> listPets() {
        Owner owner = petAccess.currentOwner();
        // Pets I own, then pets shared with me — deduped by id, own ones first.
        Map<UUID, Pet> byId = new LinkedHashMap<>();
        petRepository.findByOwnerOrderByCreatedAtAsc(owner).forEach(pet -> byId.put(pet.getId(), pet));
        caregiverRepository.findPetsSharedWith(owner).forEach(pet -> byId.putIfAbsent(pet.getId(), pet));
        return byId.values().stream().map(PetResponse::from).toList();
    }

    @GetMapping("/{petId}")
    public PetResponse getPet(@PathVariable UUID petId) {
        return PetResponse.from(findPet(petId));
    }

    @GetMapping("/{petId}/overview")
    public PetOverviewResponse overview(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        DailyCheckIn latestCheckIn = checkInRepository.findFirstByPetOrderByCheckInDateDesc(pet).orElse(null);
        FoodLog currentFood = foodLogRepository.findFirstByPetOrderByDateStartedDesc(pet).orElse(null);
        List<PatternResponse> patterns = patternMemoryService.activePatterns(petId);

        LocalDate today = LocalDate.now();
        List<DailyCheckIn> recentCheckIns =
                checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, today.minusDays(21));
        List<FoodLog> recentFoodLogs =
                foodLogRepository.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(pet, today.minusDays(14));

        String status = todayStatus(latestCheckIn, patterns);
        return new PetOverviewResponse(
                PetResponse.from(pet),
                latestCheckIn == null ? null : CheckInResponse.from(latestCheckIn),
                currentFood == null ? null : FoodLogResponse.from(currentFood),
                patterns,
                status,
                todayExplanation(pet, latestCheckIn, patterns, status),
                nextAction(latestCheckIn, patterns),
                retention(pet),
                goodNews(pet, recentCheckIns),
                watchOut(pet, recentFoodLogs)
        );
    }

    /**
     * A quiet "this is getting better" line — only when the signals genuinely
     * eased after a recent rough patch. This is the payoff that tells an owner
     * their tracking (and the change they made) actually helped.
     */
    private String goodNews(Pet pet, List<DailyCheckIn> checkIns) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> recent = between(checkIns, today.minusDays(6), today);
        List<DailyCheckIn> prior = between(checkIns, today.minusDays(20), today.minusDays(7));
        if (recent.size() < 3 || prior.isEmpty()) {
            return null;
        }

        OptionalDouble recentItch = averageItching(recent);
        Integer priorPeak = prior.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(null);
        if (recentItch.isPresent() && priorPeak != null
                && priorPeak >= 6 && recentItch.getAsDouble() <= 4.0
                && recentItch.getAsDouble() <= priorPeak - 3) {
            return Copy.t("{0}'s scratching has eased off this week.", pet.getName());
        }

        long priorUnstable = prior.stream().filter(this::isUnstableStool).count();
        long recentUnstable = recent.stream().filter(this::isUnstableStool).count();
        long recentStoolObserved = recent.stream().filter(this::hasStoolSignal).count();
        // Only call it "settled" if stool was actually recorded recently — a gap
        // in logging is not improvement.
        if (priorUnstable >= 2 && recentUnstable == 0 && recentStoolObserved >= 3) {
            return Copy.t("{0}'s stool has settled — a calmer week so far.", pet.getName());
        }
        return null;
    }

    private boolean hasStoolSignal(DailyCheckIn checkIn) {
        StoolState state = checkIn.getStoolState();
        return (state != null && state != StoolState.UNKNOWN && state != StoolState.NO_STOOL)
                || checkIn.getStoolScore() != null;
    }

    /**
     * A gentle heads-up after a new food or treat started recently, so the owner
     * watches the days that matter. Phrased as a nudge, never a warning.
     */
    private String watchOut(Pet pet, List<FoodLog> foodLogs) {
        LocalDate today = LocalDate.now();
        FoodLog recent = foodLogs.stream()
                .filter(food -> food.getDateStarted() != null
                        && !food.getDateStarted().isAfter(today)
                        && food.getDateStarted().isAfter(today.minusDays(4)))
                .filter(food -> food.isNewFood() || food.getFoodKind() == FoodKind.TREAT)
                .max(Comparator.comparing(FoodLog::getDateStarted))
                .orElse(null);
        if (recent == null) {
            return null;
        }

        long days = ChronoUnit.DAYS.between(recent.getDateStarted(), today);
        String when = days <= 0 ? Copy.t("today") : (days == 1 ? Copy.t("yesterday") : Copy.t("{0} days ago", days));
        Protein protein = recent.getPrimaryProtein();
        boolean treat = recent.getFoodKind() == FoodKind.TREAT;
        String what = (protein == null || protein == Protein.UNKNOWN)
                ? Copy.t(treat ? "treats" : "food")
                : Copy.t(treat ? "{0} treats" : "{0} food", Copy.protein(protein));
        // Species-appropriate watch list: dogs — stool/scratching; cats — appetite/litter box/energy.
        if (pet.getSpecies() == Species.CAT) {
            return Copy.t("New {0} started {1} — the next few days are worth watching for any change "
                    + "in appetite, litter box or energy.", what, when);
        }
        return Copy.t("New {0} started {1} — the next few days are the ones to watch for any change "
                + "in stool or scratching.", what, when);
    }

    private List<DailyCheckIn> between(List<DailyCheckIn> checkIns, LocalDate start, LocalDate end) {
        return checkIns.stream()
                .filter(checkIn -> !checkIn.getCheckInDate().isBefore(start) && !checkIn.getCheckInDate().isAfter(end))
                .toList();
    }

    private OptionalDouble averageItching(List<DailyCheckIn> checkIns) {
        return checkIns.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();
    }

    private boolean isUnstableStool(DailyCheckIn checkIn) {
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

    /** Streak and coverage signals derived from stored check-in dates. */
    private RetentionSummary retention(Pet pet) {
        LocalDate today = LocalDate.now();
        Set<LocalDate> dates = new HashSet<>();
        // Bounded lookback for the streak (intentional 400-day cap — far beyond
        // any realistic streak, and keeps the query cheap).
        checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, today.minusDays(400))
                .forEach(checkIn -> dates.add(checkIn.getCheckInDate()));

        // Ignore any future-dated rows so daysSince can't go negative and the
        // signals stay internally consistent.
        LocalDate lastDate = dates.stream()
                .filter(date -> !date.isAfter(today))
                .max(LocalDate::compareTo)
                .orElse(null);
        boolean loggedToday = dates.contains(today);

        // The streak is "alive" only if the most recent log is today or yesterday.
        LocalDate anchor = loggedToday ? today : (dates.contains(today.minusDays(1)) ? today.minusDays(1) : null);
        int streak = 0;
        for (LocalDate day = anchor; day != null && dates.contains(day); day = day.minusDays(1)) {
            streak++;
        }

        Integer daysSince = lastDate == null ? null : (int) ChronoUnit.DAYS.between(lastDate, today);
        int last30 = (int) dates.stream()
                .filter(date -> !date.isBefore(today.minusDays(29)) && !date.isAfter(today))
                .count();

        return new RetentionSummary(loggedToday, streak, daysSince, last30, lastDate);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PetResponse createPet(@Valid @RequestBody PetCreateRequest request) {
        Pet pet = new Pet();
        pet.setOwner(petAccess.currentOwner());
        pet.setName(request.name().trim());
        pet.setSpecies(request.species());
        pet.setBreed(clean(request.breed()));
        pet.setBirthDate(request.birthDate());
        pet.setSex(request.sex() == null ? Sex.UNKNOWN : request.sex());
        pet.setCurrentWeightKg(request.currentWeightKg());
        return PetResponse.from(petRepository.save(pet));
    }

    private String todayStatus(DailyCheckIn latestCheckIn, List<PatternResponse> patterns) {
        if (latestCheckIn == null || !latestCheckIn.getCheckInDate().isEqual(LocalDate.now())) {
            return "changed";
        }
        boolean recentFlags = latestCheckIn.getItchingScore() != null && latestCheckIn.getItchingScore() >= 6
                || latestCheckIn.isVomiting()
                || latestCheckIn.isDiarrhea()
                || latestCheckIn.isEarRedness()
                // Cat acute signals (all false/UNKNOWN for dogs, so this is safe for both).
                || latestCheckIn.isStraining()
                || latestCheckIn.isWeightConcern()
                || latestCheckIn.getHidingBehavior() == HidingBehavior.MORE
                || latestCheckIn.getLitterBoxUse() == LitterBoxUse.NONE
                || latestCheckIn.getAppetiteLevel() == AppetiteLevel.REFUSED;
        if (recentFlags || patterns.stream().anyMatch(pattern -> "HIGH".equals(pattern.confidence()))) {
            return "watch";
        }
        return "normal";
    }

    private String todayExplanation(Pet pet, DailyCheckIn latestCheckIn, List<PatternResponse> patterns, String status) {
        if (latestCheckIn == null) {
            return Copy.t("Start with one quick check-in so PetPattern can begin learning what normal looks like for {0}.",
                    pet.getName());
        }
        if (!latestCheckIn.getCheckInDate().isEqual(LocalDate.now())) {
            return Copy.t("{0} has history, but today has not been logged yet.", pet.getName());
        }
        if (!patterns.isEmpty()) {
            return patterns.get(0).summary();
        }
        if ("normal".equals(status)) {
            return Copy.t("{0} looks close to the recent normal range from the latest log.", pet.getName());
        }
        return Copy.t("{0} has a recent change worth keeping an eye on.", pet.getName());
    }

    private String nextAction(DailyCheckIn latestCheckIn, List<PatternResponse> patterns) {
        if (latestCheckIn == null || !latestCheckIn.getCheckInDate().isEqual(LocalDate.now())) {
            return Copy.t("Log today");
        }
        if (!patterns.isEmpty()) {
            return Copy.t("Show what changed");
        }
        return Copy.t("Keep tracking");
    }

    private Pet findPet(UUID petId) {
        return petAccess.requireOwnedPet(petId);
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
