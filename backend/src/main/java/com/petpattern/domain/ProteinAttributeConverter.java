package com.petpattern.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ProteinAttributeConverter implements AttributeConverter<Protein, String> {

    @Override
    public String convertToDatabaseColumn(Protein attribute) {
        return attribute == null ? Protein.UNKNOWN.name() : attribute.name();
    }

    @Override
    public Protein convertToEntityAttribute(String dbData) {
        return Protein.from(dbData);
    }
}