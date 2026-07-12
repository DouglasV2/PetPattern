package com.petpattern.account;

import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.repository.ActivityLogRepository;
import com.petpattern.repository.AiParseAttemptRepository;
import com.petpattern.repository.AuthSessionRepository;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.repository.MedicationRepository;
import com.petpattern.repository.OwnerRepository;
import com.petpattern.repository.PasswordResetTokenRepository;
import com.petpattern.repository.PatternObservationRepository;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetInviteRepository;
import com.petpattern.repository.PetPhotoRepository;
import com.petpattern.repository.PetRepository;
import com.petpattern.repository.VetShareRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountServiceTest {

    private final PetRepository pets = mock(PetRepository.class);
    private final OwnerRepository owners = mock(OwnerRepository.class);
    private final DailyCheckInRepository checkIns = mock(DailyCheckInRepository.class);
    private final FoodLogRepository foods = mock(FoodLogRepository.class);
    private final PatternObservationRepository observations = mock(PatternObservationRepository.class);
    private final PetPhotoRepository photos = mock(PetPhotoRepository.class);
    private final FoodTrialRepository trials = mock(FoodTrialRepository.class);
    private final MedicationRepository meds = mock(MedicationRepository.class);
    private final VetShareRepository shares = mock(VetShareRepository.class);
    private final PetCaregiverRepository caregivers = mock(PetCaregiverRepository.class);
    private final PetInviteRepository invites = mock(PetInviteRepository.class);
    private final AuthSessionRepository sessions = mock(AuthSessionRepository.class);
    private final AiParseAttemptRepository aiAttempts = mock(AiParseAttemptRepository.class);
    private final PasswordResetTokenRepository resetTokens = mock(PasswordResetTokenRepository.class);
    private final ActivityLogRepository activities = mock(ActivityLogRepository.class);
    private final EntityManager em = mock(EntityManager.class);

    private final AccountService service = build();

    private AccountService build() {
        AccountService s = new AccountService(pets, owners, checkIns, foods, observations, photos,
                trials, meds, shares, caregivers, invites, sessions, aiAttempts, resetTokens, activities);
        ReflectionTestUtils.setField(s, "entityManager", em);
        return s;
    }

    @Test
    void deleteWipesOwnedPetDataThenRemovesAccount() {
        Owner owner = new Owner();
        owner.setEmail("me@x.co");
        Pet mine = new Pet();
        mine.setOwner(owner);
        mine.setName("Rex");
        when(pets.findByOwnerOrderByCreatedAtAsc(owner)).thenReturn(List.of(mine));

        service.deleteAccount(owner);

        // Every child of the owned pet is wiped.
        verify(observations).deleteByPet(mine);
        verify(checkIns).deleteByPet(mine);
        verify(foods).deleteByPet(mine);
        verify(photos).deleteByPet(mine);
        verify(trials).deleteByPet(mine);
        verify(meds).deleteByPet(mine);
        verify(shares).deleteByPet(mine);
        verify(invites).deleteByPet(mine);
        verify(caregivers).deleteByPet(mine);
        verify(activities).deleteByPet(mine);
        verify(aiAttempts).deleteByPetId(mine.getId());
        // The pet, this owner's caregiver links elsewhere, invites to them, sessions, account.
        verify(pets).deleteAll(List.of(mine));
        verify(caregivers).deleteByCaregiver(owner);
        verify(invites).deleteByInvitedEmail("me@x.co");
        verify(sessions).deleteByOwner(owner);
        verify(resetTokens).deleteByOwner(owner);
        verify(owners).delete(owner);
    }

    @Test
    void deleteWithNoOwnedPetsStillRemovesAssociationsAndAccount() {
        Owner owner = new Owner();
        owner.setEmail("solo@x.co");
        when(pets.findByOwnerOrderByCreatedAtAsc(owner)).thenReturn(List.of());

        service.deleteAccount(owner);

        // No pet -> no child wipes (never touches anyone else's pet data)...
        verify(checkIns, never()).deleteByPet(org.mockito.ArgumentMatchers.any());
        verify(photos, never()).deleteByPet(org.mockito.ArgumentMatchers.any());
        // ...but the caregiver association, invites, sessions, and account still go.
        verify(caregivers).deleteByCaregiver(owner);
        verify(invites).deleteByInvitedEmail("solo@x.co");
        verify(sessions).deleteByOwner(owner);
        verify(owners).delete(owner);
    }
}
