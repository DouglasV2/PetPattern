package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.api.dto.ImmediateObservationDto;
import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.UrinationChange;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The immediate safety layer (WP1). Proves the immediate observation path evaluates the latest
 * relevant entry with no seven-check-in gate, stays non-diagnostic, does not raise false urgency,
 * resolves/expires, and never leaks across pets — while the historical engine keeps its ≥7 gate.
 *
 * <p>Dog/cat immediate rules read structured check-in fields only and never touch the trend
 * analyzers, so those collaborators are passed as {@code null} here on purpose.
 */
class ImmediateObservationServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final BaselineCalculator baseline = new BaselineCalculator();
    private final StarterRuleEngine engine =
            new StarterRuleEngine(baseline, mapper, new ObservationPatternAnalyzer(baseline, mapper));

    private final List<SpeciesRuleSet> ruleSets = List.of(
            new DogRuleSet(null, null),
            new CatRuleSet(null),
            new RabbitRuleSet(engine),
            new BirdRuleSet(engine),
            new HamsterRuleSet(engine),
            new GuineaPigRuleSet(engine),
            new ReptileRuleSet(engine),
            new FishRuleSet(engine));
    private final GenericStarterRuleSet generic = new GenericStarterRuleSet(engine);
    private final ImmediateObservationService service = new ImmediateObservationService(ruleSets, generic);

    // ---- builders -----------------------------------------------------------

    private static Pet pet(Species species, String name) {
        Pet p = new Pet();
        p.setName(name);
        p.setSpecies(species);
        return p;
    }

    private static DailyCheckIn starterDay(int daysAgo, String... signals) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setObservationsJson("{\"signals\":[" + String.join(",", signals) + "]}");
        return c;
    }

    private static String sig(String key, String value) {
        return "{\"key\":\"" + key + "\",\"value\":\"" + value + "\"}";
    }

    private static DailyCheckIn dogDay(int daysAgo, boolean vomiting, boolean diarrhea,
                                       AppetiteLevel appetite, EnergyLevel energy) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setVomiting(vomiting);
        c.setDiarrhea(diarrhea);
        c.setStoolState(diarrhea ? StoolState.DIARRHEA : StoolState.NORMAL);
        c.setAppetiteLevel(appetite);
        c.setEnergyLevel(energy);
        return c;
    }

    private static DailyCheckIn catDay(int daysAgo, boolean straining, LitterBoxUse litter, UrinationChange urination) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setStraining(straining);
        c.setLitterBoxUse(litter);
        c.setUrinationChange(urination);
        return c;
    }

    private List<ImmediateObservationDto> evaluate(Pet pet, DailyCheckIn... checkIns) {
        return service.evaluate(pet, new ArrayList<>(List.of(checkIns)), List.of());
    }

    /** Historical engine over a mocked repository set, so the ≥7 gate can be exercised directly. */
    private List<PatternCandidate> analyzeHistorical(Pet pet, List<DailyCheckIn> checkIns) {
        PetRepository petRepo = mock(PetRepository.class);
        DailyCheckInRepository checkInRepo = mock(DailyCheckInRepository.class);
        FoodLogRepository foodRepo = mock(FoodLogRepository.class);
        when(petRepo.findById(any())).thenReturn(Optional.of(pet));
        when(checkInRepo.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(any(), any()))
                .thenReturn(checkIns);
        when(foodRepo.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(any(), any()))
                .thenReturn(List.of());
        return new PatternEngine(petRepo, checkInRepo, foodRepo, ruleSets, generic).analyze(UUID.randomUUID());
    }

    // ---- evaluated on the first / early check-ins, per species --------------

    @Test
    void birdBreathingChangeIsEvaluatedOnTheFirstCheckIn() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.BIRD, "Kiwi"),
                starterDay(0, sig("breathing", "Noticed change")));
        assertTrue(hasRule(now, "BIRD_LABORED_BREATHING"),
                "a breathing change on the very first check-in is an immediate urgent sign — no 7-log gate");
        assertEquals("urgent", now.get(0).severity());
    }

    @Test
    void rabbitGiStasisIsEvaluatedBeforeSevenCheckIns() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.RABBIT, "Bun"),
                starterDay(2, sig("water", "Normal")),
                starterDay(0, sig("appetite_hay", "Eating less"), sig("poop", "Less")));
        assertTrue(hasRule(now, "RABBIT_GI_STASIS_RISK"), "eating less + fewer droppings today fires immediately");
    }

    @Test
    void dogAcuteMultiSignalIsEvaluatedOnTheFirstCheckIn() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.DOG, "Rex"),
                dogDay(0, true, true, AppetiteLevel.REFUSED, EnergyLevel.NORMAL)); // vomiting + diarrhea + refused = 3
        assertTrue(hasRule(now, "DOG_ACUTE_DISTRESS"), "three serious signs the same day is an immediate urgent sign");
    }

    @Test
    void catUrinaryObstructionIsEvaluatedOnTheFirstCheckIn() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.CAT, "Milo"),
                catDay(0, true, LitterBoxUse.NONE, UrinationChange.UNKNOWN));
        assertTrue(hasRule(now, "CAT_URINARY_OBSTRUCTION_RISK"),
                "straining with no litter-box output is the feline emergency, surfaced immediately");
    }

    @Test
    void hamsterAndGuineaPigUrgentSignsAreEvaluatedEarly() {
        assertTrue(hasRule(evaluate(pet(Species.HAMSTER, "Nibble"),
                        starterDay(0, sig("droppings", "Watery"), sig("activity", "Less active"))),
                "HAMSTER_WET_TAIL_RISK"));
        assertTrue(hasRule(evaluate(pet(Species.GUINEA_PIG, "Pig"),
                        starterDay(0, sig("appetite_hay", "Eating less"), sig("poop", "Less"))),
                "GUINEA_PIG_GI_STASIS_RISK"));
    }

    // ---- no false urgency ---------------------------------------------------

    @Test
    void mildSingleObservationDoesNotBecomeUrgent() {
        // rabbit "eating less" alone (no dropping change) is a WATCH intake rule, not urgent
        assertTrue(evaluate(pet(Species.RABBIT, "Bun"),
                starterDay(0, sig("appetite_hay", "Eating less"))).isEmpty());
        // a single serious dog signal (just vomiting) is below the 3-signal urgent threshold
        assertTrue(evaluate(pet(Species.DOG, "Rex"),
                dogDay(0, true, false, AppetiteLevel.NORMAL, EnergyLevel.NORMAL)).isEmpty());
        // a bird logged only "quieter" is a WATCH behaviour sign, never urgent
        assertTrue(evaluate(pet(Species.BIRD, "Kiwi"),
                starterDay(0, sig("vocalization", "Quieter"))).isEmpty());
    }

    @Test
    void reptileFeedingRefusalIsNeverUrgentByDesign() {
        // Reptile fasting/brumation is normal; the rule set deliberately has no urgent tier.
        List<ImmediateObservationDto> now = evaluate(pet(Species.REPTILE, "Spike"),
                starterDay(2, sig("feeding", "Refused food")),
                starterDay(0, sig("feeding", "Refused food")));
        assertTrue(now.isEmpty(), "reptile feeding refusal is a WATCH at most — never an immediate urgent sign");
    }

    @Test
    void aquariumFishChangesAreNeverUrgentByDesign() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.FISH_AQUARIUM, "Fin"),
                starterDay(0, sig("spots_fins", "Spot noticed"), sig("swimming", "Unusual swimming")));
        assertTrue(now.isEmpty(), "aquarium health is water-quality-driven; nothing here is urgent by design");
    }

    // ---- resolve / expire ---------------------------------------------------

    @Test
    void resolvedUrgentSignIsNoLongerShownAsCurrent() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.RABBIT, "Bun"),
                starterDay(3, sig("appetite_hay", "Eating less"), sig("poop", "Less")), // urgent 3 days ago
                starterDay(1, sig("appetite_hay", "Normal")),                            // normal since
                starterDay(0, sig("appetite_hay", "Normal")));
        assertTrue(now.isEmpty(), "an urgent sign superseded by newer normal logging resolves and is no longer current");
    }

    @Test
    void anOldUrgentCoOccurrenceOutsideTheWindowIsNotShown() {
        List<ImmediateObservationDto> now = evaluate(pet(Species.RABBIT, "Bun"),
                starterDay(20, sig("appetite_hay", "Eating less"), sig("poop", "Less")));
        assertTrue(now.isEmpty(), "a 20-day-old co-occurrence is outside the urgent freshness window");
    }

    // ---- stable ids, dedup, isolation, empties ------------------------------

    @Test
    void stableIdsPreventDuplicateAlertsForTheSameEntry() {
        Pet bird = pet(Species.BIRD, "Kiwi");
        DailyCheckIn[] twoBreathingDays = {
                starterDay(1, sig("breathing", "Noticed change")),
                starterDay(0, sig("breathing", "Noticed change"))};
        List<ImmediateObservationDto> first = evaluate(bird, twoBreathingDays);
        List<ImmediateObservationDto> second = evaluate(bird, twoBreathingDays);

        long breathing = first.stream().filter(o -> o.id().endsWith(":BIRD_LABORED_BREATHING")).count();
        assertEquals(1, breathing, "a signal on two days still yields exactly one immediate alert");
        assertTrue(first.get(0).id().startsWith("now:"), "immediate ids are namespaced so they are never persisted keys");
        assertEquals(first.get(0).id(), second.get(0).id(), "the id is deterministic across reads");
    }

    @Test
    void immediateLayerDoesNotLeakAcrossPets() {
        Pet sick = pet(Species.RABBIT, "Bun");
        Pet well = pet(Species.RABBIT, "Clover");
        assertFalse(evaluate(sick,
                starterDay(0, sig("appetite_hay", "Eating less"), sig("poop", "Less"))).isEmpty());
        assertTrue(evaluate(well, starterDay(0, sig("appetite_hay", "Normal"))).isEmpty(),
                "the service only reads the check-ins it is handed, so a sick pet cannot affect a healthy one");
    }

    @Test
    void noCheckInsYieldsNoImmediateObservations() {
        assertTrue(service.evaluate(pet(Species.DOG, "Rex"), List.of(), List.of()).isEmpty());
    }

    // ---- non-diagnostic wording --------------------------------------------

    @Test
    void wordingIsObservationalAndNonDiagnostic() {
        ImmediateObservationDto dto = evaluate(pet(Species.CAT, "Milo"),
                catDay(0, true, LitterBoxUse.NONE, UrinationChange.UNKNOWN)).get(0);
        assertNotNull(dto.urgentNote(), "an urgent observation always carries a vet-handoff note");
        assertTrue(dto.summary().contains("not a diagnosis"),
                "the summary must state PetPattern's limitation, not assert a diagnosis");
        assertTrue(dto.urgentNote().toLowerCase().contains("vet"), "the urgent note hands off to a real vet");
    }

    // ---- separation: immediate fires while the historical layer stays gated --

    @Test
    void historicalLayerStaysBlockedBelowSevenLogsWhileImmediateFires() {
        Pet rabbit = pet(Species.RABBIT, "Bun");
        List<DailyCheckIn> threeDays = new ArrayList<>(List.of(
                starterDay(4, sig("water", "Normal")),
                starterDay(2, sig("water", "Normal")),
                starterDay(0, sig("appetite_hay", "Eating less"), sig("poop", "Less"))));

        // Immediate: fires now, with only 3 check-ins.
        assertTrue(service.evaluate(rabbit, threeDays, List.of()).stream()
                .anyMatch(o -> o.id().endsWith(":RABBIT_GI_STASIS_RISK")));
        // Historical: silent — the ≥7 gate blocks all recurrence claims below seven logs.
        assertTrue(analyzeHistorical(rabbit, threeDays).isEmpty(),
                "the historical engine stays blocked below seven check-ins even though an urgent sign is present");

        // Even ABOVE the ≥7 gate, a SINGLE urgent record is still not a recurring pattern. The gate
        // opening must not turn one urgent day into a persisted pattern just because older normal
        // logs exist — that separation is the release blocker this test guards.
        List<DailyCheckIn> eightDays = new ArrayList<>(threeDays);
        for (int daysAgo = 6; daysAgo <= 10; daysAgo++) {
            eightDays.add(starterDay(daysAgo, sig("water", "Normal")));
        }
        assertTrue(analyzeHistorical(rabbit, eightDays).stream()
                        .noneMatch(c -> c.id().endsWith(":RABBIT_GI_STASIS_RISK")),
                "a lone urgent record must never be persisted as a recurring pattern, even with ≥7 logs");
    }

    /**
     * Release blocker (WP7): seven ordinary check-ins plus ONE urgent record. The immediate layer
     * must react to the urgent record, but the historical engine must NOT persist it as a recurring
     * pattern — one urgent day is not repetition across separate records.
     */
    @Test
    void sevenNormalPlusOneUrgentSurfacesImmediateButNoPersistedRecurringPattern() {
        Pet rabbit = pet(Species.RABBIT, "Bun");
        List<DailyCheckIn> records = new ArrayList<>();
        // Seven ordinary days — nothing changes, so nothing is worth persisting on its own.
        for (int daysAgo = 7; daysAgo >= 1; daysAgo--) {
            records.add(starterDay(daysAgo, sig("water", "Normal")));
        }
        // One urgent GI-stasis day (today).
        records.add(starterDay(0, sig("appetite_hay", "Eating less"), sig("poop", "Less")));

        // (1) The immediate observation exists.
        assertTrue(service.evaluate(rabbit, records, List.of()).stream()
                        .anyMatch(o -> o.id().endsWith(":RABBIT_GI_STASIS_RISK")),
                "one urgent record must surface in the immediate layer right away");

        // (2) No persisted recurring pattern exists — not the urgent rule, and no URGENT candidate
        //     at all reaches the historical/persistence path.
        List<PatternCandidate> historical = analyzeHistorical(rabbit, records);
        assertTrue(historical.stream().noneMatch(c -> c.id().endsWith(":RABBIT_GI_STASIS_RISK")),
                "a single urgent record is not a recurring pattern and must not be persisted");
        assertTrue(historical.stream().noneMatch(c -> c.severity() == Severity.URGENT),
                "no urgent candidate may ever reach the persisted historical layer");
    }

    private static boolean hasRule(List<ImmediateObservationDto> observations, String ruleId) {
        return observations.stream().anyMatch(o -> o.id().endsWith(":" + ruleId));
    }
}
