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
    loadPowers,
} from "../infrastructure/content/content-loader.js";

import {
    loadConfig,
    loadDatabaseConfig,
} from "./config.js";

import {
    sql,
} from "drizzle-orm";

import {
    createDatabase,
} from "../infrastructure/database/database.js";

import {
    PostgresGameRepository,
} from "../infrastructure/database/postgres-game-repository.js";

import {
    GameEventService,
} from "../application/game-event-service/game-event-service.js";

import {
    PostgresGameEventRepository,
} from "../infrastructure/database/postgres-game-event-repository.js";

loadEnvFile();

const config =
    loadConfig();

const databaseConfig =
    loadDatabaseConfig();

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
    powers,
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

        loadPowers(
            join(
                contentRoot,
                "powers",
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
        `${powers.length} pouvoirs,`,
        `${objectives.length} objectifs.`,
    ].join(" "),
);

console.log(
    "Connexion à PostgreSQL...",
);

const {
    db,
    pool,
} =
    createDatabase(
        databaseConfig.DATABASE_URL,
    );

await db.execute(
    sql`
    select 1
  `,
);

console.log(
    "PostgreSQL connecté.",
);

const gameRepository =
    new PostgresGameRepository(
        db,
    );

const gameEventRepository =
    new PostgresGameEventRepository(
        db,
    );

const gameService =
    new GameService(
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

const gameEventService =
    new GameEventService(
        {
            objectives,
        },

        gameRepository,

        gameEventRepository,
    );

const discordClient =
    createDiscordClient({
        gameService,
        gameEventService,
    });

let shuttingDown =
    false;

async function shutdown(
    signal: string,
): Promise<void> {
    if (
        shuttingDown
    ) {
        return;
    }

    shuttingDown =
        true;

    console.log(
        `Arrêt demandé (${signal})...`,
    );

    discordClient.destroy();

    await pool.end();

    console.log(
        "Slay the Traitor arrêté proprement.",
    );

    process.exitCode =
        0;
}

process.once(
    "SIGINT",
    () => {
        void shutdown(
            "SIGINT",
        );
    },
);

process.once(
    "SIGTERM",
    () => {
        void shutdown(
            "SIGTERM",
        );
    },
);

console.log(
    "Connexion à Discord...",
);

await discordClient.login(
    config.DISCORD_TOKEN,
);