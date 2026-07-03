package com.petpattern.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * A portable JSON copy of everything PetPattern holds for one owner (GDPR data
 * portability). Owned pets are exported in full; pets the owner only helps with
 * as a caregiver appear as a minimal association (no other owner's data).
 */
public record AccountExportDto(
        Instant exportedAt,
        Account account,
        List<PetExport> pets,
        List<SharedPetExport> sharedPets
) {
    public record Account(
            String email,
            String displayName,
            Instant createdAt,
            Instant acceptedTermsAt,
            Instant acceptedPrivacyAt,
            Instant acceptedMedicalDisclaimerAt
    ) {
    }

    public record PetExport(
            PetResponse profile,
            List<CheckInResponse> checkIns,
            List<FoodLogResponse> foodLogs,
            List<MedicationResponse> medications,
            List<TrialExport> foodTrials,
            List<PatternExport> patterns,
            List<PhotoExport> photos,
            List<CaregiverExport> caregivers,
            ShareExport share
    ) {
    }

    public record TrialExport(
            String protein,
            String status,
            LocalDate startDate,
            LocalDate targetEndDate,
            LocalDate reintroducedDate,
            LocalDate completedDate,
            String notes,
            Instant createdAt
    ) {
    }

    public record PatternExport(
            String patternKey,
            String type,
            String status,
            String title,
            String summary,
            String confidence,
            LocalDate firstDetectedDate,
            LocalDate lastDetectedDate,
            int detectionCount
    ) {
    }

    /** Photo metadata only — never the image bytes. */
    public record PhotoExport(
            String area,
            LocalDate capturedDate,
            String caption,
            String contentType,
            Instant createdAt
    ) {
    }

    public record CaregiverExport(
            String email,
            String displayName,
            Instant addedAt
    ) {
    }

    public record ShareExport(
            boolean active,
            Instant expiresAt
    ) {
    }

    public record SharedPetExport(
            String petName,
            String role
    ) {
    }
}
