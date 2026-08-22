import { describe, expect, it } from "vitest";

import type { GameEvent } from "../../src/domain/events/game-events.js";

import type { GamePlayer } from "../../src/domain/games/game-player.js";

import { createObjectiveAssignment } from "../../src/domain/objectives/objective-assignments.js";

import { evaluateObjective } from "../../src/domain/objectives/objective-engine.js";

import type { Objective } from "../../src/domain/objectives/objective.js";

const objective: Objective = {
  code: "lovers-survive-act-two",

  name: "Jusqu'à ce que la mort nous sépare",

  description:
    "Les deux amoureux doivent être encore vivants à la fin de l'acte 2.",

  category: "SURVIVAL",

  difficulty: "HARD",

  minimumPlayers: 2,

  maximumPlayers: 4,

  allowedTypes: ["PRIMARY"],

  requiredEvents: ["PLAYER_DIED", "ACT_COMPLETED"],

  verificationMode: "GROUP_CONFIRMED",

  compatibilityTags: [],

  score: 100,

  hiddenProgress: true,

  rule: {
    type: "CONDITION",

    operator: "ALL",

    conditions: [
      {
        type: "PLAYER_ALIVE",

        player: "POWER_TARGET",

        expected: true,
      },
    ],

    completeAt: "RESOLUTION",

    resolveAt: "ACT_END",

    resolveActNumber: 2,
  },

  supportedTrackingModes: ["MANUAL", "STS2"],
};

const players: readonly GamePlayer[] = [
  {
    id: "cupid",

    discordUserId: "discord-cupid",

    characterSlug: "silent",

    alive: true,
  },

  {
    id: "alice",

    discordUserId: "discord-alice",

    characterSlug: "ironclad",

    alive: true,
  },

  {
    id: "bob",

    discordUserId: "discord-bob",

    characterSlug: "defect",

    alive: true,
  },
];

function createActTwoCompletedEvent(): GameEvent {
  return {
    id: "act-two-completed",

    gameId: "game-1",

    type: "ACT_COMPLETED",

    actNumber: 2,

    payload: {},

    source: "SYSTEM",

    validationStatus: "VERIFIED",

    createdAt: new Date("2026-01-01T12:00:00Z"),
  };
}

describe("Cupid objective condition", () => {
  it("completes when both lovers are alive at the end of act 2", () => {
    const assignment = createObjectiveAssignment("cupid", objective, "PRIMARY");

    const evaluation = evaluateObjective({
      objective,

      assignment,

      events: [createActTwoCompletedEvent()],

      players,

      powerTargetPlayerIds: ["alice", "bob"],

      gameFinished: false,
    });

    expect(evaluation.status).toBe("COMPLETED");
  });

  it("fails when one lover is dead at the end of act 2", () => {
    const assignment = createObjectiveAssignment("cupid", objective, "PRIMARY");

    const deadBob = players.map((player) =>
      player.id === "bob"
        ? {
            ...player,

            alive: false,
          }
        : player,
    );

    const evaluation = evaluateObjective({
      objective,

      assignment,

      events: [createActTwoCompletedEvent()],

      players: deadBob,

      powerTargetPlayerIds: ["alice", "bob"],

      gameFinished: false,
    });

    expect(evaluation.status).toBe("FAILED");
  });
});
