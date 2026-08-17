import {
    z,
} from "zod";

import type {
    Power,
} from "../../../domain/powers/power.js";

const trackingModeSchema =
    z.enum([
        "MANUAL",
        "STS2",
    ]);

const targetSelectionSchema =
    z.object({
        count:
            z.number()
                .int()
                .min(1)
                .max(4),

        allowSelf:
            z.boolean(),
    })
        .strict();

const setupSchema =
    z.object({
        targetSelection:
            targetSelectionSchema,
    })
        .strict();

const usageLimitSchema =
    z.object({
        scope:
            z.enum([
                "GAME",
                "ACT",
            ]),

        maxUses:
            z.number()
                .int()
                .positive(),
    })
        .strict();

const activationSchema =
    z.object({
        timing:
            z.enum([
                "ANYTIME",
                "COMBAT_START",
                "COMBAT_ACTIVE",
                "CAMPFIRE",
            ]),

        targetSelection:
            targetSelectionSchema
                .optional(),
    })
        .strict();

const restartCombatEffectSchema =
    z.object({
        type:
            z.literal(
                "RESTART_COMBAT",
            ),
    })
        .strict();

const blockCampfireOptionEffectSchema =
    z.object({
        type:
            z.literal(
                "BLOCK_CAMPFIRE_OPTION",
            ),

        option:
            z.literal(
                "REST",
            ),

        target:
            z.literal(
                "SELECTED_PLAYER",
            ),
    })
        .strict();

const grantEnergyEffectSchema =
    z.object({
        type:
            z.literal(
                "GRANT_ENERGY",
            ),

        amount:
            z.number()
                .int()
                .positive(),

        target:
            z.literal(
                "OWNER",
            ),

        duration:
            z.literal(
                "FIRST_TURN",
            ),
    })
        .strict();

const effectSchema =
    z.discriminatedUnion(
        "type",
        [
            restartCombatEffectSchema,
            blockCampfireOptionEffectSchema,
            grantEnergyEffectSchema,
        ],
    );

const powerSchema =
    z.object({
        code:
            z.string()
                .min(1),

        name:
            z.string()
                .min(1),

        description:
            z.string()
                .min(1),

        mode:
            z.enum([
                "ACTIVE",
                "PASSIVE",
            ]),

        supportedTrackingModes:
            z.array(
                trackingModeSchema,
            )
                .min(1)
                .default([
                    "MANUAL",
                    "STS2",
                ]),

        usageLimit:
            usageLimitSchema
                .optional(),

        setup:
            setupSchema
                .optional(),

        activation:
            activationSchema
                .optional(),

        effect:
            effectSchema
                .optional(),
    })
        .strict()
        .superRefine(
            (
                power,
                context,
            ) => {
                if (
                    power.mode
                    !== "ACTIVE"
                ) {
                    return;
                }

                if (
                    power.usageLimit
                    === undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "usageLimit",
                        ],

                        message:
                            "An ACTIVE power must define a usageLimit.",
                    });
                }

                if (
                    power.activation
                    === undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "activation",
                        ],

                        message:
                            "An ACTIVE power must define its activation.",
                    });
                }

                if (
                    power.effect
                    === undefined
                ) {
                    context.addIssue({
                        code:
                            "custom",

                        path: [
                            "effect",
                        ],

                        message:
                            "An ACTIVE power must define an effect.",
                    });
                }
            },
        );

export function parsePowerDefinition(
    input:
        unknown,
): Power {
    return powerSchema.parse(
        input,
    );
}