package com.petpattern.ai;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Reliability cases for the deterministic note reader. The five launch scenarios
 * cover Croatian + English, negation ("no vomiting" / "nije povraćala" must NOT
 * flip a flag on), and a food trigger. Elevated itching is asserted as ">= 6"
 * (the reader emits 4/6/8), never an odd value.
 */
class MockAiProviderTest {

    private final MockAiProvider provider = new MockAiProvider();

    @Test
    void croatian_scratching_softStool_ateNormally() {
        DailyNoteExtractionResult r =
                provider.extract("Bella se danas dosta češala, stolica je mekša, pojela je normalno.");

        assertNotNull(r.itchingScore(), "itching should be read");
        assertTrue(r.itchingScore() >= 6, "itching should be elevated");
        assertEquals(StoolState.SOFT, r.stoolState());
        assertEquals(AppetiteLevel.NORMAL, r.appetiteLevel());
    }

    @Test
    void croatian_negatedVomiting_normalStool() {
        DailyNoteExtractionResult r = provider.extract("Nije povraćala, stolica je normalna.");

        assertFalse(r.vomiting(), "\"nije povraćala\" must not set vomiting=true");
        assertEquals(StoolState.NORMAL, r.stoolState());
    }

    @Test
    void english_negatedVomitingAndDiarrhea_normalAppetite() {
        DailyNoteExtractionResult r = provider.extract("No vomiting, no diarrhea, normal appetite.");

        assertFalse(r.vomiting(), "\"no vomiting\" must not set vomiting=true");
        assertNotEquals(StoolState.DIARRHEA, r.stoolState(), "\"no diarrhea\" must not set diarrhea");
        assertEquals(AppetiteLevel.NORMAL, r.appetiteLevel());
    }

    @Test
    void croatian_newChickenTreat_isFoodTrigger() {
        DailyNoteExtractionResult r = provider.extract("Jučer je dobila novu poslasticu s piletinom.");

        assertNotNull(r.possibleFoodTrigger(), "a food change should be spotted");
        assertEquals(Protein.CHICKEN, r.possibleFoodTrigger().primaryProtein());
        assertEquals(FoodKind.TREAT, r.possibleFoodTrigger().foodKind());
    }

    @Test
    void english_scratchingAndNewChickenTreat() {
        DailyNoteExtractionResult r =
                provider.extract("Scratched a lot today and had a new chicken treat yesterday.");

        assertNotNull(r.itchingScore(), "itching should be read");
        assertTrue(r.itchingScore() >= 6, "itching should be elevated");
        assertNotNull(r.possibleFoodTrigger(), "a food change should be spotted");
        assertEquals(Protein.CHICKEN, r.possibleFoodTrigger().primaryProtein());
        assertEquals(FoodKind.TREAT, r.possibleFoodTrigger().foodKind());
    }

    @Test
    void croatian_negatedDiarrhea_isNotDiarrhea() {
        DailyNoteExtractionResult r = provider.extract("Nije bilo proljeva danas.");

        assertNotEquals(StoolState.DIARRHEA, r.stoolState(), "\"nije bilo proljeva\" must not set diarrhea");
    }

    @Test
    void negatedScratching_leavesItchingUnread() {
        // Regression guard for the substring-matching bug: a negated symptom
        // must not be reported as present.
        DailyNoteExtractionResult r = provider.extract("No scratching and no itching today.");

        assertEquals(null, r.itchingScore());
    }

    @Test
    void itchingScoreIsAlwaysAnEvenChipValue() {
        DailyNoteExtractionResult r = provider.extract("Scratched a bit.");

        assertNotNull(r.itchingScore());
        assertEquals(0, r.itchingScore() % 2, "the reader must only emit 0/2/4/6/8/10");
    }
}
