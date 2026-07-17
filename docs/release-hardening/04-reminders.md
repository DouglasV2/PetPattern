# WP3 — Reminder behavior (web + native)

Made the daily check-in reminder correct, not just present. The web foreground path was already
solid; this sprint fixed the native (Capacitor) defects the gap analysis found and added
privacy-safe reminder analytics.

## Model
- **Pet-level.** A reminder preference is stored per pet (`petpattern.reminder.<petId>`), and each
  pet gets its OWN native notification slot (`reminderNotificationId(petId)`), so multiple pets no
  longer clobber each other on one global id.

## Fixes
| Requirement | Before | After |
|---|---|---|
| No reminder after a qualifying check-in | Native ignored `loggedToday` and fired anyway | `firstReminderAt(time, now, loggedToday)` skips today's occurrence after a check-in; the native effect re-syncs on `loggedToday` change. Web already suppressed via `shouldRemind`. |
| Do not mark enabled if permission denied | `toggle()` set `enabled:true` regardless | Only enables when the result is `granted`; otherwise stays off and shows a denied note. |
| Clear permission-denied state | Generic note | Distinct blocked note (device vs browser), shown even while off so the user understands why nothing turned on. |
| No swallowed scheduling failures | `catch {}` silently | `syncNativeReminder` returns `scheduled/cancelled/error/unavailable`, logs on error, and the UI shows a "couldn't schedule" note. |
| Multi-pet without duplicates | Single global id `1001` | Per-pet stable id; re-scheduling replaces that pet's slot. |
| Cancel on turn-off | `cancelNativeReminder` existed but was never called | `toggle()` off now cancels this pet's native reminder. |
| Timezone / DST / restart | Native anchored once | Native effect re-syncs on pref/permission/loggedToday change AND on Capacitor `App` `resume`, re-anchoring `firstReminderAt` from current local time. Web recomputes from device-local time each minute. |
| Deep-link a tapped reminder | No action listener | `initReminderTapHandler` listens for `localNotificationActionPerformed`, routes to the pet's Today (safe destination), and attaches only a non-sensitive `{petId, kind}` payload. |
| Privacy-safe notification analytics | None | `reminder_enabled`, `reminder_permission_granted/denied`, `reminder_notification_opened`, and `notification_to_checkin` (attributed when a check-in follows a tap within 30 min). No content, ever. |
| Neutral lock-screen copy | Already neutral | Kept: "Time for {name}'s daily check-in." — only the owner-chosen pet name. |
| Offline-safe | Already local-only | Kept: no network calls; storage guarded with try/catch. |

## Tests (JS)
- `reminderSchedule.test.js`: `shouldRemind` matrix (unchanged) + `firstReminderAt`
  (skip-today-after-check-in, keep-tomorrow-when-past, null on cleared) + `reminderNotificationId`
  (stable, distinct per pet, safe positive int).
- `nativeNotifications.test.js`: against a MOCKED Capacitor plugin — per-pet cancel+schedule, safe
  payload, disabled=cancel-only, multi-pet no-clobber, skip-today via fake timers, error status
  (not silent) on schedule throw, web `unavailable` no-op; plus notification→check-in conversion
  attribution (consumed exactly once, none without a preceding open, none outside the window).

## Honest verification status
The native path is exercised only through JS unit tests against a **mocked** plugin. Real on-device
behavior — actual notification delivery, the OS permission prompt, tap deep-linking, and DST
re-anchoring after a system clock/zone change — is **NOT verified in this environment** (no
device/emulator; win32 host, no Android SDK/Xcode). This must be verified on a real build (see
WP4). New user-facing strings added here fall back to English until translated.
