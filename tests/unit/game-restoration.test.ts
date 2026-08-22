import { describe, expect, it } from "vitest";

import { Game } from "../../src/domain/games/game.js";

function createActiveGame(): Game {
  const game = new Game();

  game.addPlayer({
    id: "alice",

    discordUserId: "discord-alice",

    characterSlug: "character-a",

    alive: true,
  });

  game.addPlayer({
    id: "bob",

    discordUserId: "discord-bob",

    characterSlug: "character-a",

    alive: true,
  });

  game.lockRoster();

  game.setSecretAssignments(
    [
      {
        playerId: "alice",

        roleCode: "role-a",
      },

      {
        playerId: "bob",

        roleCode: "role-b",
      },
    ],

    [
      {
        playerId: "alice",

        objectiveCode: "primary-a",

        objectiveType: "PRIMARY",

        progress: {
          current: 0,
          target: 1,
        },

        status: "PENDING",
      },

      {
        playerId: "alice",

        objectiveCode: "secondary-a",

        objectiveType: "SECONDARY",

        progress: {
          current: 0,
          target: 2,
        },

        status: "PENDING",
      },

      {
        playerId: "bob",

        objectiveCode: "primary-b",

        objectiveType: "PRIMARY",

        progress: {
          current: 1,
          target: 1,
        },

        status: "COMPLETED",
      },

      {
        playerId: "bob",

        objectiveCode: "secondary-b",

        objectiveType: "SECONDARY",

        progress: {
          current: 1,
          target: 2,
        },

        status: "IN_PROGRESS",
      },
    ],
  );

  game.start();

  return game;
}

describe("Game restoration", () => {
  it("restores a complete active game", () => {
    const original = createActiveGame();

    const restored = Game.restore(original.exportData());

    expect(restored.exportData()).toEqual(original.exportData());
  });

  it("restores independent data copies", () => {
    const original = createActiveGame();

    const restored = Game.restore(original.exportData());

    expect(restored).not.toBe(original);

    expect(restored.getPlayers()).not.toBe(original.getPlayers());
  });

  it("rejects an active game without secret assignments", () => {
    expect(() => {
      Game.restore({
        state: "ACTIVE",

        currentAct: 1,

        players: [
          {
            id: "alice",

            discordUserId: "discord-alice",

            characterSlug: "character-a",

            alive: true,
          },

          {
            id: "bob",

            discordUserId: "discord-bob",

            characterSlug: "character-a",

            alive: true,
          },
        ],

        roleAssignments: [],
        objectiveAssignments: [],

        secretAssignmentsPrepared: false,
      });
    }).toThrow("Restored game state requires secret assignments.");
  });
});
