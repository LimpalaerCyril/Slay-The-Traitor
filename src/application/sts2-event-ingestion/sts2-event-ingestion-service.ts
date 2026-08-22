import {
    createHash,
} from "node:crypto";

import type {
    PlatformIdentityLink,
} from "../bridge-identity/bridge-identity-repository.js";

import type {
    Sts2EventIngestionRepository,
} from "./sts2-event-ingestion-repository.js";

import type {
    AcceptedSts2GameEvent,
    SequencedSts2ModEvent,
    Sts2EventIgnoreReason,
    Sts2EventPersistenceDisposition,
} from "./sts2-event-ingestion-types.js";

export interface Sts2EventIdentityAuthenticator {
    authenticate(
        bridgeToken:
            string,
    ): Promise<
        PlatformIdentityLink
        | undefined
    >;
}

export interface Sts2ObjectiveRebuilder {
    rebuildObjectivesForGame(
        gameId:
            string,
    ): Promise<void>;
}

export interface IngestSts2EventBatchInput {
    readonly bridgeToken:
        string;

    readonly protocolVersion:
        1;

    readonly bridgeSessionId:
        string;

    readonly clientInstanceId:
        string;

    readonly platform:
        "STEAM";

    readonly platformPlayerId:
        string;

    readonly bridgeVersion:
        string;

    readonly gameVersion:
        string;

    readonly lobbyId:
        string;

    readonly events:
        readonly SequencedSts2ModEvent[];
}

export type IngestSts2EventBatchResult =
    | {
        readonly ok:
            true;

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
            readonly {
                readonly sequence:
                    number;

                readonly type:
                    SequencedSts2ModEvent["event"]["type"];

                readonly reason:
                    Sts2EventIgnoreReason;
            }[];

        readonly serverTime:
            Date;
    }
    | {
        readonly ok:
            false;

        readonly status:
            | "UNAUTHORIZED"
            | "IDENTITY_MISMATCH"
            | "SESSION_NOT_FOUND"
            | "RECONNECT_REQUIRED"
            | "NOT_STS2_GAME"
            | "GAME_NOT_ACTIVE"
            | "NOT_GAME_PARTICIPANT";
    }
    | {
        readonly ok:
            false;

        readonly status:
            "SEQUENCE_CONFLICT";

        readonly sequence:
            number;
    };

export class Sts2EventIngestionService {
    public constructor(
        private readonly identityAuthenticator:
            Sts2EventIdentityAuthenticator,

        private readonly repository:
            Sts2EventIngestionRepository,

        private readonly objectiveRebuilder:
            Sts2ObjectiveRebuilder,

        private readonly now:
            () => Date =
            () =>
                new Date(),
    ) { }

    public async ingestBatch(
        input:
            IngestSts2EventBatchInput,
    ): Promise<
        IngestSts2EventBatchResult
    > {
        const identity =
            await this.identityAuthenticator
                .authenticate(
                    input.bridgeToken,
                );

        if (
            identity === undefined
        ) {
            return {
                ok:
                    false,

                status:
                    "UNAUTHORIZED",
            };
        }

        if (
            identity.platform
            !== input.platform
            || identity.platformPlayerId
            !== input.platformPlayerId
        ) {
            return {
                ok:
                    false,

                status:
                    "IDENTITY_MISMATCH",
            };
        }

        const context =
            await this.repository
                .resolveContext({
                    bridgeSessionId:
                        input.bridgeSessionId,

                    identityLinkId:
                        identity.id,

                    identityDiscordUserId:
                        identity.discordUserId,

                    authenticatedPlatformPlayerId:
                        identity.platformPlayerId,

                    clientInstanceId:
                        input.clientInstanceId,

                    lobbyId:
                        input.lobbyId,
                });

        if (
            context.status
            !== "READY"
        ) {
            return mapContextFailure(
                context.status,
            );
        }

        const persistenceEvents =
            input.events.map(
                event =>
                    createPersistenceDisposition(
                        event,
                        input.platformPlayerId,
                        context.gamePlayerId,
                        context.isHost,
                    ),
            );

        const receivedAt =
            this.now();

        const persisted =
            await this.repository
                .persistBatch({
                    bridgeSessionId:
                        input.bridgeSessionId,

                    identityLinkId:
                        identity.id,

                    identityDiscordUserId:
                        identity.discordUserId,

                    authenticatedPlatformPlayerId:
                        identity.platformPlayerId,

                    clientInstanceId:
                        input.clientInstanceId,

                    lobbyId:
                        input.lobbyId,

                    expectedGameId:
                        context.gameId,

                    expectedGamePlayerId:
                        context.gamePlayerId,

                    expectedIsHost:
                        context.isHost,

                    events:
                        persistenceEvents,

                    receivedAt,
                });

        if (
            persisted.status
            === "SEQUENCE_CONFLICT"
        ) {
            return {
                ok:
                    false,

                status:
                    "SEQUENCE_CONFLICT",

                sequence:
                    persisted.sequence,
            };
        }

        if (
            persisted.status
            !== "ACKNOWLEDGED"
        ) {
            return mapContextFailure(
                persisted.status,
            );
        }

        /*
         * Le receipt + GameEvent est déjà
         * durable à ce stade.
         *
         * Si le rebuild échoue, on laisse
         * remonter l'erreur HTTP 500. Le bridge
         * retentera le même batch ; il sera alors
         * vu comme DUPLICATE et le rebuild sera
         * rejoué sans recréer de GameEvent.
         */
        if (
            persisted.shouldRebuildObjectives
        ) {
            await this.objectiveRebuilder
                .rebuildObjectivesForGame(
                    persisted.gameId,
                );
        }

        return {
            ok:
                true,

            status:
                "ACKNOWLEDGED",

            acknowledgedThrough:
                persisted.acknowledgedThrough,

            acceptedCount:
                persisted.acceptedCount,

            duplicateCount:
                persisted.duplicateCount,

            ignoredCount:
                persisted.ignoredCount,

            ignored:
                persisted.ignored,

            serverTime:
                receivedAt,
        };
    }
}

