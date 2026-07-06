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
import java.util.Set;

/**
 * Deterministic, dependency-free extractor used when no AI backend is configured.
 * Instantiated by {@link AiConfig}, not component-scanned.
 *
 * <p>It is intentionally simple keyword matching: enough to save typing for a
 * demo and local dev, never enough to be mistaken for a medical reader. It never
 * throws, and it leaves a field {@code UNKNOWN}/{@code null} when it is unsure
 * rather than guessing.
 *
 * <p>Two things keep it from being actively wrong:
 * <ul>
 *   <li><b>Negation</b> — a keyword is only counted when it is <em>asserted</em>.
 *       "no vomiting" / "nije povraćala" no longer set vomiting=true.</li>
 *   <li><b>Croatian</b> — the note is diacritic-folded (č→c, š→s, ž→z…) so an
 *       ASCII keyword set matches Croatian written with or without diacritics.</li>
 * </ul>
 * This is still a keyword heuristic, not a language model — the UI keeps the
 * whole helper hidden unless a real provider is configured ({@link #configured()}
 * is false here, surfaced as {@code aiSuggestEnabled}).
 */
public class MockAiProvider implements AiProvider {

    /** Whole-word negation cues (English + Croatian), matched inside the clause
     * just before a keyword. "n't" contractions are handled separately. */
    private static final Set<String> NEGATIONS = Set.of(
            "no", "not", "without", "never", "cannot",
            "nije", "nisu", "ne", "nema", "bez", "nikad", "niti");

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
        String text = fold(note);
        List<String> warnings = new ArrayList<>();
        int signals = 0;

        Integer itchingScore = null;
        if (mentions(text, "scratch", "itch", "itchy", "licking", "chewing paw", "biting paw", "rubbing",
                "cesa", "cese", "cesk", "grebe", "lizanje", "grize sap", "zvace sap")) {
            boolean intense = containsAny(text, "a lot", "lots", "constantly", "all day", "non-stop",
                    "nonstop", "really", "badly", "lot of", "raw",
                    "dosta", "jako", "puno", "stalno", "cijeli dan");
            boolean mild = containsAny(text, "a little", "a bit", "slightly", "mild", "occasional",
                    "now and then", "malo", "blago", "povremeno");
            itchingScore = intense ? 8 : (mild ? 4 : 6);
            signals++;
        }

        StoolState stoolState = StoolState.UNKNOWN;
        if (mentions(text, "diarrhea", "diarrhoea", "runny", "watery", "very loose", "proljev", "vodenast")) {
            stoolState = StoolState.DIARRHEA;
            signals++;
        } else if (mentions(text, "soft", "softer", "loose", "mushy", "sloppy", "mek", "rjed")) {
            stoolState = StoolState.SOFT;
            signals++;
        } else if (mentions(text, "no stool", "no poop", "didn't poop", "did not poop", "no bowel",
                "bez stolice", "nema stolice")) {
            stoolState = StoolState.NO_STOOL;
            signals++;
        } else if (mentions(text, "normal stool", "firm", "solid stool", "stool was normal", "poop was normal",
                "stolica je normalna", "normalna stolica", "stolica normalna", "cvrsta stolica")) {
            stoolState = StoolState.NORMAL;
            signals++;
        }

        AppetiteLevel appetiteLevel = AppetiteLevel.UNKNOWN;
        if (mentions(text, "refused", "won't eat", "wouldn't eat", "didn't eat", "did not eat", "no appetite",
                "odbija", "ne jede", "nije jela", "nije jeo", "bez apetita")) {
            appetiteLevel = AppetiteLevel.REFUSED;
            signals++;
        } else if (mentions(text, "ate less", "less hungry", "picky", "barely ate", "low appetite",
                "off her food", "off his food", "not interested in food",
                "jela manje", "jeo manje", "manje jede", "slab apetit")) {
            appetiteLevel = AppetiteLevel.LOWER;
            signals++;
        } else if (mentions(text, "extra hungry", "very hungry", "ate more", "more hungry", "ravenous",
                "jela vise", "jeo vise", "gladn")) {
            appetiteLevel = AppetiteLevel.HIGHER;
            signals++;
        } else if (mentions(text, "ate normally", "ate fine", "ate well", "normal appetite",
                "ate as usual", "good appetite",
                "pojela je normalno", "pojeo je normalno", "pojela normalno", "pojeo normalno",
                "jela normalno", "jeo normalno", "jede normalno", "normalan apetit")) {
            appetiteLevel = AppetiteLevel.NORMAL;
            signals++;
        }

        WaterLevel waterLevel = WaterLevel.UNKNOWN;
        if (mentions(text, "drank less", "less water", "drinking less", "not drinking", "barely drank",
                "pije manje", "manje pije", "pila manje", "pio manje")) {
            waterLevel = WaterLevel.LOWER;
            signals++;
        } else if (mentions(text, "drank more", "more water", "drinking more", "very thirsty",
                "extra thirsty", "thirsty", "pije vise", "vise pije", "zedn")) {
            waterLevel = WaterLevel.HIGHER;
            signals++;
        } else if (mentions(text, "normal water", "drank normally", "drank as usual", "pije normalno")) {
            waterLevel = WaterLevel.NORMAL;
            signals++;
        }

