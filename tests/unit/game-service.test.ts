import {
    join,
} from "node:path";

import {
    describe,
    expect,
    it,
} from "vitest";

import {
    GameService,
    type GameServiceContent,
} from "../../src/application/game-service/game-service.js";

import type {
    Objective,
} from "../../src/domain/objectives/objective.js";

import type {
    Role,
} from "../../src/domain/roles/role.js";

import {
    loadCharacters,
    loadCompatibilityRules,
    loadContradictionBudget,
    loadObjectives,
    loadRoles,
} from "../../src/infrastructure/content/content-loader.js";

import {
    InMemoryGameRepository,
} from "../../src/infrastructure/database/in-memory-game-repository.js";

function createRole(
    code: string,
): Role {
    return {
        code,
        name:
            code,
        description:
            code,

        alignment:
            "LOYAL",

        tags: [],

        minimumPlayers:
            2,

        maximumPlayers:
            4,
    };
}

function createObjective(
    code: string,
    type:
        "PRIMARY" | "SECONDARY",
): Objective {
    return {
        code,
        name:
            code,
        description:
            code,

        category:
            "TEST",

        difficulty:
            "EASY",

        minimumPlayers:
            2,

        maximumPlayers:
            4,

        allowedTypes: [
            type,
        ],

        requiredEvents: [],

        verificationMode:
            "DISCORD",

        compatibilityTags: [],

        score:
            type === "PRIMARY"
                ? 100
                : 35,

        hiddenProgress:
            false,
    };
}

function createContent():
    GameServiceContent {
    return {
        characters: [
            {
                slug:
                    "character-alpha",

                name:
                    "Character Alpha",
            },

            {
                slug:
                    "character-beta",

                name:
                    "Character Beta",
            },
        ],

        roles: [
            createRole(
                "guardian",
            ),

            createRole(
                "miser",
            ),
        ],

        objectives: [
            createObjective(
                "primary",
                "PRIMARY",
            ),

            createObjective(
                "secondary",
                "SECONDARY",
            ),
        ],

        compatibilityRules: [],

        contradictionBudget: {
            "2": {
                minimum:
                    0,

                maximum:
                    0,
            },

            "3": {
                minimum:
                    0,

                maximum:
                    0,
            },

            "4": {
                minimum:
                    0,

                maximum:
                    0,
            },
        },
    };
}

function createService():
    GameService {
    return new GameService(
        createContent(),
        new InMemoryGameRepository(),
    );
}

async function createGame(
    service: GameService,
): Promise<void> {
    await service.createGame({
        gameId:
            "game-1",

        guildId:
            "guild-1",

        textChannelId:
            "channel-1",

        hostDiscordUserId:
            "discord-alice",

        seed:
            "test-seed",
    });
}

async function joinAliceAndBob(
    service: GameService,
): Promise<void> {
    await service.joinGame({
        gameId:
            "game-1",

        playerId:
            "alice",

        discordUserId:
            "discord-alice",

        characterSlug:
            "character-alpha",
    });

    await service.joinGame({
        gameId:
            "game-1",

        playerId:
            "bob",

        discordUserId:
            "discord-bob",

        characterSlug:
            "character-beta",
    });
}

