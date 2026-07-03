package com.petpattern.repository;

import com.petpattern.domain.AuthSession;
import com.petpattern.domain.Owner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    Optional<AuthSession> findByTokenHash(String tokenHash);

    void deleteByOwner(Owner owner);

    void deleteByExpiresAtBefore(Instant cutoff);
}