        EnergyLevel energyLevel = EnergyLevel.UNKNOWN;
        if (mentions(text, "lethargic", "tired", "low energy", "sluggish", "no energy", "slept all day", "lazy",
                "umoran", "tromo", "bez energije", "spava cijeli dan")) {
            energyLevel = EnergyLevel.LOW;
            signals++;
        } else if (mentions(text, "restless", "couldn't settle", "could not settle", "agitated", "pacing",
                "nemiran", "ne miruje", "uznemiren")) {
            energyLevel = EnergyLevel.RESTLESS;
            signals++;
        } else if (mentions(text, "hyper", "energetic", "lots of energy", "very active", "bouncy",
                "puno energije", "vrlo aktivan")) {
            energyLevel = EnergyLevel.HIGH;
            signals++;
        } else if (mentions(text, "normal energy", "playful", "active as usual", "razigran", "normalna energija")) {
            energyLevel = EnergyLevel.NORMAL;
            signals++;
        }

        boolean vomiting = mentions(text, "vomit", "threw up", "throwing up", "puke", "puked",
                "povraca", "povracanje", "bljuj", "bljuv");
        if (vomiting) {
            signals++;
        }

        Boolean earRedness = null;
        if (mentions(text, "ear", "uho", "usi", "uske", "uho")
                && containsAny(text, "red", "redness", "inflamed", "infection", "irritat", "smell",
                        "crven", "upal")) {
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
        if (mentions(text, "treat", "treats", "bite", "bites", "chew", "biscuit", "jerky", "poslastic")) {
            kind = FoodKind.TREAT;
        } else if (mentions(text, "supplement", "vitamin", "fish oil", "probiotic", "dodatak prehrani")) {
            kind = FoodKind.SUPPLEMENT;
        } else if (mentions(text, "kibble", "new food", "food", "diet", "meal", "dinner", "breakfast",
                "hrana", "obrok", "granule")) {
            kind = FoodKind.MAIN_FOOD;
        }

        boolean mentionsChange = containsAny(text, "new", "started", "gave", "tried", "switch", "changed",
                "nova", "novu", "novo", "dala", "dao", "dobila", "dobio", "probala", "probao", "pocela", "poceo");
        if (protein == null && kind == null) {
            return null;
        }
        if (protein == null && !mentionsChange) {
            return null;
        }

        return new DailyNoteExtractionResult.PossibleFoodTrigger(kind, protein, foodDescription(original, protein, kind));
    }

    private Protein firstProtein(String text) {
        if (mentions(text, "chicken", "piletin", "pilec", "pilet")) {
            return Protein.CHICKEN;
        }
        if (mentions(text, "beef", "govedin")) {
            return Protein.BEEF;
        }
        if (mentions(text, "lamb", "janjet", "janjec")) {
            return Protein.LAMB;
        }
        if (mentions(text, "salmon", "fish", "losos", "riba")) {
            return Protein.SALMON;
        }
        if (mentions(text, "turkey", "puretin", "puret")) {
            return Protein.TURKEY;
        }
        if (mentions(text, "duck", "patk", "pacet")) {
            return Protein.DUCK;
        }
        if (mentions(text, "pork", "svinjet", "svinjsk")) {
            return Protein.PORK;
        }
        if (mentions(text, "egg", "jaje", "jaja")) {
            return Protein.EGG;
        }
        if (mentions(text, "dairy", "milk", "cheese", "yogurt", "yoghurt", "mlijek", "sir", "jogurt")) {
            return Protein.DAIRY;
        }
        return null;
    }

    private String foodDescription(String original, Protein protein, FoodKind kind) {
        String lower = fold(original);
        List<String> parts = new ArrayList<>();
        if (lower.contains("new") || lower.contains("nov")) {
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

    /**
     * True when at least one needle appears in the text and is not negated by a
     * cue ("no", "not", "nije", "bez"…) inside the same clause just before it.
     */
    private boolean mentions(String text, String... needles) {
        for (String needle : needles) {
            int from = 0;
            int idx;
            while ((idx = text.indexOf(needle, from)) >= 0) {
                if (!negatedBefore(text, idx)) {
                    return true;
                }
                from = idx + needle.length();
            }
        }
        return false;
    }

    /** Plain substring check — used for modifiers (intensity, "new") where a
     * preceding negation is not meaningful. */
    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private boolean negatedBefore(String text, int idx) {
        int start = Math.max(0, idx - 30);
        String window = text.substring(start, idx);
        int brk = lastClauseBreak(window);
        if (brk >= 0) {
            window = window.substring(brk + 1);
        }
        if (window.contains("n't")) {
            return true;
        }
        for (String token : window.split("[^a-z]+")) {
            if (NEGATIONS.contains(token)) {
                return true;
            }
        }
        return false;
    }

    /** Negation does not carry across a clause boundary (punctuation or "but"). */
    private int lastClauseBreak(String window) {
        int p = -1;
        for (int i = 0; i < window.length(); i++) {
            char c = window.charAt(i);
            if (c == ',' || c == '.' || c == ';' || c == ':' || c == '!' || c == '?') {
                p = i;
            }
        }
        int but = window.lastIndexOf(" but ");
        if (but > p) {
            p = but + 4;
        }
        int ali = window.lastIndexOf(" ali ");
        if (ali > p) {
            p = ali + 4;
        }
        return p;
    }

    /**
     * Lower-case and strip Croatian diacritics so one keyword set matches
     * Croatian written with or without them (the accented and plain spellings of
     * "cesala"/"meksa" both fold to the same ASCII). Source compiles as UTF-8
     * (set by the Spring Boot parent), so the literal letters below are safe.
     */
    private static String fold(String note) {
        if (note == null) {
            return "";
        }
        String lower = note.toLowerCase(Locale.ROOT);
        StringBuilder sb = new StringBuilder(lower.length());
        for (int i = 0; i < lower.length(); i++) {
            char c = lower.charAt(i);
            switch (c) {
                case 'č', 'ć' -> sb.append('c'); // c-caron, c-acute
                case 'š' -> sb.append('s');           // s-caron
                case 'ž' -> sb.append('z');           // z-caron
                case 'đ' -> sb.append('d');           // d-stroke
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
