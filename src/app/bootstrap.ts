import {
  loadEnvFile,
} from "node:process";

import {
  join,
} from "node:path";

import {
  GameService,
} from "../application/game-service/game-service.js";

import {
  createDiscordClient,
} from "../discord/client.js";

import {
  loadCharacters,
  loadCompatibilityRules,
  loadContradictionBudget,
  loadObjectives,
  loadRoles,
} from "../infrastructure/content/content-loader.js";

import {
  loadConfig,
} from "./config.js";

loadEnvFile();

const config =
  loadConfig();

const contentRoot =
  join(
    process.cwd(),
    "content",
  );

console.log(
  "Chargement du contenu...",
);

const [
  characters,
  roles,
  objectives,
  compatibilityRules,
  contradictionBudget,
] =
  await Promise.all([
    loadCharacters(
      join(
        contentRoot,
        "characters",
      ),
    ),

    loadRoles(
      join(
        contentRoot,
        "roles",
      ),
    ),

    loadObjectives(
      join(
        contentRoot,
        "objectives",
      ),
    ),

    loadCompatibilityRules(
      join(
        contentRoot,
        "balancing",
        "compatibility-rules.json",
      ),
    ),

    loadContradictionBudget(
      join(
        contentRoot,
        "balancing",
        "contradiction-budget.json",
      ),
    ),
  ]);

console.log(
  [
    "Contenu chargé :",
    `${characters.length} personnages,`,
    `${roles.length} rôles,`,
    `${objectives.length} objectifs.`,
  ].join(" "),
);

const gameService =
  new GameService({
    characters,
    roles,
    objectives,
    compatibilityRules,
    contradictionBudget,
  });

const discordClient =
  createDiscordClient({
    gameService,
  });

console.log(
  "Connexion à Discord...",
);

await discordClient.login(
  config.DISCORD_TOKEN,
);