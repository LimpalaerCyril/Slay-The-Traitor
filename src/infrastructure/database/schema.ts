import {
    sql,
} from "drizzle-orm";

import {
    boolean,
    check,
    foreignKey,
    integer,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    unique,
    uniqueIndex,
} from "drizzle-orm/pg-core";

export const gameStateEnum =
    pgEnum(
        "game_state",
        [
            "LOBBY",
            "READY",
            "ACTIVE",
            "VOTING",
            "FINISHED",
            "CANCELLED",
        ],
    );

export const objectiveTypeEnum =
    pgEnum(
        "objective_type",
        [
            "PRIMARY",
            "SECONDARY",
        ],
    );

export const objectiveStatusEnum =
    pgEnum(
        "objective_status",
        [
            "PENDING",
            "IN_PROGRESS",
            "COMPLETED",
            "FAILED",
        ],
    );

export const gamesTable =
    pgTable(
        "games",
        {
            id:
                text("id")
                    .primaryKey(),

            guildId:
                text("guild_id")
                    .notNull(),

            textChannelId:
                text("text_channel_id")
                    .notNull(),

            voiceChannelId:
                text("voice_channel_id"),

            lobbyMessageId:
                text("lobby_message_id"),

            hostDiscordUserId:
                text("host_discord_user_id")
                    .notNull(),

            seed:
                text("seed")
                    .notNull(),

            state:
                gameStateEnum("state")
                    .notNull()
                    .default("LOBBY"),

            contradiction:
                integer("contradiction"),

            createdAt:
                timestamp(
                    "created_at",
                    {
                        withTimezone: true,
                    },
                )
                    .notNull()
                    .defaultNow(),

            updatedAt:
                timestamp(
                    "updated_at",
                    {
                        withTimezone: true,
                    },
                )
                    .notNull()
                    .defaultNow(),
        },

        table => [
            uniqueIndex(
                "games_open_channel_unique",
            )
                .on(
                    table.guildId,
                    table.textChannelId,
                )
                .where(
                    sql`
            ${table.state}
            NOT IN (
              'FINISHED',
              'CANCELLED'
            )
          `,
                ),
        ],
    );

export const gamePlayersTable =
    pgTable(
        "game_players",
        {
            gameId:
                text("game_id")
                    .notNull()
                    .references(
                        () =>
                            gamesTable.id,
                        {
                            onDelete:
                                "cascade",
                        },
                    ),

            playerId:
                text("player_id")
                    .notNull(),

            discordUserId:
                text("discord_user_id")
                    .notNull(),

            characterSlug:
                text("character_slug")
                    .notNull(),

            alive:
                boolean("alive")
                    .notNull()
                    .default(true),

            position:
                integer("position")
                    .notNull(),
        },

        table => [
            primaryKey({
                name:
                    "game_players_pk",

                columns: [
                    table.gameId,
                    table.playerId,
                ],
            }),

            unique(
                "game_players_discord_user_unique",
            ).on(
                table.gameId,
                table.discordUserId,
            ),

            unique(
                "game_players_position_unique",
            ).on(
                table.gameId,
                table.position,
            ),

            check(
                "game_players_position_non_negative",

                sql`
                    ${table.position} >= 0
                `,
            ),
        ],
    );

export const roleAssignmentsTable =
    pgTable(
        "role_assignments",
        {
            gameId:
                text("game_id")
                    .notNull()
                    .references(
                        () =>
                            gamesTable.id,
                        {
                            onDelete:
                                "cascade",
                        },
                    ),

            playerId:
                text("player_id")
                    .notNull(),

            roleCode:
                text("role_code")
                    .notNull(),
        },

        table => [
            primaryKey({
                name:
                    "role_assignments_pk",

                columns: [
                    table.gameId,
                    table.playerId,
                ],
            }),

            unique(
                "role_assignments_role_unique",
            ).on(
                table.gameId,
                table.roleCode,
            ),

            foreignKey({
                name:
                    "role_assignments_player_fk",

                columns: [
                    table.gameId,
                    table.playerId,
                ],

                foreignColumns: [
                    gamePlayersTable.gameId,
                    gamePlayersTable.playerId,
                ],
            }),
        ],
    );

export const objectiveAssignmentsTable =
    pgTable(
        "objective_assignments",
        {
            gameId:
                text("game_id")
                    .notNull()
                    .references(
                        () =>
                            gamesTable.id,
                        {
                            onDelete:
                                "cascade",
                        },
                    ),

            playerId:
                text("player_id")
                    .notNull(),

            objectiveType:
                objectiveTypeEnum(
                    "objective_type",
                )
                    .notNull(),

            objectiveCode:
                text("objective_code")
                    .notNull(),

            progressCurrent:
                integer(
                    "progress_current",
                )
                    .notNull()
                    .default(0),

            progressTarget:
                integer(
                    "progress_target",
                )
                    .notNull(),

            status:
                objectiveStatusEnum(
                    "status",
                )
                    .notNull()
                    .default("PENDING"),
        },

        table => [
            primaryKey({
                name:
                    "objective_assignments_pk",

                columns: [
                    table.gameId,
                    table.playerId,
                    table.objectiveType,
                ],
            }),

            foreignKey({
                name:
                    "objective_assignments_player_fk",

                columns: [
                    table.gameId,
                    table.playerId,
                ],

                foreignColumns: [
                    gamePlayersTable.gameId,
                    gamePlayersTable.playerId,
                ],
            }),

            check(
                "objective_progress_current_non_negative",

                sql`
          ${table.progressCurrent} >= 0
        `,
            ),

            check(
                "objective_progress_target_positive",

                sql`
          ${table.progressTarget} > 0
        `,
            ),
        ],
    );