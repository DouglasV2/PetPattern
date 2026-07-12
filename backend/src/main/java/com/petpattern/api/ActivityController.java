package com.petpattern.api;

import com.petpattern.api.dto.ActivityResponse;
import com.petpattern.api.dto.CreateActivityRequest;
import com.petpattern.api.dto.UpdateActivityRequest;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.ActivityLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/activities")
public class ActivityController {

    private static final int MAX_NOTES = 500;

    private final PetAccess petAccess;
    private final ActivityLogRepository activityRepository;

    public ActivityController(PetAccess petAccess, ActivityLogRepository activityRepository) {
        this.petAccess = petAccess;
        this.activityRepository = activityRepository;
    }

    @GetMapping
    public List<ActivityResponse> list(@PathVariable UUID petId) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return activityRepository.findByPetOrderByOccurredDateDesc(pet).stream()
                .map(ActivityResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityResponse create(@PathVariable UUID petId, @RequestBody CreateActivityRequest request) {
        Pet pet = petAccess.requireOwnedPet(petId);
        if (request.type() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("An activity type is required"));
        }
        LocalDate date = request.occurredDate() != null ? request.occurredDate() : LocalDate.now();
        // One-day grace: the server clock is UTC and a client near midnight can
        // legitimately post "tomorrow" (matches CheckInController).
        if (date.isAfter(LocalDate.now().plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("An activity can't be in the future"));
        }
        ActivityLog activity = new ActivityLog();
        activity.setPet(pet);
        activity.setType(request.type());
        activity.setOccurredDate(date);
        activity.setNotes(clean(request.notes()));
        return ActivityResponse.from(activityRepository.save(activity));
    }

    @PatchMapping("/{activityId}")
    public ActivityResponse update(@PathVariable UUID petId, @PathVariable UUID activityId,
                                   @RequestBody UpdateActivityRequest request) {
        ActivityLog activity = findActivity(petId, activityId);
        if (request.type() != null) {
            activity.setType(request.type());
        }
        if (request.occurredDate() != null) {
            // One-day grace: the server clock is UTC and a client near midnight can
            // legitimately post "tomorrow" (matches CheckInController).
            if (request.occurredDate().isAfter(LocalDate.now().plusDays(1))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("An activity can't be in the future"));
            }
            activity.setOccurredDate(request.occurredDate());
        }
        activity.setNotes(clean(request.notes()));
        return ActivityResponse.from(activityRepository.save(activity));
    }

    @DeleteMapping("/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID activityId) {
        activityRepository.delete(findActivity(petId, activityId));
    }

    private ActivityLog findActivity(UUID petId, UUID activityId) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return activityRepository.findByIdAndPet(activityId, pet)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, Copy.t("Activity not found")));
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_NOTES ? trimmed.substring(0, MAX_NOTES) : trimmed;
    }
}
