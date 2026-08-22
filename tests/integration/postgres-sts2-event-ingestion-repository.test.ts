import {
    randomUUID,
} from "node:crypto";

import {
    and,
    eq,
    sql,
} from "drizzle-orm";

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import type {
    Database,
} from "../../src/infrastructure/database/database.js";

import {
    createDatabase,
} from "../../src/infrastructure/database/database.js";

import {
    PostgresSts2EventIngestionRepository,
} from "../../src/infrastructure/database/postgres-sts2-event-ingestion-repository.js";

import {
    gameEventsTable,
    gamePlayersTable,
    gamesTable,
    platformIdentityLinksTable,
    sts2BridgeConnectionsTable,
    sts2BridgeEventReceiptsTable,
    sts2BridgeSessionsTable,
} from "../../src/infrastructure/database/schema.js";

const testDatabaseUrl =
    process.env.TEST_DATABASE_URL;

const suite =
    testDatabaseUrl === undefined
        ? describe.skip
        : describe;

suite(
    "PostgresSts2EventIngestionRepository",
    () => {
        let db!:
            Database;

        let pool!:
            Awaited<
                ReturnType<
                    typeof createDatabase
                >
            >["pool"];

        beforeAll(
            async () => {
                if (
                    testDatabaseUrl
                    === undefined
                ) {
                    return;
                }

                const created =
                    createDatabase(
                        testDatabaseUrl,
                    );

                db =
                    created.db;

                pool =
                    created.pool;
            },
        );

        afterAll(
            async () => {
                if (
                    testDatabaseUrl
                    !== undefined
                ) {
                    await pool.end();
                }
            },
        );

        it(
            "rolls back GameEvent and receipt atomically when receipt INSERT fails",
            async () => {
                const gameId =
                    `test-game-${randomUUID()}`;

                const bridgeSessionId =
                    randomUUID();

                const clientInstanceId =
                    randomUUID();

                const discordUserId =
                    `discord-${randomUUID()}`;

                const platformPlayerId =
                    `7656${Math.floor(Math.random() * 1_000_000_000_000)}`;

                const lobbyId =
                    `${Date.now()}${Math.floor(Math.random() * 1000)}`;

                const sessionCode =
                    `STT-${randomUUID().slice(0, 6).toUpperCase()}`;

                const now =
                    new Date(
                        "2026-08-22T09:00:00.000Z",
                    );

                const identityRows =
                    await db
                        .insert(
                            platformIdentityLinksTable,
                        )
                        .values({
                            discordUserId,
                            platform: "STEAM",
                            platformPlayerId,
                            platformName: "Atomic Test",
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({
                            id:
                                platformIdentityLinksTable.id,
                        });

                const identity =
                    identityRows[0];

                if (
                    identity === undefined
                ) {
                    throw new Error(
                        "Unable to create test identity.",
                    );
                }

                await db
                    .insert(
                        gamesTable,
                    )
                    .values({
                        id: gameId,
                        guildId: `guild-${randomUUID()}`,
                        textChannelId: `channel-${randomUUID()}`,
                        hostDiscordUserId: discordUserId,
                        seed: randomUUID(),
                        trackingMode: "STS2",
                        state: "ACTIVE",
                        currentAct: 1,
                    });

                await db
                    .insert(
                        gamePlayersTable,
                    )
                    .values({
                        gameId,
                        playerId: "alice",
                        discordUserId,
                        characterSlug: "ironclad",
                        alive: true,
                        position: 0,
                    });

                await db
                    .insert(
                        sts2BridgeSessionsTable,
                    )
                    .values({
                        id: bridgeSessionId,
                        gameId,
                        sessionCode,
                        currentLobbyId: lobbyId,
                        hostPlatformPlayerId: platformPlayerId,
                        createdAt: now,
                        updatedAt: now,
                    });

                await db
                    .insert(
                        sts2BridgeConnectionsTable,
                    )
                    .values({
                        bridgeSessionId,
                        identityLinkId: identity.id,
                        clientInstanceId,
                        platformName: "Atomic Test",
                        bridgeVersion: "0.1.0",
                        gameVersion: "test",
                        lobbyId,
                        isHost: true,
                        hostPlatformPlayerId: platformPlayerId,
                        connectedAt: now,
                        lastSeenAt: now,
                    });

                const functionName =
                    "stt_test_fail_event_receipt";

                const triggerName =
                    "stt_test_fail_event_receipt_trigger";

                try {
                    await db.execute(
                        sql.raw(`
                            CREATE OR REPLACE FUNCTION ${functionName}()
                            RETURNS trigger
                            LANGUAGE plpgsql
                            AS $$
                            BEGIN
                                RAISE EXCEPTION 'forced receipt failure';
                            END;
                            $$;
                        `),
                    );

                    await db.execute(
                        sql.raw(`
                            CREATE TRIGGER ${triggerName}
                            BEFORE INSERT ON sts2_bridge_event_receipts
                            FOR EACH ROW
                            EXECUTE FUNCTION ${functionName}();
                        `),
                    );

                    const repository =
                        new PostgresSts2EventIngestionRepository(
                            db,
                        );

                    await expect(
                        repository.persistBatch({
                            bridgeSessionId,
                            identityLinkId: identity.id,
                            identityDiscordUserId: discordUserId,
                            authenticatedPlatformPlayerId: platformPlayerId,
                            clientInstanceId,
                            lobbyId,
                            expectedGameId: gameId,
                            expectedGamePlayerId: "alice",
                            expectedIsHost: true,
                            receivedAt: now,
                            events: [
                                {
                                    kind: "ACCEPT",
                                    fingerprint: "a".repeat(64),
                                    source: {
                                        sequence: 1,
                                        occurredAt: now,
                                        event: {
                                            type: "POTION_USED",
                                            actNumber: 1,
                                            actorPlatformPlayerId: platformPlayerId,
                                            payload: {
                                                potionId: "FIRE_POTION",
                                            },
                                        },
                                    },
                                    gameEvent: {
                                        type: "POTION_USED",
                                        actNumber: 1,
                                        actorPlayerId: "alice",
                                        payload: {
                                            potionId: "FIRE_POTION",
                                        },
                                        createdAt: now,
                                    },
                                },
                            ],
                        }),
                    ).rejects.toThrow(
                        /forced receipt failure/i,
                    );

                    const eventRows =
                        await db
                            .select()
                            .from(
                                gameEventsTable,
                            )
                            .where(
                                and(
                                    eq(
                                        gameEventsTable.gameId,
                                        gameId,
                                    ),

                                    eq(
                                        gameEventsTable.source,
                                        "MOD",
                                    ),
                                ),
                            );

                    const receiptRows =
                        await db
                            .select()
                            .from(
                                sts2BridgeEventReceiptsTable,
                            )
                            .where(
                                eq(
                                    sts2BridgeEventReceiptsTable
                                        .bridgeSessionId,
                                    bridgeSessionId,
                                ),
                            );

                    expect(eventRows).toHaveLength(0);
                    expect(receiptRows).toHaveLength(0);
                } finally {
                    await db.execute(
                        sql.raw(`
                            DROP TRIGGER IF EXISTS ${triggerName}
                            ON sts2_bridge_event_receipts;
                        `),
                    );

                    await db.execute(
                        sql.raw(`
                            DROP FUNCTION IF EXISTS ${functionName}();
                        `),
                    );

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

                    await db
                        .delete(
                            platformIdentityLinksTable,
                        )
                        .where(
                            eq(
                                platformIdentityLinksTable.id,
                                identity.id,
                            ),
                        );
                }
            },
        );
    },
);
