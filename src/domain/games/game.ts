import type {
    ObjectiveAssignment,
} from "../objectives/objective-assignments.js";

import type {
    RoleAssignment,
} from "../roles/role-assignment.js";

import type {
    GamePlayer,
} from "./game-player.js";

import type {
    GameState,
} from "./game-state.js";

import type {
    GameAct,
} from "./game-act.js";

import type {
    PowerAssignment,
} from "../powers/power-assignment.js";

export interface GameData {
    readonly state:
    GameState;

    readonly players:
    readonly GamePlayer[];

    readonly roleAssignments:
    readonly RoleAssignment[];

    readonly objectiveAssignments:
    readonly ObjectiveAssignment[];

    readonly secretAssignmentsPrepared: boolean;

    readonly currentAct?: GameAct;

    readonly powerAssignments?: readonly PowerAssignment[];
}

export class Game {
    private _state: GameState = "LOBBY";

    private readonly players: GamePlayer[] = [];

    private roleAssignments: RoleAssignment[] = [];

    private objectiveAssignments: ObjectiveAssignment[] = [];

    private powerAssignments: PowerAssignment[] = [];

    private _secretAssignmentsPrepared = false;

    private _currentAct: GameAct | undefined;

    public get state(): GameState {
        return this._state;
    }

    public get secretAssignmentsPrepared():
        boolean {
        return this._secretAssignmentsPrepared;
    }

    public get currentAct():
        GameAct | undefined {
        return this._currentAct;
    }

    public static restore(
        data: GameData,
    ): Game {
        const game =
            new Game();

        game._state =
            data.state;

        game.players.push(
            ...data.players.map(
                player => ({
                    ...player,
                }),
            ),
        );

        game.roleAssignments =
            data.roleAssignments.map(
                assignment => ({
                    ...assignment,
                }),
            );

        game.objectiveAssignments =
            data.objectiveAssignments.map(
                assignment => ({
                    ...assignment,

                    progress: {
                        ...assignment.progress,
                    },
                }),
            );

        game.powerAssignments =
            (
                data.powerAssignments
                ?? []
            ).map(
                assignment => ({
                    ...assignment,

                    targetPlayerIds: [
                        ...assignment
                            .targetPlayerIds,
                    ],
                }),
            );

        game._secretAssignmentsPrepared =
            data.secretAssignmentsPrepared;

        game._currentAct =
            data.currentAct;

        game.validateRestoredData();

        return game;
    }

    public exportData():
        GameData {
        return {
            state:
                this._state,

            players:
                this.players.map(
                    player => ({
                        ...player,
                    }),
                ),

            roleAssignments:
                this.roleAssignments.map(
                    assignment => ({
                        ...assignment,
                    }),
                ),

            objectiveAssignments:
                this.objectiveAssignments.map(
                    assignment => ({
                        ...assignment,

                        progress: {
                            ...assignment.progress,
                        },
                    }),
                ),

            powerAssignments:
                this.powerAssignments
                    .map(
                        assignment => ({
                            ...assignment,

                            targetPlayerIds: [
                                ...assignment
                                    .targetPlayerIds,
                            ],
                        }),
                    ),

            secretAssignmentsPrepared:
                this._secretAssignmentsPrepared,

            ...(
                this._currentAct
                    === undefined
                    ? {}
                    : {
                        currentAct:
                            this._currentAct,
                    }
            ),
        };
    }

    public addPlayer(
        player: GamePlayer,
    ): void {
        if (
            this._state !== "LOBBY"
        ) {
            throw new Error(
                "Players can only join during the lobby.",
            );
        }

        if (
            this.players.length >= 4
        ) {
            throw new Error(
                "A game cannot have more than four players.",
            );
        }

        const duplicateId =
            this.players.some(
                existingPlayer =>
                    existingPlayer.id
                    === player.id,
            );

        if (duplicateId) {
            throw new Error(
                "Player id already exists in this game.",
            );
        }

        const alreadyJoined =
            this.players.some(
                existingPlayer =>
                    existingPlayer.discordUserId
                    === player.discordUserId,
            );

        if (alreadyJoined) {
            throw new Error(
                "Player already joined this game.",
            );
        }

        if (
            player.characterSlug.trim()
                .length === 0
        ) {
            throw new Error(
                "Player character cannot be empty.",
            );
        }

        this.players.push({
            ...player,
        });
    }

