import { describe, expect, it } from "vitest";

import { assignRoles } from "../../src/application/role-assignment/role-assignment-engine.js";

import type { GamePlayer } from "../../src/domain/games/game-player.js";

import type { Role } from "../../src/domain/roles/role.js";

function createPlayer(id: string): GamePlayer {
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

    primaryObjectiveCode: "test-primary",

    supportedTrackingModes: ["MANUAL", "STS2"],
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
      trackingMode: "MANUAL",
    });

    const second = assignRoles({
      seed: "spire-seed",
      players,
      roles,
      trackingMode: "MANUAL",
    });

    expect(first).toEqual(second);
  });

  it("can produce different assignments with another seed", () => {
    const players = createFourPlayers();
    const roles = createFourRoles();

    const first = assignRoles({
      seed: "spire-seed",
      players,
      roles,
      trackingMode: "MANUAL",
    });

    const second = assignRoles({
      seed: "spire-seed-2",
      players,
      roles,
      trackingMode: "MANUAL",
    });

    expect(first).not.toEqual(second);
  });

  it("assigns exactly one different role to every player", () => {
    const assignments = assignRoles({
      seed: "spire-seed",
      players: createFourPlayers(),
      roles: createFourRoles(),
      trackingMode: "MANUAL",
    });

    expect(assignments).toHaveLength(4);

    const roleCodes = assignments.map((assignment) => assignment.roleCode);

    expect(new Set(roleCodes).size).toBe(4);
  });

  it("ignores roles unavailable for the player count", () => {
    const players = [createPlayer("alice"), createPlayer("bob")];

    const roles = [
      createRole("guardian"),
      createRole("miser"),

      createRole("traitor", 3, 4),
    ];

    const assignments = assignRoles({
      seed: "two-player-game",
      players,
      roles,
      trackingMode: "MANUAL",
    });

    const roleCodes = assignments.map((assignment) => assignment.roleCode);

    expect(roleCodes).not.toContain("traitor");

    expect(assignments).toHaveLength(2);
  });

  it("fails when there are not enough eligible roles", () => {
    const players = createFourPlayers();

    const roles = [createRole("guardian"), createRole("oracle")];

    expect(() => {
      assignRoles({
        players,
        roles,
        seed: "test-seed",
        trackingMode: "MANUAL",
      });
    }).toThrow("Not enough roles are available for 4 players.");
  });

  it("does not depend on player or role input order", () => {
    const normal = assignRoles({
      seed: "spire-seed",

      players: createFourPlayers(),

      roles: createFourRoles(),

      trackingMode: "MANUAL",
    });

    const reversed = assignRoles({
      seed: "spire-seed",

      players: [...createFourPlayers()].reverse(),

      roles: [...createFourRoles()].reverse(),

      trackingMode: "MANUAL",
    });

    expect(reversed).toEqual(normal);
  });

  it("rejects duplicate role codes", () => {
    const players = [createPlayer("alice"), createPlayer("bob")];

    const roles = [createRole("guardian"), createRole("guardian")];

    expect(() => {
      assignRoles({
        seed: "spire-seed",
        players,
        roles,
        trackingMode: "MANUAL",
      });
    }).toThrow("Duplicate role code: guardian");
  });

  it("produces the same assignments regardless of player input order", () => {
    const players = [
      {
        id: "alice",

        discordUserId: "discord-alice",

        characterSlug: "character-a",

        alive: true,
      },

      {
        id: "bob",

        discordUserId: "discord-bob",

        characterSlug: "character-b",

        alive: true,
      },

      {
        id: "charlie",

        discordUserId: "discord-charlie",

        characterSlug: "character-c",

        alive: true,
      },
    ];

    const roles: readonly Role[] = [
      {
        code: "guardian",

        name: "Guardian",

        description: "Guardian",

        alignment: "LOYAL",

        tags: [],

        minimumPlayers: 2,

        maximumPlayers: 4,

        primaryObjectiveCode: "test-primary",

        supportedTrackingModes: ["MANUAL", "STS2"],
      },

      {
        code: "miser",

        name: "Miser",

        description: "Miser",

        alignment: "SELFISH",

        tags: [],

        minimumPlayers: 2,

        maximumPlayers: 4,

        primaryObjectiveCode: "test-primary",

        supportedTrackingModes: ["MANUAL", "STS2"],
      },

      {
        code: "oracle",

        name: "Oracle",

        description: "Oracle",

        alignment: "CHAOTIC",

        tags: [],

        minimumPlayers: 2,

        maximumPlayers: 4,

        primaryObjectiveCode: "test-primary",

        supportedTrackingModes: ["MANUAL", "STS2"],
      },

      {
        code: "traitor",

        name: "Traitor",

        description: "Traitor",

        alignment: "DISRUPTIVE",

        tags: [],

        minimumPlayers: 3,

        maximumPlayers: 4,

        primaryObjectiveCode: "test-primary",

        supportedTrackingModes: ["MANUAL", "STS2"],
      },
    ];

    const first = assignRoles({
      seed: "order-independent-seed",

      players: [players[0]!, players[1]!, players[2]!],

      roles,
      trackingMode: "MANUAL",
    });

    const second = assignRoles({
      seed: "order-independent-seed",

      players: [players[2]!, players[0]!, players[1]!],

      roles,
      trackingMode: "MANUAL",
    });

    expect(second).toEqual(first);
  });

  it("produces the same assignments regardless of role input order", () => {
    const players = [
      {
        id: "alice",

        discordUserId: "discord-alice",

        characterSlug: "character-a",

        alive: true,
      },

      {
        id: "bob",

        discordUserId: "discord-bob",

        characterSlug: "character-b",

        alive: true,
      },
    ];

    const guardian: Role = {
      code: "guardian",

      name: "Guardian",

      description: "Guardian",

      alignment: "LOYAL",

      tags: [],

      minimumPlayers: 2,

      maximumPlayers: 4,

      primaryObjectiveCode: "test-primary",

      supportedTrackingModes: ["MANUAL", "STS2"],
    };

    const miser: Role = {
      code: "miser",

      name: "Miser",

      description: "Miser",

      alignment: "SELFISH",

      tags: [],

      minimumPlayers: 2,

      maximumPlayers: 4,

      primaryObjectiveCode: "test-primary",

      supportedTrackingModes: ["MANUAL", "STS2"],
    };

    const oracle: Role = {
      code: "oracle",

      name: "Oracle",

      description: "Oracle",

      alignment: "CHAOTIC",

      tags: [],

      minimumPlayers: 2,

      maximumPlayers: 4,

      primaryObjectiveCode: "oracle-primary",

      supportedTrackingModes: ["MANUAL", "STS2"],
    };

    const first = assignRoles({
      seed: "role-order-seed",

      players,

      roles: [guardian, miser, oracle],
      trackingMode: "MANUAL",
    });

    const second = assignRoles({
      seed: "role-order-seed",

      players,

      roles: [oracle, guardian, miser],
      trackingMode: "MANUAL",
    });

    expect(second).toEqual(first);
  });
});
