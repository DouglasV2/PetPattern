package com.petpattern.account;

import com.petpattern.api.dto.AccountExportDto;
import com.petpattern.api.dto.CheckInResponse;
import com.petpattern.api.dto.FoodLogResponse;
import com.petpattern.api.dto.MedicationResponse;
import com.petpattern.api.dto.PetResponse;
import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.repository.MedicationRepository;
import com.petpattern.repository.PatternObservationRepository;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetPhotoRepository;
import com.petpattern.repository.PetRepository;
import com.petpattern.vet.VetShareService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Builds the GDPR data-portability export for one owner. Owned pets in full;
 * caregiver-only pets as a minimal association so no other owner's data leaks.
 */
@Service
public class ExportService {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final MedicationRepository medicationRepository;
    private final FoodTrialRepository trialRepository;
    private final PatternObservationRepository observationRepository;
    private final PetPhotoRepository photoRepository;
    private final PetCaregiverRepository caregiverRepository;
    private final VetShareService vetShareService;

    public ExportService(PetRepository petRepository,
                         DailyCheckInRepository checkInRepository,
                         FoodLogRepository foodLogRepository,
                         MedicationRepository medicationRepository,
                         FoodTrialRepository trialRepository,
                         PatternObservationRepository observationRepository,
                         PetPhotoRepository photoRepository,
                         PetCaregiverRepository caregiverRepository,
                         VetShareService vetShareService) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.medicationRepository = medicationRepository;
        this.trialRepository = trialRepository;
        this.observationRepository = observationRepository;
        this.photoRepository = photoRepository;
        this.caregiverRepository = caregiverRepository;
        this.vetShareService = vetShareService;
    }

    @Transactional(readOnly = true)
    public AccountExportDto export(Owner owner) {
        AccountExportDto.Account account = new AccountExportDto.Account(
                owner.getEmail(),
                owner.getDisplayName(),
                owner.getCreatedAt(),
                owner.getAcceptedTermsAt(),
                owner.getAcceptedPrivacyAt(),
                owner.getAcceptedMedicalDisclaimerAt());

        List<AccountExportDto.PetExport> pets = petRepository.findByOwnerOrderByCreatedAtAsc(owner).stream()
                .map(this::exportPet)
                .toList();

        List<AccountExportDto.SharedPetExport> sharedPets = caregiverRepository.findPetsSharedWith(owner).stream()
                .map(pet -> new AccountExportDto.SharedPetExport(pet.getName(), "caregiver"))
                .toList();

        return new AccountExportDto(Instant.now(), account, pets, sharedPets);
    }

    private AccountExportDto.PetExport exportPet(Pet pet) {
        List<CheckInResponse> checkIns = checkInRepository.findByPetOrderByCheckInDateAsc(pet).stream()
                .map(CheckInResponse::from).toList();
        List<FoodLogResponse> foodLogs = foodLogRepository.findByPetOrderByDateStartedDesc(pet).stream()
                .map(FoodLogResponse::from).toList();
        List<MedicationResponse> medications = medicationRepository.findByPetOrderByStartDateDesc(pet).stream()
                .map(MedicationResponse::from).toList();
        List<AccountExportDto.TrialExport> trials = trialRepository.findByPetOrderByStartDateDesc(pet).stream()
                .map(trial -> new AccountExportDto.TrialExport(
                        trial.getProtein(),
                        trial.getStatus().name(),
                        trial.getStartDate(),
                        trial.getTargetEndDate(),
                        trial.getReintroducedDate(),
                        trial.getCompletedDate(),
                        trial.getNotes(),
                        trial.getCreatedAt()))
                .toList();
        List<AccountExportDto.PatternExport> patterns = observationRepository.findByPet(pet).stream()
                .map(obs -> new AccountExportDto.PatternExport(
                        obs.getPatternKey(),
                        obs.getType(),
                        obs.getStatus().name(),
                        obs.getLastTitle(),
                        obs.getLastSummary(),
                        obs.getLastConfidence(),
                        obs.getFirstDetectedDate(),
                        obs.getLastDetectedDate(),
                        obs.getDetectionCount()))
                .toList();
        List<AccountExportDto.PhotoExport> photos = photoRepository
                .findPhotoViewByPetOrderByCapturedDateDescCreatedAtDesc(pet).stream()
                .map(view -> new AccountExportDto.PhotoExport(
                        view.getArea() == null ? null : view.getArea().name(),
                        view.getCapturedDate(),
                        view.getCaption(),
                        view.getContentType(),
                        view.getCreatedAt()))
                .toList();
        List<AccountExportDto.CaregiverExport> caregivers = caregiverRepository.findByPetOrderByAddedAtAsc(pet).stream()
                .map(link -> new AccountExportDto.CaregiverExport(
                        link.getCaregiver().getEmail(),
                        link.getCaregiver().getDisplayName(),
                        link.getAddedAt()))
                .toList();
        Instant shareExpiry = vetShareService.activeExpiry(pet).orElse(null);
        AccountExportDto.ShareExport share = new AccountExportDto.ShareExport(shareExpiry != null, shareExpiry);

        return new AccountExportDto.PetExport(
                PetResponse.from(pet), checkIns, foodLogs, medications, trials, patterns, photos, caregivers, share);
    }
}
