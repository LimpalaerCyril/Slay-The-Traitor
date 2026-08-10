import { z } from "zod";

import type { Role } from "../../../domain/roles/role.js";

const alignmentSchema = z.enum([
  "LOYAL",
  "SELFISH",
  "DISRUPTIVE",
  "CHAOTIC",
]);

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
  })
  .superRefine((role, context) => {
    if (
      role.minimumPlayers
      > role.maximumPlayers
    ) {
      context.addIssue({
        code: "custom",
        message:
          "minimumPlayers cannot exceed maximumPlayers.",
      });
    }
  });

export function parseRoleDefinition(
  input: unknown,
): Role {
  return roleSchema.parse(input);
}