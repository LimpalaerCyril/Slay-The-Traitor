import { z } from "zod";

const configSchema = z.object({
  DISCORD_TOKEN: z
    .string()
    .trim()
    .min(1),

  DISCORD_CLIENT_ID: z
    .string()
    .regex(/^\d+$/),

  DISCORD_GUILD_ID: z
    .string()
    .regex(/^\d+$/),
});

export type AppConfig =
  z.infer<typeof configSchema>;

export function loadConfig():
AppConfig {
  return configSchema.parse(
    process.env,
  );
}