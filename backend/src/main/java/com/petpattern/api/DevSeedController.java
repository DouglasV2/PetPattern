package com.petpattern.api;

import com.petpattern.api.dto.PetResponse;
import com.petpattern.auth.AuthService;
import com.petpattern.domain.*;
import com.petpattern.patterns.PatternType;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.repository.MedicationRepository;
import com.petpattern.repository.OwnerRepository;
import com.petpattern.repository.PatternObservationRepository;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetInviteRepository;
import com.petpattern.repository.PetPhotoRepository;
import com.petpattern.repository.PetRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Random;
import java.util.Set;

@RestController
@RequestMapping("/api/dev")
public class DevSeedController {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PatternObservationRepository observationRepository;
    private final PetPhotoRepository photoRepository;
    private final FoodTrialRepository trialRepository;
    private final OwnerRepository ownerRepository;
    private final AuthService authService;
    private final MedicationRepository medicationRepository;
    private final PetCaregiverRepository caregiverRepository;
    private final PetInviteRepository inviteRepository;

    // When false (production, if opted out) the demo seed endpoint 404s.
    @Value("${petpattern.demo.enabled:true}")
    private boolean demoEnabled;

    public DevSeedController(PetRepository petRepository,
                             DailyCheckInRepository checkInRepository,
                             FoodLogRepository foodLogRepository,
                             PatternObservationRepository observationRepository,
                             PetPhotoRepository photoRepository,
                             FoodTrialRepository trialRepository,
                             OwnerRepository ownerRepository,
                             AuthService authService,
                             MedicationRepository medicationRepository,
                             PetCaregiverRepository caregiverRepository,
                             PetInviteRepository inviteRepository) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.observationRepository = observationRepository;
        this.photoRepository = photoRepository;
        this.trialRepository = trialRepository;
        this.ownerRepository = ownerRepository;
        this.authService = authService;
        this.medicationRepository = medicationRepository;
        this.caregiverRepository = caregiverRepository;
        this.inviteRepository = inviteRepository;
    }

    @PostMapping("/seed")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PetResponse seedBella(HttpServletResponse response) {
        if (!demoEnabled) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        }
        // Bella lives under a demo account, and hitting seed signs you in as that
        // account — so the one-click "Load Bella demo" still works with real auth.
        Owner demo = authService.ensureOwner("demo@petpattern.app", "petpattern-demo", "Demo");
        response.addHeader(HttpHeaders.SET_COOKIE, authService.sessionCookie(authService.issueSession(demo)).toString());

        Pet pet = petRepository.findFirstByOwnerAndNameIgnoreCase(demo, "Bella").orElseGet(Pet::new);
        pet.setOwner(demo);
        pet.setName("Bella");
        pet.setSpecies(Species.DOG);
        pet.setBreed("Labrador mix");
        pet.setBirthDate(LocalDate.now().minusYears(5).minusMonths(3));
        pet.setSex(Sex.FEMALE);
        pet.setCurrentWeightKg(new BigDecimal("24.60"));
        pet = petRepository.save(pet);

        observationRepository.deleteByPet(pet);
        checkInRepository.deleteByPet(pet);
        foodLogRepository.deleteByPet(pet);
        photoRepository.deleteByPet(pet);
        trialRepository.deleteByPet(pet);
        medicationRepository.deleteByPet(pet);
        inviteRepository.deleteByPet(pet);
        caregiverRepository.deleteByPet(pet);
        // Force the deletes to hit the database before we insert the fresh demo
        // rows. Without this, Hibernate orders inserts before deletes within the
        // same transaction and the new check-ins collide with the old ones on
        // uk_pet_checkin_date when re-seeding over an existing volume.
        observationRepository.flush();
        checkInRepository.flush();
        foodLogRepository.flush();
        photoRepository.flush();
        trialRepository.flush();
        medicationRepository.flush();
        inviteRepository.flush();
        caregiverRepository.flush();

        LocalDate start = LocalDate.now().minusDays(44);
        createFood(pet, start, FoodKind.MAIN_FOOD, "North Bowl", "Lamb & Rice Adult", Protein.LAMB, Set.of(), false, false, "Stable main food before the tracked period.");
        createFood(pet, start.plusDays(12), FoodKind.TREAT, "Happy Tail", "Chicken Training Bites", Protein.CHICKEN, Set.of(Protein.EGG), false, true, "New chicken treat during training.");
        createFood(pet, start.plusDays(24), FoodKind.MAIN_FOOD, "North Bowl", "Salmon & Oat Sensitive", Protein.SALMON, Set.of(), false, true, "Main food changed after a scratchy week.");
        createFood(pet, start.plusDays(34), FoodKind.TREAT, "Happy Tail", "Chicken Training Bites", Protein.CHICKEN, Set.of(Protein.EGG), false, true, "Chicken treat retried.");
        createFood(pet, start.plusDays(42), FoodKind.TREAT, "Happy Tail", "Chicken Training Bites", Protein.CHICKEN, Set.of(Protein.EGG), false, true, "Gave the chicken treats again this week.");

        Random random = new Random(11);
        for (int i = 0; i < 45; i++) {
            LocalDate date = start.plusDays(i);
            boolean chickenWindowOne = i >= 15 && i <= 21;
            boolean chickenWindowTwo = i >= 37 && i <= 44;
            boolean recentStoolSoft = i == 39 || i == 42;
            boolean recentDiarrhea = i == 41;
            boolean lowerWater = i >= 42;

            DailyCheckIn checkIn = new DailyCheckIn();
            checkIn.setPet(pet);
            checkIn.setCheckInDate(date);
            checkIn.setItchingScore(chickenWindowOne || chickenWindowTwo ? 6 + random.nextInt(3) : 2 + random.nextInt(2));
            checkIn.setStoolState(recentDiarrhea ? StoolState.DIARRHEA : (recentStoolSoft || chickenWindowOne ? StoolState.SOFT : StoolState.NORMAL));
            checkIn.setStoolScore(safeStoolScore(checkIn.getStoolState()));
            checkIn.setDiarrhea(recentDiarrhea);
            checkIn.setAppetiteLevel(i == 41 ? AppetiteLevel.LOWER : AppetiteLevel.NORMAL);
            checkIn.setWaterLevel(lowerWater ? WaterLevel.LOWER : WaterLevel.NORMAL);
            checkIn.setEnergyLevel(chickenWindowTwo ? EnergyLevel.RESTLESS : EnergyLevel.NORMAL);
            checkIn.setWaterIntakeMl(lowerWater ? 610 + random.nextInt(45) : 820 + random.nextInt(130));
            checkIn.setEnergyScore(chickenWindowTwo ? 6 : 8);
            checkIn.setAppetiteScore(i == 41 ? 5 : 8);
            checkIn.setSleepQualityScore(chickenWindowOne || chickenWindowTwo ? 6 : 8);
            checkIn.setVomiting(false);
            checkIn.setEarRedness(chickenWindowOne || chickenWindowTwo);

            if (i == 16) {
                setNote(checkIn, "More paw licking in the evening.");
            } else if (i == 37) {
                setNote(checkIn, "Scratching more this week, started the chicken treats again a few days ago.");
            } else if (i == 41) {
                setNote(checkIn, "Soft stool and scratching after chicken treats returned.");
            }

            checkInRepository.save(checkIn);
        }

        // Photos are intentionally NOT seeded: this feature is a real-photo
        // visual record, and synthetic placeholder images would read as fake.
        // The gallery shows its honest empty state until the owner adds photos.

        // A completed chicken trial that matches Bella's real logged data: she
        // was calm while chicken was out (days 22-33), then flared again after
        // the chicken treat came back (day 34). A clear, honest before/after.
        FoodTrial trial = new FoodTrial();
        trial.setPet(pet);
        trial.setProtein(Protein.CHICKEN.name());
        trial.setStartDate(start.plusDays(22));
        trial.setTargetEndDate(start.plusDays(33));
        trial.setReintroducedDate(start.plusDays(34));
        trial.setCompletedDate(LocalDate.now());
        trial.setStatus(TrialStatus.COMPLETED);
        trial.setNotes("Took the chicken treats out for three weeks to see if the scratching settled.");
        trialRepository.save(trial);

        // A couple of medications: an ongoing skin supplement and a short ear-drops
        // course during the first flare — so the vet summary shows real meds.
        createMedication(pet, "Omega-3 skin support", start, null, "Daily supplement for coat and skin.");
        createMedication(pet, "Otiderm ear drops", start.plusDays(37), start.plusDays(43), "Short course while her ears were red.");

        // One pending caregiver invite, so the "who can help" screen shows a real
        // state (someone invited, not yet accepted) rather than only an empty one.
        PetInvite invite = new PetInvite();
        invite.setPet(pet);
        invite.setInvitedEmail("partner@petpattern.app");
        invite.setInvitedBy(demo);
        invite.setExpiresAt(java.time.Instant.now().plus(java.time.Duration.ofDays(14)));
        inviteRepository.save(invite);

        // Seed pattern memory so the "remembers your dog" payoff is visible
        // immediately: the chicken pattern has recurred across earlier periods,
        // not just today. detectionCount counts distinct days the engine flagged
        // it. lastDetectedDate is today so the next live detection does not bump.
        LocalDate today = LocalDate.now();
        createObservation(pet, PatternType.POSSIBLE_FOOD_TRIGGER, "POSSIBLE_FOOD_TRIGGER_CHICKEN",
                today.minusDays(33), today, 3, "HIGH",
                "Possible chicken-related pattern",
                "More scratching and softer stool were logged after chicken-based food or treats in more than one tracked period. "
                        + "This is not a medical conclusion, but it may be worth discussing with your vet.");
        createObservation(pet, PatternType.STOOL_INSTABILITY, "STOOL_INSTABILITY",
                today.minusDays(20), today, 2, "HIGH",
                "Stool has been less stable this week",
                "Bella had softer stool or diarrhea more than once this week.");
        // A pattern that recurred earlier but has not returned -> shows as "settled".
        createObservation(pet, PatternType.POSSIBLE_FOOD_TRIGGER, "POSSIBLE_FOOD_TRIGGER_BEEF",
                today.minusDays(40), today.minusDays(12), 2, "MEDIUM",
                "Possible beef-related pattern",
                "More scratching was logged after beef-based food in an earlier period, but this has not recurred recently.");

        return PetResponse.from(pet);
    }

    private void createObservation(Pet pet,
                                   PatternType type,
                                   String keySuffix,
                                   LocalDate firstDetected,
                                   LocalDate lastDetected,
                                   int detectionCount,
                                   String confidence,
                                   String title,
                                   String summary) {
        PatternObservation observation = new PatternObservation(pet, pet.getId() + ":" + keySuffix, type, firstDetected);
        observation.setLastDetectedDate(lastDetected);
        observation.setDetectionCount(detectionCount);
        observation.setLastConfidence(confidence);
        observation.setLastTitle(title);
        observation.setLastSummary(summary);
        observationRepository.save(observation);
    }

    private void createFood(Pet pet,
                            LocalDate dateStarted,
                            FoodKind foodKind,
                            String brand,
                            String productName,
                            Protein primaryProtein,
                            Set<Protein> secondaryProteins,
                            boolean grainFree,
                            boolean newFood,
                            String notes) {
        FoodLog food = new FoodLog();
        food.setPet(pet);
        food.setDateStarted(dateStarted);
        food.setFoodKind(foodKind);
        food.setBrand(brand);
        food.setProductName(productName);
        food.setPrimaryProtein(primaryProtein);
        food.setSecondaryProteins(secondaryProteins);
        food.setGrainFree(grainFree);
        food.setNewFood(newFood);
        food.setAmountGrams(foodKind == FoodKind.MAIN_FOOD ? 280 : 20);
        food.setNotes(notes);
        foodLogRepository.save(food);
    }

    private void createMedication(Pet pet, String name, LocalDate startDate, LocalDate endDate, String notes) {
        Medication medication = new Medication();
        medication.setPet(pet);
        medication.setName(name);
        medication.setStartDate(startDate);
        medication.setEndDate(endDate);
        medication.setNotes(notes);
        medicationRepository.save(medication);
    }

    private void setNote(DailyCheckIn checkIn, String note) {
        checkIn.setFreeTextNote(note);
        checkIn.setNotes(note);
    }

    private Integer safeStoolScore(StoolState state) {
        return switch (state) {
            case DIARRHEA -> 1;
            case SOFT -> 2;
            case NORMAL -> 3;
            case NO_STOOL, UNKNOWN -> null;
        };
    }
}
