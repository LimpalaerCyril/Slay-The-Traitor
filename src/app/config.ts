import { z } from "zod";

const discordConfigSchema = z.object({
  DISCORD_TOKEN: z.string().trim().min(1),

  DISCORD_CLIENT_ID: z.string().regex(/^\d+$/),

  DISCORD_GUILD_ID: z.string().regex(/^\d+$/),

  API_HOST: z.string().trim().min(1).default("127.0.0.1"),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
});

export type AppConfig = z.infer<typeof discordConfigSchema>;

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export function loadConfig(): AppConfig {
  return discordConfigSchema.parse(process.env);
}

export function loadDatabaseConfig(): DatabaseConfig {
  return databaseConfigSchema.parse(process.env);
}
