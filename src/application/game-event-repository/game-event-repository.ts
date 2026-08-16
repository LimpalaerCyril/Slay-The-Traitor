import type {
    GameEvent,
} from "../../domain/events/game-events.js";

import type {
    ValidationStatus,
} from "../../domain/events/validation-status.js";

export interface GameEventRepository {
    append(
        event:
            GameEvent,
    ): Promise<void>;

    findById(
        eventId:
            string,
    ): Promise<
        GameEvent
        | undefined
    >;

    findByGameId(
        gameId:
            string,
    ): Promise<
        readonly GameEvent[]
    >;

    setValidationStatus(
        eventId:
            string,

        status:
            ValidationStatus,
    ): Promise<void>;
}