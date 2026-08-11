import {
  loadEnvFile,
} from "node:process";

import {
  defineConfig,
} from "drizzle-kit";

loadEnvFile();

const databaseUrl =
  process.env.DATABASE_URL;

if (
  databaseUrl === undefined
  || databaseUrl.trim()
    .length === 0
) {
  throw new Error(
    "DATABASE_URL is required.",
  );
}

export default defineConfig({
  dialect:
    "postgresql",

  schema:
    "./src/infrastructure/database/schema.ts",

  out:
    "./drizzle",

  dbCredentials: {
    url:
      databaseUrl,
  },

  migrations: {
    schema:
      "drizzle",

    table:
      "__drizzle_migrations",
  },
});