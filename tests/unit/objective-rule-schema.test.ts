import { describe, expect, it } from "vitest";

import { parseObjectiveDefinition } from "../../src/infrastructure/content/schemas/objective-schema.js";

function createBaseObjective() {
  return {
    code: "test",

    name: "Test",

    description: "Test",

    category: "TEST",

    difficulty: "EASY",

    minimumPlayers: 2,

    maximumPlayers: 4,

    allowedTypes: ["PRIMARY"],

    requiredEvents: [],

    verificationMode: "DISCORD",

    compatibilityTags: [],

    score: 100,

    hiddenProgress: false,
  };
}

describe("advanced objective rules", () => {
  it("normalizes legacy progressRule into rule", () => {
    const objective = parseObjectiveDefinition({
      ...createBaseObjective(),

      requiredEvents: ["CURSE_ADDED"],

      progressRule: {
        type: "EVENT_COUNT",

        eventType: "CURSE_ADDED",

        actor: "OWNER",

        target: "OTHER",

        increment: 1,

        requiredCount: 2,
      },
    });

    expect(objective.rule).toEqual({
      type: "EVENT_COUNT",

      eventType: "CURSE_ADDED",

      actor: "OWNER",

      target: "OTHER",

      increment: 1,

      requiredCount: 2,
    });
  });

  it("accepts VALUE_SUM", () => {
    const objective = parseObjectiveDefinition({
      ...createBaseObjective(),

      requiredEvents: ["BLOCK_GRANTED_TO_ALLY"],

      rule: {
        type: "VALUE_SUM",

        eventType: "BLOCK_GRANTED_TO_ALLY",

        actor: "OWNER",

        target: "OTHER",

        payloadField: "amount",

        targetValue: 40,
      },
    });

    expect(objective.rule?.type).toBe("VALUE_SUM");
  });

  it("accepts RANKING", () => {
    const objective = parseObjectiveDefinition({
      ...createBaseObjective(),

      requiredEvents: ["GOLD_CHANGED"],

      rule: {
        type: "RANKING",

        eventType: "GOLD_CHANGED",

        participant: "ACTOR",

        aggregation: "LATEST",

        payloadField: "current",

        order: "HIGHEST",

        allowTies: true,

        resolveAt: "GAME_END",
      },
    });

    expect(objective.rule?.type).toBe("RANKING");
  });

  it("accepts CONDITION", () => {
    const objective = parseObjectiveDefinition({
      ...createBaseObjective(),

      rule: {
        type: "CONDITION",

        operator: "ALL",

        conditions: [
          {
            type: "PLAYER_ALIVE",

            player: "ROLE_TARGET",

            expected: true,
          },
        ],

        completeAt: "RESOLUTION",

        resolveAt: "GAME_END",
      },
    });

    expect(objective.rule?.type).toBe("CONDITION");
  });

  it("accepts FORBIDDEN_EVENT", () => {
    const objective = parseObjectiveDefinition({
      ...createBaseObjective(),

      requiredEvents: ["PLAYER_DIED"],

      rule: {
        type: "FORBIDDEN_EVENT",

        eventType: "PLAYER_DIED",

        actor: "ANY",

        target: "OWNER",

        resolveAt: "GAME_END",
      },
    });

    expect(objective.rule?.type).toBe("FORBIDDEN_EVENT");
  });

  it("rejects SUM ranking without payloadField", () => {
    expect(() =>
      parseObjectiveDefinition({
        ...createBaseObjective(),

        requiredEvents: ["GOLD_CHANGED"],

        rule: {
          type: "RANKING",

          eventType: "GOLD_CHANGED",

          participant: "ACTOR",

          aggregation: "SUM",

          order: "HIGHEST",

          allowTies: true,

          resolveAt: "GAME_END",
        },
      }),
    ).toThrow();
  });
});
