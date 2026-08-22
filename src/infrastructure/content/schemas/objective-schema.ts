import {
    z,
} from "zod";

import {
    EVENT_TYPES,
} from "../../../domain/events/event-type.js";

import type {
    Objective,
} from "../../../domain/objectives/objective.js";

const eventTypeSchema =
    z.enum(
        EVENT_TYPES,
    );

const verificationModeSchema =
    z.enum([
        "DISCORD",
        "SELF_REPORT",
        "GROUP_CONFIRMED",
        "MOD_ONLY",
    ]);

const objectiveDifficultySchema =
    z.enum([
        "EASY",
        "MEDIUM",
        "HARD",
    ]);

const objectiveTypeSchema =
    z.enum([
        "PRIMARY",
        "SECONDARY",
    ]);

const participantSelectorSchema =
    z.enum([
        "OWNER",
        "OTHER",
        "ANY",
    ]);

const resolutionSchema =
    z.enum([
        "ACT_END",
        "GAME_END",
    ]);

const gameActSchema =
    z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
    ]);

const eventCountRuleSchema =
    z.object({
        type:
            z.literal(
                "EVENT_COUNT",
            ),

        eventType:
            eventTypeSchema,

        actor:
            participantSelectorSchema,

        target:
            participantSelectorSchema,

        increment:
            z.number()
                .int()
                .positive(),

        requiredCount:
            z.number()
                .int()
                .positive(),
    });

const valueSumRuleSchema =
    z.object({
        type:
            z.literal(
                "VALUE_SUM",
            ),

        eventType:
            eventTypeSchema,

        actor:
            participantSelectorSchema,

        target:
            participantSelectorSchema,

        payloadField:
            z.string()
                .trim()
                .min(1),

        targetValue:
            z.number()
                .positive(),
    });

const rankingRuleSchema =
    z.object({
        type:
            z.literal(
                "RANKING",
            ),

        eventType:
            eventTypeSchema,

        participant:
            z.enum([
                "ACTOR",
                "TARGET",
            ]),

        aggregation:
            z.enum([
                "COUNT",
                "SUM",
                "LATEST",
            ]),

        payloadField:
            z.string()
                .trim()
                .min(1)
                .optional(),

        order:
            z.enum([
                "HIGHEST",
                "LOWEST",
            ]),

        allowTies:
            z.boolean(),

        resolveAt:
            resolutionSchema,
    })
        .superRefine(
            (
                rule,
                context,
            ) => {
                if (
                    rule.aggregation
                    === "COUNT"
                    && rule.payloadField
                    !== undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "payloadField",
                        ],

                        message:
                            "COUNT ranking rules must not define payloadField.",
                    });
                }

                if (
                    rule.aggregation
                    !== "COUNT"
                    && rule.payloadField
                    === undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "payloadField",
                        ],

                        message:
                            "SUM and LATEST ranking rules require payloadField.",
                    });
                }
            },
        );

const objectiveConditionSchema =
    z.discriminatedUnion(
        "type",
        [
            z.object({
                type:
                    z.literal(
                        "PLAYER_ALIVE",
                    ),

                player:
                    z.enum([
                        "OWNER",
                        "ROLE_TARGET",
                        "POWER_TARGET",
                    ]),

                expected:
                    z.boolean(),
            }),

            z.object({
                type:
                    z.literal(
                        "EXPEDITION_RESULT",
                    ),

                result:
                    z.enum([
                        "WON",
                        "LOST",
                    ]),
            }),
        ],
    );

const conditionRuleSchema =
    z.object({
        type:
            z.literal(
                "CONDITION",
            ),

        operator:
            z.enum([
                "ALL",
                "ANY",
            ]),

        conditions:
            z.array(
                objectiveConditionSchema,
            )
                .min(1),

        completeAt:
            z.enum([
                "IMMEDIATE",
                "RESOLUTION",
            ]),

        resolveAt:
            resolutionSchema,

        resolveActNumber:
            gameActSchema
                .optional(),
    })
        .superRefine(
            (
                rule,
                context,
            ) => {
                if (
                    rule.resolveAt
                    === "GAME_END"
                    && rule.resolveActNumber
                    !== undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "resolveActNumber",
                        ],

                        message:
                            "resolveActNumber can only be used with ACT_END.",
                    });
                }
            },
        );

