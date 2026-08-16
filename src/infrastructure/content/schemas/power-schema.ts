import {
    z,
} from "zod";

import type {
    Power,
} from "../../../domain/powers/power.js";

const powerModeSchema =
    z.enum([
        "ACTIVE",
        "PASSIVE",
    ]);

const trackingModeSchema =
    z.enum([
        "MANUAL",
        "STS2",
    ]);

const powerTargetSelectionSchema =
    z.object({
        count:
            z
                .number()
                .int()
                .min(1)
                .max(4),

        allowSelf:
            z.boolean(),
    });

const powerSetupSchema =
    z.object({
        targetSelection:
            powerTargetSelectionSchema,
    });

const powerSchema =
    z.object({
        code:
            z
                .string()
                .trim()
                .min(1),

        name:
            z
                .string()
                .trim()
                .min(1),

        description:
            z
                .string()
                .trim()
                .min(1),

        mode:
            powerModeSchema,

        supportedTrackingModes:
            z
                .array(
                    trackingModeSchema,
                )
                .min(1),

        maxUses:
            z
                .number()
                .int()
                .positive()
                .optional(),

        setup:
            powerSetupSchema
                .optional(),
    });

export function parsePowerDefinition(
    input: unknown,
): Power {
    return powerSchema.parse(
        input,
    );
}