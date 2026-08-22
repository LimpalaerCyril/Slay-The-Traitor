import type {
    IgnoredSts2Event,
    Sts2EventPersistenceDisposition,
} from "./sts2-event-ingestion-types.js";

export interface ResolveSts2EventContextInput {
    readonly bridgeSessionId:
        string;

    readonly identityLinkId:
        number;

    readonly identityDiscordUserId:
        string;

    readonly authenticatedPlatformPlayerId:
        string;

    readonly clientInstanceId:
        string;

    readonly lobbyId:
        string;
}

export type ResolveSts2EventContextResult =
    | {
        readonly status:
            "READY";

        readonly gameId:
            string;

        readonly gamePlayerId:
            string;

        readonly isHost:
            boolean;
    }
    | {
        readonly status:
            | "SESSION_NOT_FOUND"
            | "LOBBY_MISMATCH"
            | "CONNECTION_NOT_FOUND"
            | "CLIENT_INSTANCE_MISMATCH"
            | "NOT_STS2_GAME"
            | "GAME_NOT_ACTIVE"
            | "NOT_GAME_PARTICIPANT";
    };

export interface PersistSts2EventBatchInput
    extends ResolveSts2EventContextInput {
    readonly expectedGameId:
        string;

    readonly expectedGamePlayerId:
        string;

    readonly expectedIsHost:
        boolean;

    readonly events:
        readonly Sts2EventPersistenceDisposition[];

    readonly receivedAt:
        Date;
}

export type PersistSts2EventBatchResult =
    | {
        readonly status:
            "ACKNOWLEDGED";

        readonly acknowledgedThrough:
            number;

        readonly acceptedCount:
            number;

        readonly duplicateCount:
            number;

        readonly ignoredCount:
            number;

        readonly ignored:
            readonly IgnoredSts2Event[];

        readonly shouldRebuildObjectives:
            boolean;

        readonly gameId:
            string;
    }
    | {
        readonly status:
            "SEQUENCE_CONFLICT";

        readonly sequence:
            number;
    }
    | {
        readonly status:
            | "SESSION_NOT_FOUND"
            | "LOBBY_MISMATCH"
            | "CONNECTION_NOT_FOUND"
            | "CLIENT_INSTANCE_MISMATCH"
            | "NOT_STS2_GAME"
            | "GAME_NOT_ACTIVE"
            | "NOT_GAME_PARTICIPANT";
    };

export interface Sts2EventIngestionRepository {
    resolveContext(
        input:
            ResolveSts2EventContextInput,
    ): Promise<
        ResolveSts2EventContextResult
    >;

    persistBatch(
        input:
            PersistSts2EventBatchInput,
    ): Promise<
        PersistSts2EventBatchResult
    >;
}
