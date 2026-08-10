import { z } from "zod";

import type {
    ObjectiveCompatibilityRule,
} from "../../../domain/objectives/objective-compatibility-rule.js";

const compatibilityRuleSchema =
    z.object({
        leftTag: z
            .string()
            .trim()
            .min(1),

        rightTag: z
            .string()
            .trim()
            .min(1),

        samePlayer: z.enum([
            "ALLOWED",
            "FORBIDDEN",
        ]),

        partyContradictionCost: z
            .number()
            .int()
            .nonnegative(),
    });

const compatibilityRulesSchema =
    z
        .array(
            compatibilityRuleSchema,
        )
        .superRefine(
            (rules, context) => {
                const seenPairs =
                    new Set<string>();

                rules.forEach(
                    (rule, index) => {
                        const pairKey = [
                            rule.leftTag,
                            rule.rightTag,
                        ]
                            .sort()
                            .join("::");

                        if (
                            seenPairs.has(pairKey)
                        ) {
                            context.addIssue({
                                code: "custom",

                                message:
                                    `Duplicate compatibility rule for ${pairKey}.`,

                                path: [
                                    index,
                                ],
                            });

                            return;
                        }

                        seenPairs.add(pairKey);
                    },
                );
            },
        );

export function parseCompatibilityRules(
    input: unknown,
): readonly ObjectiveCompatibilityRule[] {
    return compatibilityRulesSchema.parse(
        input,
    );
}