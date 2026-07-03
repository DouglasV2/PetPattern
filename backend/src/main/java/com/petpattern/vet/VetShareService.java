package com.petpattern.vet;

import com.petpattern.domain.Pet;
import com.petpattern.domain.VetShare;
import com.petpattern.repository.VetShareRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Manages read-only vet-summary share links. A link is a bearer capability: an
 * unguessable token (only its SHA-256 hash is stored), expiring after 90 days,
 * revocable, and scoped to a single pet's summary. One active link per pet —
 * creating a new one replaces the old.
 */
@Service
public class VetShareService {

    static final Duration TTL = Duration.ofDays(90);

    private final VetShareRepository shareRepository;
    private final SecureRandom random = new SecureRandom();

    public VetShareService(VetShareRepository shareRepository) {
        this.shareRepository = shareRepository;
    }

    /** Replaces any existing link for the pet and returns the RAW token (shown once). */
    @Transactional
    public Created createOrReplace(Pet pet) {
        shareRepository.deleteByPet(pet);
        shareRepository.flush();
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        VetShare share = new VetShare();
        share.setPet(pet);
        share.setTokenHash(sha256(token));
        share.setExpiresAt(Instant.now().plus(TTL));
        shareRepository.save(share);
        return new Created(token, share.getExpiresAt());
    }

    /** The pet's current link's expiry, if one is active (no token — it's not stored in the clear). */
    public Optional<Instant> activeExpiry(Pet pet) {
        return shareRepository.findFirstByPetOrderByCreatedAtDesc(pet)
                .filter(share -> share.getExpiresAt().isAfter(Instant.now()))
                .map(VetShare::getExpiresAt);
    }

    @Transactional
    public void revoke(Pet pet) {
        shareRepository.deleteByPet(pet);
    }

    /** Resolves a link token to its pet, or empty if missing/expired. */
    public Optional<Pet> resolve(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return shareRepository.findByTokenHash(sha256(token))
                .filter(share -> share.getExpiresAt().isAfter(Instant.now()))
                .map(VetShare::getPet);
    }

    @Scheduled(fixedRate = 86_400_000L)
    @Transactional
    public void purgeExpired() {
        shareRepository.deleteByExpiresAtBefore(Instant.now());
    }

    public record Created(String token, Instant expiresAt) {
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