    public removePlayer(
        playerId: string,
    ): void {
        if (
            this._state !== "LOBBY"
        ) {
            throw new Error(
                "Players can only leave during the lobby.",
            );
        }

        const index =
            this.players.findIndex(
                player =>
                    player.id === playerId,
            );

        if (index === -1) {
            throw new Error(
                "Player is not part of this game.",
            );
        }

        this.players.splice(
            index,
            1,
        );
    }

    public changeCharacter(
        playerId: string,
        characterSlug: string,
    ): void {
        if (
            this._state !== "LOBBY"
        ) {
            throw new Error(
                "Character can only be changed during the lobby.",
            );
        }

        if (
            characterSlug.trim()
                .length === 0
        ) {
            throw new Error(
                "Player character cannot be empty.",
            );
        }

        const index =
            this.players.findIndex(
                player =>
                    player.id === playerId,
            );

        if (index === -1) {
            throw new Error(
                "Player is not part of this game.",
            );
        }

        const player =
            this.players[index]!;

        this.players[index] = {
            ...player,
            characterSlug,
        };
    }

    public markPlayerDead(
        playerId:
            string,
    ): void {
        if (
            this._state !== "ACTIVE"
            && this._state !== "VOTING"
        ) {
            throw new Error(
                "A player can only die during an active game.",
            );
        }

        const index =
            this.players.findIndex(
                player =>
                    player.id
                    === playerId,
            );

        const player =
            this.players[
            index
            ];

        if (
            index < 0
            || player === undefined
        ) {
            throw new Error(
                `Unknown player: ${playerId}`,
            );
        }

        /*
         * Idempotent :
         * recevoir deux fois la même information
         * ne doit pas ressusciter/casser le joueur.
         */
        if (
            !player.alive
        ) {
            return;
        }

        this.players[
            index
        ] = {
            ...player,

            alive:
                false,
        };
    }

    public lockRoster(): void {
        if (
            this._state !== "LOBBY"
        ) {
            throw new Error(
                "Roster can only be locked from the lobby.",
            );
        }

        if (
            this.players.length < 2
        ) {
            throw new Error(
                "At least two players are required.",
            );
        }

        this._state = "READY";
    }

    public setSecretAssignments(
        roleAssignments:
            readonly RoleAssignment[],

        objectiveAssignments:
            readonly ObjectiveAssignment[],

        powerAssignments:
            readonly PowerAssignment[] = [],
    ): void {
        if (
            this._state !== "READY"
        ) {
            throw new Error(
                "Secret assignments can only be prepared when the game is ready.",
            );
        }

        this.validateRoleAssignments(
            roleAssignments,
        );

        this.validateObjectiveAssignments(
            objectiveAssignments,
        );

        this.validatePowerAssignments(
            powerAssignments,
        );

        if (
            powerAssignments.some(
                assignment =>
                    !assignment.setupCompleted,
            )
        ) {
            throw new Error(
                "Secret assignments cannot contain an incomplete power setup.",
            );
        }

        this.roleAssignments =
            roleAssignments.map(
                assignment => ({
                    ...assignment,
                }),
            );

        this.objectiveAssignments =
            objectiveAssignments.map(
                assignment => ({
                    ...assignment,

                    progress: {
                        ...assignment.progress,
                    },
                }),
            );

        this.powerAssignments =
            powerAssignments.map(
                assignment => ({
                    ...assignment,

                    targetPlayerIds: [
                        ...assignment
                            .targetPlayerIds,
                    ],
                }),
            );

        this._secretAssignmentsPrepared =
            true;

        this._currentAct =
            1;
    }

    public start(): void {
        if (
            this._state !== "READY"
        ) {
            throw new Error(
                "Game can only start when ready.",
            );
        }

        if (
            !this._secretAssignmentsPrepared
        ) {
            throw new Error(
                "Secret assignments must be prepared before starting the game.",
            );
        }

        if (
            !this.arePowerSetupsComplete()
        ) {
            throw new Error(
                "Secret assignments cannot contain an incomplete power setup.",
            );
        }

        this._state = "ACTIVE";
    }

    public finish(): void {
        if (
            this._state !== "ACTIVE"
        ) {
            throw new Error(
                "Only an active game can be finished.",
            );
        }

        this._state = "FINISHED";
    }

