package com.petpattern.api.dto;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.WaterLevel;

import java.time.LocalDate;
import java.util.UUID;

public record CheckInResponse(
        UUID id,
        LocalDate checkInDate,
        Integer itchingScore,
        StoolState stoolState,
        Integer stoolScore,
        AppetiteLevel appetiteLevel,
        WaterLevel waterLevel,
        EnergyLevel energyLevel,
        boolean vomiting,
        boolean earRedness,
        String freeTextNote,
        Integer energyScore,
        Integer appetiteScore,
        Integer sleepQualityScore,
        Integer waterIntakeMl,
        boolean diarrhea,
        String notes
) {
    public static CheckInResponse from(DailyCheckIn checkIn) {
        return new CheckInResponse(
                checkIn.getId(),
                checkIn.getCheckInDate(),
                checkIn.getItchingScore(),
                checkIn.getStoolState(),
                checkIn.getStoolScore(),
                checkIn.getAppetiteLevel(),
                checkIn.getWaterLevel(),
                checkIn.getEnergyLevel(),
                checkIn.isVomiting(),
                checkIn.isEarRedness(),
                checkIn.getFreeTextNote(),
                checkIn.getEnergyScore(),
                checkIn.getAppetiteScore(),
                checkIn.getSleepQualityScore(),
                checkIn.getWaterIntakeMl(),
                checkIn.isDiarrhea(),
                checkIn.getNotes()
        );
    }
}
