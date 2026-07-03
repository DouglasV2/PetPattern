package com.petpattern.repository;

import com.petpattern.domain.Owner;
import com.petpattern.domain.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    // Invalidate every outstanding token for an owner (on a new request, or when
    // the account is deleted).
    void deleteByOwner(Owner owner);

    // Housekeeping: drop expired rows so the table can't grow without bound.
    void deleteByExpiresAtBefore(Instant cutoff);
}