    public cancel(): void {
        if (
            this._state === "FINISHED"
            || this._state === "CANCELLED"
        ) {
            throw new Error(
                "A finished or cancelled game cannot be cancelled.",
            );
        }

        this._state = "CANCELLED";
    }

    public getPlayers():
        readonly GamePlayer[] {
        return this.players;
    }

    public getRoleAssignmentForPlayer(
        playerId: string,
    ): RoleAssignment | undefined {
        return this.roleAssignments.find(
            assignment =>
                assignment.playerId
                === playerId,
        );
    }

    public getObjectiveAssignmentsForPlayer(
        playerId: string,
    ): readonly ObjectiveAssignment[] {
        return this.objectiveAssignments
            .filter(
                assignment =>
                    assignment.playerId
                    === playerId,
            )
            .map(
                assignment => ({
                    ...assignment,

                    progress: {
                        ...assignment.progress,
                    },
                }),
            );
    }

    public replaceObjectiveAssignment(
        assignment:
            ObjectiveAssignment,
    ): void {
        const index =
            this.objectiveAssignments
                .findIndex(
                    candidate =>
                        candidate.playerId
                        === assignment.playerId
                        && candidate.objectiveCode
                        === assignment.objectiveCode
                        && candidate.objectiveType
                        === assignment.objectiveType
                        && candidate.actNumber
                        === assignment.actNumber,
                );

        if (
            index < 0
        ) {
            throw new Error(
                `Unknown objective assignment: ${assignment.playerId}/${assignment.objectiveCode}`,
            );
        }

        if (
            assignment.progress.current
            < 0
        ) {
            throw new Error(
                "Objective progress cannot be negative.",
            );
        }

        if (
            assignment.progress.target
            <= 0
        ) {
            throw new Error(
                "Objective progress target must be positive.",
            );
        }

        this.objectiveAssignments[
            index
        ] = {
            ...assignment,

            progress: {
                ...assignment.progress,
            },
        };
    }

    public advanceAct(
        nextAct:
            GameAct,

        secondaryAssignments:
            readonly ObjectiveAssignment[],
    ): void {
        if (
            this._state
            !== "ACTIVE"
        ) {
            throw new Error(
                "Acts can only advance during an active game.",
            );
        }

        const currentAct =
            this._currentAct;

        if (
            currentAct === undefined
        ) {
            throw new Error(
                "Cannot advance a game without a current act.",
            );
        }

        if (
            currentAct === 3
        ) {
            throw new Error(
                "Act 3 is already the final act.",
            );
        }

        const expectedNextAct:
            GameAct =
            currentAct === 1
                ? 2
                : 3;

        if (
            nextAct
            !== expectedNextAct
        ) {
            throw new Error(
                `Expected act ${expectedNextAct}, received act ${nextAct}.`,
            );
        }

        if (
            secondaryAssignments.length
            !== this.players.length
        ) {
            throw new Error(
                `Every player must receive a secondary objective for act ${nextAct}.`,
            );
        }

        const assignedPlayers =
            new Set<string>();

        for (
            const assignment
            of secondaryAssignments
        ) {
            if (
                assignment.objectiveType
                !== "SECONDARY"
            ) {
                throw new Error(
                    "Act advancement only accepts secondary objectives.",
                );
            }

            if (
                assignment.actNumber
                !== nextAct
            ) {
                throw new Error(
                    `Secondary objective must belong to act ${nextAct}.`,
                );
            }

            if (
                assignedPlayers.has(
                    assignment.playerId,
                )
            ) {
                throw new Error(
                    `Player ${assignment.playerId} received more than one secondary objective for act ${nextAct}.`,
                );
            }

            assignedPlayers.add(
                assignment.playerId,
            );
        }

        const updatedAssignments = [
            ...this.objectiveAssignments,

            ...secondaryAssignments.map(
                assignment => ({
                    ...assignment,

                    progress: {
                        ...assignment.progress,
                    },
                }),
            ),
        ];

        this.validateObjectiveAssignments(
            updatedAssignments,
        );

        this.objectiveAssignments =
            updatedAssignments;

        this._currentAct =
            nextAct;
    }

    public getPowerAssignments():
        readonly PowerAssignment[] {
        return this.powerAssignments
            .map(
                assignment => ({
                    ...assignment,

                    targetPlayerIds: [
                        ...assignment
                            .targetPlayerIds,
                    ],
                }),
            );
    }