function createPersistenceDisposition(
    source:
        SequencedSts2ModEvent,

    authenticatedPlatformPlayerId:
        string,

    gamePlayerId:
        string,

    isHost:
        boolean,
): Sts2EventPersistenceDisposition {
    const fingerprint =
        createEventFingerprint(
            source,
        );

    switch (
        source.event.type
    ) {
        case "POTION_USED":
        case "GOLD_CHANGED":
        case "RELIC_ACQUIRED": {
            if (
                source.event
                    .actorPlatformPlayerId
                !== authenticatedPlatformPlayerId
            ) {
                return createIgnoredDisposition(
                    source,
                    fingerprint,
                    "LOCAL_PLAYER_AUTHORITY_REQUIRED",
                );
            }

            return createAcceptedDisposition(
                source,
                fingerprint,
                {
                    type:
                        source.event.type,

                    actNumber:
                        source.event.actNumber,

                    actorPlayerId:
                        gamePlayerId,

                    payload:
                        source.event.payload,

                    createdAt:
                        source.occurredAt,
                },
            );
        }

        case "PLAYER_HP_CHANGED":
        case "PLAYER_DIED": {
            if (
                source.event
                    .targetPlatformPlayerId
                !== authenticatedPlatformPlayerId
            ) {
                return createIgnoredDisposition(
                    source,
                    fingerprint,
                    "LOCAL_PLAYER_AUTHORITY_REQUIRED",
                );
            }

            return createAcceptedDisposition(
                source,
                fingerprint,
                {
                    type:
                        source.event.type,

                    actNumber:
                        source.event.actNumber,

                    targetPlayerId:
                        gamePlayerId,

                    payload:
                        source.event.payload,

                    createdAt:
                        source.occurredAt,
                },
            );
        }

        case "BOSS_DEFEATED":
        case "ACT_COMPLETED": {
            if (
                !isHost
            ) {
                return createIgnoredDisposition(
                    source,
                    fingerprint,
                    "HOST_AUTHORITY_REQUIRED",
                );
            }

            return createAcceptedDisposition(
                source,
                fingerprint,
                {
                    type:
                        source.event.type,

                    actNumber:
                        source.event.actNumber,

                    payload:
                        source.event.payload,

                    createdAt:
                        source.occurredAt,
                },
            );
        }
    }
}

function createAcceptedDisposition(
    source:
        SequencedSts2ModEvent,

    fingerprint:
        string,

    gameEvent:
        AcceptedSts2GameEvent,
): Sts2EventPersistenceDisposition {
    return {
        kind:
            "ACCEPT",

        fingerprint,
        source,
        gameEvent,
    };
}

function createIgnoredDisposition(
    source:
        SequencedSts2ModEvent,

    fingerprint:
        string,

    reason:
        Sts2EventIgnoreReason,
): Sts2EventPersistenceDisposition {
    return {
        kind:
            "IGNORE",

        fingerprint,
        source,
        reason,
    };
}

function createEventFingerprint(
    source:
        SequencedSts2ModEvent,
): string {
    const canonical =
        stableStringify({
            occurredAt:
                source.occurredAt
                    .toISOString(),

            event:
                source.event,
        });

    return createHash(
        "sha256",
    )
        .update(
            canonical,
            "utf8",
        )
        .digest(
            "hex",
        );
}

function stableStringify(
    value:
        unknown,
): string {
    if (
        value === null
        || typeof value
        !== "object"
    ) {
        const serialized =
            JSON.stringify(
                value,
            );

        if (
            serialized === undefined
        ) {
            throw new Error(
                "Unable to fingerprint undefined STS2 event data.",
            );
        }

        return serialized;
    }

    if (
        Array.isArray(
            value,
        )
    ) {
        return `[${
            value.map(
                item =>
                    stableStringify(
                        item,
                    ),
            )
                .join(",")
        }]`;
    }

    const record =
        value as Record<
            string,
            unknown
        >;

    const keys =
        Object.keys(
            record,
        )
            .sort();

    return `{${
        keys.map(
            key =>
                `${JSON.stringify(key)}:${stableStringify(record[key])}`,
        )
            .join(",")
    }}`;
}

function mapContextFailure(
    status:
        | "SESSION_NOT_FOUND"
        | "LOBBY_MISMATCH"
        | "CONNECTION_NOT_FOUND"
        | "CLIENT_INSTANCE_MISMATCH"
        | "NOT_STS2_GAME"
        | "GAME_NOT_ACTIVE"
        | "NOT_GAME_PARTICIPANT",
): IngestSts2EventBatchResult {
    switch (
        status
    ) {
        case "SESSION_NOT_FOUND":
            return {
                ok:
                    false,

                status:
                    "SESSION_NOT_FOUND",
            };

        case "LOBBY_MISMATCH":
        case "CONNECTION_NOT_FOUND":
        case "CLIENT_INSTANCE_MISMATCH":
            return {
                ok:
                    false,

                status:
                    "RECONNECT_REQUIRED",
            };

        case "NOT_STS2_GAME":
            return {
                ok:
                    false,

                status:
                    "NOT_STS2_GAME",
            };

        case "GAME_NOT_ACTIVE":
            return {
                ok:
                    false,

                status:
                    "GAME_NOT_ACTIVE",
            };

        case "NOT_GAME_PARTICIPANT":
            return {
                ok:
                    false,

                status:
                    "NOT_GAME_PARTICIPANT",
            };
    }
}
