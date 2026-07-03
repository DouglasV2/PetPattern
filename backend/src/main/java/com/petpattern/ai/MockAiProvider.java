package com.petpattern.ai;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;
import com.petpattern.domain.WaterLevel;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Deterministic, dependency-free extractor used when no AI backend is configured.
 * Instantiated by {@link AiConfig}, not component-scanned.
 *
 * <p>It is intentionally simple keyword matching: enough to save typing for a
 * demo and local dev, never enough to be mistaken for a medical reader. It never
 * throws, and it leaves a field {@code UNKNOWN}/{@code null} when it is unsure
 * rather than guessing.
 */
public class MockAiProvider implements AiProvider {

    @Override
    public String name() {
        return "mock-keyword";
    }

    @Override
    public boolean configured() {
        return false;
    }

    @Override
    public DailyNoteExtractionResult extract(String note) {
        String text = note == null ? "" : note.toLowerCase(Locale.ROOT);
        List<String> warnings = new ArrayList<>();
        int signals = 0;

        Integer itchingScore = null;
        if (containsAny(text, "scratch", "itch", "itchy", "licking", "chewing paw", "biting paw", "rubbing")) {
            boolean intense = containsAny(text, "a lot", "lots", "constantly", "all day", "non-stop",
                    "nonstop", "really", "badly", "lot of", "raw");
            boolean mild = containsAny(text, "a little", "a bit", "slightly", "mild", "occasional", "now and then");
            itchingScore = intense ? 8 : (mild ? 4 : 6);
            signals++;
        }

        StoolState stoolState = StoolState.UNKNOWN;
        if (containsAny(text, "diarrhea", "diarrhoea", "runny", "watery", "very loose")) {
            stoolState = StoolState.DIARRHEA;
            signals++;
        } else if (containsAny(text, "soft", "softer", "loose", "mushy", "sloppy")) {
            stoolState = StoolState.SOFT;
            signals++;
        } else if (containsAny(text, "no stool", "no poop", "didn't poop", "did not poop", "no bowel")) {
            stoolState = StoolState.NO_STOOL;
            signals++;
        } else if (containsAny(text, "normal stool", "firm", "solid stool", "stool was normal", "poop was normal")) {
            stoolState = StoolState.NORMAL;
            signals++;
        }

        AppetiteLevel appetiteLevel = AppetiteLevel.UNKNOWN;
        if (containsAny(text, "refused", "won't eat", "wouldn't eat", "didn't eat", "did not eat", "no appetite")) {
            appetiteLevel = AppetiteLevel.REFUSED;
            signals++;
        } else if (containsAny(text, "ate less", "less hungry", "picky", "barely ate", "low appetite",
                "off her food", "off his food", "not interested in food")) {
            appetiteLevel = AppetiteLevel.LOWER;
            signals++;
        } else if (containsAny(text, "extra hungry", "very hungry", "ate more", "more hungry", "ravenous")) {
            appetiteLevel = AppetiteLevel.HIGHER;
            signals++;
        } else if (containsAny(text, "ate normally", "ate fine", "ate well", "normal appetite",
                "ate as usual", "good appetite")) {
            appetiteLevel = AppetiteLevel.NORMAL;
            signals++;
        }

        WaterLevel waterLevel = WaterLevel.UNKNOWN;
        if (containsAny(text, "drank less", "less water", "drinking less", "not drinking", "barely drank")) {
            waterLevel = WaterLevel.LOWER;
            signals++;
        } else if (containsAny(text, "drank more", "more water", "drinking more", "very thirsty",
                "extra thirsty", "thirsty")) {
            waterLevel = WaterLevel.HIGHER;
            signals++;
        } else if (containsAny(text, "normal water", "drank normally", "drank as usual")) {
            waterLevel = WaterLevel.NORMAL;
            signals++;
        }

        EnergyLevel energyLevel = EnergyLevel.UNKNOWN;
        if (containsAny(text, "lethargic", "tired", "low energy", "sluggish", "no energy", "slept all day", "lazy")) {
            energyLevel = EnergyLevel.LOW;
            signals++;
        } else if (containsAny(text, "restless", "couldn't settle", "could not settle", "agitated", "pacing")) {
            energyLevel = EnergyLevel.RESTLESS;
            signals++;
        } else if (containsAny(text, "hyper", "energetic", "lots of energy", "very active", "bouncy")) {
            energyLevel = EnergyLevel.HIGH;
            signals++;
        } else if (containsAny(text, "normal energy", "playful", "active as usual")) {
            energyLevel = EnergyLevel.NORMAL;
            signals++;
        }

        boolean vomiting = containsAny(text, "vomit", "threw up", "throwing up", "puke", "puked");
        if (vomiting) {
            signals++;
        }

        Boolean earRedness = null;
        if (text.contains("ear") && containsAny(text, "red", "redness", "inflamed", "infection", "irritat", "smell")) {
            earRedness = true;
            signals++;
        }

        DailyNoteExtractionResult.PossibleFoodTrigger trigger = detectFood(text, note);
        if (trigger != null) {
            signals++;
        }

        String confidence;
        if (text.isBlank()) {
            confidence = "LOW";
            warnings.add(Copy.t("The note was empty, so no fields could be suggested."));
        } else if (signals == 0) {
            confidence = "LOW";
            warnings.add(Copy.t("Could not confidently read any fields from this note. Please fill them in yourself."));
        } else if (signals <= 2) {
            confidence = "LOW";
        } else if (signals <= 4) {
            confidence = "MEDIUM";
        } else {
            confidence = "HIGH";
        }

        if (!text.isBlank() && note != null && note.trim().length() < 12) {
            warnings.add(Copy.t("The note was short, so review the suggestions carefully."));
        }

        return new DailyNoteExtractionResult(
                itchingScore, stoolState, appetiteLevel, waterLevel, energyLevel,
                vomiting, earRedness, trigger, confidence, warnings);
    }

