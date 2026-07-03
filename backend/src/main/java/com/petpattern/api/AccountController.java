package com.petpattern.api;

import com.petpattern.account.AccountService;
import com.petpattern.account.ExportService;
import com.petpattern.api.dto.AccountExportDto;
import com.petpattern.auth.AuthService;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.Owner;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    public AccountController(PetAccess petAccess,
                            AccountService accountService,
                            ExportService exportService,
                            AuthService authService) {
        this.petAccess = petAccess;
        this.accountService = accountService;
        this.exportService = exportService;
        this.authService = authService;
    }

    @GetMapping("/export")
    public ResponseEntity<AccountExportDto> export() {
        Owner owner = petAccess.currentOwner();
        AccountExportDto data = exportService.export(owner);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"petpattern-export.json\"")
                .body(data);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount() {
        Owner owner = petAccess.currentOwner();
        accountService.deleteAccount(owner);
        // The owner's sessions were deleted with the account; also clear the cookie.
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authService.clearCookie().toString())
                .build();
    }
}
