import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculatePartyContradiction,
  isContradictionWithinBudget,
} from "../../src/application/objective-compatibility/party-contradiction-engine.js";

import type {
  ContradictionBudget,
} from "../../src/domain/objectives/contradiction-budget.js";

import type {
  ObjectiveAssignment,
} from "../../src/domain/objectives/objective-assignments.js";

import type {
  ObjectiveCompatibilityRule,
} from "../../src/domain/objectives/objective-compatibility-rule.js";

import type {
  Objective,
} from "../../src/domain/objectives/objective.js";

const rules:
readonly ObjectiveCompatibilityRule[] = [
  {
    leftTag:
      "REQUIRES_PLAYER_DEATH",

    rightTag:
      "FORBIDS_PLAYER_DEATH",

    samePlayer:
      "FORBIDDEN",

    partyContradictionCost: 3,
  },

  {
    leftTag:
      "SABOTAGE",

    rightTag:
      "PROTECTIVE",

    samePlayer:
      "ALLOWED",

    partyContradictionCost: 2,
  },

  {
    leftTag:
      "REQUIRES_CURSE",

    rightTag:
      "PROTECTIVE",

    samePlayer:
      "ALLOWED",

    partyContradictionCost: 1,
  },
];

const budget:
ContradictionBudget = {
  "2": {
    minimum: 0,
    maximum: 1,
  },

  "3": {
    minimum: 1,
    maximum: 3,
  },

  "4": {
    minimum: 2,
    maximum: 5,
  },
};

function createObjective(
  code: string,
  tags: readonly string[],
): Objective {
  return {
    code,
    name: code,
    description: code,

    category: "TEST",
    difficulty: "MEDIUM",

    minimumPlayers: 2,
    maximumPlayers: 4,

    allowedTypes: [
      "PRIMARY",
      "SECONDARY",
    ],

    requiredEvents: [],

    verificationMode:
      "DISCORD",

    compatibilityTags:
      tags,

    score: 100,
    hiddenProgress: false,
  };
}

function createAssignment(
  playerId: string,
  objectiveCode: string,
  objectiveType:
    "PRIMARY" | "SECONDARY",
): ObjectiveAssignment {
  return {
    playerId,
    objectiveCode,
    objectiveType,

    progress: {
      current: 0,
      target: 1,
    },

    status: "PENDING",
  };
}

describe(
  "PartyContradictionEngine",
  () => {
    it("returns zero when players have no conflicting tags", () => {
      const objectives = [
        createObjective(
          "economy",
          ["ECONOMY"],
        ),

        createObjective(
          "information",
          ["INFORMATION"],
        ),
      ];

      const assignments = [
        createAssignment(
          "alice",
          "economy",
          "PRIMARY",
        ),

        createAssignment(
          "bob",
          "information",
          "PRIMARY",
        ),
      ];

      const result =
        calculatePartyContradiction(
          assignments,
          objectives,
          rules,
        );

      expect(result.total).toBe(0);
      expect(
        result.breakdown,
      ).toHaveLength(0);
    });

    it("counts opposing death objectives between players", () => {
      const objectives = [
        createObjective(
          "cause-death",
          [
            "REQUIRES_PLAYER_DEATH",
          ],
        ),

        createObjective(
          "protect-all",
          [
            "FORBIDS_PLAYER_DEATH",
          ],
        ),
      ];

      const assignments = [
        createAssignment(
          "alice",
          "cause-death",
          "PRIMARY",
        ),

        createAssignment(
          "bob",
          "protect-all",
          "PRIMARY",
        ),
      ];

      const result =
        calculatePartyContradiction(
          assignments,
          objectives,
          rules,
        );

      expect(result.total).toBe(3);
    });

    it("counts a rule only once per player pair", () => {
      const objectives = [
        createObjective(
          "sabotage-a",
          ["SABOTAGE"],
        ),

        createObjective(
          "sabotage-b",
          ["SABOTAGE"],
        ),

        createObjective(
          "protect",
          ["PROTECTIVE"],
        ),
      ];

      const assignments = [
        createAssignment(
          "alice",
          "sabotage-a",
          "PRIMARY",
        ),

        createAssignment(
          "alice",
          "sabotage-b",
          "SECONDARY",
        ),

        createAssignment(
          "bob",
          "protect",
          "PRIMARY",
        ),
      ];

      const result =
        calculatePartyContradiction(
          assignments,
          objectives,
          rules,
        );

      expect(result.total).toBe(2);
    });

    it("adds different matching rules between the same players", () => {
      const objectives = [
        createObjective(
          "corrupt",
          [
            "SABOTAGE",
            "REQUIRES_CURSE",
          ],
        ),

        createObjective(
          "protect",
          ["PROTECTIVE"],
        ),
      ];

      const assignments = [
        createAssignment(
          "alice",
          "corrupt",
          "PRIMARY",
        ),

        createAssignment(
          "bob",
          "protect",
          "PRIMARY",
        ),
      ];

      const result =
        calculatePartyContradiction(
          assignments,
          objectives,
          rules,
        );

      expect(result.total).toBe(3);

      expect(
        result.breakdown,
      ).toHaveLength(2);
    });

    it("does not count contradictions inside the same player's objectives", () => {
      const objectives = [
        createObjective(
          "sabotage",
          ["SABOTAGE"],
        ),

        createObjective(
          "protect",
          ["PROTECTIVE"],
        ),
      ];

      const assignments = [
        createAssignment(
          "alice",
          "sabotage",
          "PRIMARY",
        ),

        createAssignment(
          "alice",
          "protect",
          "SECONDARY",
        ),
      ];

      const result =
        calculatePartyContradiction(
          assignments,
          objectives,
          rules,
        );

      expect(result.total).toBe(0);
    });

    it("fails when an assignment references an unknown objective", () => {
      expect(() => {
        calculatePartyContradiction(
          [
            createAssignment(
              "alice",
              "unknown",
              "PRIMARY",
            ),
          ],

          [],

          rules,
        );
      }).toThrow(
        "Unknown objective code: unknown",
      );
    });

    it("detects when a contradiction score is inside the configured budget", () => {
      expect(
        isContradictionWithinBudget(
          3,
          4,
          budget,
        ),
      ).toBe(true);
    });

    it("detects when a contradiction score is too low", () => {
      expect(
        isContradictionWithinBudget(
          0,
          4,
          budget,
        ),
      ).toBe(false);
    });

    it("detects when a contradiction score is too high", () => {
      expect(
        isContradictionWithinBudget(
          6,
          4,
          budget,
        ),
      ).toBe(false);
    });
  },
);