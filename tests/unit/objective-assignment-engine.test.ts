import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assignObjectives,
} from "../../src/application/objective-assignment/objective-assignment-engine.js";

import type {
  GamePlayer,
} from "../../src/domain/games/game-player.js";

import type {
  Objective,
} from "../../src/domain/objectives/objective.js";

import type {
  ObjectiveCompatibilityRule,
} from "../../src/domain/objectives/objective-compatibility-rule.js";

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
  type: "PRIMARY" | "SECONDARY",
  minimumPlayers = 2,
  maximumPlayers = 4,
): Objective {
  return {
    code,
    name: code,

    description:
      `Objective ${code}`,

    category: "TEST",
    difficulty: "MEDIUM",

    minimumPlayers,
    maximumPlayers,

    allowedTypes: [
      type,
    ],

    requiredEvents: [
      "POWER_USED",
    ],

    verificationMode:
      "DISCORD",

    compatibilityTags: [],

    score:
      type === "PRIMARY"
        ? 100
        : 35,

    hiddenProgress: false,

    progressRule: {
      type: "EVENT_COUNT",

      eventType:
        "POWER_USED",

      actor: "OWNER",
      target: "ANY",

      increment: 1,
      requiredCount:
        type === "PRIMARY"
          ? 3
          : 2,
    },
  };
}

function createPlayers():
  GamePlayer[] {
  return [
    createPlayer("alice"),
    createPlayer("bob"),
    createPlayer("charlie"),
    createPlayer("diana"),
  ];
}

function createObjectives():
  Objective[] {
  return [
    createObjective(
      "primary-a",
      "PRIMARY",
    ),

    createObjective(
      "primary-b",
      "PRIMARY",
    ),

    createObjective(
      "primary-c",
      "PRIMARY",
    ),

    createObjective(
      "primary-d",
      "PRIMARY",
    ),

    createObjective(
      "secondary-a",
      "SECONDARY",
    ),

    createObjective(
      "secondary-b",
      "SECONDARY",
    ),

    createObjective(
      "secondary-c",
      "SECONDARY",
    ),

    createObjective(
      "secondary-d",
      "SECONDARY",
    ),
  ];
}

const compatibilityRules:
  readonly ObjectiveCompatibilityRule[] = [
    {
      leftTag:
        "REQUIRES_HIGH_GOLD",

      rightTag:
        "REQUIRES_LOW_GOLD",

      samePlayer:
        "FORBIDDEN",

      partyContradictionCost: 1,
    },

    {
      leftTag:
        "REQUIRES_PLAYER_DEATH",

      rightTag:
        "FORBIDS_PLAYER_DEATH",

      samePlayer:
        "FORBIDDEN",

      partyContradictionCost: 3,
    },
  ];

