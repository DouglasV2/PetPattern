package com.petpattern.api.dto;

import java.util.List;

/**
 * One immediate, safety-oriented observation surfaced from the pet's latest relevant entry
 * (the immediate layer, evaluated with no seven-check-in gate). It is always the urgent tier,
 * always observational and non-diagnostic ({@code summary} restates only what the owner logged
 * and {@code urgentNote} hands off to a real vet), and is recomputed from current data on every
 * read — never stored as a recurring pattern.
 *
 * @param id        stable id ({@code now:<petId>:<ruleId>}); deterministic, so the same entry
 *                  never yields duplicate alerts and it never collides with a persisted pattern key.
 * @param type      coarse pattern type name (e.g. {@code STARTER_URGENT_SIGN}).
 * @param severity  always {@code "urgent"} for this list.
 * @param title     short owner-facing headline; names no condition.
 * @param summary   non-diagnostic explanation including PetPattern's limitation.
 * @param urgentNote the vet-handoff tail ("PetPattern cannot examine {name} — call your vet…").
 * @param relatedCheckInIds the check-ins that back this observation, as string ids.
 */
public record ImmediateObservationDto(
        String id,
        String type,
        String severity,
        String title,
        String summary,
        String urgentNote,
        List<String> relatedCheckInIds
) {
}
