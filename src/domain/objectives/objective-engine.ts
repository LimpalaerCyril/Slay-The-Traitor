import type {
    GameEvent,
} from "../events/game-events.js";

import type {
    GamePlayer,
} from "../games/game-player.js";

import type {
    ObjectiveAssignment,
    ObjectiveProgress,
} from "./objective-assignments.js";

import type {
    ObjectiveStatus,
} from "./objective-status.js";

import type {
    Objective,
} from "./objective.js";

import type {
    ConditionObjectiveRule,
    ObjectiveCondition,
    ObjectiveParticipantSelector,
    ObjectiveResolution,
    RankingObjectiveRule,
} from "./objective-rule.js";

import {
    isVerifiedGameEvent,
} from "../events/game-events.js";

import { GameAct } from "../games/game-act.js";

export interface ObjectiveEvaluation {
    readonly progress:
    ObjectiveProgress;

    readonly status:
    ObjectiveStatus;
}

export interface EvaluateObjectiveInput {
    readonly objective: Objective;

    readonly assignment: ObjectiveAssignment;

    readonly events: readonly GameEvent[];

    readonly players: readonly GamePlayer[];

    /*
     * Par exemple la cible de l'Ange.
     */
    readonly roleTargetPlayerIds?: readonly string[] | undefined;

    /*
    * Par exemple les deux amoureux
    * sélectionnés par Cupidon.
    */
    readonly powerTargetPlayerIds?: readonly string[] | undefined;

    /*
     * true lorsque la partie sociale
     * est terminée.
     */
    readonly gameFinished: boolean;

    /*
     * N'est nécessaire que pour les
     * conditions EXPEDITION_RESULT.
     */
    readonly expeditionWon?: boolean | undefined;
}

function matchesParticipant(
    playerId:
        string | undefined,
    selector:
        ObjectiveParticipantSelector,
    ownerPlayerId:
        string,
): boolean {
    if (
        selector === "ANY"
    ) {
        return true;
    }

    if (
        playerId === undefined
    ) {
        return false;
    }

    if (
        selector === "OWNER"
    ) {
        return playerId
            === ownerPlayerId;
    }

    return playerId
        !== ownerPlayerId;
}

function matchesEvent(
    event:
        GameEvent,
    ownerPlayerId:
        string,
    eventType:
        GameEvent["type"],
    actor:
        ObjectiveParticipantSelector,
    target:
        ObjectiveParticipantSelector,
): boolean {
    return (
        event.type
        === eventType
        && matchesParticipant(
            event.actorPlayerId,
            actor,
            ownerPlayerId,
        )
        && matchesParticipant(
            event.targetPlayerId,
            target,
            ownerPlayerId,
        )
    );
}

function readNumericPayload(
    event:
        GameEvent,
    field:
        string,
): number | undefined {
    const value =
        event.payload[
        field
        ];

    if (
        typeof value
        !== "number"
        || !Number.isFinite(
            value,
        )
    ) {
        return undefined;
    }

    return value;
}

function createNumericEvaluation(
    current:
        number,
    target:
        number,
): ObjectiveEvaluation {
    const safeCurrent =
        Math.max(
            0,
            current,
        );

    if (
        safeCurrent
        >= target
    ) {
        return {
            progress: {
                current:
                    safeCurrent,

                target,
            },

            status:
                "COMPLETED",
        };
    }

    return {
        progress: {
            current:
                safeCurrent,

            target,
        },

        status:
            safeCurrent > 0
                ? "IN_PROGRESS"
                : "PENDING",
    };
}

function isResolutionReached(
    resolution:
        ObjectiveResolution,

    assignment:
        ObjectiveAssignment,

    events:
        readonly GameEvent[],

    gameFinished:
        boolean,

    resolveActNumber?: GameAct,
): boolean {
    if (
        resolution === "GAME_END"
    ) {
        return gameFinished;
    }

    const actNumber =
        resolveActNumber
        ?? assignment.actNumber;

    if (
        actNumber === undefined
    ) {
        return false;
    }

    return events.some(
        event =>
            event.type
            === "ACT_COMPLETED"
            && event.actNumber
            === actNumber,
    );
}

