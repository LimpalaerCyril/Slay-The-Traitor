import { describe, expect, it } from "vitest";

import {
    assignRoles,
} from "../../src/application/role-assignment/role-assignment-engine.js";

import type {
    GamePlayer,
} from "../../src/domain/games/game-player.js";

import type {
    Role,
} from "../../src/domain/roles/role.js";

function createPlayer(
    id: string,
): GamePlayer {
    return {
        id,
        discordUserId: `discord-${id}`,
        characterSlug: "test-character",
        alive: true,
    };
}

function createRole(
    code: string,
    minimumPlayers = 2,
    maximumPlayers = 4,
): Role {
    return {
        code,
        name: code,
        description: `Role ${code}`,

        alignment: "LOYAL",
        tags: [],

        minimumPlayers,
        maximumPlayers,
    };
}

function createFourPlayers(): GamePlayer[] {
    return [
        createPlayer("alice"),
        createPlayer("bob"),
        createPlayer("charlie"),
        createPlayer("diana"),
    ];
}

function createFourRoles(): Role[] {
    return [
        createRole("guardian"),
        createRole("miser"),
        createRole("oracle"),
        createRole("traitor"),
    ];
}

describe("RoleAssignmentEngine", () => {
    it("produces the same assignments with the same seed", () => {
        const players = createFourPlayers();
        const roles = createFourRoles();

        const first = assignRoles({
            seed: "spire-seed",
            players,
            roles,
        });

        const second = assignRoles({
            seed: "spire-seed",
            players,
            roles,
        });

        expect(first).toEqual(second);
    });

    it("produces a stable known assignment for a seed", () => {
        const assignments = assignRoles({
            seed: "spire-seed",
            players: createFourPlayers(),
            roles: createFourRoles(),
        });

        expect(assignments).toEqual([
            {
                playerId: "alice",
                roleCode: "guardian",
            },
            {
                playerId: "bob",
                roleCode: "traitor",
            },
            {
                playerId: "charlie",
                roleCode: "oracle",
            },
            {
                playerId: "diana",
                roleCode: "miser",
            },
        ]);
    });

    it("can produce different assignments with another seed", () => {
        const players = createFourPlayers();
        const roles = createFourRoles();

        const first = assignRoles({
            seed: "spire-seed",
            players,
            roles,
        });

        const second = assignRoles({
            seed: "spire-seed-2",
            players,
            roles,
        });

        expect(first).not.toEqual(second);
    });

    it("assigns exactly one different role to every player", () => {
        const assignments = assignRoles({
            seed: "spire-seed",
            players: createFourPlayers(),
            roles: createFourRoles(),
        });

        expect(assignments).toHaveLength(4);

        const roleCodes = assignments.map(
            assignment => assignment.roleCode,
        );

        expect(
            new Set(roleCodes).size,
        ).toBe(4);
    });

    it("ignores roles unavailable for the player count", () => {
        const players = [
            createPlayer("alice"),
            createPlayer("bob"),
        ];

        const roles = [
            createRole("guardian"),
            createRole("miser"),

            createRole(
                "traitor",
                3,
                4,
            ),
        ];

        const assignments = assignRoles({
            seed: "two-player-game",
            players,
            roles,
        });

        const roleCodes = assignments.map(
            assignment => assignment.roleCode,
        );

        expect(
            roleCodes,
        ).not.toContain("traitor");

        expect(assignments).toHaveLength(2);
    });

    it("fails when there are not enough eligible roles", () => {
        const players = createFourPlayers();

        const roles = [
            createRole("guardian"),
            createRole("oracle"),
        ];

        expect(() => {
            assignRoles({
                seed: "spire-seed",
                players,
                roles,
            });
        }).toThrow(
            "Not enough eligible roles for this game.",
        );
    });

    it("does not depend on player or role input order", () => {
        const normal = assignRoles({
            seed: "spire-seed",

            players: createFourPlayers(),

            roles: createFourRoles(),
        });

        const reversed = assignRoles({
            seed: "spire-seed",

            players: [
                ...createFourPlayers(),
            ].reverse(),

            roles: [
                ...createFourRoles(),
            ].reverse(),
        });

        expect(reversed).toEqual(normal);
    });

    it("rejects duplicate role codes", () => {
        const players = [
            createPlayer("alice"),
            createPlayer("bob"),
        ];

        const roles = [
            createRole("guardian"),
            createRole("guardian"),
        ];

        expect(() => {
            assignRoles({
                seed: "spire-seed",
                players,
                roles,
            });
        }).toThrow(
            "Duplicate role code: guardian",
        );
    });

    it(
        "produces the same assignments regardless of player input order",
        () => {
            const players = [
                {
                    id:
                        "alice",

                    discordUserId:
                        "discord-alice",

                    characterSlug:
                        "character-a",

                    alive:
                        true,
                },

                {
                    id:
                        "bob",

                    discordUserId:
                        "discord-bob",

                    characterSlug:
                        "character-b",

                    alive:
                        true,
                },

                {
                    id:
                        "charlie",

                    discordUserId:
                        "discord-charlie",

                    characterSlug:
                        "character-c",

                    alive:
                        true,
                },
            ];

            const roles = [
                {
                    code:
                        "guardian",

                    name:
                        "Guardian",

                    description:
                        "Guardian",

                    alignment:
                        "LOYAL" as const,

                    tags: [],

                    minimumPlayers:
                        2,

                    maximumPlayers:
                        4,
                },

                {
                    code:
                        "miser",

                    name:
                        "Miser",

                    description:
                        "Miser",

                    alignment:
                        "SELFISH" as const,

                    tags: [],

                    minimumPlayers:
                        2,

                    maximumPlayers:
                        4,
                },

                {
                    code:
                        "oracle",

                    name:
                        "Oracle",

                    description:
                        "Oracle",

                    alignment:
                        "CHAOTIC" as const,

                    tags: [],

                    minimumPlayers:
                        2,

                    maximumPlayers:
                        4,
                },

                {
                    code:
                        "traitor",

                    name:
                        "Traitor",

                    description:
                        "Traitor",

                    alignment:
                        "DISRUPTIVE" as const,

                    tags: [],

                    minimumPlayers:
                        3,

                    maximumPlayers:
                        4,
                },
            ];

            const first =
                assignRoles({
                    seed:
                        "order-independent-seed",

                    players: [
                        players[0]!,
                        players[1]!,
                        players[2]!,
                    ],

                    roles,
                });

            const second =
                assignRoles({
                    seed:
                        "order-independent-seed",

                    players: [
                        players[2]!,
                        players[0]!,
                        players[1]!,
                    ],

                    roles,
                });

            expect(
                second,
            ).toEqual(
                first,
            );
        },
    );

    it(
        "produces the same assignments regardless of role input order",
        () => {
            const players = [
                {
                    id:
                        "alice",

                    discordUserId:
                        "discord-alice",

                    characterSlug:
                        "character-a",

                    alive:
                        true,
                },

                {
                    id:
                        "bob",

                    discordUserId:
                        "discord-bob",

                    characterSlug:
                        "character-b",

                    alive:
                        true,
                },
            ];

            const guardian = {
                code:
                    "guardian",

                name:
                    "Guardian",

                description:
                    "Guardian",

                alignment:
                    "LOYAL" as const,

                tags: [],

                minimumPlayers:
                    2,

                maximumPlayers:
                    4,
            };

            const miser = {
                code:
                    "miser",

                name:
                    "Miser",

                description:
                    "Miser",

                alignment:
                    "SELFISH" as const,

                tags: [],

                minimumPlayers:
                    2,

                maximumPlayers:
                    4,
            };

            const oracle = {
                code:
                    "oracle",

                name:
                    "Oracle",

                description:
                    "Oracle",

                alignment:
                    "CHAOTIC" as const,

                tags: [],

                minimumPlayers:
                    2,

                maximumPlayers:
                    4,
            };

            const first =
                assignRoles({
                    seed:
                        "role-order-seed",

                    players,

                    roles: [
                        guardian,
                        miser,
                        oracle,
                    ],
                });

            const second =
                assignRoles({
                    seed:
                        "role-order-seed",

                    players,

                    roles: [
                        oracle,
                        guardian,
                        miser,
                    ],
                });

            expect(
                second,
            ).toEqual(
                first,
            );
        },
    );
});