    public getPowerAssignmentForPlayer(
        playerId: string,
    ): PowerAssignment | undefined {
        const assignment =
            this.powerAssignments
                .find(
                    candidate =>
                        candidate.playerId
                        === playerId,
                );

        if (
            assignment === undefined
        ) {
            return undefined;
        }

        return {
            ...assignment,

            targetPlayerIds: [
                ...assignment
                    .targetPlayerIds,
            ],
        };
    }

    private validateRoleAssignments(
        assignments:
            readonly RoleAssignment[],
    ): void {
        if (
            assignments.length
            !== this.players.length
        ) {
            throw new Error(
                "Every player must receive exactly one role.",
            );
        }

        const playerIds =
            new Set(
                this.players.map(
                    player => player.id,
                ),
            );

        const assignedPlayers =
            new Set<string>();

        const assignedRoles =
            new Set<string>();

        for (
            const assignment
            of assignments
        ) {
            if (
                !playerIds.has(
                    assignment.playerId,
                )
            ) {
                throw new Error(
                    `Unknown player in role assignment: ${assignment.playerId}`,
                );
            }

            if (
                assignedPlayers.has(
                    assignment.playerId,
                )
            ) {
                throw new Error(
                    `Player ${assignment.playerId} received more than one role.`,
                );
            }

            if (
                assignedRoles.has(
                    assignment.roleCode,
                )
            ) {
                throw new Error(
                    `Role ${assignment.roleCode} was assigned more than once.`,
                );
            }

            assignedPlayers.add(
                assignment.playerId,
            );

            assignedRoles.add(
                assignment.roleCode,
            );
        }
    }

    private validateObjectiveAssignments(
        assignments:
            readonly ObjectiveAssignment[],
    ): void {
        const playerIds =
            new Set(
                this.players.map(
                    player =>
                        player.id,
                ),
            );

        const primaryPlayers =
            new Set<string>();

        const secondaryKeys =
            new Set<string>();

        for (
            const assignment
            of assignments
        ) {
            if (
                !playerIds.has(
                    assignment.playerId,
                )
            ) {
                throw new Error(
                    `Objective assignment references unknown player: ${assignment.playerId}`,
                );
            }

            if (
                assignment.objectiveType
                === "PRIMARY"
            ) {
                if (
                    assignment.actNumber
                    !== undefined
                ) {
                    throw new Error(
                        "A primary objective cannot belong to an act.",
                    );
                }

                if (
                    primaryPlayers.has(
                        assignment.playerId,
                    )
                ) {
                    throw new Error(
                        `Player ${assignment.playerId} has more than one primary objective.`,
                    );
                }

                primaryPlayers.add(
                    assignment.playerId,
                );

                continue;
            }

            const actNumber =
                assignment.actNumber
                ?? 1;

            const key =
                `${assignment.playerId}:${actNumber}`;

            if (
                secondaryKeys.has(
                    key,
                )
            ) {
                throw new Error(
                    `Player ${assignment.playerId} has more than one secondary objective for act ${actNumber}.`,
                );
            }

            secondaryKeys.add(
                key,
            );
        }

        for (
            const player
            of this.players
        ) {
            if (
                !primaryPlayers.has(
                    player.id,
                )
            ) {
                throw new Error(
                    `Player ${player.id} must have exactly one primary objective.`,
                );
            }

            if (
                !secondaryKeys.has(
                    `${player.id}:1`,
                )
            ) {
                throw new Error(
                    `Player ${player.id} must have a secondary objective for act 1.`,
                );
            }
        }
    }

    private validatePowerAssignments(
        assignments:
            readonly PowerAssignment[],
    ): void {
        const playerIds =
            new Set(
                this.players.map(
                    player =>
                        player.id,
                ),
            );

        const assignedPlayers =
            new Set<string>();

        for (
            const assignment
            of assignments
        ) {
            if (
                !playerIds.has(
                    assignment.playerId,
                )
            ) {
                throw new Error(
                    `Power assignment references unknown player: ${assignment.playerId}`,
                );
            }

            if (
                assignedPlayers.has(
                    assignment.playerId,
                )
            ) {
                throw new Error(
                    `Player ${assignment.playerId} has more than one power assignment.`,
                );
            }

            assignedPlayers.add(
                assignment.playerId,
            );

            if (
                assignment.powerCode
                    .trim()
                    .length === 0
            ) {
                throw new Error(
                    "Power assignment must reference a power code.",
                );
            }

            if (
                !Number.isInteger(
                    assignment.uses,
                )
                || assignment.uses < 0
            ) {
                throw new Error(
                    "Power assignment uses must be a non-negative integer.",
                );
            }

            const uniqueTargets =
                new Set(
                    assignment
                        .targetPlayerIds,
                );

            if (
                uniqueTargets.size
                !== assignment
                    .targetPlayerIds
                    .length
            ) {
                throw new Error(
                    `Power assignment for player ${assignment.playerId} contains duplicate targets.`,
                );
            }

            for (
                const targetPlayerId
                of assignment
                    .targetPlayerIds
            ) {
                if (
                    !playerIds.has(
                        targetPlayerId,
                    )
                ) {
                    throw new Error(
                        `Power assignment references unknown target player: ${targetPlayerId}`,
                    );
                }
            }
        }
    }

