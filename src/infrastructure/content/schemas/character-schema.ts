import { z } from "zod";

import type {
  Character,
} from "../../../domain/characters/character.js";

const characterSchema =
  z
    .object({
      slug: z
        .string()
        .trim()
        .min(1),

      name: z
        .string()
        .trim()
        .min(1),
    })
    .strict();

export function parseCharacterDefinition(
  input: unknown,
): Character {
  return characterSchema.parse(
    input,
  );
}