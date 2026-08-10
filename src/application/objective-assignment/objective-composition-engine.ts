import type {
    GamePlayer,
} from "../../domain/games/game-player.js";

import type {
    ContradictionBudget,
} from "../../domain/objectives/contradiction-budget.js";

import {
    createObjectiveAssignment,
    type ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";

import type {
    ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import {
    isObjectiveAvailableForPlayerCount,
    type Objective,
} from "../../domain/objectives/objective.js";

import {
    canObjectivesBeAssignedToSamePlayer,
} from "../objective-compatibility/objective-compatibility-engine.js";

import {
    calculatePartyContradiction,
    isContradictionWithinBudget,
} from "../objective-compatibility/party-contradiction-engine.js";

import {
    shuffleWithSeed,
} from "../role-assignment/seeded-random.js";

export interface GenerateObjectiveCompositionInput {
    readonly seed: string;

    readonly players:
    readonly GamePlayer[];

    readonly objectives:
    readonly Objective[];

    readonly compatibilityRules:
    readonly ObjectiveCompatibilityRule[];

    readonly contradictionBudget:
    ContradictionBudget;
}

export interface ObjectiveCompositionResult {
    readonly assignments:
    readonly ObjectiveAssignment[];

    readonly contradiction: number;
}

interface ObjectivePair {
    readonly primary: Objective;
    readonly secondary: Objective;
}

function compareStrings(
    left: string,
    right: string,
): number {
    if (left < right) {
        return -1;
    }

    if (left > right) {
        return 1;
    }

    return 0;
}

function assertUniquePlayerIds(
    players: readonly GamePlayer[],
): void {
    const ids =
        new Set<string>();

    for (const player of players) {
        if (ids.has(player.id)) {
            throw new Error(
                `Duplicate player id: ${player.id}`,
            );
        }

        ids.add(player.id);
    }
}

function assertUniqueObjectiveCodes(
    objectives: readonly Objective[],
): void {
    const codes =
        new Set<string>();

    for (
        const objective
        of objectives
    ) {
        if (
            codes.has(
                objective.code,
            )
        ) {
            throw new Error(
                `Duplicate objective code: ${objective.code}`,
            );
        }

        codes.add(
            objective.code,
        );
    }
}

function getEligibleObjectives(
    objectives:
        readonly Objective[],
    playerCount: number,
    type:
        "PRIMARY" | "SECONDARY",
): Objective[] {
    return objectives
        .filter(
            objective =>
                isObjectiveAvailableForPlayerCount(
                    objective,
                    playerCount,
                )
                && objective.allowedTypes.includes(
                    type,
                ),
        )
        .sort(
            (left, right) =>
                compareStrings(
                    left.code,
                    right.code,
                ),
        );
}

function createObjectivePairs(
    primaryObjectives:
        readonly Objective[],
    secondaryObjectives:
        readonly Objective[],
    compatibilityRules:
        readonly ObjectiveCompatibilityRule[],
): ObjectivePair[] {
    const pairs:
        ObjectivePair[] = [];

    for (
        const primary
        of primaryObjectives
    ) {
        for (
            const secondary
            of secondaryObjectives
        ) {
            if (
                primary.code
                === secondary.code
            ) {
                continue;
            }

            if (
                !canObjectivesBeAssignedToSamePlayer(
                    primary,
                    secondary,
                    compatibilityRules,
                )
            ) {
                continue;
            }

            pairs.push({
                primary,
                secondary,
            });
        }
    }

    return pairs;
}

function createAssignments(
    playerId: string,
    pair: ObjectivePair,
): readonly ObjectiveAssignment[] {
    return [
        createObjectiveAssignment(
            playerId,
            pair.primary,
            "PRIMARY",
        ),

        createObjectiveAssignment(
            playerId,
            pair.secondary,
            "SECONDARY",
        ),
    ];
}

export function generateObjectiveComposition(
    input:
        GenerateObjectiveCompositionInput,
): ObjectiveCompositionResult {
    const {
        seed,
        players,
        objectives,
        compatibilityRules,
        contradictionBudget,
    } = input;

    if (
        players.length < 2
        || players.length > 4
    ) {
        throw new Error(
            "Objective composition requires between two and four players.",
        );
    }

    assertUniquePlayerIds(
        players,
    );

    assertUniqueObjectiveCodes(
        objectives,
    );

    const playerCount =
        players.length;

    const orderedPlayers =
        [...players].sort(
            (left, right) =>
                compareStrings(
                    left.id,
                    right.id,
                ),
        );

    const primaryObjectives =
        getEligibleObjectives(
            objectives,
            playerCount,
            "PRIMARY",
        );

    const secondaryObjectives =
        getEligibleObjectives(
            objectives,
            playerCount,
            "SECONDARY",
        );

    if (
        primaryObjectives.length === 0
    ) {
        throw new Error(
            "No primary objective is available for this game.",
        );
    }

    if (
        secondaryObjectives.length === 0
    ) {
        throw new Error(
            "No secondary objective is available for this game.",
        );
    }

    const objectivePairs =
        createObjectivePairs(
            primaryObjectives,
            secondaryObjectives,
            compatibilityRules,
        );

    if (
        objectivePairs.length === 0
    ) {
        throw new Error(
            "No compatible objective pair is available for this game.",
        );
    }

    const range =
        contradictionBudget[
        String(
            playerCount,
        ) as "2" | "3" | "4"
        ];

    function search(
        playerIndex: number,
        assignments:
            readonly ObjectiveAssignment[],
    ): ObjectiveCompositionResult | undefined {
        if (
            playerIndex
            >= orderedPlayers.length
        ) {
            const result =
                calculatePartyContradiction(
                    assignments,
                    objectives,
                    compatibilityRules,
                );

            if (
                !isContradictionWithinBudget(
                    result.total,
                    playerCount,
                    contradictionBudget,
                )
            ) {
                return undefined;
            }

            return {
                assignments,
                contradiction:
                    result.total,
            };
        }

        const player =
            orderedPlayers[
            playerIndex
            ]!;

        const candidates =
            shuffleWithSeed(
                objectivePairs,
                `${seed}:objective-composition:${player.id}`,
            );

        for (
            const pair
            of candidates
        ) {
            const nextAssignments = [
                ...assignments,

                ...createAssignments(
                    player.id,
                    pair,
                ),
            ];

            const partialContradiction =
                calculatePartyContradiction(
                    nextAssignments,
                    objectives,
                    compatibilityRules,
                );

            if (
                partialContradiction.total
                > range.maximum
            ) {
                continue;
            }

            const result =
                search(
                    playerIndex + 1,
                    nextAssignments,
                );

            if (
                result !== undefined
            ) {
                return result;
            }
        }

        return undefined;
    }

    const result =
        search(
            0,
            [],
        );

    if (
        result === undefined
    ) {
        throw new Error(
            `No objective composition satisfies contradiction budget ${range.minimum}-${range.maximum} for ${playerCount} players.`,
        );
    }

    return result;
}