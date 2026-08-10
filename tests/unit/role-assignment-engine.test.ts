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
});