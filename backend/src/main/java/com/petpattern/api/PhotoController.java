package com.petpattern.api;

import com.petpattern.api.dto.PhotoResponse;
import com.petpattern.domain.Pet;
import com.petpattern.domain.PetPhoto;
import com.petpattern.domain.PhotoArea;
import com.petpattern.auth.PetAccess;
import com.petpattern.repository.PetPhotoRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/photos")
public class PhotoController {

    /** Raster image types only — no SVG/HTML, so stored bytes can never be served as script. */
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final int MAX_CAPTION = 300;
    // Generous for a real pet diary; a guard against unbounded growth on the
    // no-auth pilot rather than a product limit owners would hit.
    private static final long MAX_PHOTOS_PER_PET = 300;

    private final PetAccess petAccess;
    private final PetPhotoRepository photoRepository;

    public PhotoController(PetAccess petAccess, PetPhotoRepository photoRepository) {
        this.petAccess = petAccess;
        this.photoRepository = photoRepository;
    }

    @GetMapping
    public List<PhotoResponse> list(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        return photoRepository.findPhotoViewByPetOrderByCapturedDateDescCreatedAtDesc(pet).stream()
                .map(view -> PhotoResponse.fromView(view, petId))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoResponse upload(@PathVariable UUID petId,
                                @RequestParam("file") MultipartFile file,
                                @RequestParam(value = "area", required = false) String area,
                                @RequestParam(value = "capturedDate", required = false) String capturedDate,
                                @RequestParam(value = "caption", required = false) String caption) {
        Pet pet = findPet(petId);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An image file is required");
        }
        if (photoRepository.countByPet(pet) >= MAX_PHOTOS_PER_PET) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This pet already has the maximum number of photos");
        }
        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT).trim();
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Only JPEG, PNG or WebP images are allowed");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read the image");
        }
        // Don't trust the client's Content-Type header: verify the actual file
        // signature (magic bytes) so arbitrary content can't be stored as an "image",
        // and store the DETECTED type rather than the declared one.
        String detectedType = detectImageType(bytes);
        if (detectedType == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Only JPEG, PNG or WebP images are allowed");
        }

        PetPhoto photo = new PetPhoto();
        photo.setPet(pet);
        photo.setArea(PhotoArea.from(area));
        photo.setCapturedDate(parseDate(capturedDate));
        photo.setContentType(detectedType);
        photo.setCaption(clean(caption));
        photo.setData(bytes);
        return PhotoResponse.from(photoRepository.save(photo));
    }

    /** Returns the real image MIME type from the leading bytes, or null if not a supported raster. */
    private static String detectImageType(byte[] b) {
        if (b == null || b.length < 12) {
            return null;
        }
        // JPEG: FF D8 FF
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && (b[4] & 0xFF) == 0x0D && (b[5] & 0xFF) == 0x0A && (b[6] & 0xFF) == 0x1A && (b[7] & 0xFF) == 0x0A) {
            return "image/png";
        }
        // WebP: "RIFF" .... "WEBP"
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    @GetMapping("/{photoId}/image")
    public ResponseEntity<byte[]> image(@PathVariable UUID petId, @PathVariable UUID photoId) {
        Pet pet = findPet(petId);
        PetPhoto photo = photoRepository.findById(photoId)
                .filter(existing -> existing.getPet().getId().equals(pet.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));

        // Only ever echo a known-safe raster type; never let a stored value sniff into script.
        String contentType = ALLOWED_TYPES.contains(photo.getContentType())
                ? photo.getContentType()
                : "application/octet-stream";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                // nosniff + the raster-only content-type allowlist already stop a
                // stored byte stream from being interpreted as script. (No CSP
                // `sandbox` here — on an image response it blocks <img> rendering.)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'")
                .body(photo.getData());
    }

    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID photoId) {
        Pet pet = findPet(petId);
        PetPhoto photo = photoRepository.findById(photoId)
                .filter(existing -> existing.getPet().getId().equals(pet.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
        photoRepository.delete(photo);
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now();
        }
        try {
            LocalDate date = LocalDate.parse(value.trim());
            // A photo can't be from the future; clamp so progression stays sane.
            return date.isAfter(LocalDate.now()) ? LocalDate.now() : date;
        } catch (DateTimeParseException ex) {
            return LocalDate.now();
        }
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_CAPTION ? trimmed.substring(0, MAX_CAPTION) : trimmed;
    }

    private Pet findPet(UUID petId) {
        return petAccess.requireOwnedPet(petId);
    }
}
