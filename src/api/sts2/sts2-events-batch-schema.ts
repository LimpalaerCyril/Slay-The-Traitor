import {
    z,
} from "zod";

const gameActSchema =
    z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
    ]);

const platformPlayerIdSchema =
    z.string()
        .trim()
        .min(1)
        .max(32)
        .regex(
            /^\d+$/,
            "platformPlayerId must be a decimal string.",
        );

const modelIdSchema =
    z.string()
        .trim()
        .min(1)
        .max(200);

const potionUsedEventSchema =
    z.object({
        type:
            z.literal(
                "POTION_USED",
            ),

        actNumber:
            gameActSchema,

        actorPlatformPlayerId:
            platformPlayerIdSchema,

        payload:
            z.object({
                potionId:
                    modelIdSchema,
            })
                .strict(),
    })
        .strict();

const goldChangedEventSchema =
    z.object({
        type:
            z.literal(
                "GOLD_CHANGED",
            ),

        actNumber:
            gameActSchema,

        actorPlatformPlayerId:
            platformPlayerIdSchema,

        payload:
            z.object({
                current:
                    z.number()
                        .int()
                        .nonnegative(),

                delta:
                    z.number()
                        .int(),
            })
                .strict(),
    })
        .strict();

const relicAcquiredEventSchema =
    z.object({
        type:
            z.literal(
                "RELIC_ACQUIRED",
            ),

        actNumber:
            gameActSchema,

        actorPlatformPlayerId:
            platformPlayerIdSchema,

        payload:
            z.object({
                relicId:
                    modelIdSchema,
            })
                .strict(),
    })
        .strict();

const playerHpChangedEventSchema =
    z.object({
        type:
            z.literal(
                "PLAYER_HP_CHANGED",
            ),

        actNumber:
            gameActSchema,

        targetPlatformPlayerId:
            platformPlayerIdSchema,

        payload:
            z.object({
                previous:
                    z.number()
                        .int()
                        .nonnegative(),

                current:
                    z.number()
                        .int()
                        .nonnegative(),

                delta:
                    z.number()
                        .int(),

                maxHp:
                    z.number()
                        .int()
                        .positive(),

                alive:
                    z.boolean(),
            })
                .strict()
                .superRefine(
                    (
                        payload,
                        context,
                    ) => {
                        if (
                            payload.previous
                            + payload.delta
                            !== payload.current
                        ) {
                            context.addIssue({
                                code:
                                    "custom",

                                path: [
                                    "delta",
                                ],

                                message:
                                    "delta must equal current - previous.",
                            });
                        }

                        if (
                            payload.current
                            > payload.maxHp
                        ) {
                            context.addIssue({
                                code:
                                    "custom",

                                path: [
                                    "current",
                                ],

                                message:
                                    "current HP cannot exceed maxHp.",
                            });
                        }
                    },
                ),
    })
        .strict();

const playerDiedEventSchema =
    z.object({
        type:
            z.literal(
                "PLAYER_DIED",
            ),

        actNumber:
            gameActSchema,

        targetPlatformPlayerId:
            platformPlayerIdSchema,

        payload:
            z.object({})
                .strict(),
    })
        .strict();

const bossDefeatedEventSchema =
    z.object({
        type:
            z.literal(
                "BOSS_DEFEATED",
            ),

        actNumber:
            gameActSchema,

        payload:
            z.object({
                bossId:
                    modelIdSchema,
            })
                .strict(),
    })
        .strict();

const actCompletedEventSchema =
    z.object({
        type:
            z.literal(
                "ACT_COMPLETED",
            ),

        actNumber:
            gameActSchema,

        payload:
            z.object({})
                .strict(),
    })
        .strict();

export const sts2ModEventSchema =
    z.discriminatedUnion(
        "type",
        [
            potionUsedEventSchema,
            goldChangedEventSchema,
            relicAcquiredEventSchema,
            playerHpChangedEventSchema,
            playerDiedEventSchema,
            bossDefeatedEventSchema,
            actCompletedEventSchema,
        ],
    );

const sequencedEventSchema =
    z.object({
        sequence:
            z.number()
                .int()
                .positive()
                .max(
                    Number.MAX_SAFE_INTEGER,
                ),

        occurredAt:
            z.string()
                .datetime({
                    offset:
                        true,
                })
                .transform(
                    value =>
                        new Date(
                            value,
                        ),
                ),

        event:
            sts2ModEventSchema,
    })
        .strict();

export const sts2EventsBatchBodySchema =
    z.object({
        protocolVersion:
            z.literal(1),

        bridgeSessionId:
            z.string()
                .uuid(),

        clientInstanceId:
            z.string()
                .uuid(),

        platform:
            z.literal(
                "STEAM",
            ),

        platformPlayerId:
            platformPlayerIdSchema,

        bridgeVersion:
            z.string()
                .trim()
                .min(1)
                .max(100),

        gameVersion:
            z.string()
                .trim()
                .min(1)
                .max(100),

        lobbyId:
            z.string()
                .trim()
                .min(1)
                .max(64),

        events:
            z.array(
                sequencedEventSchema,
            )
                .min(1)
                .max(100),
    })
        .strict()
        .superRefine(
            (
                body,
                context,
            ) => {
                for (
                    let index = 1;
                    index < body.events.length;
                    index += 1
                ) {
                    const previous =
                        body.events[
                            index - 1
                        ];

                    const current =
                        body.events[
                            index
                        ];

                    if (
                        previous === undefined
                        || current === undefined
                    ) {
                        continue;
                    }

                    if (
                        current.sequence
                        !== previous.sequence
                        + 1
                    ) {
                        context.addIssue({
                            code:
                                "custom",

                            path: [
                                "events",
                                index,
                                "sequence",
                            ],

                            message:
                                "Batch sequences must be strictly increasing and contiguous.",
                        });
                    }
                }
            },
        );

export type Sts2EventsBatchBody =
    z.infer<
        typeof sts2EventsBatchBodySchema
    >;
