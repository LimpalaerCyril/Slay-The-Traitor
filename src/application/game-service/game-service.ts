import type {
    Character,
} from "../../domain/characters/character.js";

import {
    Game,
} from "../../domain/games/game.js";

import type {
    GamePlayer,
} from "../../domain/games/game-player.js";

import type {
    GameState,
} from "../../domain/games/game-state.js";

import type {
    ContradictionBudget,
} from "../../domain/objectives/contradiction-budget.js";

import type {
    ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";

import type {
    ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import type {
    Objective,
} from "../../domain/objectives/objective.js";

import type {
    RoleAssignment,
} from "../../domain/roles/role-assignment.js";

import type {
    Role,
} from "../../domain/roles/role.js";

import type {
    GameRepository,
    GameSession,
} from "../game-repository/game-repository.js";

import {
    generateObjectiveComposition,
} from "../objective-assignment/objective-composition-engine.js";

import {
    assignRoles,
} from "../role-assignment/role-assignment-engine.js";

export interface GameServiceContent {
    readonly characters:
    readonly Character[];

    readonly roles:
    readonly Role[];

    readonly objectives:
    readonly Objective[];

    readonly compatibilityRules:
    readonly ObjectiveCompatibilityRule[];

    readonly contradictionBudget:
    ContradictionBudget;
}

export interface CreateGameInput {
    readonly gameId: string;
    readonly guildId: string;
    readonly textChannelId: string;

    readonly voiceChannelId?:
    string;

    readonly hostDiscordUserId:
    string;

    readonly seed: string;
}

export interface JoinGameInput {
    readonly gameId: string;

    readonly playerId: string;

    readonly discordUserId:
    string;

    readonly characterSlug:
    string;
}

export interface GameSnapshot {
    readonly id: string;

    readonly guildId: string;
    readonly textChannelId: string;

    readonly voiceChannelId:
    string | undefined;

    readonly lobbyMessageId:
    string | undefined;

    readonly hostDiscordUserId:
    string;

    readonly seed: string;

    readonly state:
    GameState;

    readonly players:
    readonly GamePlayer[];

    readonly contradiction:
    number | undefined;
}

export interface PlayerObjectiveSecret {
    readonly assignment:
    ObjectiveAssignment;

    readonly objective:
    Objective;
}

export interface PlayerSecrets {
    readonly playerId: string;

    readonly roleAssignment:
    RoleAssignment;

    readonly role:
    Role;

    readonly objectives:
    readonly PlayerObjectiveSecret[];
}

export interface PlayerReveal {
    readonly player:
    GamePlayer;

    readonly secrets:
    PlayerSecrets;
}

export class GameService {
    public constructor(
        private readonly content:
            GameServiceContent,

        private readonly repository:
            GameRepository,
    ) { }

    public getCharacters():
        readonly Character[] {
        return this.content.characters.map(
            character => ({
                ...character,
            }),
        );
    }

    public getCharacter(
        characterSlug: string,
    ): Character | undefined {
        const character =
            this.content.characters.find(
                candidate =>
                    candidate.slug
                    === characterSlug,
            );

        return character === undefined
            ? undefined
            : {
                ...character,
            };
    }

    public async createGame(
        input: CreateGameInput,
    ): Promise<GameSnapshot> {
        if (
            input.seed.trim().length
            === 0
        ) {
            throw new Error(
                "Game seed cannot be empty.",
            );
        }

        const gameWithSameId =
            await this.repository
                .findById(
                    input.gameId,
                );

        if (
            gameWithSameId !== undefined
        ) {
            throw new Error(
                `Game already exists: ${input.gameId}`,
            );
        }

        const existingGame =
            await this.repository
                .findOpenByChannel(
                    input.guildId,
                    input.textChannelId,
                );

        if (
            existingGame !== undefined
        ) {
            throw new Error(
                "A game is already open in this channel.",
            );
        }

        const session:
            GameSession = {
            id:
                input.gameId,

            guildId:
                input.guildId,

            textChannelId:
                input.textChannelId,

            voiceChannelId:
                input.voiceChannelId,

            lobbyMessageId:
                undefined,

            hostDiscordUserId:
                input.hostDiscordUserId,

            seed:
                input.seed,

            contradiction:
                undefined,

            game:
                new Game(),
        };

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async joinGame(
        input: JoinGameInput,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                input.gameId,
            );

        this.assertCharacterExists(
            input.characterSlug,
        );

        session.game.addPlayer({
            id:
                input.playerId,

            discordUserId:
                input.discordUserId,

            characterSlug:
                input.characterSlug,

            alive:
                true,
        });

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async leaveGame(
        gameId: string,
        discordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        session.game.removePlayer(
            player.id,
        );

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async changeCharacter(
        gameId: string,
        discordUserId: string,
        characterSlug: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertCharacterExists(
            characterSlug,
        );

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        session.game.changeCharacter(
            player.id,
            characterSlug,
        );

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async prepareGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        if (
            session.game.state
            !== "LOBBY"
        ) {
            throw new Error(
                "Only a lobby game can be prepared.",
            );
        }

        const players =
            session.game.getPlayers();

        if (
            players.length < 2
        ) {
            throw new Error(
                "At least two players are required.",
            );
        }

        const roleAssignments =
            assignRoles({
                seed:
                    `${session.seed}:roles`,

                players,

                roles:
                    this.content.roles,
            });

        const objectiveComposition =
            generateObjectiveComposition({
                seed:
                    `${session.seed}:objectives`,

                players,

                objectives:
                    this.content.objectives,

                compatibilityRules:
                    this.content
                        .compatibilityRules,

                contradictionBudget:
                    this.content
                        .contradictionBudget,
            });

        session.game.lockRoster();

        session.game
            .setSecretAssignments(
                roleAssignments,
                objectiveComposition
                    .assignments,
            );

        session.contradiction =
            objectiveComposition
                .contradiction;

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async startGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        session.game.start();

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async finishGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        session.game.finish();

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async cancelGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        session.game.cancel();

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async registerLobbyMessage(
        gameId: string,
        messageId: string,
    ): Promise<GameSnapshot> {
        if (
            messageId.trim().length
            === 0
        ) {
            throw new Error(
                "Lobby message id cannot be empty.",
            );
        }

        const session =
            await this.getSession(
                gameId,
            );

        session.lobbyMessageId =
            messageId;

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async getGameSnapshot(
        gameId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        return this.createSnapshot(
            session,
        );
    }

    public async getCurrentGameByChannel(
        guildId: string,
        textChannelId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.repository
                .findOpenByChannel(
                    guildId,
                    textChannelId,
                );

        if (
            session === undefined
        ) {
            throw new Error(
                "No active game exists in this channel.",
            );
        }

        return this.createSnapshot(
            session,
        );
    }

    public async getMySecrets(
        gameId: string,
        discordUserId: string,
    ): Promise<PlayerSecrets> {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "ACTIVE"
        ) {
            throw new Error(
                "Secrets are only available during an active game.",
            );
        }

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        return this.createPlayerSecrets(
            session,
            player,
        );
    }

    public async getGameReveal(
        gameId: string,
    ): Promise<
        readonly PlayerReveal[]
    > {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "FINISHED"
        ) {
            throw new Error(
                "Game reveal is only available after the game has finished.",
            );
        }

        return session.game
            .getPlayers()
            .map(
                player => ({
                    player: {
                        ...player,
                    },

                    secrets:
                        this.createPlayerSecrets(
                            session,
                            player,
                        ),
                }),
            );
    }

    private async getSession(
        gameId: string,
    ): Promise<GameSession> {
        const session =
            await this.repository
                .findById(
                    gameId,
                );

        if (
            session === undefined
        ) {
            throw new Error(
                `Unknown game: ${gameId}`,
            );
        }

        return session;
    }

    private findPlayerByDiscordUserId(
        session: GameSession,
        discordUserId: string,
    ): GamePlayer {
        const player =
            session.game
                .getPlayers()
                .find(
                    candidate =>
                        candidate.discordUserId
                        === discordUserId,
                );

        if (
            player === undefined
        ) {
            throw new Error(
                "Discord user is not part of this game.",
            );
        }

        return player;
    }

    private assertCharacterExists(
        characterSlug: string,
    ): void {
        const exists =
            this.content.characters
                .some(
                    character =>
                        character.slug
                        === characterSlug,
                );

        if (!exists) {
            throw new Error(
                `Unknown character: ${characterSlug}`,
            );
        }
    }

    private assertHost(
        session: GameSession,
        discordUserId: string,
    ): void {
        if (
            session.hostDiscordUserId
            !== discordUserId
        ) {
            throw new Error(
                "Only the game host can perform this action.",
            );
        }
    }

    private createPlayerSecrets(
        session: GameSession,
        player: GamePlayer,
    ): PlayerSecrets {
        const roleAssignment =
            session.game
                .getRoleAssignmentForPlayer(
                    player.id,
                );

        if (
            roleAssignment === undefined
        ) {
            throw new Error(
                `No role assignment found for player ${player.id}.`,
            );
        }

        const role =
            this.content.roles.find(
                definition =>
                    definition.code
                    === roleAssignment.roleCode,
            );

        if (
            role === undefined
        ) {
            throw new Error(
                `Unknown role definition: ${roleAssignment.roleCode}`,
            );
        }

        const objectiveAssignments =
            session.game
                .getObjectiveAssignmentsForPlayer(
                    player.id,
                );

        const objectives =
            objectiveAssignments.map(
                assignment => {
                    const objective =
                        this.content
                            .objectives
                            .find(
                                definition =>
                                    definition.code
                                    === assignment
                                        .objectiveCode,
                            );

                    if (
                        objective === undefined
                    ) {
                        throw new Error(
                            `Unknown objective definition: ${assignment.objectiveCode}`,
                        );
                    }

                    return {
                        assignment,
                        objective,
                    };
                },
            );

        return {
            playerId:
                player.id,

            roleAssignment: {
                ...roleAssignment,
            },

            role,

            objectives,
        };
    }

    private createSnapshot(
        session: GameSession,
    ): GameSnapshot {
        return {
            id:
                session.id,

            guildId:
                session.guildId,

            textChannelId:
                session.textChannelId,

            voiceChannelId:
                session.voiceChannelId,

            lobbyMessageId:
                session.lobbyMessageId,

            hostDiscordUserId:
                session.hostDiscordUserId,

            seed:
                session.seed,

            state:
                session.game.state,

            players:
                session.game
                    .getPlayers()
                    .map(
                        player => ({
                            ...player,
                        }),
                    ),

            contradiction:
                session.contradiction,
        };
    }
}