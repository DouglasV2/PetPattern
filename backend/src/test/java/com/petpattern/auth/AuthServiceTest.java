package com.petpattern.auth;

import com.petpattern.domain.AuthSession;
import com.petpattern.domain.Owner;
import com.petpattern.repository.AuthSessionRepository;
import com.petpattern.repository.OwnerRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private final OwnerRepository owners = mock(OwnerRepository.class);
    private final AuthSessionRepository sessions = mock(AuthSessionRepository.class);
    private final AuthService auth = new AuthService(owners, sessions);
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Test
    void registerNormalizesEmailAndHashesPassword() {
        when(owners.existsByEmail("a@b.com")).thenReturn(false);
        when(owners.save(any(Owner.class))).thenAnswer(inv -> inv.getArgument(0));

        Owner owner = auth.register("A@B.com", "supersecret", "Al", true);

        assertEquals("a@b.com", owner.getEmail());
        assertNotEquals("supersecret", owner.getPasswordHash());
        assertTrue(bcrypt.matches("supersecret", owner.getPasswordHash()));
        assertNotNull(owner.getAcceptedTermsAt(), "acceptance must be stamped");
        assertNotNull(owner.getAcceptedPrivacyAt());
        assertNotNull(owner.getAcceptedMedicalDisclaimerAt());
    }

    @Test
    void registerRejectsShortPassword() {
        assertThrows(ResponseStatusException.class, () -> auth.register("a@b.com", "short", null, true));
    }

    @Test
    void registerRejectsWithoutTermsAcceptance() {
        assertThrows(ResponseStatusException.class,
                () -> auth.register("a@b.com", "supersecret", "Al", false));
    }

    @Test
    void authenticateAcceptsCorrectAndRejectsWrongPassword() {
        Owner owner = new Owner();
        owner.setEmail("a@b.com");
        owner.setPasswordHash(bcrypt.encode("supersecret"));
        when(owners.findByEmail("a@b.com")).thenReturn(Optional.of(owner));

        assertSame(owner, auth.authenticate("a@b.com", "supersecret"));
        assertThrows(ResponseStatusException.class, () -> auth.authenticate("a@b.com", "wrong"));
    }

    @Test
    void sessionTokenIsStoredHashedAndResolvesUntilExpiry() {
        Owner owner = new Owner();
        when(sessions.save(any(AuthSession.class))).thenAnswer(inv -> inv.getArgument(0));

        String token = auth.issueSession(owner);

        ArgumentCaptor<AuthSession> captor = ArgumentCaptor.forClass(AuthSession.class);
        verify(sessions).save(captor.capture());
        AuthSession saved = captor.getValue();
        assertNotEquals(token, saved.getTokenHash(), "raw token must not be stored");

        when(sessions.findByTokenHash(saved.getTokenHash())).thenReturn(Optional.of(saved));
        assertSame(owner, auth.resolve(token));

        saved.setExpiresAt(Instant.now().minusSeconds(60));
        assertNull(auth.resolve(token), "an expired session must not resolve");
    }
}
