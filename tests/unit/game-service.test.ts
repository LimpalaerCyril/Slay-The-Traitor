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
    join,
} from "node:path";

import {
    loadCharacters,
    loadCompatibilityRules,
    loadContradictionBudget,
    loadObjectives,
    loadRoles,
} from "../../src/infrastructure/content/content-loader.js";

function createRole(
    code: string,
): Role {
    return {
        code,
        name: code,
        description: code,

        alignment:
            "LOYAL",

        tags: [],

        minimumPlayers: 2,
        maximumPlayers: 4,
    };
}

function createObjective(
    code: string,
    type:
        "PRIMARY" | "SECONDARY",
): Objective {
    return {
        code,
        name: code,
        description: code,

        category: "TEST",
        difficulty: "EASY",

        minimumPlayers: 2,
        maximumPlayers: 4,

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

        hiddenProgress: false,
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
                minimum: 0,
                maximum: 0,
            },

            "3": {
                minimum: 0,
                maximum: 0,
            },

            "4": {
                minimum: 0,
                maximum: 0,
            },
        },
    };
}

function createService():
    GameService {
    return new GameService(
        createContent(),
    );
}

function createGame(
    service: GameService,
): void {
    service.createGame({
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

function joinAliceAndBob(
    service: GameService,
): void {
    service.joinGame({
        gameId:
            "game-1",

        playerId:
            "alice",

        discordUserId:
            "discord-alice",

        characterSlug:
            "character-alpha",
    });

    service.joinGame({
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
        it("creates a lobby game", () => {
            const service =
                createService();

            const game =
                service.createGame({
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
            ).toBe("LOBBY");

            expect(
                game.players,
            ).toHaveLength(0);
        });

        it("allows players to join with a known character", () => {
            const service =
                createService();

            createGame(
                service,
            );

            const game =
                service.joinGame({
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
            ).toHaveLength(1);
        });

        it("rejects an unknown character", () => {
            const service =
                createService();

            createGame(
                service,
            );

            expect(() => {
                service.joinGame({
                    gameId:
                        "game-1",

                    playerId:
                        "alice",

                    discordUserId:
                        "discord-alice",

                    characterSlug:
                        "unknown-character",
                });
            }).toThrow(
                "Unknown character: unknown-character",
            );
        });

        it("only allows the host to prepare the game", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            expect(() => {
                service.prepareGame(
                    "game-1",
                    "discord-bob",
                );
            }).toThrow(
                "Only the game host can perform this action.",
            );
        });

        it("prepares roles and objectives and moves the game to READY", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            const game =
                service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

            expect(
                game.state,
            ).toBe("READY");

            expect(
                game.contradiction,
            ).toBe(0);
        });

        it("starts a prepared game", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            service.prepareGame(
                "game-1",
                "discord-alice",
            );

            const game =
                service.startGame(
                    "game-1",
                    "discord-alice",
                );

            expect(
                game.state,
            ).toBe("ACTIVE");
        });

        it("exposes only the requesting player's secrets", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            service.prepareGame(
                "game-1",
                "discord-alice",
            );

            service.startGame(
                "game-1",
                "discord-alice",
            );

            const secrets =
                service.getMySecrets(
                    "game-1",
                    "discord-alice",
                );

            expect(
                secrets.playerId,
            ).toBe("alice");

            expect(
                secrets.role,
            ).toBeDefined();

            expect(
                secrets.objectives,
            ).toHaveLength(2);

            expect(
                secrets.objectives.some(
                    entry =>
                        entry.assignment
                            .objectiveType
                        === "PRIMARY",
                ),
            ).toBe(true);

            expect(
                secrets.objectives.some(
                    entry =>
                        entry.assignment
                            .objectiveType
                        === "SECONDARY",
                ),
            ).toBe(true);
        });

        it("does not expose secrets before the game is active", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            service.prepareGame(
                "game-1",
                "discord-alice",
            );

            expect(() => {
                service.getMySecrets(
                    "game-1",
                    "discord-alice",
                );
            }).toThrow(
                "Secrets are only available during an active game.",
            );
        });

        it("rejects secret access from someone outside the game", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            service.prepareGame(
                "game-1",
                "discord-alice",
            );

            service.startGame(
                "game-1",
                "discord-alice",
            );

            expect(() => {
                service.getMySecrets(
                    "game-1",
                    "discord-eve",
                );
            }).toThrow(
                "Discord user is not part of this game.",
            );
        });

        it("is deterministic with the same seed and players", () => {
            const first =
                createService();

            const second =
                createService();

            createGame(first);
            createGame(second);

            joinAliceAndBob(first);
            joinAliceAndBob(second);

            first.prepareGame(
                "game-1",
                "discord-alice",
            );

            second.prepareGame(
                "game-1",
                "discord-alice",
            );

            first.startGame(
                "game-1",
                "discord-alice",
            );

            second.startGame(
                "game-1",
                "discord-alice",
            );

            const firstSecrets =
                first.getMySecrets(
                    "game-1",
                    "discord-alice",
                );

            const secondSecrets =
                second.getMySecrets(
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
                    entry =>
                        entry.objective.code,
                ),
            ).toEqual(
                secondSecrets.objectives.map(
                    entry =>
                        entry.objective.code,
                ),
            );
        });

        it("can prepare and start a two-player game using the real content files", async () => {
            const characters =
                await loadCharacters(
                    join(
                        process.cwd(),
                        "content",
                        "characters",
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

            const service =
                new GameService({
                    characters,
                    roles,
                    objectives,
                    compatibilityRules,
                    contradictionBudget,
                });

            service.createGame({
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

            service.joinGame({
                gameId:
                    "real-game",

                playerId:
                    "alice",

                discordUserId:
                    "discord-alice",

                characterSlug:
                    character.slug,
            });

            service.joinGame({
                gameId:
                    "real-game",

                playerId:
                    "bob",

                discordUserId:
                    "discord-bob",

                characterSlug:
                    character.slug,
            });

            service.prepareGame(
                "real-game",
                "discord-alice",
            );

            const game =
                service.startGame(
                    "real-game",
                    "discord-alice",
                );

            expect(
                game.state,
            ).toBe("ACTIVE");

            const alice =
                service.getMySecrets(
                    "real-game",
                    "discord-alice",
                );

            expect(
                alice.role,
            ).toBeDefined();

            expect(
                alice.objectives,
            ).toHaveLength(2);
        });

        it("finds the current game by Discord channel", () => {
            const service =
                createService();

            createGame(
                service,
            );

            const game =
                service.getCurrentGameByChannel(
                    "guild-1",
                    "channel-1",
                );

            expect(
                game.id,
            ).toBe("game-1");
        });

        it("prevents two open games in the same channel", () => {
            const service =
                createService();

            createGame(
                service,
            );

            expect(() => {
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
                });
            }).toThrow(
                "A game is already open in this channel.",
            );
        });

        it("allows a new game after the previous game is cancelled", () => {
            const service =
                createService();

            createGame(
                service,
            );

            service.cancelGame(
                "game-1",
                "discord-alice",
            );

            const game =
                service.createGame({
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
            ).toBe("LOBBY");
        });

        it("stores the Discord lobby message id", () => {
            const service =
                createService();

            createGame(
                service,
            );

            const game =
                service.registerLobbyMessage(
                    "game-1",
                    "message-123",
                );

            expect(
                game.lobbyMessageId,
            ).toBe(
                "message-123",
            );
        });

        it("reveals all players after the game finishes", () => {
            const service =
                createService();

            createGame(
                service,
            );

            joinAliceAndBob(
                service,
            );

            service.prepareGame(
                "game-1",
                "discord-alice",
            );

            service.startGame(
                "game-1",
                "discord-alice",
            );

            service.finishGame(
                "game-1",
                "discord-alice",
            );

            const reveal =
                service.getGameReveal(
                    "game-1",
                );

            expect(
                reveal,
            ).toHaveLength(2);

            expect(
                reveal.every(
                    entry =>
                        entry.secrets
                            .objectives
                            .length === 2,
                ),
            ).toBe(true);
        });
    },
);