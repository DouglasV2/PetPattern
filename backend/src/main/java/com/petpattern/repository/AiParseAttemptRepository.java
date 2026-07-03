package com.petpattern.repository;

import com.petpattern.ai.AiParseAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AiParseAttemptRepository extends JpaRepository<AiParseAttempt, UUID> {

    /** Erase a pet's stored note-parse attempts (used on account deletion). */
    void deleteByPetId(UUID petId);
}
