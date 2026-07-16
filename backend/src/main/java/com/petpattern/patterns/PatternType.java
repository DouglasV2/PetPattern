package com.petpattern.patterns;

public enum PatternType {
    // Dog-oriented
    ITCHING_ABOVE_BASELINE,
    STOOL_INSTABILITY,
    WATER_DROP,
    POSSIBLE_FOOD_TRIGGER,
    RECURRING_EAR_REDNESS,
    // Cat-oriented (cautious, non-diagnostic)
    APPETITE_LOW,
    WATER_CHANGE,
    LITTER_BOX_CHANGE,
    HIDING_INCREASED,
    REPEATED_VOMITING,
    // Species-neutral (starter species): an owner-observed signal from the flexible
    // observations model that repeated across more than one day. Non-diagnostic.
    REPEATED_OBSERVATION,
    // Starter-species coarse categories. The specific rule identity is the frozen
    // ruleId inside the candidate id (petId:ruleId); this enum is only the small,
    // switchable/stored coarse type each rule reports as. Additive — see RuleTag.
    STARTER_URGENT_SIGN,
    STARTER_INTAKE_CHANGE,
    STARTER_OUTPUT_CHANGE,
    STARTER_BODY_CONDITION,
    STARTER_BEHAVIOR_CHANGE,
    STARTER_ENV_CONTEXT
}
