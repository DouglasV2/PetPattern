package com.petpattern.api;

import com.petpattern.api.dto.PetResponse;
import com.petpattern.domain.*;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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

    public DevSeedController(PetRepository petRepository,
                             DailyCheckInRepository checkInRepository,
                             FoodLogRepository foodLogRepository) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
    }

    @PostMapping("/seed")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PetResponse seedBella() {
        Pet pet = petRepository.findFirstByNameIgnoreCase("Bella").orElseGet(Pet::new);
        pet.setName("Bella");
        pet.setSpecies(Species.DOG);
        pet.setBreed("Labrador mix");
        pet.setBirthDate(LocalDate.now().minusYears(5).minusMonths(3));
        pet.setSex(Sex.FEMALE);
        pet.setCurrentWeightKg(new BigDecimal("24.60"));
        pet = petRepository.save(pet);

        checkInRepository.deleteByPet(pet);
        foodLogRepository.deleteByPet(pet);

        LocalDate start = LocalDate.now().minusDays(44);
        createFood(pet, start, FoodKind.MAIN_FOOD, "North Bowl", "Lamb & Rice Adult", Protein.LAMB, Set.of(), false, false, "Stable main food before the tracked period.");
        createFood(pet, start.plusDays(12), FoodKind.TREAT, "Happy Tail", "Chicken Training Bites", Protein.CHICKEN, Set.of(Protein.EGG), false, true, "New chicken treat during training.");
        createFood(pet, start.plusDays(24), FoodKind.MAIN_FOOD, "North Bowl", "Salmon & Oat Sensitive", Protein.SALMON, Set.of(), false, true, "Main food changed after a scratchy week.");
        createFood(pet, start.plusDays(34), FoodKind.TREAT, "Happy Tail", "Chicken Training Bites", Protein.CHICKEN, Set.of(Protein.EGG), false, true, "Chicken treat retried.");

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
                checkIn.setFreeTextNote("More paw licking in the evening.");
                checkIn.setNotes("More paw licking in the evening.");
            } else if (i == 41) {
                checkIn.setFreeTextNote("Soft stool and scratching after chicken treats returned.");
                checkIn.setNotes("Soft stool and scratching after chicken treats returned.");
            }

            checkInRepository.save(checkIn);
        }

        return PetResponse.from(pet);
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

    private Integer safeStoolScore(StoolState state) {
        return switch (state) {
            case DIARRHEA -> 1;
            case SOFT -> 2;
            case NORMAL -> 3;
            case NO_STOOL, UNKNOWN -> null;
        };
    }
}
