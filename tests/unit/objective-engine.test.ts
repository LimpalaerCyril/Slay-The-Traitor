import { describe, expect, it } from "vitest";

import type { GameEvent } from "../../src/domain/events/game-events.js";

import type { GamePlayer } from "../../src/domain/games/game-player.js";

import { createObjectiveAssignment } from "../../src/domain/objectives/objective-assignments.js";

import { evaluateObjective } from "../../src/domain/objectives/objective-engine.js";

import type { Objective } from "../../src/domain/objectives/objective.js";

import type { ObjectiveRule } from "../../src/domain/objectives/objective-rule.js";

const players: readonly GamePlayer[] = [
  {
    id: "alice",

    discordUserId: "discord-alice",

    characterSlug: "silent",

    alive: true,
  },

  {
    id: "bob",

    discordUserId: "discord-bob",

    characterSlug: "ironclad",

    alive: true,
  },
];

function createObjective(
  rule: ObjectiveRule,
  type: "PRIMARY" | "SECONDARY" = "PRIMARY",
): Objective {
  const requiredEvents = "eventType" in rule ? [rule.eventType] : [];

  return {
    code: "test-objective",

    name: "Test Objective",

    description: "Test",

    category: "TEST",

    difficulty: "EASY",

    minimumPlayers: 2,

    maximumPlayers: 4,

    allowedTypes: [type],

    requiredEvents,

    verificationMode: "DISCORD",

    compatibilityTags: [],

    score: 100,

    hiddenProgress: false,

    rule,

    supportedTrackingModes: ["MANUAL", "STS2"],
  };
}

function createEvent(overrides: Partial<GameEvent>): GameEvent {
  return {
    id: "event-1",

    gameId: "game-1",

    type: "CURSE_ADDED",

    payload: {},

    source: "SYSTEM",

    validationStatus: "VERIFIED",

    createdAt: new Date("2026-01-01T12:00:00Z"),

    ...overrides,
  };
}

describe("objective engine", () => {
  it("counts only verified matching events", () => {
    const objective = createObjective({
      type: "EVENT_COUNT",

      eventType: "CURSE_ADDED",

      actor: "OWNER",

      target: "OTHER",

      increment: 1,

      requiredCount: 2,
    });

    const assignment = createObjectiveAssignment("alice", objective, "PRIMARY");

    const result = evaluateObjective({
      objective,
      assignment,

      players,

      events: [
        createEvent({
          id: "event-1",

          actorPlayerId: "alice",

          targetPlayerId: "bob",
        }),

        createEvent({
          id: "event-2",

          actorPlayerId: "alice",

          targetPlayerId: "bob",

          validationStatus: "PENDING",
        }),

        createEvent({
          id: "event-3",

          actorPlayerId: "bob",

          targetPlayerId: "alice",
        }),
      ],

      gameFinished: false,
    });

    expect(result).toEqual({
      progress: {
        current: 1,

        target: 2,
      },

      status: "IN_PROGRESS",
    });
  });

  it("sums numeric payload values", () => {
    const objective = createObjective({
      type: "VALUE_SUM",

      eventType: "BLOCK_GRANTED_TO_ALLY",

      actor: "OWNER",

      target: "OTHER",

      payloadField: "amount",

      targetValue: 40,
    });

    const assignment = createObjectiveAssignment("alice", objective, "PRIMARY");

    const result = evaluateObjective({
      objective,
      assignment,

      players,

      events: [
        createEvent({
          id: "event-1",

          type: "BLOCK_GRANTED_TO_ALLY",

          actorPlayerId: "alice",

          targetPlayerId: "bob",

          payload: {
            amount: 15,
          },
        }),

        createEvent({
          id: "event-2",

          type: "BLOCK_GRANTED_TO_ALLY",

          actorPlayerId: "alice",

          targetPlayerId: "bob",

          payload: {
            amount: 25,
          },
        }),
      ],

      gameFinished: false,
    });

    expect(result.status).toBe("COMPLETED");

    expect(result.progress).toEqual({
      current: 40,

      target: 40,
    });
  });

  it("resolves a ranking at the end of the game", () => {
    const objective = createObjective({
      type: "RANKING",

      eventType: "RELIC_ACQUIRED",

      participant: "ACTOR",

      aggregation: "COUNT",

      order: "HIGHEST",

      allowTies: true,

      resolveAt: "GAME_END",
    });

    const assignment = createObjectiveAssignment("alice", objective, "PRIMARY");

    const result = evaluateObjective({
      objective,
      assignment,

      players,

      events: [
        createEvent({
          id: "relic-1",

          type: "RELIC_ACQUIRED",

          actorPlayerId: "alice",
        }),

        createEvent({
          id: "relic-2",

          type: "RELIC_ACQUIRED",

          actorPlayerId: "alice",
        }),

        createEvent({
          id: "relic-3",

          type: "RELIC_ACQUIRED",

          actorPlayerId: "bob",
        }),
      ],

      gameFinished: true,
    });

    expect(result.status).toBe("COMPLETED");
  });

  it("evaluates role-target conditions", () => {
    const objective = createObjective({
      type: "CONDITION",

      operator: "ALL",

      conditions: [
        {
          type: "PLAYER_ALIVE",

          player: "ROLE_TARGET",

          expected: true,
        },

        {
          type: "EXPEDITION_RESULT",

          result: "WON",
        },
      ],

      completeAt: "RESOLUTION",

      resolveAt: "GAME_END",
    });

    const assignment = createObjectiveAssignment("alice", objective, "PRIMARY");

    const result = evaluateObjective({
      objective,
      assignment,

      players,

      roleTargetPlayerIds: ["bob"],

      events: [],

      gameFinished: true,

      expeditionWon: true,
    });

    expect(result.status).toBe("COMPLETED");

    expect(result.progress).toEqual({
      current: 2,

      target: 2,
    });
  });

  it("fails immediately when a forbidden event occurs", () => {
    const objective = createObjective({
      type: "FORBIDDEN_EVENT",

      eventType: "PLAYER_DIED",

      actor: "ANY",

      target: "OWNER",

      resolveAt: "GAME_END",
    });

    const assignment = createObjectiveAssignment("alice", objective, "PRIMARY");

    const result = evaluateObjective({
      objective,
      assignment,

      players,

      events: [
        createEvent({
          id: "death-1",

          type: "PLAYER_DIED",

          targetPlayerId: "alice",
        }),
      ],

      gameFinished: false,
    });

    expect(result.status).toBe("FAILED");
  });

  it("ignores events from another act for secondary objectives", () => {
    const objective = createObjective(
      {
        type: "EVENT_COUNT",

        eventType: "POTION_USED",

        actor: "OWNER",

        target: "ANY",

        increment: 1,

        requiredCount: 2,
      },

      "SECONDARY",
    );

    const assignment = createObjectiveAssignment(
      "alice",
      objective,
      "SECONDARY",
      1,
    );

    const result = evaluateObjective({
      objective,
      assignment,

      players,

      events: [
        createEvent({
          id: "act-1-potion",

          type: "POTION_USED",

          actNumber: 1,

          actorPlayerId: "alice",
        }),

        createEvent({
          id: "act-2-potion",

          type: "POTION_USED",

          actNumber: 2,

          actorPlayerId: "alice",
        }),
      ],

      gameFinished: false,
    });

    expect(result.progress).toEqual({
      current: 1,

      target: 2,
    });
  });
});
