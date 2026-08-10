import {
  describe,
  expect,
  it,
} from "vitest";

import {
  generateObjectiveComposition,
} from "../../src/application/objective-assignment/objective-composition-engine.js";

import {
  calculatePartyContradiction,
} from "../../src/application/objective-compatibility/party-contradiction-engine.js";

import type {
  GamePlayer,
} from "../../src/domain/games/game-player.js";

import type {
  ContradictionBudget,
} from "../../src/domain/objectives/contradiction-budget.js";

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
      "SABOTAGE",

    rightTag:
      "PROTECTIVE",

    samePlayer:
      "ALLOWED",

    partyContradictionCost: 2,
  },

  {
    leftTag:
      "REQUIRES_HIGH_GOLD",

    rightTag:
      "REQUIRES_LOW_GOLD",

    samePlayer:
      "FORBIDDEN",

    partyContradictionCost: 1,
  },
];

const budget:
ContradictionBudget = {
  "2": {
    minimum: 0,
    maximum: 2,
  },

  "3": {
    minimum: 2,
    maximum: 4,
  },

  "4": {
    minimum: 2,
    maximum: 6,
  },
};

function createPlayer(
  id: string,
): GamePlayer {
  return {
    id,

    discordUserId:
      `discord-${id}`,

    characterSlug:
      "test-character",

    alive: true,
  };
}

function createObjective(
  code: string,
  type:
    "PRIMARY" | "SECONDARY",
  tags:
    readonly string[],
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
      type,
    ],

    requiredEvents: [],

    verificationMode:
      "DISCORD",

    compatibilityTags:
      tags,

    score:
      type === "PRIMARY"
        ? 100
        : 35,

    hiddenProgress: false,
  };
}

function createPlayers():
GamePlayer[] {
  return [
    createPlayer("alice"),
    createPlayer("bob"),
    createPlayer("charlie"),
  ];
}

function createObjectives():
Objective[] {
  return [
    createObjective(
      "sabotage-primary",
      "PRIMARY",
      ["SABOTAGE"],
    ),

    createObjective(
      "neutral-primary",
      "PRIMARY",
      ["ECONOMY"],
    ),

    createObjective(
      "protective-secondary",
      "SECONDARY",
      ["PROTECTIVE"],
    ),

    createObjective(
      "neutral-secondary",
      "SECONDARY",
      ["INFORMATION"],
    ),
  ];
}

describe(
  "ObjectiveCompositionEngine",
  () => {
    it("assigns one primary and one secondary objective to every player", () => {
      const result =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      expect(
        result.assignments,
      ).toHaveLength(6);

      for (
        const player
        of createPlayers()
      ) {
        const playerAssignments =
          result.assignments.filter(
            assignment =>
              assignment.playerId
              === player.id,
          );

        expect(
          playerAssignments,
        ).toHaveLength(2);

        expect(
          playerAssignments.some(
            assignment =>
              assignment.objectiveType
              === "PRIMARY",
          ),
        ).toBe(true);

        expect(
          playerAssignments.some(
            assignment =>
              assignment.objectiveType
              === "SECONDARY",
          ),
        ).toBe(true);
      }
    });

    it("produces the same composition with the same seed", () => {
      const first =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      const second =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      expect(
        first,
      ).toEqual(
        second,
      );
    });

    it("produces a composition inside the contradiction budget", () => {
      const result =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      expect(
        result.contradiction,
      ).toBeGreaterThanOrEqual(
        budget["3"].minimum,
      );

      expect(
        result.contradiction,
      ).toBeLessThanOrEqual(
        budget["3"].maximum,
      );
    });

    it("returns the same contradiction calculated by the contradiction engine", () => {
      const objectives =
        createObjectives();

      const result =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players:
            createPlayers(),

          objectives,

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      const calculated =
        calculatePartyContradiction(
          result.assignments,
          objectives,
          rules,
        );

      expect(
        result.contradiction,
      ).toBe(
        calculated.total,
      );
    });

    it("never combines forbidden objectives for one player", () => {
      const objectives = [
        createObjective(
          "high-gold",
          "PRIMARY",
          [
            "REQUIRES_HIGH_GOLD",
          ],
        ),

        createObjective(
          "low-gold",
          "SECONDARY",
          [
            "REQUIRES_LOW_GOLD",
          ],
        ),

        createObjective(
          "neutral-secondary",
          "SECONDARY",
          [
            "INFORMATION",
          ],
        ),
      ];

      const permissiveBudget:
      ContradictionBudget = {
        "2": {
          minimum: 0,
          maximum: 10,
        },

        "3": {
          minimum: 0,
          maximum: 10,
        },

        "4": {
          minimum: 0,
          maximum: 10,
        },
      };

      const result =
        generateObjectiveComposition({
          seed:
            "forbidden-test",

          players: [
            createPlayer("alice"),
            createPlayer("bob"),
          ],

          objectives,

          compatibilityRules:
            rules,

          contradictionBudget:
            permissiveBudget,
        });

      expect(
        result.assignments.some(
          assignment =>
            assignment.objectiveCode
            === "low-gold",
        ),
      ).toBe(false);
    });

    it("fails when the minimum contradiction cannot be reached", () => {
      const impossibleBudget:
      ContradictionBudget = {
        "2": {
          minimum: 10,
          maximum: 20,
        },

        "3": {
          minimum: 10,
          maximum: 20,
        },

        "4": {
          minimum: 10,
          maximum: 20,
        },
      };

      expect(() => {
        generateObjectiveComposition({
          seed:
            "impossible-budget",

          players:
            createPlayers(),

          objectives:
            createObjectives(),

          compatibilityRules:
            rules,

          contradictionBudget:
            impossibleBudget,
        });
      }).toThrow(
        "No objective composition satisfies contradiction budget 10-20 for 3 players.",
      );
    });

    it("does not depend on player or objective input order", () => {
      const normal =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      const reversed =
        generateObjectiveComposition({
          seed:
            "composition-seed",

          players: [
            ...createPlayers(),
          ].reverse(),

          objectives: [
            ...createObjectives(),
          ].reverse(),

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });

      expect(
        reversed,
      ).toEqual(
        normal,
      );
    });

    it("fails when no compatible primary-secondary pair exists", () => {
      const objectives = [
        createObjective(
          "high-gold",
          "PRIMARY",
          [
            "REQUIRES_HIGH_GOLD",
          ],
        ),

        createObjective(
          "low-gold",
          "SECONDARY",
          [
            "REQUIRES_LOW_GOLD",
          ],
        ),
      ];

      expect(() => {
        generateObjectiveComposition({
          seed:
            "no-pair",

          players: [
            createPlayer("alice"),
            createPlayer("bob"),
          ],

          objectives,

          compatibilityRules:
            rules,

          contradictionBudget:
            budget,
        });
      }).toThrow(
        "No compatible objective pair is available for this game.",
      );
    });
  },
);