    private validateRestoredData():
        void {
        if (
            this.players.length > 4
        ) {
            throw new Error(
                "A restored game cannot have more than four players.",
            );
        }

        if (
            this.powerAssignments.length > 0
        ) {
            this.validatePowerAssignments(
                this.powerAssignments,
            );
        }

        const stateRequiresCurrentAct =
            this._state === "READY"
            || this._state === "ACTIVE"
            || this._state === "VOTING"
            || this._state === "FINISHED";

        if (
            stateRequiresCurrentAct
            && this._currentAct
            === undefined
        ) {
            throw new Error(
                "Restored game state requires a current act.",
            );
        }

        if (
            this._state === "LOBBY"
            && this._currentAct
            !== undefined
        ) {
            throw new Error(
                "A restored lobby cannot already have a current act.",
            );
        }

        const playerIds =
            new Set<string>();

        const discordUserIds =
            new Set<string>();

        for (
            const player
            of this.players
        ) {
            if (
                playerIds.has(
                    player.id,
                )
            ) {
                throw new Error(
                    `Duplicate restored player id: ${player.id}`,
                );
            }

            if (
                discordUserIds.has(
                    player.discordUserId,
                )
            ) {
                throw new Error(
                    `Duplicate restored Discord user: ${player.discordUserId}`,
                );
            }

            if (
                player.characterSlug
                    .trim()
                    .length === 0
            ) {
                throw new Error(
                    "Restored player character cannot be empty.",
                );
            }

            playerIds.add(
                player.id,
            );

            discordUserIds.add(
                player.discordUserId,
            );
        }

        const stateRequiresRoster =
            this._state === "SETUP"
            || this._state === "READY"
            || this._state === "ACTIVE"
            || this._state === "VOTING"
            || this._state === "FINISHED";

        if (
            stateRequiresRoster
            && this.players.length < 2
        ) {
            throw new Error(
                "Restored game state requires at least two players.",
            );
        }

        if (
            this._state === "SETUP"
        ) {
            this.validateRoleAssignments(
                this.roleAssignments,
            );

            if (
                this.objectiveAssignments
                    .length > 0
            ) {
                throw new Error(
                    "A setup game cannot already contain objective assignments.",
                );
            }

            if (
                this._secretAssignmentsPrepared
            ) {
                throw new Error(
                    "A setup game cannot already have prepared secret assignments.",
                );
            }
        } else if (
            this._secretAssignmentsPrepared
        ) {
            this.validateRoleAssignments(
                this.roleAssignments,
            );

            this.validateObjectiveAssignments(
                this.objectiveAssignments,
            );

            if (
                !this.arePowerSetupsComplete()
            ) {
                throw new Error(
                    "A prepared game cannot contain an incomplete power setup.",
                );
            }
        } else if (
            this.roleAssignments.length > 0
            || this.objectiveAssignments.length > 0
            || this.powerAssignments.length > 0
        ) {
            throw new Error(
                "Restored game contains assignments but is not in a valid prepared state.",
            );
        }

        const stateRequiresSecrets =
            this._state === "READY"
            || this._state === "ACTIVE"
            || this._state === "VOTING"
            || this._state === "FINISHED";

        if (
            stateRequiresSecrets
            && !this._secretAssignmentsPrepared
        ) {
            throw new Error(
                "Restored game state requires secret assignments.",
            );
        }

        if (
            this._state === "LOBBY"
            && this._secretAssignmentsPrepared
        ) {
            throw new Error(
                "A restored lobby cannot already contain secret assignments.",
            );
        }
    }

