import type {
    GameEvent,
} from "../../domain/events/game-events.js";

import type {
    ValidationStatus,
} from "../../domain/events/validation-status.js";

import type {
    GameEventRepository,
} from "../../application/game-event-repository/game-event-repository.js";

export class InMemoryGameEventRepository
    implements GameEventRepository {
    private readonly events =
        new Map<
            string,
            GameEvent
        >();

    public async append(
        event:
            GameEvent,
    ): Promise<void> {
        if (
            this.events.has(
                event.id,
            )
        ) {
            throw new Error(
                `Game event already exists: ${event.id}`,
            );
        }

        this.events.set(
            event.id,
            cloneGameEvent(
                event,
            ),
        );
    }

    public async findById(
        eventId:
            string,
    ): Promise<
        GameEvent
        | undefined
    > {
        const event =
            this.events.get(
                eventId,
            );

        return event === undefined
            ? undefined
            : cloneGameEvent(
                event,
            );
    }

    public async findByGameId(
        gameId:
            string,
    ): Promise<
        readonly GameEvent[]
    > {
        return [
            ...this.events.values(),
        ]
            .filter(
                event =>
                    event.gameId
                    === gameId,
            )
            .sort(
                (
                    left,
                    right,
                ) => {
                    const timeDifference =
                        left.createdAt.getTime()
                        - right.createdAt.getTime();

                    if (
                        timeDifference
                        !== 0
                    ) {
                        return timeDifference;
                    }

                    return left.id.localeCompare(
                        right.id,
                    );
                },
            )
            .map(
                cloneGameEvent,
            );
    }

    public async setValidationStatus(
        eventId:
            string,

        status:
            ValidationStatus,
    ): Promise<void> {
        const event =
            this.events.get(
                eventId,
            );

        if (
            event === undefined
        ) {
            throw new Error(
                `Unknown game event: ${eventId}`,
            );
        }

        this.events.set(
            eventId,
            {
                ...event,

                validationStatus:
                    status,
            },
        );
    }
}

function cloneGameEvent(
    event:
        GameEvent,
): GameEvent {
    return {
        ...event,

        payload: {
            ...event.payload,
        },

        createdAt:
            new Date(
                event.createdAt,
            ),
    };
}