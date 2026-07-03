package com.petpattern.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Delivers the password-reset email. Entirely env-driven (see docs/observability.md):
 *
 * <ul>
 *   <li><b>Production</b> — set {@code PETPATTERN_MAIL_ENABLED=true} + {@code SPRING_MAIL_*}.
 *       A {@link JavaMailSender} is auto-configured only when {@code spring.mail.host}
 *       is present, so it's optional on the classpath.</li>
 *   <li><b>Dev / not configured</b> — no mail is sent. The link is logged <b>only when
 *       the {@code prod} profile is NOT active</b>, so a local tester can complete the
 *       flow. In prod the raw token is <b>never</b> logged (a reset token in the logs is
 *       an account-takeover secret); only a "mail not configured" notice is emitted.</li>
 * </ul>
 *
 * Delivery is {@link Async} and is invoked after the DB transaction commits, so the
 * forgot-password request never blocks on SMTP (no held DB connection, and the
 * response timing no longer reveals whether an account exists). Subject/body are
 * rendered by the caller (on the request thread, where the locale is active) and
 * passed in, so async delivery keeps the right language.
 */
@Component
public class PasswordResetMailer {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean enabled;
    private final boolean prod;
    private final String from;

    public PasswordResetMailer(ObjectProvider<JavaMailSender> mailSender,
                               Environment environment,
                               @Value("${petpattern.mail.enabled:false}") boolean enabled,
                               @Value("${petpattern.mail.from:PetPattern <no-reply@petpattern.app>}") String from) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.prod = environment.acceptsProfiles(Profiles.of("prod"));
    }

    /**
     * @param link kept only so the DEV (non-prod) path can print a usable reset link;
     *             it is never logged in production.
     */
    @Async
    public void deliver(String toEmail, String subject, String body, String link) {
        if (enabled) {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null) {
                log.error("petpattern.mail.enabled=true but no mail sender is configured "
                        + "(set spring.mail.host / SPRING_MAIL_HOST). Reset email NOT sent.");
                return;
            }
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(from);
                message.setTo(toEmail);
                message.setSubject(subject);
                message.setText(body);
                sender.send(message);
                log.info("Password reset email sent.");
            } catch (Exception ex) {
                // Never surface mail-server detail (the response is neutral either way).
                log.error("Failed to send password reset email", ex);
            }
            return;
        }
        // Mail disabled. In prod, NEVER log the token — it's an account-takeover secret.
        if (prod) {
            log.warn("Password reset requested, but email sending is disabled "
                    + "(set PETPATTERN_MAIL_ENABLED=true + SMTP_*). No email sent; no token logged.");
        } else {
            // Dev-only convenience so the flow is testable without a mail server.
            log.warn("Mail is disabled — password reset link (dev only): {}", link);
        }
    }
}
