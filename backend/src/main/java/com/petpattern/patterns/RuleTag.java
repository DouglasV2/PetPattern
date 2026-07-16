package com.petpattern.patterns;

/**
 * The coarse category a starter-species rule reports as. Maps 1:1 to a STARTER_*
 * {@link PatternType} so the specific rule identity stays in the frozen ruleId
 * while the exhaustive switches and stored rows only ever see a small, stable enum.
 */
public enum RuleTag {

    /** An owner-logged combination many vets say not to wait on. */
    URGENT_SIGN(PatternType.STARTER_URGENT_SIGN),
    /** Eating / drinking / hay-intake reduced or refused. */
    INTAKE_CHANGE(PatternType.STARTER_INTAKE_CHANGE),
    /** Droppings / stool / urate changed. */
    OUTPUT_CHANGE(PatternType.STARTER_OUTPUT_CHANGE),
    /** Weight, a lump/swelling, shell, fins/scales, feathers — the body itself. */
    BODY_CONDITION(PatternType.STARTER_BODY_CONDITION),
    /** Activity, hiding, posture, vocalization, swimming — how the pet behaves. */
    BEHAVIOR_CHANGE(PatternType.STARTER_BEHAVIOR_CHANGE),
    /** Enclosure temperature / humidity / water, around a behaviour change. Context only. */
    ENV_CONTEXT(PatternType.STARTER_ENV_CONTEXT);

    private final PatternType patternType;

    RuleTag(PatternType patternType) {
        this.patternType = patternType;
    }

    public PatternType patternType() {
        return patternType;
    }
}
