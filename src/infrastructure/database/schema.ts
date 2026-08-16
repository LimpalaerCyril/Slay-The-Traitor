import {
    sql,
} from "drizzle-orm";

import {
    boolean,
    check,
    foreignKey,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    unique,
    uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
    EventPayload,
} from "../../domain/events/game-events.js";

import type {
    EventType,
} from "../../domain/events/event-type.js";

export const gameStateEnum =
    pgEnum(
        "game_state",
        [
            "LOBBY",
            "SETUP",
            "READY",
            "ACTIVE",
            "VOTING",
            "FINISHED",
            "CANCELLED",
        ],
    );

export const gameTrackingModeEnum =
    pgEnum(
        "game_tracking_mode",
        [
            "MANUAL",
            "STS2",
        ],
    );

export const gameEventSourceEnum =
    pgEnum(
        "game_event_source",
        [
            "DISCORD",
            "MANUAL",
            "MOD",
            "SYSTEM",
        ],
    );

export const gameEventValidationStatusEnum =
    pgEnum(
        "game_event_validation_status",
        [
            "PENDING",
            "VERIFIED",
            "REJECTED",
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

            trackingMode:
                gameTrackingModeEnum(
                    "tracking_mode",
                )
                    .notNull()
                    .default("MANUAL"),

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

            currentAct:
                integer(
                    "current_act",
                ),
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

            check(
                "games_current_act_valid",

                sql`
                    ${table.currentAct}
                    IS NULL
                    OR (
                    ${table.currentAct} >= 1
                    AND ${table.currentAct} <= 3
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

export const gameEventsTable =
    pgTable(
        "game_events",
        {
            id:
                text("id")
                    .primaryKey(),

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

            eventType:
                text("event_type")
                    .$type<EventType>()
                    .notNull(),

            actNumber:
                integer(
                    "act_number",
                ),

            actorPlayerId:
                text(
                    "actor_player_id",
                ),

            targetPlayerId:
                text(
                    "target_player_id",
                ),

            payload:
                jsonb(
                    "payload",
                )
                    .$type<EventPayload>()
                    .notNull()
                    .default(
                        sql`
                            '{}'::jsonb
                        `,
                    ),

            source:
                gameEventSourceEnum(
                    "source",
                )
                    .notNull(),

            validationStatus:
                gameEventValidationStatusEnum(
                    "validation_status",
                )
                    .notNull()
                    .default(
                        "PENDING",
                    ),

            createdAt:
                timestamp(
                    "created_at",
                    {
                        withTimezone:
                            true,
                    },
                )
                    .notNull()
                    .defaultNow(),
        },

        table => [
            index(
                "game_events_game_created_at_idx",
            ).on(
                table.gameId,
                table.createdAt,
            ),

            index(
                "game_events_game_type_idx",
            ).on(
                table.gameId,
                table.eventType,
            ),

            check(
                "game_events_act_number_valid",

                sql`
                    ${table.actNumber}
                    IS NULL
                    OR (
                        ${table.actNumber} >= 1
                        AND ${table.actNumber} <= 3
                    )
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

            variantCode:
                text(
                    "variant_code",
                ),

            targetPlayerIds:
                jsonb(
                    "target_player_ids",
                )
                    .$type<string[]>()
                    .notNull()
                    .default(
                        sql`
                            '[]'::jsonb
                        `,
                    ),

            setupCompleted:
                boolean(
                    "setup_completed",
                )
                    .notNull()
                    .default(
                        true,
                    ),
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
            id:
                serial(
                    "id",
                )
                    .primaryKey(),

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

            actNumber:
                integer(
                    "act_number",
                ),
        },

        table => [
            uniqueIndex(
                "objective_assignments_primary_unique",
            )
                .on(
                    table.gameId,
                    table.playerId,
                )
                .where(
                    sql`
                        ${table.objectiveType}
                        = 'PRIMARY'
                    `,
                ),

            uniqueIndex(
                "objective_assignments_secondary_act_unique",
            )
                .on(
                    table.gameId,
                    table.playerId,
                    table.actNumber,
                )
                .where(
                    sql`
                        ${table.objectiveType}
                        = 'SECONDARY'
                    `,
                ),

            check(
                "objective_assignments_scope_valid",

                sql`
                    (
                    ${table.objectiveType} = 'PRIMARY'
                    AND ${table.actNumber} IS NULL
                    )
                    OR
                    (
                    ${table.objectiveType} = 'SECONDARY'
                    AND ${table.actNumber} BETWEEN 1 AND 3
                    )
                `,
            ),

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

export const powerAssignmentsTable =
    pgTable(
        "power_assignments",

        {
            gameId:
                text(
                    "game_id",
                )
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
                text(
                    "player_id",
                )
                    .notNull(),

            powerCode:
                text(
                    "power_code",
                )
                    .notNull(),

            targetPlayerIds:
                jsonb(
                    "target_player_ids",
                )
                    .$type<string[]>()
                    .notNull()
                    .default(
                        sql`
                            '[]'::jsonb
                        `,
                    ),

            setupCompleted:
                boolean(
                    "setup_completed",
                )
                    .notNull()
                    .default(
                        true,
                    ),

            uses:
                integer(
                    "uses",
                )
                    .notNull()
                    .default(
                        0,
                    ),
        },

        table => [
            primaryKey({
                name:
                    "power_assignments_pk",

                columns: [
                    table.gameId,
                    table.playerId,
                ],
            }),

            check(
                "power_assignments_uses_non_negative",

                sql`
                    ${table.uses} >= 0
                `,
            ),
        ],
    );