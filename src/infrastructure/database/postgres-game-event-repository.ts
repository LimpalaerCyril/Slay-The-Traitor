import {
    asc,
    eq,
} from "drizzle-orm";

import type {
    GameEvent,
} from "../../domain/events/game-events.js";

import type {
    ValidationStatus,
} from "../../domain/events/validation-status.js";

import {
    isGameAct,
    type GameAct,
} from "../../domain/games/game-act.js";

import type {
    GameEventRepository,
} from "../../application/game-event-repository/game-event-repository.js";

import type {
    Database,
} from "./database.js";

import {
    gameEventsTable,
} from "./schema.js";

export class PostgresGameEventRepository
    implements GameEventRepository {
    public constructor(
        private readonly db:
            Database,
    ) { }

    public async append(
        event:
            GameEvent,
    ): Promise<void> {
        await this.db
            .insert(
                gameEventsTable,
            )
            .values({
                id:
                    event.id,

                gameId:
                    event.gameId,

                eventType:
                    event.type,

                actNumber:
                    event.actNumber
                    ?? null,

                actorPlayerId:
                    event.actorPlayerId
                    ?? null,

                targetPlayerId:
                    event.targetPlayerId
                    ?? null,

                payload:
                    event.payload,

                source:
                    event.source,

                validationStatus:
                    event.validationStatus,

                createdAt:
                    event.createdAt,
            });
    }

    public async findById(
        eventId:
            string,
    ): Promise<
        GameEvent
        | undefined
    > {
        const rows =
            await this.db
                .select()
                .from(
                    gameEventsTable,
                )
                .where(
                    eq(
                        gameEventsTable.id,
                        eventId,
                    ),
                )
                .limit(
                    1,
                );

        const row =
            rows[0];

        return row === undefined
            ? undefined
            : mapGameEventRow(
                row,
            );
    }

    public async findByGameId(
        gameId:
            string,
    ): Promise<
        readonly GameEvent[]
    > {
        const rows =
            await this.db
                .select()
                .from(
                    gameEventsTable,
                )
                .where(
                    eq(
                        gameEventsTable.gameId,
                        gameId,
                    ),
                )
                .orderBy(
                    asc(
                        gameEventsTable.createdAt,
                    ),

                    asc(
                        gameEventsTable.id,
                    ),
                );

        return rows.map(
            mapGameEventRow,
        );
    }

    public async setValidationStatus(
        eventId:
            string,

        status:
            ValidationStatus,
    ): Promise<void> {
        const rows =
            await this.db
                .update(
                    gameEventsTable,
                )
                .set({
                    validationStatus:
                        status,
                })
                .where(
                    eq(
                        gameEventsTable.id,
                        eventId,
                    ),
                )
                .returning({
                    id:
                        gameEventsTable.id,
                });

        if (
            rows.length === 0
        ) {
            throw new Error(
                `Unknown game event: ${eventId}`,
            );
        }
    }
}

function mapGameEventRow(
    row:
        typeof gameEventsTable.$inferSelect,
): GameEvent {
    const actNumber =
        parseGameAct(
            row.actNumber,
        );

    return {
        id:
            row.id,

        gameId:
            row.gameId,

        type:
            row.eventType,

        ...(
            actNumber
            === undefined
                ? {}
                : {
                    actNumber,
                }
        ),

        ...(
            row.actorPlayerId
            === null
                ? {}
                : {
                    actorPlayerId:
                        row.actorPlayerId,
                }
        ),

        ...(
            row.targetPlayerId
            === null
                ? {}
                : {
                    targetPlayerId:
                        row.targetPlayerId,
                }
        ),

        payload:
            row.payload,

        source:
            row.source,

        validationStatus:
            row.validationStatus,

        createdAt:
            row.createdAt,
    };
}

function parseGameAct(
    value:
        number
        | null,
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
            `Invalid game event act stored in database: ${value}`,
        );
    }

    return value;
}