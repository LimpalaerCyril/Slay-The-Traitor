import { z } from "zod";

import type {
  ContradictionBudget,
} from "../../../domain/objectives/contradiction-budget.js";

const contradictionRangeSchema =
  z
    .object({
      minimum: z
        .number()
        .int()
        .nonnegative(),

      maximum: z
        .number()
        .int()
        .nonnegative(),
    })
    .superRefine(
      (range, context) => {
        if (
          range.minimum
          > range.maximum
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Contradiction minimum cannot exceed maximum.",
          });
        }
      },
    );

const contradictionBudgetSchema =
  z
    .object({
      "2":
        contradictionRangeSchema,

      "3":
        contradictionRangeSchema,

      "4":
        contradictionRangeSchema,
    })
    .strict();

export function parseContradictionBudget(
  input: unknown,
): ContradictionBudget {
  return contradictionBudgetSchema.parse(
    input,
  );
}