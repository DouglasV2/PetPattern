package com.petpattern.api;

import com.petpattern.api.dto.PetResponse;
import com.petpattern.domain.*;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Random;

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
    public PetResponse seedBella() {
        Pet pet = new Pet();
        pet.setName("Bella");
        pet.setSpecies(Species.DOG);
        pet.setBreed("Labrador mix");
        pet.setBirthDate(LocalDate.now().minusYears(5).minusMonths(3));
        pet.setSex(Sex.FEMALE);
        pet.setCurrentWeightKg(new BigDecimal("24.60"));
        pet = petRepository.save(pet);

        LocalDate start = LocalDate.now().minusDays(42);
        Random random = new Random(7);

        createFood(pet, start, "North Bowl", "Lamb & Rice", "lamb", false, "Stable food before trial.");
        createFood(pet, start.plusDays(14), "Happy Tail", "Chicken Comfort", "chicken", true, "Owner started chicken recipe trial.");
        createFood(pet, start.plusDays(29), "North Bowl", "Lamb & Rice", "lamb", true, "Owner moved back to lamb after itching week.");
        createFood(pet, start.plusDays(36), "Happy Tail", "Chicken Comfort", "chicken", true, "Chicken recipe retried.");

        for (int i = 0; i < 43; i++) {
            LocalDate date = start.plusDays(i);
            DailyCheckIn c = new DailyCheckIn();
            c.setPet(pet);
            c.setCheckInDate(date);

            boolean chickenWindowOne = i >= 18 && i <= 23;
            boolean chickenWindowTwo = i >= 40;

            int itching = chickenWindowOne || chickenWindowTwo ? 6 + random.nextInt(3) : 2 + random.nextInt(2);
            int stool = chickenWindowOne ? 2 + random.nextInt(2) : 3 + random.nextInt(2);

            c.setItchingScore(itching);
            c.setStoolScore(stool);
            c.setEnergyScore(chickenWindowTwo ? 6 : 8);
            c.setAppetiteScore(8);
            c.setSleepQualityScore(chickenWindowOne || chickenWindowTwo ? 6 : 8);
            c.setWaterIntakeMl(chickenWindowTwo ? 620 + random.nextInt(70) : 820 + random.nextInt(130));
            c.setDiarrhea(i == 20 || i == 21);
            c.setVomiting(false);
            c.setEarRedness(chickenWindowOne || chickenWindowTwo);

            if (i == 19) {
                c.setNotes("More paw licking in the evening.");
            } else if (i == 41) {
                c.setNotes("Scratching again after chicken food restart.");
            }

            checkInRepository.save(c);
        }

        return PetResponse.from(pet);
    }

    private void createFood(Pet pet, LocalDate date, String brand, String recipe, String protein, boolean isNew, String notes) {
        FoodLog food = new FoodLog();
        food.setPet(pet);
        food.setDate(date);
        food.setBrand(brand);
        food.setRecipeName(recipe);
        food.setPrimaryProtein(protein);
        food.setAmountGrams(280);
        food.setNewFood(isNew);
        food.setNotes(notes);
        foodLogRepository.save(food);
    }
}