describe(
  "ObjectiveAssignmentEngine",
  () => {
    it("assigns one primary and one secondary objective to every player", () => {
      const assignments =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      expect(
        assignments,
      ).toHaveLength(8);

      for (
        const player
        of createPlayers()
      ) {
        const playerAssignments =
          assignments.filter(
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

    it("produces the same assignments with the same seed", () => {
      const first =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      const second =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      expect(first).toEqual(
        second,
      );
    });

    it("produces a stable known assignment", () => {
      const assignments =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      expect(
        assignments.map(
          assignment => ({
            player:
              assignment.playerId,

            type:
              assignment.objectiveType,

            objective:
              assignment.objectiveCode,
          }),
        ),
      ).toEqual([
        {
          player: "alice",
          type: "PRIMARY",
          objective: "primary-d",
        },
        {
          player: "alice",
          type: "SECONDARY",
          objective: "secondary-b",
        },
        {
          player: "bob",
          type: "PRIMARY",
          objective: "primary-c",
        },
        {
          player: "bob",
          type: "SECONDARY",
          objective: "secondary-d",
        },
        {
          player: "charlie",
          type: "PRIMARY",
          objective: "primary-b",
        },
        {
          player: "charlie",
          type: "SECONDARY",
          objective: "secondary-a",
        },
        {
          player: "diana",
          type: "PRIMARY",
          objective: "primary-a",
        },
        {
          player: "diana",
          type: "SECONDARY",
          objective: "secondary-c",
        },
      ]);
    });

    it("initializes progress from requiredCount", () => {
      const assignments =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      const primary =
        assignments.find(
          assignment =>
            assignment.objectiveType
            === "PRIMARY",
        )!;

      const secondary =
        assignments.find(
          assignment =>
            assignment.objectiveType
            === "SECONDARY",
        )!;

      expect(
        primary.progress,
      ).toEqual({
        current: 0,
        target: 3,
      });

      expect(
        secondary.progress,
      ).toEqual({
        current: 0,
        target: 2,
      });
    });

    it("ignores objectives unavailable for the player count", () => {
      const players = [
        createPlayer("alice"),
        createPlayer("bob"),
      ];

      const objectives = [
        createObjective(
          "primary-valid",
          "PRIMARY",
          2,
          4,
        ),

        createObjective(
          "primary-three-plus",
          "PRIMARY",
          3,
          4,
        ),

        createObjective(
          "secondary-valid",
          "SECONDARY",
          2,
          4,
        ),
      ];

      const assignments =
        assignObjectives({
          seed:
            "two-player",

          players,
          objectives,
        });

      expect(
        assignments.map(
          assignment =>
            assignment.objectiveCode,
        ),
      ).not.toContain(
        "primary-three-plus",
      );
    });

    it("fails when no primary objective is available", () => {
      const players = [
        createPlayer("alice"),
        createPlayer("bob"),
      ];

      const objectives = [
        createObjective(
          "secondary",
          "SECONDARY",
        ),
      ];

      expect(() => {
        assignObjectives({
          seed: "test",
          players,
          objectives,
        });
      }).toThrow(
        "No primary objective is available for this game.",
      );
    });

    it("fails when no secondary objective is available", () => {
      const players = [
        createPlayer("alice"),
        createPlayer("bob"),
      ];

      const objectives = [
        createObjective(
          "primary",
          "PRIMARY",
        ),
      ];

      expect(() => {
        assignObjectives({
          seed: "test",
          players,
          objectives,
        });
      }).toThrow(
        "No secondary objective is available for this game.",
      );
    });

    it("does not depend on input order", () => {
      const normal =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      const reversed =
        assignObjectives({
          seed:
            "objective-seed",

          players: [
            ...createPlayers(),
          ].reverse(),

          objectives: [
            ...createObjectives(),
          ].reverse(),
        });

      expect(reversed).toEqual(
        normal,
      );
    });

    it("never assigns incompatible primary and secondary objectives to the same player", () => {
      const players = [
        createPlayer("alice"),
        createPlayer("bob"),
      ];

      const highGold: Objective = {
        ...createObjective(
          "high-gold",
          "PRIMARY",
        ),

        compatibilityTags: [
          "REQUIRES_HIGH_GOLD",
        ],
      };

      const lowGold: Objective = {
        ...createObjective(
          "low-gold",
          "SECONDARY",
        ),

        compatibilityTags: [
          "REQUIRES_LOW_GOLD",
        ],
      };

      const neutral: Objective = {
        ...createObjective(
          "neutral",
          "SECONDARY",
        ),

        compatibilityTags: [
          "INFORMATION",
        ],
      };

      const assignments =
        assignObjectives({
          seed:
            "compatibility-test",

          players,

          objectives: [
            highGold,
            lowGold,
            neutral,
          ],

          compatibilityRules,
        });

      const secondaryAssignments =
        assignments.filter(
          assignment =>
            assignment.objectiveType
            === "SECONDARY",
        );

      expect(
        secondaryAssignments,
      ).toHaveLength(2);

      expect(
        secondaryAssignments.every(
          assignment =>
            assignment.objectiveCode
            === "neutral",
        ),
      ).toBe(true);
    });

    it("fails when no compatible secondary objective exists", () => {
      const players = [
        createPlayer("alice"),
        createPlayer("bob"),
      ];

      const highGold: Objective = {
        ...createObjective(
          "high-gold",
          "PRIMARY",
        ),

        compatibilityTags: [
          "REQUIRES_HIGH_GOLD",
        ],
      };

      const lowGold: Objective = {
        ...createObjective(
          "low-gold",
          "SECONDARY",
        ),

        compatibilityTags: [
          "REQUIRES_LOW_GOLD",
        ],
      };

      expect(() => {
        assignObjectives({
          seed:
            "impossible-combination",

          players,

          objectives: [
            highGold,
            lowGold,
          ],

          compatibilityRules,
        });
      }).toThrow(
        "No compatible secondary objective is available for primary objective high-gold.",
      );
    });

    it("also applies compatibility rules based on other tags", () => {
      const players = [
        createPlayer("alice"),
        createPlayer("bob"),
      ];

      const requireDeath: Objective = {
        ...createObjective(
          "require-death",
          "PRIMARY",
        ),

        compatibilityTags: [
          "REQUIRES_PLAYER_DEATH",
        ],
      };

      const forbidDeath: Objective = {
        ...createObjective(
          "forbid-death",
          "SECONDARY",
        ),

        compatibilityTags: [
          "FORBIDS_PLAYER_DEATH",
        ],
      };

      const usePower: Objective = {
        ...createObjective(
          "use-power",
          "SECONDARY",
        ),

        compatibilityTags: [
          "POWER",
        ],
      };

      const assignments =
        assignObjectives({
          seed:
            "death-compatibility",

          players,

          objectives: [
            requireDeath,
            forbidDeath,
            usePower,
          ],

          compatibilityRules,
        });

      expect(
        assignments.some(
          assignment =>
            assignment.objectiveCode
            === "forbid-death",
        ),
      ).toBe(false);

      expect(
        assignments.some(
          assignment =>
            assignment.objectiveCode
            === "use-power",
        ),
      ).toBe(true);
    });

    it("keeps backward-compatible behavior when no compatibility rules are provided", () => {
      const assignments =
        assignObjectives({
          seed:
            "objective-seed",

          players:
            createPlayers(),

          objectives:
            createObjectives(),
        });

      expect(
        assignments,
      ).toHaveLength(8);
    });
  },
);