const forbiddenEventRuleSchema =
    z.object({
        type:
            z.literal(
                "FORBIDDEN_EVENT",
            ),

        eventType:
            eventTypeSchema,

        actor:
            participantSelectorSchema,

        target:
            participantSelectorSchema,

        resolveAt:
            resolutionSchema,
    });

const objectiveRuleSchema =
    z.union([
        eventCountRuleSchema,
        valueSumRuleSchema,
        rankingRuleSchema,
        conditionRuleSchema,
        forbiddenEventRuleSchema,
    ]);

/*
 * Compatibilité temporaire avec le
 * contenu JSON déjà existant.
 *
 * Les anciens fichiers utilisent :
 *
 * "progressRule": {
 *   "type": "EVENT_COUNT",
 *   ...
 * }
 *
 * Ils seront normalisés en Objective.rule.
 */
const legacyProgressRuleSchema =
    eventCountRuleSchema;

const objectiveSchema =
    z.object({
        code:
            z.string()
                .trim()
                .min(1),

        name:
            z.string()
                .trim()
                .min(1),

        description:
            z.string()
                .trim()
                .min(1),

        category:
            z.string()
                .trim()
                .min(1),

        difficulty:
            objectiveDifficultySchema,

        minimumPlayers:
            z.number()
                .int()
                .min(2)
                .max(4),

        maximumPlayers:
            z.number()
                .int()
                .min(2)
                .max(4),

        allowedTypes:
            z.array(
                objectiveTypeSchema,
            )
                .min(1),

        requiredEvents:
            z.array(
                eventTypeSchema,
            ),

        verificationMode:
            verificationModeSchema,

        compatibilityTags:
            z.array(
                z.string()
                    .trim()
                    .min(1),
            ),

        score:
            z.number()
                .int()
                .nonnegative(),

        hiddenProgress:
            z.boolean(),

        /*
         * Nouvelle propriété.
         */
        rule:
            objectiveRuleSchema
                .optional(),

        /*
         * Ancienne propriété.
         * À supprimer lorsque tout le contenu
         * aura été migré.
         */
        progressRule:
            legacyProgressRuleSchema
                .optional(),

        supportedTrackingModes:
            z.array(
                z.enum([
                    "MANUAL",
                    "STS2",
                ]),
            )
                .min(1)
                .default([
                    "MANUAL",
                    "STS2",
                ]),
    })
        .superRefine(
            (
                objective,
                context,
            ) => {
                if (
                    objective.minimumPlayers
                    > objective.maximumPlayers
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        message:
                            "minimumPlayers cannot exceed maximumPlayers.",
                    });
                }

                if (
                    objective.rule
                    !== undefined
                    && objective.progressRule
                    !== undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "rule",
                        ],

                        message:
                            "Objective cannot define both rule and legacy progressRule.",
                    });
                }

                const rule =
                    objective.rule
                    ?? objective.progressRule;

                if (
                    rule !== undefined
                    && "eventType" in rule
                    && !objective
                        .requiredEvents
                        .includes(
                            rule.eventType,
                        )
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "requiredEvents",
                        ],

                        message:
                            `requiredEvents must contain ${rule.eventType}.`,
                    });
                }
            },
        );

export function parseObjectiveDefinition(
    input:
        unknown,
): Objective {
    const parsed =
        objectiveSchema.parse(
            input,
        );

    const rule =
        parsed.rule
        ?? parsed.progressRule;

    return {
        code:
            parsed.code,

        name:
            parsed.name,

        description:
            parsed.description,

        category:
            parsed.category,

        difficulty:
            parsed.difficulty,

        minimumPlayers:
            parsed.minimumPlayers,

        maximumPlayers:
            parsed.maximumPlayers,

        allowedTypes:
            parsed.allowedTypes,

        requiredEvents:
            parsed.requiredEvents,

        verificationMode:
            parsed.verificationMode,

        compatibilityTags:
            parsed.compatibilityTags,

        score:
            parsed.score,

        hiddenProgress:
            parsed.hiddenProgress,

        ...(
            rule === undefined
                ? {}
                : {
                    rule,
                }
        ),

        supportedTrackingModes:
            parsed.supportedTrackingModes,
    };
}