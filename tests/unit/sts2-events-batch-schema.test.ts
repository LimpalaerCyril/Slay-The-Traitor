import {
    describe,
    expect,
    it,
} from "vitest";

import {
    sts2EventsBatchBodySchema,
} from "../../src/api/sts2/sts2-events-batch-schema.js";

const BASE = {
    protocolVersion:
        1 as const,

    bridgeSessionId:
        "11111111-1111-4111-8111-111111111111",

    clientInstanceId:
        "22222222-2222-4222-8222-222222222222",

    platform:
        "STEAM" as const,

    platformPlayerId:
        "76561198169032837",

    bridgeVersion:
        "0.1.0",

    gameVersion:
        "2026-08-22",

    lobbyId:
        "109775240917553456",
};

function createPotionEvent(
    sequence:
        number,
) {
    return {
        sequence,

        occurredAt:
            "2026-08-22T08:00:00.000Z",

        event: {
            type:
                "POTION_USED" as const,

            actNumber:
                1 as const,

            actorPlatformPlayerId:
                BASE.platformPlayerId,

            payload: {
                potionId:
                    "FIRE_POTION",
            },
        },
    };
}

describe(
    "STS2 events batch Zod contract",
    () => {
        it(
            "accepts every supported MOD event",
            () => {
                const parsed =
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,

                            events: [
                                createPotionEvent(1),
                                {
                                    sequence: 2,
                                    occurredAt: "2026-08-22T08:00:01.000Z",
                                    event: {
                                        type: "GOLD_CHANGED",
                                        actNumber: 1,
                                        actorPlatformPlayerId: BASE.platformPlayerId,
                                        payload: {
                                            current: 125,
                                            delta: 26,
                                        },
                                    },
                                },
                                {
                                    sequence: 3,
                                    occurredAt: "2026-08-22T08:00:02.000Z",
                                    event: {
                                        type: "RELIC_ACQUIRED",
                                        actNumber: 1,
                                        actorPlatformPlayerId: BASE.platformPlayerId,
                                        payload: {
                                            relicId: "ANCHOR",
                                        },
                                    },
                                },
                                {
                                    sequence: 4,
                                    occurredAt: "2026-08-22T08:00:03.000Z",
                                    event: {
                                        type: "PLAYER_HP_CHANGED",
                                        actNumber: 1,
                                        targetPlatformPlayerId: BASE.platformPlayerId,
                                        payload: {
                                            previous: 80,
                                            current: 72,
                                            delta: -8,
                                            maxHp: 80,
                                            alive: true,
                                        },
                                    },
                                },
                                {
                                    sequence: 5,
                                    occurredAt: "2026-08-22T08:00:04.000Z",
                                    event: {
                                        type: "PLAYER_DIED",
                                        actNumber: 1,
                                        targetPlatformPlayerId: BASE.platformPlayerId,
                                        payload: {},
                                    },
                                },
                                {
                                    sequence: 6,
                                    occurredAt: "2026-08-22T08:00:05.000Z",
                                    event: {
                                        type: "BOSS_DEFEATED",
                                        actNumber: 1,
                                        payload: {
                                            bossId: "CEREMONIAL_BEAST_BOSS",
                                        },
                                    },
                                },
                                {
                                    sequence: 7,
                                    occurredAt: "2026-08-22T08:00:06.000Z",
                                    event: {
                                        type: "ACT_COMPLETED",
                                        actNumber: 1,
                                        payload: {},
                                    },
                                },
                            ],
                        });

                expect(
                    parsed.success,
                ).toBe(true);
            },
        );

        it.each([
            "CURSE_ADDED",
            "BLOCK_GRANTED_TO_ALLY",
            "ENEMY_KILLED",
            "POWER_USED",
            "VOTE_CAST",
        ])(
            "rejects unsupported MOD event %s",
            type => {
                const parsed =
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,

                            events: [
                                {
                                    sequence: 1,
                                    occurredAt: "2026-08-22T08:00:00.000Z",
                                    event: {
                                        type,
                                        actNumber: 1,
                                        payload: {},
                                    },
                                },
                            ],
                        });

                expect(
                    parsed.success,
                ).toBe(false);
            },
        );

        it(
            "rejects empty and oversized batches",
            () => {
                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [],
                        })
                        .success,
                ).toBe(false);

                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events:
                                Array.from(
                                    {
                                        length: 101,
                                    },
                                    (
                                        _,
                                        index,
                                    ) =>
                                        createPotionEvent(
                                            index + 1,
                                        ),
                                ),
                        })
                        .success,
                ).toBe(false);
            },
        );

        it(
            "rejects non-positive, non-contiguous and descending sequences",
            () => {
                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [
                                createPotionEvent(0),
                            ],
                        })
                        .success,
                ).toBe(false);

                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [
                                createPotionEvent(1),
                                createPotionEvent(3),
                            ],
                        })
                        .success,
                ).toBe(false);

                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [
                                createPotionEvent(2),
                                createPotionEvent(1),
                            ],
                        })
                        .success,
                ).toBe(false);
            },
        );

        it(
            "rejects extra fields including gameId and strict payload violations",
            () => {
                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            gameId: "secret-internal-game-id",
                            events: [
                                createPotionEvent(1),
                            ],
                        })
                        .success,
                ).toBe(false);

                expect(
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [
                                {
                                    ...createPotionEvent(1),
                                    event: {
                                        ...createPotionEvent(1).event,
                                        payload: {
                                            potionId: "FIRE_POTION",
                                            unexpected: true,
                                        },
                                    },
                                },
                            ],
                        })
                        .success,
                ).toBe(false);
            },
        );

        it(
            "rejects inconsistent HP delta and HP over maxHp",
            () => {
                const invalidDelta =
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [
                                {
                                    sequence: 1,
                                    occurredAt: "2026-08-22T08:00:00.000Z",
                                    event: {
                                        type: "PLAYER_HP_CHANGED",
                                        actNumber: 1,
                                        targetPlatformPlayerId: BASE.platformPlayerId,
                                        payload: {
                                            previous: 80,
                                            current: 70,
                                            delta: -9,
                                            maxHp: 80,
                                            alive: true,
                                        },
                                    },
                                },
                            ],
                        });

                expect(
                    invalidDelta.success,
                ).toBe(false);

                const overMax =
                    sts2EventsBatchBodySchema
                        .safeParse({
                            ...BASE,
                            events: [
                                {
                                    sequence: 1,
                                    occurredAt: "2026-08-22T08:00:00.000Z",
                                    event: {
                                        type: "PLAYER_HP_CHANGED",
                                        actNumber: 1,
                                        targetPlatformPlayerId: BASE.platformPlayerId,
                                        payload: {
                                            previous: 79,
                                            current: 81,
                                            delta: 2,
                                            maxHp: 80,
                                            alive: true,
                                        },
                                    },
                                },
                            ],
                        });

                expect(
                    overMax.success,
                ).toBe(false);
            },
        );
    },
);
