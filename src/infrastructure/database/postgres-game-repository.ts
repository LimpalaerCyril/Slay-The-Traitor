import {
    and,
    eq,
    notInArray,
} from "drizzle-orm";

import type {
    GameRepository,
    GameSession,
} from "../../application/game-repository/game-repository.js";

import {
    isGameAct,
    type GameAct,
} from "../../domain/games/game-act.js";

import {
    Game,
} from "../../domain/games/game.js";

import type {
    Database,
} from "./database.js";

import {
    gamePlayersTable,
    gamesTable,
    objectiveAssignmentsTable,
    roleAssignmentsTable,
    powerAssignmentsTable,
} from "./schema.js";

export class PostgresGameRepository
    implements GameRepository {
    public constructor(
        private readonly db:
            Database,
    ) { }

    public async save(
        session: GameSession,
    ): Promise<void> {
        const gameData =
            session.game
                .exportData();

        await this.db.transaction(
            async transaction => {
                const now =
                    new Date();

                await transaction
                    .insert(
                        gamesTable,
                    )
                    .values({
                        id:
                            session.id,

                        guildId:
                            session.guildId,

                        textChannelId:
                            session.textChannelId,

                        voiceChannelId:
                            session.voiceChannelId
                            ?? null,

                        lobbyMessageId:
                            session.lobbyMessageId
                            ?? null,

                        hostDiscordUserId:
                            session.hostDiscordUserId,

                        seed:
                            session.seed,

                        trackingMode:
                            session.trackingMode,

                        state:
                            gameData.state,

                        contradiction:
                            session.contradiction
                            ?? null,

                        updatedAt:
                            now,

                        currentAct:
                            gameData.currentAct
                            ?? null,
                    })
                    .onConflictDoUpdate({
                        target:
                            gamesTable.id,

                        set: {
                            guildId:
                                session.guildId,

                            textChannelId:
                                session.textChannelId,

                            voiceChannelId:
                                session.voiceChannelId
                                ?? null,

                            lobbyMessageId:
                                session.lobbyMessageId
                                ?? null,

                            hostDiscordUserId:
                                session.hostDiscordUserId,

                            seed:
                                session.seed,

                            trackingMode:
                                session.trackingMode,

                            state:
                                gameData.state,

                            contradiction:
                                session.contradiction
                                ?? null,

                            updatedAt:
                                now,

                            currentAct:
                                gameData.currentAct
                                ?? null,
                        },
                    });

                /*
                 * On sauvegarde l'agrégat complet.
                 *
                 * Comme une partie contient
                 * au maximum quatre joueurs,
                 * cette stratégie reste simple
                 * et très peu coûteuse.
                 */

                await transaction
                    .delete(
                        objectiveAssignmentsTable,
                    )
                    .where(
                        eq(
                            objectiveAssignmentsTable.gameId,
                            session.id,
                        ),
                    );

                await transaction
                    .delete(
                        powerAssignmentsTable,
                    )
                    .where(
                        eq(
                            powerAssignmentsTable.gameId,
                            session.id,
                        ),
                    );

                await transaction
                    .delete(
                        roleAssignmentsTable,
                    )
                    .where(
                        eq(
                            roleAssignmentsTable.gameId,
                            session.id,
                        ),
                    );

                await transaction
                    .delete(
                        gamePlayersTable,
                    )
                    .where(
                        eq(
                            gamePlayersTable.gameId,
                            session.id,
                        ),
                    );

                if (
                    gameData.players.length > 0
                ) {
                    await transaction
                        .insert(
                            gamePlayersTable,
                        )
                        .values(
                            gameData.players.map(
                                (
                                    player,
                                    position,
                                ) => ({
                                    gameId:
                                        session.id,

                                    playerId:
                                        player.id,

                                    discordUserId:
                                        player.discordUserId,

                                    characterSlug:
                                        player.characterSlug,

                                    alive:
                                        player.alive,

                                    position,
                                }),
                            ),
                        );
                }

                if (
                    gameData
                        .roleAssignments
                        .length > 0
                ) {
                    await transaction
                        .insert(
                            roleAssignmentsTable,
                        )
                        .values(
                            gameData
                                .roleAssignments
                                .map(
                                    assignment => ({
                                        gameId:
                                            session.id,

                                        playerId:
                                            assignment.playerId,

                                        roleCode:
                                            assignment.roleCode,

                                        variantCode:
                                            assignment.variantCode
                                            ?? null,

                                        targetPlayerIds:
                                            assignment.targetPlayerIds
                                                === undefined
                                                ? []
                                                : [
                                                    ...assignment
                                                        .targetPlayerIds,
                                                ],

                                        setupCompleted:
                                            assignment.setupCompleted
                                            ?? true,
                                    }),
                                ),
                        );
                }

                if (
                    gameData
                        .powerAssignments
                    !== undefined
                    && gameData
                        .powerAssignments
                        .length > 0
                ) {
                    await transaction
                        .insert(
                            powerAssignmentsTable,
                        )
                        .values(
                            gameData
                                .powerAssignments
                                .map(
                                    assignment => ({
                                        gameId:
                                            session.id,

                                        playerId:
                                            assignment
                                                .playerId,

                                        powerCode:
                                            assignment
                                                .powerCode,

                                        targetPlayerIds: [
                                            ...assignment
                                                .targetPlayerIds,
                                        ],

                                        setupCompleted:
                                            assignment
                                                .setupCompleted,

                                        uses:
                                            assignment
                                                .uses,
                                    }),
                                ),
                        );
                }

                if (
                    gameData
                        .objectiveAssignments
                        .length > 0
                ) {
                    await transaction
                        .insert(
                            objectiveAssignmentsTable,
                        )
                        .values(
                            gameData
                                .objectiveAssignments
                                .map(
                                    assignment => ({
                                        gameId:
                                            session.id,

                                        playerId:
                                            assignment.playerId,

                                        objectiveType:
                                            assignment.objectiveType,

                                        objectiveCode:
                                            assignment.objectiveCode,

                                        progressCurrent:
                                            assignment
                                                .progress
                                                .current,

                                        progressTarget:
                                            assignment
                                                .progress
                                                .target,

                                        status:
                                            assignment.status,

                                        actNumber:
                                            assignment.actNumber
                                            ?? null,
                                    }),
                                ),
                        );
                }
            },
        );
    }

    public async findById(
        gameId: string,
    ): Promise<
        GameSession | undefined
    > {
        const rows =
            await this.db
                .select()
                .from(
                    gamesTable,
                )
                .where(
                    eq(
                        gamesTable.id,
                        gameId,
                    ),
                )
                .limit(1);

        const row =
            rows[0];

        if (
            row === undefined
        ) {
            return undefined;
        }

        return this.loadSession(
            row,
        );
    }

    public async findOpenByChannel(
        guildId: string,
        textChannelId: string,
    ): Promise<
        GameSession | undefined
    > {
        const rows =
            await this.db
                .select()
                .from(
                    gamesTable,
                )
                .where(
                    and(
                        eq(
                            gamesTable.guildId,
                            guildId,
                        ),

                        eq(
                            gamesTable.textChannelId,
                            textChannelId,
                        ),

                        notInArray(
                            gamesTable.state,
                            [
                                "FINISHED",
                                "CANCELLED",
                            ],
                        ),
                    ),
                )
                .limit(1);

        const row =
            rows[0];

        if (
            row === undefined
        ) {
            return undefined;
        }

        return this.loadSession(
            row,
        );
    }

    private async loadSession(
        gameRow:
            typeof gamesTable.$inferSelect,
    ): Promise<GameSession> {
        const [
            playerRows,
            roleRows,
            powerRows,
            objectiveRows,
        ] =
            await Promise.all([
                this.db
                    .select()
                    .from(
                        gamePlayersTable,
                    )
                    .where(
                        eq(
                            gamePlayersTable.gameId,
                            gameRow.id,
                        ),
                    )
                    .orderBy(
                        gamePlayersTable.position,
                    ),

                this.db
                    .select()
                    .from(
                        roleAssignmentsTable,
                    )
                    .where(
                        eq(
                            roleAssignmentsTable.gameId,
                            gameRow.id,
                        ),
                    ),

                this.db
                    .select()
                    .from(
                        powerAssignmentsTable,
                    )
                    .where(
                        eq(
                            powerAssignmentsTable.gameId,
                            gameRow.id,
                        ),
                    ),

                this.db
                    .select()
                    .from(
                        objectiveAssignmentsTable,
                    )
                    .where(
                        eq(
                            objectiveAssignmentsTable.gameId,
                            gameRow.id,
                        ),
                    ),
            ]);

        /*
        * Pendant SETUP, les rôles sont déjà
        * affectés mais les objectifs ne le sont
        * pas encore.
        *
        * La présence d'objectifs indique donc
        * que la préparation secrète complète
        * a été effectuée.
        *
        * Game.restore() vérifiera ensuite que
        * l'ensemble rôle + objectifs est cohérent.
        */
        const secretAssignmentsPrepared =
            objectiveRows.length > 0;

        const currentAct =
            parseGameAct(
                gameRow.currentAct,
            );

        const game =
            Game.restore({
                state:
                    gameRow.state,

                players:
                    playerRows.map(
                        row => ({
                            id:
                                row.playerId,

                            discordUserId:
                                row.discordUserId,

                            characterSlug:
                                row.characterSlug,

                            alive:
                                row.alive,
                        }),
                    ),

                roleAssignments:
                    roleRows.map(
                        row => ({
                            playerId:
                                row.playerId,

                            roleCode:
                                row.roleCode,

                            ...(
                                row.variantCode
                                    === null
                                    ? {}
                                    : {
                                        variantCode:
                                            row.variantCode,
                                    }
                            ),

                            targetPlayerIds: [
                                ...row.targetPlayerIds,
                            ],

                            setupCompleted:
                                row.setupCompleted,
                        }),
                    ),

                powerAssignments:
                    powerRows.map(
                        row => ({
                            playerId:
                                row.playerId,

                            powerCode:
                                row.powerCode,

                            targetPlayerIds: [
                                ...row.targetPlayerIds,
                            ],

                            setupCompleted:
                                row.setupCompleted,

                            uses:
                                row.uses,
                        }),
                    ),

                objectiveAssignments:
                    objectiveRows.map(
                        row => {
                            const actNumber =
                                parseGameAct(
                                    row.actNumber,
                                );

                            return {
                                playerId:
                                    row.playerId,

                                objectiveCode:
                                    row.objectiveCode,

                                objectiveType:
                                    row.objectiveType,

                                ...(
                                    actNumber === undefined
                                        ? {}
                                        : {
                                            actNumber,
                                        }
                                ),

                                progress: {
                                    current:
                                        row.progressCurrent,

                                    target:
                                        row.progressTarget,
                                },

                                status:
                                    row.status,
                            };
                        },
                    ),

                secretAssignmentsPrepared,

                ...(
                    currentAct === undefined
                        ? {}
                        : {
                            currentAct,
                        }
                ),
            });

        return {
            id:
                gameRow.id,

            guildId:
                gameRow.guildId,

            textChannelId:
                gameRow.textChannelId,

            voiceChannelId:
                gameRow.voiceChannelId
                ?? undefined,

            lobbyMessageId:
                gameRow.lobbyMessageId
                ?? undefined,

            hostDiscordUserId:
                gameRow.hostDiscordUserId,

            seed:
                gameRow.seed,

            trackingMode:
                gameRow.trackingMode,

            contradiction:
                gameRow.contradiction
                ?? undefined,

            game,
        };
    }
}

function parseGameAct(
    value:
        number | null,
): GameAct | undefined {
    if (
        value === null
    ) {
        return undefined;
    }

    if (
        !isGameAct(
            value,
        )
    ) {
        throw new Error(
            `Invalid game act stored in database: ${value}`,
        );
    }

    return value;
}