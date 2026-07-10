package com.petpattern.vet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.api.dto.VetSummaryDto;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.domain.PhotoArea;
import com.petpattern.domain.Species;
import com.petpattern.repository.PhotoView;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The two multi-species sections of the vet summary read the flexible
 * observations model directly, so they are unit-tested without a database: the
 * service is built with a real ObjectMapper and null repositories, and the
 * section methods take their check-ins / photos as parameters.
 */
class VetSummaryServiceTest {

    private final VetSummaryService service =
            new VetSummaryService(null, null, null, null, null, null, new ObjectMapper());

    private DailyCheckIn checkIn(LocalDate date, String observationsJson) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(date);
        c.setObservationsJson(observationsJson);
        return c;
    }

    @Test
    void speciesObservations_nullForFullSupportSpecies() {
        Pet dog = pet(Species.DOG, "Bella");
        assertNull(service.speciesObservations(dog, List.of(
                checkIn(LocalDate.now(), "{\"signals\":[{\"key\":\"appetite\",\"value\":\"less\"}]}"))),
                "dog/cat use explicit columns, not the observations section");

        Pet cat = pet(Species.CAT, "Milo");
        assertNull(service.speciesObservations(cat, List.of()));
    }

    @Test
    void speciesObservations_aggregatesStarterSignals_excludingVisibleChange() {
        Pet rabbit = pet(Species.RABBIT, "Poppy");
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = List.of(
                checkIn(today.minusDays(2), "{\"signals\":[{\"key\":\"appetite_hay\",\"label\":\"Appetite / hay\",\"value\":\"less\"}]}"),
                checkIn(today.minusDays(1), "{\"signals\":[{\"key\":\"appetite_hay\",\"value\":\"refused\"},{\"key\":\"poop\",\"value\":\"normal\"}]}"),
                checkIn(today, "{\"signals\":[{\"key\":\"visible_change\",\"value\":\"redness noticed\"}]}"));

        VetSummaryDto.ObservationSummary summary = service.speciesObservations(rabbit, checkIns);

        assertNotNull(summary);
        // appetite_hay changed on 2 days; poop=normal is not a change; visible_change is reported elsewhere.
        assertEquals(1, summary.signals().size());
        VetSummaryDto.ObservationLine line = summary.signals().get(0);
        assertEquals("appetite_hay", line.key());
        assertEquals("Appetite / hay", line.label());
        assertEquals(2, line.changedDays());
        assertEquals("refused", line.latestValue(), "latest value is the most recent day's value");
    }

    @Test
    void visibleChanges_buildsChronologicalTimeline_forAnySpecies() {
        Pet dog = pet(Species.DOG, "Bella");
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = List.of(
                checkIn(today.minusDays(6), "{\"signals\":[{\"key\":\"visible_change\",\"value\":\"redness noticed\",\"status\":\"same\",\"severity\":\"mild\",\"note\":\"left paw\"}]}"),
                checkIn(today, "{\"signals\":[{\"key\":\"visible_change\",\"value\":\"redness noticed\",\"status\":\"better\"}]}"));

        VetSummaryDto.VisibleChangeSummary summary = service.visibleChanges(dog, checkIns, List.of());

        assertNotNull(summary);
        assertEquals(2, summary.entries().size());
        VetSummaryDto.VisibleChangeEntry first = summary.entries().get(0);
        assertEquals(today.minusDays(6), first.date());
        assertEquals("same", first.status());
        assertEquals("mild", first.severity());
        assertEquals("left paw", first.note());
        assertEquals("better", summary.entries().get(1).status());
        assertEquals(0, summary.photoCount());
    }

    @Test
    void visibleChanges_correlatesPhotosByDate() {
        Pet reptile = pet(Species.REPTILE, "Rex");
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = List.of(
                checkIn(today, "{\"signals\":[{\"key\":\"visible_change\",\"value\":\"shell mark\"}]}"));

        VetSummaryDto.VisibleChangeSummary summary =
                service.visibleChanges(reptile, checkIns, List.of(fakePhoto(PhotoArea.SHELL, today)));

        assertNotNull(summary);
        assertEquals(1, summary.photoCount());
        assertEquals(1, summary.entries().get(0).photoCount());
    }

    @Test
    void visibleChanges_nullWhenNothingVisibleLogged() {
        Pet cat = pet(Species.CAT, "Milo");
        assertNull(service.visibleChanges(cat, List.of(
                checkIn(LocalDate.now(), "{\"signals\":[{\"key\":\"appetite\",\"value\":\"less\"}]}")), List.of()));
    }

    private static Pet pet(Species species, String name) {
        Pet pet = new Pet();
        pet.setSpecies(species);
        pet.setName(name);
        return pet;
    }

    private static PhotoView fakePhoto(PhotoArea area, LocalDate date) {
        return new PhotoView() {
            public UUID getId() {
                return UUID.randomUUID();
            }

            public PhotoArea getArea() {
                return area;
            }

            public LocalDate getCapturedDate() {
                return date;
            }

            public String getCaption() {
                return null;
            }

            public String getContentType() {
                return "image/jpeg";
            }

            public Instant getCreatedAt() {
                return Instant.now();
            }
        };
    }
}
