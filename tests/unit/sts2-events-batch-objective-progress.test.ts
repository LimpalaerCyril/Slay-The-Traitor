import {
    describe,
    expect,
    it,
} from "vitest";

import type {
    GameEvent,
} from "../../src/domain/events/game-events.js";

import {
    applyObjectiveEvaluation,
    evaluateObjective,
} from "../../src/domain/objectives/objective-engine.js";

import type {
    ObjectiveAssignment,
} from "../../src/domain/objectives/objective-assignments.js";

import type {
    Objective,
} from "../../src/domain/objectives/objective.js";

import type {
    PersistSts2EventBatchInput,
    ResolveSts2EventContextInput,
    Sts2EventIngestionRepository,
} from "../../src/application/sts2-event-ingestion/sts2-event-ingestion-repository.js";

import {
    Sts2EventIngestionService,
} from "../../src/application/sts2-event-ingestion/sts2-event-ingestion-service.js";

const objective:
    Objective = {
    code:
        "alchemist-test",

    name:
        "Alchimiste",

    description:
        "Utiliser trois potions.",

    category:
        "PERFORMANCE",

    difficulty:
        "EASY",

    minimumPlayers:
        2,

    maximumPlayers:
        4,

    allowedTypes: [
        "SECONDARY",
    ],

    requiredEvents: [
        "POTION_USED",
    ],

    verificationMode:
        "GROUP_CONFIRMED",

    compatibilityTags: [],

    score:
        35,

    hiddenProgress:
        false,

    rule: {
        type:
            "EVENT_COUNT",

        eventType:
            "POTION_USED",

        actor:
            "OWNER",

        target:
            "ANY",

        increment:
            1,

        requiredCount:
            3,
    },

    supportedTrackingModes: [
        "STS2",
    ],
};

const assignment:
    ObjectiveAssignment = {
    playerId:
        "alice",

    objectiveCode:
        objective.code,

    objectiveType:
        "SECONDARY",

    actNumber:
        1,

    progress: {
        current:
            0,

        target:
            3,
    },

    status:
        "PENDING",
};

class CapturingRepository
    implements Sts2EventIngestionRepository {
    public readonly events:
        GameEvent[] = [];

    public async resolveContext(
        _input:
            ResolveSts2EventContextInput,
    ) {
        return {
            status:
                "READY" as const,

            gameId:
                "game-1",

            gamePlayerId:
                "alice",

            isHost:
                false,
        };
    }

    public async persistBatch(
        input:
            PersistSts2EventBatchInput,
    ) {
        for (
            const item
            of input.events
        ) {
            if (
                item.kind
                !== "ACCEPT"
            ) {
                continue;
            }

            this.events.push({
                id:
                    `event-${item.source.sequence}`,

                gameId:
                    "game-1",

                type:
                    item.gameEvent.type,

                actNumber:
                    item.gameEvent.actNumber,

                ...(
                    item.gameEvent
                        .actorPlayerId
                    === undefined
                        ? {}
                        : {
                            actorPlayerId:
                                item.gameEvent
                                    .actorPlayerId,
                        }
                ),

                ...(
                    item.gameEvent
                        .targetPlayerId
                    === undefined
                        ? {}
                        : {
                            targetPlayerId:
                                item.gameEvent
                                    .targetPlayerId,
                        }
                ),

                payload:
                    item.gameEvent.payload,

                source:
                    "MOD",

                validationStatus:
                    "VERIFIED",

                createdAt:
                    item.gameEvent.createdAt,
            });
        }

        return {
            status:
                "ACKNOWLEDGED" as const,

            acknowledgedThrough:
                input.events.at(-1)!
                    .source.sequence,

            acceptedCount:
                input.events.length,

            duplicateCount:
                0,

            ignoredCount:
                0,

            ignored: [],

            shouldRebuildObjectives:
                true,

            gameId:
                "game-1",
        };
    }
}

describe(
    "STS2 MOD event → Objective Engine",
    () => {
        it(
            "completes an Alchemist-style objective after three verified POTION_USED events",
            async () => {
                const repository =
                    new CapturingRepository();

                const localAssignment = {
                    ...assignment,

                    progress: {
                        ...assignment.progress,
                    },
                };

                const service =
                    new Sts2EventIngestionService(
                        {
                            authenticate:
                                async () => ({
                                    id: 7,
                                    discordUserId: "discord-alice",
                                    platform: "STEAM",
                                    platformPlayerId: "76561198169032837",
                                    platformName: "Alice",
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                }),
                        },

                        repository,

                        {
                            rebuildObjectivesForGame:
                                async () => {
                                    const evaluation =
                                        evaluateObjective({
                                            objective,
                                            assignment:
                                                localAssignment,
                                            events:
                                                repository.events,
                                            players: [
                                                {
                                                    id: "alice",
                                                    discordUserId: "discord-alice",
                                                    characterSlug: "ironclad",
                                                    alive: true,
                                                },
                                                {
                                                    id: "bob",
                                                    discordUserId: "discord-bob",
                                                    characterSlug: "silent",
                                                    alive: true,
                                                },
                                            ],
                                            roleTargetPlayerIds: [],
                                            powerTargetPlayerIds: [],
                                            gameFinished: false,
                                        });

                                    applyObjectiveEvaluation(
                                        localAssignment,
                                        evaluation,
                                    );
                                },
                        },
                    );

                const result =
                    await service.ingestBatch({
                        bridgeToken: "sttb_v1_test",
                        protocolVersion: 1,
                        bridgeSessionId: "11111111-1111-4111-8111-111111111111",
                        clientInstanceId: "22222222-2222-4222-8222-222222222222",
                        platform: "STEAM",
                        platformPlayerId: "76561198169032837",
                        bridgeVersion: "0.1.0",
                        gameVersion: "2026-08-22",
                        lobbyId: "109775240917553456",
                        events: [1, 2, 3].map(
                            sequence => ({
                                sequence,
                                occurredAt: new Date(`2026-08-22T08:00:0${sequence}.000Z`),
                                event: {
                                    type: "POTION_USED" as const,
                                    actNumber: 1 as const,
                                    actorPlatformPlayerId: "76561198169032837",
                                    payload: {
                                        potionId: `POTION_${sequence}`,
                                    },
                                },
                            }),
                        ),
                    });

                expect(result).toMatchObject({
                    ok: true,
                    acceptedCount: 3,
                });

                expect(repository.events).toHaveLength(3);

                expect(
                    repository.events.every(
                        event =>
                            event.source === "MOD"
                            && event.validationStatus === "VERIFIED",
                    ),
                ).toBe(true);

                expect(localAssignment.progress.current).toBe(3);
                expect(localAssignment.status).toBe("COMPLETED");
            },
        );
    },
);
