import { loadEnvFile } from "node:process";

import { join } from "node:path";

import { GameService } from "../application/game-service/game-service.js";

import { createDiscordClient } from "../discord/client.js";

import {
  loadCharacters,
  loadCompatibilityRules,
  loadContradictionBudget,
  loadObjectives,
  loadRoles,
  loadPowers,
} from "../infrastructure/content/content-loader.js";

import { loadConfig, loadDatabaseConfig } from "./config.js";

import { sql } from "drizzle-orm";

import { createDatabase } from "../infrastructure/database/database.js";

import { PostgresGameRepository } from "../infrastructure/database/postgres-game-repository.js";

import { GameEventService } from "../application/game-event-service/game-event-service.js";

import { PostgresGameEventRepository } from "../infrastructure/database/postgres-game-event-repository.js";

import { BridgeIdentityService } from "../application/bridge-identity/bridge-identity-service.js";

import { PostgresBridgeIdentityRepository } from "../infrastructure/database/postgres-bridge-identity-repository.js";

import { Sts2BridgeSessionService } from "../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { PostgresSts2BridgeSessionRepository } from "../infrastructure/database/postgres-sts2-bridge-session-repository.js";

import { PostgresSts2EventIngestionRepository } from "../infrastructure/database/postgres-sts2-event-ingestion-repository.js";

import { Sts2EventIngestionService } from "../application/sts2-event-ingestion/sts2-event-ingestion-service.js";

import { createApiServer } from "../api/create-api-server.js";

loadEnvFile();

const config = loadConfig();

const databaseConfig = loadDatabaseConfig();

const contentRoot = join(process.cwd(), "content");

console.log("Chargement du contenu...");

const [
  characters,
  roles,
  powers,
  objectives,
  compatibilityRules,
  contradictionBudget,
] = await Promise.all([
  loadCharacters(join(contentRoot, "characters")),

  loadRoles(join(contentRoot, "roles")),

  loadPowers(join(contentRoot, "powers")),

  loadObjectives(join(contentRoot, "objectives")),

  loadCompatibilityRules(
    join(contentRoot, "balancing", "compatibility-rules.json"),
  ),

  loadContradictionBudget(
    join(contentRoot, "balancing", "contradiction-budget.json"),
  ),
]);

console.log(
  [
    "Contenu chargé :",
    `${characters.length} personnages,`,
    `${roles.length} rôles,`,
    `${powers.length} pouvoirs,`,
    `${objectives.length} objectifs.`,
  ].join(" "),
);

console.log("Connexion à PostgreSQL...");

const { db, pool } = createDatabase(databaseConfig.DATABASE_URL);

await db.execute(
  sql`
    select 1
  `,
);

console.log("PostgreSQL connecté.");

const gameRepository = new PostgresGameRepository(db);

const bridgeIdentityRepository = new PostgresBridgeIdentityRepository(db);

const sts2BridgeSessionRepository = new PostgresSts2BridgeSessionRepository(db);

const gameService = new GameService(
  {
    characters,
    roles,
    powers,
    objectives,
    compatibilityRules,
    contradictionBudget,
  },

  gameRepository,
);

const bridgeIdentityService = new BridgeIdentityService(
  bridgeIdentityRepository,
);

const sts2BridgeSessionService = new Sts2BridgeSessionService(
  sts2BridgeSessionRepository,
  bridgeIdentityService,
  gameService,
);

const gameEventRepository = new PostgresGameEventRepository(db);

const gameEventService = new GameEventService(
  {
    objectives,
  },

  gameRepository,

  gameEventRepository,
);

const sts2EventIngestionRepository = new PostgresSts2EventIngestionRepository(
  db,
);

const sts2EventIngestionService = new Sts2EventIngestionService(
  bridgeIdentityService,

  sts2EventIngestionRepository,

  gameEventService,
);

const apiServer = await createApiServer({
  bridgeIdentityService,

  sts2BridgeSessionService,

  sts2EventIngestionService,
});

await apiServer.listen({
  host: config.API_HOST,

  port: config.API_PORT,
});

console.log(`API STT disponible sur ${config.API_HOST}:${config.API_PORT}.`);

const discordClient = createDiscordClient({
  gameService,

  /*
   * Conserve gameEventService ici
   * dans ta version actuelle.
   */
  gameEventService,

  bridgeIdentityService,

  sts2BridgeSessionService,
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`Arrêt demandé (${signal})...`);

  discordClient.destroy();

  await apiServer.close();

  await pool.end();

  console.log("Slay the Traitor arrêté proprement.");

  process.exitCode = 0;
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

console.log("Connexion à Discord...");

await discordClient.login(config.DISCORD_TOKEN);
