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

export interface GameData {
    readonly state:
    GameState;

    readonly players:
    readonly GamePlayer[];

    readonly roleAssignments:
    readonly RoleAssignment[];

    readonly objectiveAssignments:
    readonly ObjectiveAssignment[];

    readonly secretAssignmentsPrepared:
    boolean;
}

export class Game {
    private _state: GameState =
        "LOBBY";

    private readonly players:
        GamePlayer[] = [];

    private roleAssignments:
        RoleAssignment[] = [];

    private objectiveAssignments:
        ObjectiveAssignment[] = [];

    private _secretAssignmentsPrepared =
        false;

    public get state(): GameState {
        return this._state;
    }

    public get secretAssignmentsPrepared():
        boolean {
        return this._secretAssignmentsPrepared;
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

        game._secretAssignmentsPrepared =
            data.secretAssignmentsPrepared;

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

            secretAssignmentsPrepared:
                this._secretAssignmentsPrepared,
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

        this._secretAssignmentsPrepared =
            true;
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
        if (
            assignments.length
            !== this.players.length * 2
        ) {
            throw new Error(
                "Every player must receive one primary and one secondary objective.",
            );
        }

        const playerIds =
            new Set(
                this.players.map(
                    player => player.id,
                ),
            );

        for (
            const player
            of this.players
        ) {
            const playerAssignments =
                assignments.filter(
                    assignment =>
                        assignment.playerId
                        === player.id,
                );

            const primaryCount =
                playerAssignments.filter(
                    assignment =>
                        assignment.objectiveType
                        === "PRIMARY",
                ).length;

            const secondaryCount =
                playerAssignments.filter(
                    assignment =>
                        assignment.objectiveType
                        === "SECONDARY",
                ).length;

            if (
                primaryCount !== 1
                || secondaryCount !== 1
            ) {
                throw new Error(
                    `Player ${player.id} must receive exactly one primary and one secondary objective.`,
                );
            }
        }

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
                    `Unknown player in objective assignment: ${assignment.playerId}`,
                );
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
            this._state === "READY"
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
            this._secretAssignmentsPrepared
        ) {
            this.validateRoleAssignments(
                this.roleAssignments,
            );

            this.validateObjectiveAssignments(
                this.objectiveAssignments,
            );
        } else if (
            this.roleAssignments.length > 0
            || this.objectiveAssignments.length > 0
        ) {
            throw new Error(
                "Restored game contains secret assignments but is not marked as prepared.",
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
}