function evaluateCondition(
    condition:
        ObjectiveCondition,
    input:
        EvaluateObjectiveInput,
): boolean {
    switch (
    condition.type
    ) {
        case "PLAYER_ALIVE": {
            const playerIds =
                condition.player
                    === "OWNER"
                    ? [
                        input.assignment
                            .playerId,
                    ]
                    : condition.player
                        === "ROLE_TARGET"
                        ? [
                            ...(
                                input.roleTargetPlayerIds
                                ?? []
                            ),
                        ]
                        : [
                            ...(
                                input.powerTargetPlayerIds
                                ?? []
                            ),
                        ];

            if (
                playerIds.length
                === 0
            ) {
                return false;
            }

            return playerIds.every(
                playerId => {
                    const player =
                        input.players.find(
                            candidate =>
                                candidate.id
                                === playerId,
                        );

                    if (
                        player === undefined
                    ) {
                        return false;
                    }

                    return player.alive
                        === condition.expected;
                },
            );
        }

        case "EXPEDITION_RESULT":
            if (
                input.expeditionWon
                === undefined
            ) {
                return false;
            }

            return condition.result
                === "WON"
                ? input.expeditionWon
                : !input.expeditionWon;
    }
}

function evaluateConditionRule(
    rule:
        ConditionObjectiveRule,
    input:
        EvaluateObjectiveInput,
    events:
        readonly GameEvent[],
): ObjectiveEvaluation {
    const results =
        rule.conditions.map(
            condition =>
                evaluateCondition(
                    condition,
                    input,
                ),
        );

    const satisfiedCount =
        results.filter(
            Boolean,
        ).length;

    const satisfied =
        rule.operator
            === "ALL"
            ? results.every(
                Boolean,
            )
            : results.some(
                Boolean,
            );

    const target =
        rule.operator
            === "ALL"
            ? rule.conditions.length
            : 1;

    if (
        rule.completeAt
        === "IMMEDIATE"
        && satisfied
    ) {
        return {
            progress: {
                current:
                    target,

                target,
            },

            status:
                "COMPLETED",
        };
    }

    const resolutionReached =
        isResolutionReached(
            rule.resolveAt,
            input.assignment,
            events,
            input.gameFinished,
            rule.resolveActNumber,
        );

    if (
        resolutionReached
    ) {
        return {
            progress: {
                current:
                    Math.min(
                        satisfiedCount,
                        target,
                    ),

                target,
            },

            status:
                satisfied
                    ? "COMPLETED"
                    : "FAILED",
        };
    }

    return {
        progress: {
            current:
                Math.min(
                    satisfiedCount,
                    target,
                ),

            target,
        },

        status:
            satisfiedCount > 0
                ? "IN_PROGRESS"
                : "PENDING",
    };
}

function evaluateRankingRule(
    rule:
        RankingObjectiveRule,
    input:
        EvaluateObjectiveInput,
    events:
        readonly GameEvent[],
): ObjectiveEvaluation {
    const resolutionReached =
        isResolutionReached(
            rule.resolveAt,
            input.assignment,
            events,
            input.gameFinished,
        );

    if (
        !resolutionReached
    ) {
        return {
            progress: {
                current:
                    0,

                target:
                    1,
            },

            status:
                "PENDING",
        };
    }

    const playerIds =
        new Set(
            input.players.map(
                player =>
                    player.id,
            ),
        );

    const values =
        new Map<
            string,
            number
        >();

    for (
        const player
        of input.players
    ) {
        values.set(
            player.id,
            0,
        );
    }

    let hasMetricData =
        false;

    const orderedEvents =
        [...events]
            .filter(
                event =>
                    event.type
                    === rule.eventType,
            )
            .sort(
                (
                    left,
                    right,
                ) => {
                    const difference =
                        left.createdAt.getTime()
                        - right.createdAt.getTime();

                    if (
                        difference !== 0
                    ) {
                        return difference;
                    }

                    return left.id.localeCompare(
                        right.id,
                    );
                },
            );

    for (
        const event
        of orderedEvents
    ) {
        const participantId =
            rule.participant
                === "ACTOR"
                ? event.actorPlayerId
                : event.targetPlayerId;

        if (
            participantId === undefined
            || !playerIds.has(
                participantId,
            )
        ) {
            continue;
        }

        if (
            rule.aggregation
            === "COUNT"
        ) {
            hasMetricData =
                true;

            values.set(
                participantId,
                (
                    values.get(
                        participantId,
                    )
                    ?? 0
                ) + 1,
            );

            continue;
        }

        const payloadField =
            rule.payloadField;

        if (
            payloadField === undefined
        ) {
            continue;
        }

        const value =
            readNumericPayload(
                event,
                payloadField,
            );

        if (
            value === undefined
        ) {
            continue;
        }

        hasMetricData =
            true;

        if (
            rule.aggregation
            === "SUM"
        ) {
            values.set(
                participantId,
                (
                    values.get(
                        participantId,
                    )
                    ?? 0
                ) + value,
            );

            continue;
        }

        /*
         * LATEST :
         * orderedEvents étant trié,
         * la dernière valeur écrase les
         * précédentes.
         */
        values.set(
            participantId,
            value,
        );
    }

    if (
        !hasMetricData
    ) {
        return {
            progress: {
                current:
                    0,

                target:
                    1,
            },

            status:
                "FAILED",
        };
    }

    const allValues =
        [
            ...values.values(),
        ];

    const bestValue =
        rule.order
            === "HIGHEST"
            ? Math.max(
                ...allValues,
            )
            : Math.min(
                ...allValues,
            );

    const winners =
        [
            ...values.entries(),
        ]
            .filter(
                (
                    [
                        ,
                        value,
                    ],
                ) =>
                    value
                    === bestValue,
            )
            .map(
                (
                    [
                        playerId,
                    ],
                ) =>
                    playerId,
            );

    const ownerWins =
        winners.includes(
            input.assignment.playerId,
        )
        && (
            rule.allowTies
            || winners.length === 1
        );

    return {
        progress: {
            current:
                ownerWins
                    ? 1
                    : 0,

            target:
                1,
        },

        status:
            ownerWins
                ? "COMPLETED"
                : "FAILED",
    };
}

