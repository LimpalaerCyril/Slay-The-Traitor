import { z } from "zod";

import type {
  Objective,
} from "../../../domain/objectives/objective.js";

const eventTypeSchema = z.enum([
  "PLAYER_DIED",
  "PLAYER_HP_CHANGED",
  "CURSE_ADDED",
  "GOLD_CHANGED",
  "RELIC_ACQUIRED",
  "BOSS_DEFEATED",
  "ACT_COMPLETED",
  "PLAYER_MUTED",
  "VOTE_CAST",
  "POWER_USED",
]);

const verificationModeSchema = z.enum([
  "DISCORD",
  "SELF_REPORT",
  "GROUP_CONFIRMED",
  "MOD_ONLY",
]);

const objectiveDifficultySchema = z.enum([
  "EASY",
  "MEDIUM",
  "HARD",
]);

const objectiveTypeSchema = z.enum([
  "PRIMARY",
  "SECONDARY",
]);

const objectiveProgressRuleSchema =
  z.discriminatedUnion(
    "type",
    [
      z.object({
        type: z.literal("EVENT_COUNT"),

        eventType: eventTypeSchema,

        actor: z.enum([
          "OWNER",
          "ANY",
        ]),

        target: z.enum([
          "OWNER",
          "OTHER",
          "ANY",
        ]),

        increment: z
          .number()
          .int()
          .positive(),

        requiredCount: z
          .number()
          .int()
          .positive(),
      }),
    ],
  );

const objectiveSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),

    category: z.string().min(1),

    difficulty:
      objectiveDifficultySchema,

    minimumPlayers: z
      .number()
      .int()
      .min(2)
      .max(4),

    maximumPlayers: z
      .number()
      .int()
      .min(2)
      .max(4),

    allowedTypes: z
      .array(objectiveTypeSchema)
      .min(1),

    requiredEvents: z.array(
      eventTypeSchema,
    ),

    verificationMode:
      verificationModeSchema,

    compatibilityTags: z.array(
      z.string().min(1),
    ),

    score: z
      .number()
      .int()
      .nonnegative(),

    hiddenProgress: z.boolean(),

    progressRule:
      objectiveProgressRuleSchema.optional(),
  })
  .superRefine(
    (objective, context) => {
      if (
        objective.minimumPlayers
        > objective.maximumPlayers
      ) {
        context.addIssue({
          code: "custom",
          message:
            "minimumPlayers cannot exceed maximumPlayers.",
        });
      }
    },
  );

export function parseObjectiveDefinition(
  input: unknown,
): Objective {
  const parsed =
    objectiveSchema.parse(input);

  const objective: Objective = {
    code: parsed.code,
    name: parsed.name,
    description: parsed.description,

    category: parsed.category,
    difficulty: parsed.difficulty,

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

    score: parsed.score,

    hiddenProgress:
      parsed.hiddenProgress,

    ...(parsed.progressRule !== undefined
      ? {
        progressRule:
          parsed.progressRule,
      }
      : {}),
  };

  return objective;
}