import { describe, expect, it } from "vitest";

import { parsePowerDefinition } from "../../src/infrastructure/content/schemas/power-schema.js";

describe("Power schema", () => {
  it("parses a game-limited restart power", () => {
    const power = parsePowerDefinition({
      code: "time-rewind",

      name: "Remonter le temps",

      description: "Restart combat.",

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

    expect(power.usageLimit).toEqual({
      scope: "GAME",

      maxUses: 1,
    });

    expect(power.effect).toEqual({
      type: "RESTART_COMBAT",
    });
  });

  it("parses an act-limited targeted campfire power", () => {
    const power = parsePowerDefinition({
      code: "sleep-denial",

      name: "Insomnie",

      description: "Blocks rest.",

      mode: "ACTIVE",

      supportedTrackingModes: ["STS2"],

      usageLimit: {
        scope: "ACT",

        maxUses: 1,
      },

      activation: {
        timing: "CAMPFIRE",

        targetSelection: {
          count: 1,

          allowSelf: false,
        },
      },

      effect: {
        type: "BLOCK_CAMPFIRE_OPTION",

        option: "REST",

        target: "SELECTED_PLAYER",
      },
    });

    expect(power.activation?.targetSelection).toEqual({
      count: 1,

      allowSelf: false,
    });
  });

  it("parses Tesla energy gain", () => {
    const power = parsePowerDefinition({
      code: "overcharge",

      name: "Surcharge",

      description: "Gain energy.",

      mode: "ACTIVE",

      supportedTrackingModes: ["STS2"],

      usageLimit: {
        scope: "ACT",

        maxUses: 3,
      },

      activation: {
        timing: "COMBAT_START",
      },

      effect: {
        type: "GRANT_ENERGY",

        amount: 1,

        target: "OWNER",

        duration: "FIRST_TURN",
      },
    });

    expect(power.effect).toEqual({
      type: "GRANT_ENERGY",

      amount: 1,

      target: "OWNER",

      duration: "FIRST_TURN",
    });
  });

  it("rejects an active power without an effect", () => {
    expect(() =>
      parsePowerDefinition({
        code: "broken",

        name: "Broken",

        description: "Broken.",

        mode: "ACTIVE",

        supportedTrackingModes: ["STS2"],

        usageLimit: {
          scope: "GAME",

          maxUses: 1,
        },

        activation: {
          timing: "ANYTIME",
        },
      }),
    ).toThrow();
  });

  it("keeps passive setup powers valid", () => {
    const power = parsePowerDefinition({
      code: "lovers-bond",

      name: "Lien amoureux",

      description: "Link players.",

      mode: "PASSIVE",

      supportedTrackingModes: ["MANUAL", "STS2"],

      setup: {
        targetSelection: {
          count: 2,

          allowSelf: true,
        },
      },
    });

    expect(power.setup?.targetSelection.count).toBe(2);
  });
});
