package com.petpattern.api.dto;

import java.time.LocalDate;

/**
 * Habit signals for Bella today. The moat only exists if the owner keeps
 * logging, so the overview surfaces a gentle streak and a nudge — never a guilt
 * trip. All fields are derived from stored check-in dates.
 */
public record RetentionSummary(
        boolean loggedToday,
        int streakDays,
        Integer daysSinceLastCheckIn,
        int loggedDaysLast30,
        LocalDate lastCheckInDate
) {
}
