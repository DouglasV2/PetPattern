package com.petpattern.api;

import com.petpattern.account.AccountService;
import com.petpattern.account.ExportService;
import com.petpattern.analytics.AnalyticsService;
import com.petpattern.api.dto.AccountExportDto;
import com.petpattern.auth.AuthService;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.domain.Owner;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * The signed-in owner's own account: export their data (GDPR portability) or
 * permanently delete the account. Both require a valid session (via PetAccess).
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final PetAccess petAccess;
    private final AccountService accountService;
    private final ExportService exportService;
    private final AuthService authService;
    private final AnalyticsService analytics;

    public AccountController(PetAccess petAccess,
                            AccountService accountService,
                            ExportService exportService,
                            AuthService authService,
                            AnalyticsService analytics) {
        this.petAccess = petAccess;
        this.accountService = accountService;
        this.exportService = exportService;
        this.authService = authService;
        this.analytics = analytics;
    }

    @GetMapping("/export")
    public ResponseEntity<AccountExportDto> export() {
        Owner owner = petAccess.currentOwner();
        AccountExportDto data = exportService.export(owner);
        analytics.record(owner.getId(), AnalyticsEventType.DATA_EXPORT_REQUESTED, Map.of());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"petpattern-export.json\"")
                .body(data);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount() {
        Owner owner = petAccess.currentOwner();
        // Record the churn event before the account is wiped (analytics has no FK to the
        // owner, so the pseudonymous row survives deletion by design — it is not identifying).
        analytics.record(owner.getId(), AnalyticsEventType.ACCOUNT_DELETED, Map.of());
        accountService.deleteAccount(owner);
        // The owner's sessions were deleted with the account; also clear the cookie.
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authService.clearCookie().toString())
                .build();
    }
}
