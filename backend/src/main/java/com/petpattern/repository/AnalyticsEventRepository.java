package com.petpattern.repository;

import com.petpattern.domain.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, UUID> {

    /** Duplicate-milestone guard: has this pseudonymous ref already recorded this type? */
    boolean existsByRefAndType(String ref, String type);

    @Query("select e.type as type, count(distinct e.ref) as refs, count(e) as total "
            + "from AnalyticsEvent e group by e.type")
    List<FunnelRow> funnel();

    /** (ref, UTC day) rows — the input to the retention computation. */
    @Query("select e.ref as ref, e.occurredOn as day from AnalyticsEvent e")
    List<RefDayRow> refDays();

    /** Platform attribution: distinct refs + total events per platform. */
    @Query("select e.platform as platform, count(distinct e.ref) as refs, count(e) as total "
            + "from AnalyticsEvent e group by e.platform")
    List<PlatformRow> platformBreakdown();

    /** (ref, UTC day, platform) rows — the input to per-platform retention (a ref's platform is
     *  taken from its earliest event). */
    @Query("select e.ref as ref, e.occurredOn as day, e.platform as platform, e.occurredAt as at "
            + "from AnalyticsEvent e")
    List<RefDayPlatformRow> refDayPlatforms();

    /**
     * For every (ref, type), the FIRST time that ref hit that event type. This is the input to the
     * step-conversion, time-to-milestone, and date-cohort computations — one row per ref per type,
     * so it stays small and never exposes an identity (refs are pseudonyms).
     */
    @Query("select e.ref as ref, e.type as type, min(e.occurredAt) as at "
            + "from AnalyticsEvent e group by e.ref, e.type")
    List<RefTypeFirstRow> refTypeFirsts();

    @Query("select count(distinct e.ref) from AnalyticsEvent e")
    long countDistinctRefs();

    @Query("select min(e.occurredOn) from AnalyticsEvent e")
    LocalDate firstDay();

    @Query("select max(e.occurredOn) from AnalyticsEvent e")
    LocalDate lastDay();

    interface FunnelRow {
        String getType();
        long getRefs();
        long getTotal();
    }

    interface RefDayRow {
        String getRef();
        LocalDate getDay();
    }

    interface PlatformRow {
        String getPlatform();
        long getRefs();
        long getTotal();
    }

    interface RefDayPlatformRow {
        String getRef();
        LocalDate getDay();
        String getPlatform();
        java.time.Instant getAt();
    }

    interface RefTypeFirstRow {
        String getRef();
        String getType();
        java.time.Instant getAt();
    }
}
