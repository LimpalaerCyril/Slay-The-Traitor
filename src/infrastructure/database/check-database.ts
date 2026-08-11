import {
  loadEnvFile,
} from "node:process";

import {
  sql,
} from "drizzle-orm";

import {
  loadDatabaseConfig,
} from "../../app/config.js";

import {
  createDatabase,
} from "./database.js";

loadEnvFile();

const config =
  loadDatabaseConfig();

const {
  db,
  pool,
} =
  createDatabase(
    config.DATABASE_URL,
  );

try {
  await db.execute(
    sql`
      select 1
    `,
  );

  console.log(
    "Connexion PostgreSQL réussie.",
  );
} finally {
  await pool.end();
}