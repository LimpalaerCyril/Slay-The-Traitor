import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canObjectivesBeAssignedToSamePlayer,
  getContradictionCost,
} from "../../src/application/objective-compatibility/objective-compatibility-engine.js";

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
      "REQUIRES_HIGH_GOLD",

    rightTag:
      "REQUIRES_LOW_GOLD",

    samePlayer:
      "FORBIDDEN",

    partyContradictionCost: 1,
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

function createObjective(
  code: string,
  compatibilityTags: readonly string[],
): Objective {
  return {
    code,
    name: code,

    description:
      `Objective ${code}`,

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

    compatibilityTags,

    score: 100,

    hiddenProgress: false,
  };
}

describe(
  "ObjectiveCompatibilityEngine",
  () => {
    it("forbids incompatible gold objectives for the same player", () => {
      const highGold =
        createObjective(
          "high-gold",
          [
            "REQUIRES_HIGH_GOLD",
          ],
        );

      const lowGold =
        createObjective(
          "low-gold",
          [
            "REQUIRES_LOW_GOLD",
          ],
        );

      expect(
        canObjectivesBeAssignedToSamePlayer(
          highGold,
          lowGold,
          rules,
        ),
      ).toBe(false);
    });

    it("forbids conflicting player death objectives for the same player", () => {
      const deathRequired =
        createObjective(
          "death-required",
          [
            "REQUIRES_PLAYER_DEATH",
          ],
        );

      const deathForbidden =
        createObjective(
          "death-forbidden",
          [
            "FORBIDS_PLAYER_DEATH",
          ],
        );

      expect(
        canObjectivesBeAssignedToSamePlayer(
          deathRequired,
          deathForbidden,
          rules,
        ),
      ).toBe(false);
    });

    it("allows sabotage and protective objectives for the same player", () => {
      const sabotage =
        createObjective(
          "sabotage",
          [
            "SABOTAGE",
          ],
        );

      const protective =
        createObjective(
          "protective",
          [
            "PROTECTIVE",
          ],
        );

      expect(
        canObjectivesBeAssignedToSamePlayer(
          sabotage,
          protective,
          rules,
        ),
      ).toBe(true);
    });

    it("returns a contradiction cost of 3 for opposing death objectives", () => {
      const deathRequired =
        createObjective(
          "death-required",
          [
            "REQUIRES_PLAYER_DEATH",
          ],
        );

      const deathForbidden =
        createObjective(
          "death-forbidden",
          [
            "FORBIDS_PLAYER_DEATH",
          ],
        );

      expect(
        getContradictionCost(
          deathRequired,
          deathForbidden,
          rules,
        ),
      ).toBe(3);
    });

    it("returns a contradiction cost of 2 for sabotage versus protective", () => {
      const sabotage =
        createObjective(
          "sabotage",
          [
            "SABOTAGE",
          ],
        );

      const protective =
        createObjective(
          "protective",
          [
            "PROTECTIVE",
          ],
        );

      expect(
        getContradictionCost(
          sabotage,
          protective,
          rules,
        ),
      ).toBe(2);
    });

    it("returns zero when no compatibility rule matches", () => {
      const economy =
        createObjective(
          "economy",
          [
            "ECONOMY",
          ],
        );

      const information =
        createObjective(
          "information",
          [
            "INFORMATION",
          ],
        );

      expect(
        getContradictionCost(
          economy,
          information,
          rules,
        ),
      ).toBe(0);
    });

    it("treats compatibility rules as symmetric", () => {
      const sabotage =
        createObjective(
          "sabotage",
          [
            "SABOTAGE",
          ],
        );

      const protective =
        createObjective(
          "protective",
          [
            "PROTECTIVE",
          ],
        );

      expect(
        getContradictionCost(
          sabotage,
          protective,
          rules,
        ),
      ).toBe(
        getContradictionCost(
          protective,
          sabotage,
          rules,
        ),
      );

      expect(
        canObjectivesBeAssignedToSamePlayer(
          sabotage,
          protective,
          rules,
        ),
      ).toBe(
        canObjectivesBeAssignedToSamePlayer(
          protective,
          sabotage,
          rules,
        ),
      );
    });

    it("adds the costs of multiple matching rules", () => {
      const corruptSabotage =
        createObjective(
          "corrupt-sabotage",
          [
            "SABOTAGE",
            "REQUIRES_CURSE",
          ],
        );

      const protective =
        createObjective(
          "protective",
          [
            "PROTECTIVE",
          ],
        );

      expect(
        getContradictionCost(
          corruptSabotage,
          protective,
          rules,
        ),
      ).toBe(3);
    });
  },
);