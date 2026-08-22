import {
    strict as assert,
} from "node:assert";

import {
    loadEnvFile,
} from "node:process";

import {
    eq,
} from "drizzle-orm";

import {
    Game,
} from "../../domain/games/game.js";

import {
    loadDatabaseConfig,
} from "../../app/config.js";

import {
    createDatabase,
} from "./database.js";

import {
    gamesTable,
} from "./schema.js";

import {
    PostgresGameRepository,
} from "./postgres-game-repository.js";

import {
    PostgresGameEventRepository,
} from "./postgres-game-event-repository.js";

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

const repository =
    new PostgresGameRepository(
        db,
    );

const eventRepository =
    new PostgresGameEventRepository(
        db,
    );

const gameId =
    `repository-check-${Date.now()}`;

try {
    const game =
        new Game();

    game.addPlayer({
        id:
            "alice",

        discordUserId:
            "discord-alice",

        characterSlug:
            "test-character",

        alive:
            true,
    });

    game.addPlayer({
        id:
            "bob",

        discordUserId:
            "discord-bob",

        characterSlug:
            "test-character",

        alive:
            true,
    });

    game.lockRoster();

    game.setSecretAssignments(
        [
            {
                playerId:
                    "alice",

                roleCode:
                    "role-a",

                targetPlayerIds: [],

                setupCompleted:
                    true,
            },

            {
                playerId:
                    "bob",

                roleCode:
                    "role-b",

                targetPlayerIds: [],

                setupCompleted:
                    true,
            },
        ],

        [
            {
                playerId:
                    "alice",

                objectiveCode:
                    "primary-a",

                objectiveType:
                    "PRIMARY",

                progress: {
                    current: 0,
                    target: 1,
                },

                status:
                    "PENDING",
            },

            {
                playerId:
                    "alice",

                objectiveCode:
                    "secondary-a",

                objectiveType:
                    "SECONDARY",

                progress: {
                    current: 1,
                    target: 2,
                },

                status:
                    "IN_PROGRESS",
            },

            {
                playerId:
                    "bob",

                objectiveCode:
                    "primary-b",

                objectiveType:
                    "PRIMARY",

                progress: {
                    current: 1,
                    target: 1,
                },

                status:
                    "COMPLETED",
            },

            {
                playerId:
                    "bob",

                objectiveCode:
                    "secondary-b",

                objectiveType:
                    "SECONDARY",

                progress: {
                    current: 0,
                    target: 2,
                },

                status:
                    "PENDING",
            },
        ],

        [
            {
                playerId:
                    "alice",

                powerCode:
                    "test-power",

                targetPlayerIds: [
                    "bob",
                ],

                setupCompleted:
                    true,

                uses:
                    1,
            },
        ],
    );

    game.start();

    await repository.save({
        id:
            gameId,

        guildId:
            "repository-check-guild",

        textChannelId:
            "repository-check-channel",

        voiceChannelId:
            undefined,

        lobbyMessageId:
            "repository-check-message",

        hostDiscordUserId:
            "discord-alice",

        seed:
            "repository-check-seed",

        trackingMode:
            "MANUAL",

        contradiction:
            1,

        game,
    });

    const restored =
        await repository.findById(
            gameId,
        );

    assert.ok(
        restored,
    );

    await eventRepository.append({
        id:
            `${gameId}-event-1`,

        gameId,

        type:
            "POWER_USED",

        actNumber:
            1,

        actorPlayerId:
            "alice",

        targetPlayerId:
            "bob",

        payload: {
            powerCode:
                "test-power",
        },

        source:
            "MANUAL",

        validationStatus:
            "VERIFIED",

        createdAt:
            new Date(),
    });

    /*
     * On resauvegarde volontairement
     * l'agrégat après création de l'événement.
     *
     * Cela provoque le delete/reinsert des
     * game_players dans le repository actuel.
     */
    await repository.save(
        restored,
    );

    const restoredEvents =
        await eventRepository
            .findByGameId(
                gameId,
            );

    assert.equal(
        restoredEvents.length,
        1,
    );

    assert.equal(
        restoredEvents[0]?.type,
        "POWER_USED",
    );

    assert.equal(
        restoredEvents[0]?.actorPlayerId,
        "alice",
    );

    assert.equal(
        restoredEvents[0]?.validationStatus,
        "VERIFIED",
    );

    assert.equal(
        restored.game.state,
        "ACTIVE",
    );

    assert.equal(
        restored.game
            .getPlayers()
            .length,
        2,
    );

    assert.equal(
        restored.lobbyMessageId,
        "repository-check-message",
    );

    assert.equal(
        restored.trackingMode,
        "MANUAL",
    );

    assert.equal(
        restored.contradiction,
        1,
    );

    assert.deepEqual(
        restored.game.exportData(),
        game.exportData(),
    );

    const byChannel =
        await repository
            .findOpenByChannel(
                "repository-check-guild",
                "repository-check-channel",
            );

    assert.equal(
        byChannel?.id,
        gameId,
    );

    console.log(
        "GameRepository PostgreSQL : OK",
    );
} finally {
    await db
        .delete(
            gamesTable,
        )
        .where(
            eq(
                gamesTable.id,
                gameId,
            ),
        );

    await pool.end();
}