    public beginSetup(
        roleAssignments:
            readonly RoleAssignment[],

        powerAssignments:
            readonly PowerAssignment[] = [],
    ): void {
        if (
            this._state
            !== "LOBBY"
        ) {
            throw new Error(
                "Role setup can only begin from the lobby.",
            );
        }

        if (
            this.players.length < 2
        ) {
            throw new Error(
                "At least two players are required.",
            );
        }

        this.validateRoleAssignments(
            roleAssignments,
        );

        this.validatePowerAssignments(
            powerAssignments,
        );

        this.roleAssignments =
            roleAssignments.map(
                assignment => ({
                    ...assignment,

                    targetPlayerIds:
                        assignment
                            .targetPlayerIds
                            === undefined
                            ? []
                            : [
                                ...assignment
                                    .targetPlayerIds,
                            ],
                }),
            );

        this.objectiveAssignments =
            [];

        this.powerAssignments =
            powerAssignments.map(
                assignment => ({
                    ...assignment,

                    targetPlayerIds: [
                        ...assignment
                            .targetPlayerIds,
                    ],
                }),
            );

        this._secretAssignmentsPrepared =
            false;

        this._currentAct =
            undefined;

        this._state =
            "SETUP";
    }

    public updateRoleSetup(
        playerId: string,
        variantCode: string,
        targetPlayerIds:
            readonly string[],
    ): void {
        if (
            this._state
            !== "SETUP"
        ) {
            throw new Error(
                "Role setup can only be changed during SETUP.",
            );
        }

        const index =
            this.roleAssignments
                .findIndex(
                    assignment =>
                        assignment.playerId
                        === playerId,
                );

        const current =
            this.roleAssignments[
            index
            ];

        if (
            index < 0
            || current === undefined
        ) {
            throw new Error(
                `No role assignment found for player ${playerId}.`,
            );
        }

        this.roleAssignments[
            index
        ] = {
            ...current,

            variantCode,

            targetPlayerIds: [
                ...targetPlayerIds,
            ],

            setupCompleted:
                true,
        };
    }

    public updatePowerSetup(
        playerId: string,
        targetPlayerIds:
            readonly string[],
    ): void {
        if (
            this._state
            !== "SETUP"
        ) {
            throw new Error(
                "Power setup can only be changed during SETUP.",
            );
        }

        const index =
            this.powerAssignments
                .findIndex(
                    assignment =>
                        assignment.playerId
                        === playerId,
                );

        const current =
            this.powerAssignments[
            index
            ];

        if (
            index < 0
            || current === undefined
        ) {
            throw new Error(
                `No power assignment found for player ${playerId}.`,
            );
        }

        const candidate:
            PowerAssignment = {
            ...current,

            targetPlayerIds: [
                ...targetPlayerIds,
            ],

            setupCompleted:
                true,
        };

        /*
         * On réutilise les invariants généraux
         * avant d'accepter la modification.
         */
        const updated =
            [
                ...this.powerAssignments,
            ];

        updated[
            index
        ] = candidate;

        this.validatePowerAssignments(
            updated,
        );

        this.powerAssignments =
            updated;
    }

    public arePowerSetupsComplete():
        boolean {
        return this.powerAssignments
            .every(
                assignment =>
                    assignment
                        .setupCompleted,
            );
    }

    public areSetupsComplete():
        boolean {
        return (
            this.areRoleSetupsComplete()
            && this.arePowerSetupsComplete()
        );
    }

    public areRoleSetupsComplete():
        boolean {
        return this.roleAssignments
            .every(
                assignment =>
                    assignment.setupCompleted
                    !== false,
            );
    }

    public completeSetup(
        objectiveAssignments:
            readonly ObjectiveAssignment[],
    ): void {
        if (
            this._state
            !== "SETUP"
        ) {
            throw new Error(
                "Role setup can only be completed during SETUP.",
            );
        }

        if (
            !this.areSetupsComplete()
        ) {
            throw new Error(
                "Every required setup must be completed before the game becomes ready.",
            );
        }

        this.validateObjectiveAssignments(
            objectiveAssignments,
        );

        this.objectiveAssignments =
            objectiveAssignments.map(
                assignment => ({
                    ...assignment,

                    progress: {
                        ...assignment.progress,
                    },
                }),
            );

        this._secretAssignmentsPrepared =
            true;

        this._currentAct =
            1;

        this._state =
            "READY";
    }
}