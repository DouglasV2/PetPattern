package com.petpattern.api;

import com.petpattern.analytics.AnalyticsService;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.patterns.PatternMemoryService;
import com.petpattern.patterns.PatternTimelineService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * PATTERN_VIEWED wiring (WP6): the automatic patterns LIST fetch (run on every pet load / refresh)
 * must NOT record a view; only an explicit "open a specific pattern" (the timeline endpoints) does.
 */
class PatternControllerTest {

    private final PatternMemoryService memory = mock(PatternMemoryService.class);
    private final PatternTimelineService timeline = mock(PatternTimelineService.class);
    private final PetAccess petAccess = mock(PetAccess.class);
    private final AnalyticsService analytics = mock(AnalyticsService.class);
    private final PatternController controller =
            new PatternController(memory, timeline, petAccess, analytics);

    @Test
    void listingPatternsDoesNotRecordAView() {
        UUID petId = UUID.randomUUID();
        when(memory.listPatterns(petId)).thenReturn(List.of());

        controller.patterns(petId);

        // The list endpoint is auto-fetched by loadPetData — recording here would inflate the metric.
        verify(analytics, never()).recordCurrent(AnalyticsEventType.PATTERN_VIEWED);
        verify(analytics, never()).recordCurrent(any());
    }

    @Test
    void openingASpecificPatternTimelineRecordsAView() {
        UUID petId = UUID.randomUUID();
        when(timeline.timelineForPatternId(any(), any())).thenReturn(null);

        controller.timeline(petId, "petId:SOME_RULE");

        verify(analytics).recordCurrent(AnalyticsEventType.PATTERN_VIEWED);
    }
}
