package com.petpattern.api.dto;

import com.petpattern.domain.DailyCheckIn;

import java.time.LocalDate;
import java.util.UUID;

public record CheckInResponse(
        UUID id,
        LocalDate checkInDate,
        Integer stoolScore,
        Integer itchingScore,
        Integer energyScore,
        Integer appetiteScore,
        Integer sleepQualityScore,
        Integer waterIntakeMl,
        boolean vomiting,
        boolean diarrhea,
        boolean earRedness,
        String notes
) {
    public static CheckInResponse from(DailyCheckIn checkIn) {
        return new CheckInResponse(
                checkIn.getId(),
                checkIn.getCheckInDate(),
                checkIn.getStoolScore(),
                checkIn.getItchingScore(),
                checkIn.getEnergyScore(),
                checkIn.getAppetiteScore(),
                checkIn.getSleepQualityScore(),
                checkIn.getWaterIntakeMl(),
                checkIn.isVomiting(),
                checkIn.isDiarrhea(),
                checkIn.isEarRedness(),
                checkIn.getNotes()
        );
    }
}