describe(
    "GameService",
    () => {
        it(
            "creates a lobby game",
            async () => {
                const service =
                    createService();

                const game =
                    await service.createGame({
                        gameId:
                            "game-1",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-alice",

                        seed:
                            "test-seed",
                    });

                expect(
                    game.state,
                ).toBe(
                    "LOBBY",
                );

                expect(
                    game.players,
                ).toHaveLength(
                    0,
                );
            },
        );

        it(
            "allows players to join with a known character",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                const game =
                    await service.joinGame({
                        gameId:
                            "game-1",

                        playerId:
                            "alice",

                        discordUserId:
                            "discord-alice",

                        characterSlug:
                            "character-alpha",
                    });

                expect(
                    game.players,
                ).toHaveLength(
                    1,
                );
            },
        );

        it(
            "rejects an unknown character",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await expect(
                    service.joinGame({
                        gameId:
                            "game-1",

                        playerId:
                            "alice",

                        discordUserId:
                            "discord-alice",

                        characterSlug:
                            "unknown-character",
                    }),
                ).rejects.toThrow(
                    "Unknown character: unknown-character",
                );
            },
        );

        it(
            "only allows the host to prepare the game",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await expect(
                    service.prepareGame(
                        "game-1",
                        "discord-bob",
                    ),
                ).rejects.toThrow(
                    "Only the game host can perform this action.",
                );
            },
        );

        it(
            "prepares roles and objectives and moves the game to READY",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const game =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "READY",
                );

                expect(
                    game.contradiction,
                ).toBe(
                    0,
                );
            },
        );

        it(
            "starts a prepared game",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                const game =
                    await service.startGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "ACTIVE",
                );
            },
        );

        it(
            "exposes only the requesting player's secrets",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await service.startGame(
                    "game-1",
                    "discord-alice",
                );

                const secrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    secrets.playerId,
                ).toBe(
                    "alice",
                );

                expect(
                    secrets.role,
                ).toBeDefined();

                expect(
                    secrets.objectives,
                ).toHaveLength(
                    2,
                );

                expect(
                    secrets.objectives.some(
                        (entry) =>
                            entry.assignment
                                .objectiveType
                            === "PRIMARY",
                    ),
                ).toBe(
                    true,
                );

                expect(
                    secrets.objectives.some(
                        (entry) =>
                            entry.assignment
                                .objectiveType
                            === "SECONDARY",
                    ),
                ).toBe(
                    true,
                );
            },
        );

        it(
            "does not expose secrets before the game is active",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await expect(
                    service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    ),
                ).rejects.toThrow(
                    "Secrets are only available during an active game.",
                );
            },
        );

        it(
            "rejects secret access from someone outside the game",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await service.startGame(
                    "game-1",
                    "discord-alice",
                );

                await expect(
                    service.getMySecrets(
                        "game-1",
                        "discord-eve",
                    ),
                ).rejects.toThrow(
                    "Discord user is not part of this game.",
                );
            },
        );

        it(
            "is deterministic with the same seed and players",
            async () => {
                const first =
                    createService();

                const second =
                    createService();

                await createGame(
                    first,
                );

                await createGame(
                    second,
                );

                await joinAliceAndBob(
                    first,
                );

                await joinAliceAndBob(
                    second,
                );

                await first.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await second.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await first.startGame(
                    "game-1",
                    "discord-alice",
                );

                await second.startGame(
                    "game-1",
                    "discord-alice",
                );

                const firstSecrets =
                    await first.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                const secondSecrets =
                    await second.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    firstSecrets.role.code,
                ).toBe(
                    secondSecrets.role.code,
                );

                expect(
                    firstSecrets.objectives.map(
                        (entry) =>
                            entry.objective.code,
                    ),
                ).toEqual(
                    secondSecrets.objectives.map(
                        (entry) =>
                            entry.objective.code,
                    ),
                );
            },
        );

        it(
            "can prepare and start a two-player game using the real content files",
            async () => {
                const characters =
                    await loadCharacters(
                        join(
                            process.cwd(),
                            "content",
                            "characters",
                        ),
                    );

                const roles =
                    await loadRoles(
                        join(
                            process.cwd(),
                            "content",
                            "roles",
                        ),
                    );

                const objectives =
                    await loadObjectives(
                        join(
                            process.cwd(),
                            "content",
                            "objectives",
                        ),
                    );

                const compatibilityRules =
                    await loadCompatibilityRules(
                        join(
                            process.cwd(),
                            "content",
                            "balancing",
                            "compatibility-rules.json",
                        ),
                    );

                const contradictionBudget =
                    await loadContradictionBudget(
                        join(
                            process.cwd(),
                            "content",
                            "balancing",
                            "contradiction-budget.json",
                        ),
                    );

                const character =
                    characters[0];

                if (
                    character === undefined
                ) {
                    throw new Error(
                        "At least one character is required to run the real-content integration test.",
                    );
                }

                const service =
                    new GameService(
                        {
                            characters,
                            roles,
                            objectives,
                            compatibilityRules,
                            contradictionBudget,
                        },

                        new InMemoryGameRepository(),
                    );

                await service.createGame({
                    gameId:
                        "real-game",

                    guildId:
                        "guild-1",

                    textChannelId:
                        "channel-1",

                    hostDiscordUserId:
                        "discord-alice",

                    seed:
                        "real-content-seed",
                });

                /*
                 * Les doublons de personnages
                 * sont volontairement autorisés.
                 */
                await service.joinGame({
                    gameId:
                        "real-game",

                    playerId:
                        "alice",

                    discordUserId:
                        "discord-alice",

                    characterSlug:
                        character.slug,
                });

                await service.joinGame({
                    gameId:
                        "real-game",

                    playerId:
                        "bob",

                    discordUserId:
                        "discord-bob",

                    characterSlug:
                        character.slug,
                });

                await service.prepareGame(
                    "real-game",
                    "discord-alice",
                );

                const game =
                    await service.startGame(
                        "real-game",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "ACTIVE",
                );

                expect(
                    game.players,
                ).toHaveLength(
                    2,
                );

                expect(
                    game.players.every(
                        (player) =>
                            player.characterSlug
                            === character.slug,
                    ),
                ).toBe(
                    true,
                );

                const alice =
                    await service.getMySecrets(
                        "real-game",
                        "discord-alice",
                    );

                const bob =
                    await service.getMySecrets(
                        "real-game",
                        "discord-bob",
                    );

                expect(
                    alice.role,
                ).toBeDefined();

                expect(
                    bob.role,
                ).toBeDefined();

                expect(
                    alice.objectives,
                ).toHaveLength(
                    2,
                );

                expect(
                    bob.objectives,
                ).toHaveLength(
                    2,
                );
            },
        );

        it(
            "finds the current game by Discord channel",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                const game =
                    await service
                        .getCurrentGameByChannel(
                            "guild-1",
                            "channel-1",
                        );

                expect(
                    game.id,
                ).toBe(
                    "game-1",
                );
            },
        );

        it(
            "prevents two open games in the same channel",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await expect(
                    service.createGame({
                        gameId:
                            "game-2",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-bob",

                        seed:
                            "second-seed",
                    }),
                ).rejects.toThrow(
                    "A game is already open in this channel.",
                );
            },
        );

        it(
            "allows a new game after the previous game is cancelled",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await service.cancelGame(
                    "game-1",
                    "discord-alice",
                );

                const game =
                    await service.createGame({
                        gameId:
                            "game-2",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-alice",

                        seed:
                            "second-seed",
                    });

                expect(
                    game.state,
                ).toBe(
                    "LOBBY",
                );
            },
        );

        it(
            "stores the Discord lobby message id",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                const game =
                    await service
                        .registerLobbyMessage(
                            "game-1",
                            "message-123",
                        );

                expect(
                    game.lobbyMessageId,
                ).toBe(
                    "message-123",
                );
            },
        );

        it(
            "reveals all players after the game finishes",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await service.startGame(
                    "game-1",
                    "discord-alice",
                );

                await service.finishGame(
                    "game-1",
                    "discord-alice",
                );

                const reveal =
                    await service.getGameReveal(
                        "game-1",
                    );

                expect(
                    reveal,
                ).toHaveLength(
                    2,
                );

                expect(
                    reveal.every(
                        (entry) =>
                            entry.secrets
                                .objectives
                                .length === 2,
                    ),
                ).toBe(
                    true,
                );
            },
        );
    },
);