export function evaluateObjective(
    input:
        EvaluateObjectiveInput,
): ObjectiveEvaluation {
    const rule =
        input.objective.rule;

    if (
        rule === undefined
    ) {
        throw new Error(
            `Objective ${input.objective.code} has no evaluation rule.`,
        );
    }

    /*
     * Seuls les événements validés ont
     * le droit d'affecter un objectif.
     */
    const verifiedEvents =
        input.events
            .filter(
                isVerifiedGameEvent,
            )
            .filter(
                event => {
                    if (
                        input.assignment
                            .objectiveType
                        !== "SECONDARY"
                    ) {
                        return true;
                    }

                    return event.actNumber
                        === input.assignment
                            .actNumber;
                },
            );

    switch (
    rule.type
    ) {
        case "EVENT_COUNT": {
            const matchingEvents =
                verifiedEvents.filter(
                    event =>
                        matchesEvent(
                            event,
                            input.assignment
                                .playerId,
                            rule.eventType,
                            rule.actor,
                            rule.target,
                        ),
                );

            return createNumericEvaluation(
                matchingEvents.length
                * rule.increment,
                rule.requiredCount,
            );
        }

        case "VALUE_SUM": {
            const total =
                verifiedEvents
                    .filter(
                        event =>
                            matchesEvent(
                                event,
                                input.assignment
                                    .playerId,
                                rule.eventType,
                                rule.actor,
                                rule.target,
                            ),
                    )
                    .reduce(
                        (
                            sum,
                            event,
                        ) =>
                            sum
                            + (
                                readNumericPayload(
                                    event,
                                    rule.payloadField,
                                )
                                ?? 0
                            ),
                        0,
                    );

            return createNumericEvaluation(
                total,
                rule.targetValue,
            );
        }

        case "RANKING":
            return evaluateRankingRule(
                rule,
                input,
                verifiedEvents,
            );

        case "CONDITION":
            return evaluateConditionRule(
                rule,
                input,
                verifiedEvents,
            );

        case "FORBIDDEN_EVENT": {
            const violation =
                verifiedEvents.some(
                    event =>
                        matchesEvent(
                            event,
                            input.assignment
                                .playerId,
                            rule.eventType,
                            rule.actor,
                            rule.target,
                        ),
                );

            if (
                violation
            ) {
                return {
                    progress: {
                        current:
                            0,

                        target:
                            1,
                    },

                    status:
                        "FAILED",
                };
            }

            const resolutionReached =
                isResolutionReached(
                    rule.resolveAt,
                    input.assignment,
                    verifiedEvents,
                    input.gameFinished,
                );

            return {
                progress: {
                    current:
                        resolutionReached
                            ? 1
                            : 0,

                    target:
                        1,
                },

                status:
                    resolutionReached
                        ? "COMPLETED"
                        : "PENDING",
            };
        }
    }
}

export function applyObjectiveEvaluation(
    assignment:
        ObjectiveAssignment,
    evaluation:
        ObjectiveEvaluation,
): void {
    assignment.progress = {
        ...evaluation.progress,
    };

    assignment.status =
        evaluation.status;
}