    private DailyNoteExtractionResult.PossibleFoodTrigger detectFood(String text, String original) {
        Protein protein = firstProtein(text);

        FoodKind kind = null;
        if (containsAny(text, "treat", "treats", "bite", "bites", "chew", "biscuit", "jerky")) {
            kind = FoodKind.TREAT;
        } else if (containsAny(text, "supplement", "vitamin", "fish oil", "probiotic")) {
            kind = FoodKind.SUPPLEMENT;
        } else if (containsAny(text, "kibble", "new food", "food", "diet", "meal", "dinner", "breakfast")) {
            kind = FoodKind.MAIN_FOOD;
        }

        boolean mentionsChange = containsAny(text, "new", "started", "gave", "tried", "switch", "changed");
        if (protein == null && kind == null) {
            return null;
        }
        if (protein == null && !mentionsChange) {
            return null;
        }

        return new DailyNoteExtractionResult.PossibleFoodTrigger(kind, protein, foodDescription(original, protein, kind));
    }

    private Protein firstProtein(String text) {
        if (text.contains("chicken")) {
            return Protein.CHICKEN;
        }
        if (text.contains("beef")) {
            return Protein.BEEF;
        }
        if (text.contains("lamb")) {
            return Protein.LAMB;
        }
        if (text.contains("salmon") || text.contains("fish")) {
            return Protein.SALMON;
        }
        if (text.contains("turkey")) {
            return Protein.TURKEY;
        }
        if (text.contains("duck")) {
            return Protein.DUCK;
        }
        if (text.contains("pork")) {
            return Protein.PORK;
        }
        if (text.contains("egg")) {
            return Protein.EGG;
        }
        if (containsAny(text, "dairy", "milk", "cheese", "yogurt", "yoghurt")) {
            return Protein.DAIRY;
        }
        return null;
    }

    private String foodDescription(String original, Protein protein, FoodKind kind) {
        String lower = original == null ? "" : original.toLowerCase(Locale.ROOT);
        List<String> parts = new ArrayList<>();
        if (lower.contains("new")) {
            parts.add("new");
        }
        if (protein != null) {
            parts.add(protein.displayName().toLowerCase(Locale.ROOT));
        }
        if (kind == FoodKind.TREAT) {
            parts.add("treat");
        } else if (kind == FoodKind.MAIN_FOOD) {
            parts.add("food");
        } else if (kind == FoodKind.SUPPLEMENT) {
            parts.add("supplement");
        }
        String description = String.join(" ", parts).trim();
        return description.isBlank() ? "possible food change" : description;
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
