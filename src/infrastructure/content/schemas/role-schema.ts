import { z } from "zod";

import type { Role } from "../../../domain/roles/role.js";

const alignmentSchema = z.enum([
  "LOYAL",
  "SELFISH",
  "DISRUPTIVE",
  "CHAOTIC",
]);

const roleTargetSelectionSchema =
  z.object({
    count:
      z
        .number()
        .int()
        .min(1)
        .max(3),

    allowSelf:
      z.boolean(),
  });

const roleVariantSchema =
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

    primaryObjectiveCode:
      z
        .string()
        .trim()
        .min(1),

    targetSelection:
      roleTargetSelectionSchema
        .optional(),
  });

const roleSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),

    alignment: alignmentSchema,

    tags: z.array(
      z.string().min(1),
    ),

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

    primaryObjectiveCode:
      z
        .string()
        .trim()
        .min(1)
        .optional(),

    variants:
      z
        .array(
          roleVariantSchema,
        )
        .min(2)
        .optional(),

    powerCode:
      z
        .string()
        .trim()
        .min(1)
        .optional(),

    supportedTrackingModes:
      z
        .array(
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
      role,
      context,
    ) => {
      const hasPrimary =
        role.primaryObjectiveCode
        !== undefined;

      const hasVariants =
        role.variants
        !== undefined;

      if (
        hasPrimary
        === hasVariants
      ) {
        context.addIssue({
          code:
            "custom",

          message:
            "A role must define either primaryObjectiveCode or variants, but not both.",
        });
      }

      if (
        role.variants
        !== undefined
      ) {
        const codes =
          new Set<string>();

        for (
          const variant
          of role.variants
        ) {
          if (
            codes.has(
              variant.code,
            )
          ) {
            context.addIssue({
              code:
                "custom",

              message:
                `Duplicate role variant code: ${variant.code}`,
            });
          }

          codes.add(
            variant.code,
          );
        }
      }
    },
  );

export function parseRoleDefinition(
  input: unknown,
): Role {
  return roleSchema.parse(input);
}