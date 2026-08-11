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

                        state:
                            gameData.state,

                        contradiction:
                            session.contradiction
                            ?? null,

                        updatedAt:
                            now,
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

                            state:
                                gameData.state,

                            contradiction:
                                session.contradiction
                                ?? null,

                            updatedAt:
                                now,
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
         * Dès qu'il existe une affectation
         * secrète, Game.restore() vérifie que
         * l'ensemble est complet.
         *
         * Une corruption partielle de la DB
         * provoquera donc volontairement une
         * erreur de réhydratation.
         */
        const secretAssignmentsPrepared =
            roleRows.length > 0
            || objectiveRows.length > 0;

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
                        }),
                    ),

                objectiveAssignments:
                    objectiveRows.map(
                        row => ({
                            playerId:
                                row.playerId,

                            objectiveCode:
                                row.objectiveCode,

                            objectiveType:
                                row.objectiveType,

                            progress: {
                                current:
                                    row.progressCurrent,

                                target:
                                    row.progressTarget,
                            },

                            status:
                                row.status,
                        }),
                    ),

                secretAssignmentsPrepared,
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

            contradiction:
                gameRow.contradiction
                ?? undefined,

            game,
        };
    }
}