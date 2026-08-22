import { describe, expect, it } from "vitest";

import { join } from "node:path";

import {
  loadCharacters,
  loadCompatibilityRules,
  loadContradictionBudget,
  loadObjectives,
  loadRoles,
  loadPowers,
} from "../../src/infrastructure/content/content-loader.js";

import { parseCompatibilityRules } from "../../src/infrastructure/content/schemas/compatibility-rule-schema.js";

import { parseObjectiveDefinition } from "../../src/infrastructure/content/schemas/objective-schema.js";

import { parseRoleDefinition } from "../../src/infrastructure/content/schemas/role-schema.js";

import { parseContradictionBudget } from "../../src/infrastructure/content/schemas/contradiction-budget-schema.js";

import { parseCharacterDefinition } from "../../src/infrastructure/content/schemas/character-schema.js";

import { isRoleAvailableForPlayerCount } from "../../src/domain/roles/role.js";

import { isObjectiveAvailableForPlayerCount } from "../../src/domain/objectives/objective.js";

import { parsePowerDefinition } from "../../src/infrastructure/content/schemas/power-schema.js";

describe("Content validation", () => {
  it("accepts a valid role", () => {
    const role = parseRoleDefinition({
      code: "guardian",
      name: "Le Gardien",
      description: "Test",

      alignment: "LOYAL",

      tags: ["PROTECTIVE"],

      minimumPlayers: 2,
      maximumPlayers: 4,

      primaryObjectiveCode: "guardian-primary",

      supportedTrackingModes: ["MANUAL", "STS2"],
    });

    expect(role.code).toBe("guardian");
  });

  it("rejects an invalid alignment", () => {
    expect(() => {
      parseRoleDefinition({
        code: "bad-role",
        name: "Bad Role",
        description: "Test",

        alignment: "BANANA",

        tags: [],

        minimumPlayers: 2,
        maximumPlayers: 4,
      });
    }).toThrow();
  });

  it("rejects inconsistent player limits", () => {
    expect(() => {
      parseRoleDefinition({
        code: "bad-role",
        name: "Bad Role",
        description: "Test",

        alignment: "LOYAL",

        tags: [],

        minimumPlayers: 4,
        maximumPlayers: 2,
      });
    }).toThrow();
  });

  it("accepts a valid objective", () => {
    const objective = parseObjectiveDefinition({
      code: "curse-test",
      name: "Curse Test",
      description: "Test",

      category: "SABOTAGE",
      difficulty: "HARD",

      minimumPlayers: 3,
      maximumPlayers: 4,

      allowedTypes: ["PRIMARY"],

      requiredEvents: ["CURSE_ADDED"],

      verificationMode: "GROUP_CONFIRMED",

      compatibilityTags: ["SABOTAGE"],

      score: 100,
      hiddenProgress: false,

      progressRule: {
        type: "EVENT_COUNT",

        eventType: "CURSE_ADDED",

        actor: "OWNER",
        target: "OTHER",

        increment: 1,
        requiredCount: 2,
      },
    });

    expect(objective.rule).toBeDefined();

    expect(objective.rule?.type).toBe("EVENT_COUNT");
  });

  it("rejects an unknown event type", () => {
    expect(() => {
      parseObjectiveDefinition({
        code: "bad-objective",
        name: "Bad Objective",
        description: "Test",

        category: "TEST",
        difficulty: "EASY",

        minimumPlayers: 2,
        maximumPlayers: 4,

        requiredEvents: ["PLAYER_ATE_PIZZA"],

        verificationMode: "DISCORD",

        compatibilityTags: [],

        score: 100,
        hiddenProgress: false,
      });
    }).toThrow();
  });

  it("loads valid real role and objective content", async () => {
    const rolesPath = join(process.cwd(), "content", "roles");

    const objectivesPath = join(process.cwd(), "content", "objectives");

    const roles = await loadRoles(rolesPath);

    const objectives = await loadObjectives(objectivesPath);

    expect(roles.length).toBeGreaterThan(0);

    expect(objectives.length).toBeGreaterThan(0);

    const roleCodes = roles.map((role) => role.code);

    expect(new Set(roleCodes).size).toBe(roleCodes.length);

    const objectiveCodes = objectives.map((objective) => objective.code);

    expect(new Set(objectiveCodes).size).toBe(objectiveCodes.length);

    for (const role of roles) {
      expect(role.code.trim()).not.toBe("");

      expect(role.name.trim()).not.toBe("");

      expect(role.minimumPlayers).toBeLessThanOrEqual(role.maximumPlayers);
    }

    for (const objective of objectives) {
      expect(objective.code.trim()).not.toBe("");

      expect(objective.name.trim()).not.toBe("");

      expect(objective.minimumPlayers).toBeLessThanOrEqual(
        objective.maximumPlayers,
      );

      expect(objective.allowedTypes.length).toBeGreaterThan(0);
    }

    for (const playerCount of [2, 3, 4] as const) {
      const availableRoles = roles.filter((role) =>
        isRoleAvailableForPlayerCount(role, playerCount),
      );

      expect(
        availableRoles.length,
        `Not enough roles are available for ${playerCount} players.`,
      ).toBeGreaterThanOrEqual(playerCount);
    }

    for (const playerCount of [2, 3, 4] as const) {
      const availableObjectives = objectives.filter((objective) =>
        isObjectiveAvailableForPlayerCount(objective, playerCount),
      );

      const primaryObjectives = availableObjectives.filter((objective) =>
        objective.allowedTypes.includes("PRIMARY"),
      );

      const secondaryObjectives = availableObjectives.filter((objective) =>
        objective.allowedTypes.includes("SECONDARY"),
      );

      expect(
        primaryObjectives.length,
        `No primary objective is available for ${playerCount} players.`,
      ).toBeGreaterThan(0);

      expect(
        secondaryObjectives.length,
        `No secondary objective is available for ${playerCount} players.`,
      ).toBeGreaterThan(0);
    }
  });

  it("accepts valid compatibility rules", () => {
    const rules = parseCompatibilityRules([
      {
        leftTag: "SABOTAGE",

        rightTag: "PROTECTIVE",

        samePlayer: "ALLOWED",

        partyContradictionCost: 2,
      },
    ]);

    expect(rules).toHaveLength(1);
  });

  it("rejects a negative contradiction cost", () => {
    expect(() => {
      parseCompatibilityRules([
        {
          leftTag: "SABOTAGE",

          rightTag: "PROTECTIVE",

          samePlayer: "ALLOWED",

          partyContradictionCost: -1,
        },
      ]);
    }).toThrow();
  });

  it("rejects duplicate symmetric compatibility rules", () => {
    expect(() => {
      parseCompatibilityRules([
        {
          leftTag: "SABOTAGE",

          rightTag: "PROTECTIVE",

          samePlayer: "ALLOWED",

          partyContradictionCost: 2,
        },

        {
          leftTag: "PROTECTIVE",

          rightTag: "SABOTAGE",

          samePlayer: "ALLOWED",

          partyContradictionCost: 2,
        },
      ]);
    }).toThrow();
  });

  it("loads the real compatibility rules", async () => {
    const rulesPath = join(
      process.cwd(),
      "content",
      "balancing",
      "compatibility-rules.json",
    );

    const rules = await loadCompatibilityRules(rulesPath);

    expect(rules).toHaveLength(4);

    expect(
      rules.some(
        (rule) =>
          rule.leftTag === "REQUIRES_PLAYER_DEATH" &&
          rule.rightTag === "FORBIDS_PLAYER_DEATH",
      ),
    ).toBe(true);
  });

  it("accepts a valid contradiction budget", () => {
    const budget = parseContradictionBudget({
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
    });

    expect(budget["4"].maximum).toBe(5);
  });

  it("rejects a contradiction budget whose minimum exceeds maximum", () => {
    expect(() => {
      parseContradictionBudget({
        "2": {
          minimum: 2,
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
      });
    }).toThrow();
  });

  it("loads the real contradiction budget", async () => {
    const budgetPath = join(
      process.cwd(),
      "content",
      "balancing",
      "contradiction-budget.json",
    );

    const budget = await loadContradictionBudget(budgetPath);

    expect(budget["2"]).toEqual({
      minimum: 0,
      maximum: 1,
    });

    expect(budget["4"]).toEqual({
      minimum: 2,
      maximum: 5,
    });
  });

  it("accepts a valid character", () => {
    const character = parseCharacterDefinition({
      slug: "character-alpha",

      name: "Personnage Alpha",
    });

    expect(character.slug).toBe("character-alpha");
  });

  it("loads the real character content", async () => {
    const charactersPath = join(process.cwd(), "content", "characters");

    const characters = await loadCharacters(charactersPath);

    /*
     * Le catalogue doit contenir au moins
     * un personnage pour permettre
     * de créer une partie.
     */
    expect(characters.length).toBeGreaterThan(0);

    /*
     * Les slugs servent d'identifiants
     * techniques et doivent rester uniques.
     */
    const slugs = characters.map((character) => character.slug);

    expect(new Set(slugs).size).toBe(slugs.length);

    /*
     * Les détails individuels sont déjà
     * validés par Zod lors du chargement.
     *
     * On vérifie simplement ici que le
     * catalogue réel est exploitable.
     */
    for (const character of characters) {
      expect(character.slug.trim()).not.toBe("");

      expect(character.name.trim()).not.toBe("");
    }
  });

  it("accepts a role with variants instead of a direct primary objective", () => {
    const role = parseRoleDefinition({
      code: "angel",

      name: "Angel",

      description: "Choose your path.",

      alignment: "SELFISH",

      tags: [],

      minimumPlayers: 2,

      maximumPlayers: 4,

      supportedTrackingModes: ["MANUAL", "STS2"],

      variants: [
        {
          code: "guardian",

          name: "Guardian Angel",

          description: "Protect a player.",

          primaryObjectiveCode: "angel-guardian",

          targetSelection: {
            count: 1,

            allowSelf: false,
          },
        },

        {
          code: "fallen",

          name: "Fallen Angel",

          description: "Condemn a player.",

          primaryObjectiveCode: "angel-fallen",

          targetSelection: {
            count: 1,

            allowSelf: false,
          },
        },
      ],
    });

    expect(role.variants).toHaveLength(2);

    expect(role.primaryObjectiveCode).toBeUndefined();
  });

  it("rejects a role with both a direct primary objective and variants", () => {
    expect(() => {
      parseRoleDefinition({
        code: "invalid-role",

        name: "Invalid",

        description: "Invalid",

        alignment: "LOYAL",

        tags: [],

        minimumPlayers: 2,

        maximumPlayers: 4,

        primaryObjectiveCode: "some-primary",

        variants: [
          {
            code: "a",

            name: "A",

            description: "A",

            primaryObjectiveCode: "primary-a",
          },

          {
            code: "b",

            name: "B",

            description: "B",

            primaryObjectiveCode: "primary-b",
          },
        ],
      });
    }).toThrow();
  });

  it("accepts a valid active power", () => {
    const power = parsePowerDefinition({
      code: "time-rewind",

      name: "Time Rewind",

      description: "Restart a combat.",

      mode: "ACTIVE",

      supportedTrackingModes: ["STS2"],

      usageLimit: {
        scope: "GAME",

        maxUses: 1,
      },

      activation: {
        timing: "COMBAT_ACTIVE",
      },

      effect: {
        type: "RESTART_COMBAT",
      },
    });

    expect(power.mode).toBe("ACTIVE");

    expect(power.usageLimit).toEqual({
      scope: "GAME",

      maxUses: 1,
    });

    expect(power.activation).toEqual({
      timing: "COMBAT_ACTIVE",
    });

    expect(power.effect).toEqual({
      type: "RESTART_COMBAT",
    });

    expect(power.setup).toBeUndefined();
  });

  it("accepts a passive power with setup", () => {
    const power = parsePowerDefinition({
      code: "lovers-bond",

      name: "Lovers Bond",

      description: "Link two players.",

      mode: "PASSIVE",

      supportedTrackingModes: ["STS2"],

      setup: {
        targetSelection: {
          count: 2,

          allowSelf: true,
        },
      },
    });

    expect(power.mode).toBe("PASSIVE");

    expect(power.setup?.targetSelection.count).toBe(2);

    expect(power.setup?.targetSelection.allowSelf).toBe(true);
  });

  it("rejects an invalid power mode", () => {
    expect(() => {
      parsePowerDefinition({
        code: "invalid",

        name: "Invalid",

        description: "Invalid",

        mode: "SETUP",

        supportedTrackingModes: ["MANUAL"],
      });
    }).toThrow();
  });

  it("rejects a non-positive power usage limit", () => {
    expect(() => {
      parsePowerDefinition({
        code: "invalid",

        name: "Invalid",

        description: "Invalid",

        mode: "ACTIVE",

        supportedTrackingModes: ["STS2"],

        usageLimit: {
          scope: "GAME",

          maxUses: 0,
        },

        activation: {
          timing: "COMBAT_ACTIVE",
        },

        effect: {
          type: "RESTART_COMBAT",
        },
      });
    }).toThrow();
  });

  it("rejects a power setup requiring more than four targets", () => {
    expect(() => {
      parsePowerDefinition({
        code: "invalid",

        name: "Invalid",

        description: "Invalid",

        mode: "PASSIVE",

        supportedTrackingModes: ["STS2"],

        setup: {
          targetSelection: {
            count: 5,

            allowSelf: true,
          },
        },
      });
    }).toThrow();
  });

  it("accepts a role referencing a power", () => {
    const role = parseRoleDefinition({
      code: "cupid",

      name: "Cupid",

      description: "Cupid",

      alignment: "LOYAL",

      tags: [],

      minimumPlayers: 2,

      maximumPlayers: 4,

      primaryObjectiveCode: "cupid-primary",

      powerCode: "lovers-bond",

      supportedTrackingModes: ["STS2"],
    });

    expect(role.powerCode).toBe("lovers-bond");
  });

  it("loads the real power content", async () => {
    const powers = await loadPowers(join(process.cwd(), "content", "powers"));

    expect(powers.length).toBeGreaterThan(0);

    const codes = powers.map((power) => power.code);

    expect(codes).toContain("lovers-bond");

    expect(codes).toContain("time-rewind");
  });
});
