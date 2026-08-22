import { describe, expect, it } from "vitest";

import type { PlayerSecrets } from "../../src/application/game-service/game-service.js";

import { createPlayerSecretsContent } from "../../src/discord/presenters/player-secrets-presenter.js";

function createSecrets(): PlayerSecrets {
  return {
    playerId: "alice",

    roleAssignment: {
      playerId: "alice",

      roleCode: "cupid",

      targetPlayerIds: [],

      setupCompleted: true,
    },

    role: {
      code: "cupid",

      name: "Cupidon",

      description: "Répandez l'amour.",

      alignment: "LOYAL",

      tags: [],

      minimumPlayers: 2,

      maximumPlayers: 4,

      primaryObjectiveCode: "primary",

      powerCode: "lovers-bond",

      supportedTrackingModes: ["MANUAL", "STS2"],
    },

    roleTargets: [],

    lovePartners: [
      {
        id: "bob",

        discordUserId: "discord-bob",

        characterSlug: "ironclad",

        alive: true,
      },
    ],

    power: {
      assignment: {
        playerId: "alice",

        powerCode: "lovers-bond",

        targetPlayerIds: ["alice", "bob"],

        setupCompleted: true,

        uses: 0,
      },

      power: {
        code: "lovers-bond",

        name: "Lien amoureux",

        description: "Unissez deux joueurs.",

        mode: "PASSIVE",

        supportedTrackingModes: ["MANUAL", "STS2"],

        setup: {
          targetSelection: {
            count: 2,

            allowSelf: true,
          },
        },
      },

      targets: [
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
      ],
    },

    objectives: [
      {
        assignment: {
          playerId: "alice",

          objectiveCode: "primary",

          objectiveType: "PRIMARY",

          status: "PENDING",

          progress: {
            current: 0,

            target: 1,
          },
        },

        objective: {
          code: "primary",

          name: "Objectif principal test",

          description: "Description principale.",

          category: "TEST",

          difficulty: "EASY",

          minimumPlayers: 2,

          maximumPlayers: 4,

          supportedTrackingModes: ["MANUAL", "STS2"],

          allowedTypes: ["PRIMARY"],

          requiredEvents: [],

          verificationMode: "DISCORD",

          compatibilityTags: [],

          score: 100,

          hiddenProgress: false,
        },
      },

      {
        assignment: {
          playerId: "alice",

          objectiveCode: "secondary",

          objectiveType: "SECONDARY",

          actNumber: 1,

          status: "PENDING",

          progress: {
            current: 0,

            target: 1,
          },
        },

        objective: {
          code: "secondary",

          name: "Objectif secondaire test",

          description: "Description secondaire.",

          category: "TEST",

          difficulty: "EASY",

          minimumPlayers: 2,

          maximumPlayers: 4,

          supportedTrackingModes: ["MANUAL", "STS2"],

          allowedTypes: ["SECONDARY"],

          requiredEvents: [],

          verificationMode: "DISCORD",

          compatibilityTags: [],

          score: 35,

          hiddenProgress: false,
        },
      },
    ],
  };
}

describe("createPlayerSecretsContent", () => {
  it("renders role, power, targets and objectives", () => {
    const content = createPlayerSecretsContent(createSecrets());

    expect(content).toContain("Votre rôle : Cupidon");

    expect(content).toContain("Pouvoir : Lien amoureux");

    expect(content).toContain("Type :** Passif");

    expect(content).toContain("<@discord-alice>");

    expect(content).toContain("<@discord-bob>");

    expect(content).toContain("Objectif principal test");

    expect(content).toContain("Objectif secondaire — Acte 1");

    expect(content).toContain("Statut amoureux");

    expect(content).toContain("Vous êtes amoureux de <@discord-bob>");
  });

  it("uses the selected role variant as the displayed role name", () => {
    const base = createSecrets();

    const secrets: PlayerSecrets = {
      ...base,

      roleAssignment: {
        playerId: "alice",

        roleCode: "angel",

        variantCode: "guardian",

        targetPlayerIds: ["bob"],

        setupCompleted: true,
      },

      role: {
        code: "angel",

        name: "L'Ange",

        description: "Choisissez votre destinée.",

        alignment: "SELFISH",

        tags: [],

        minimumPlayers: 2,

        maximumPlayers: 4,

        variants: [
          {
            code: "guardian",

            name: "Ange Gardien",

            description: "Protégez votre cible pendant toute l'expédition.",

            primaryObjectiveCode: "primary",

            targetSelection: {
              count: 1,

              allowSelf: false,
            },
          },

          {
            code: "fallen",

            name: "Ange Déchu",

            description: "Provoquez la chute de votre cible.",

            primaryObjectiveCode: "primary",

            targetSelection: {
              count: 1,

              allowSelf: false,
            },
          },
        ],

        supportedTrackingModes: ["MANUAL", "STS2"],
      },

      roleTargets: [
        {
          id: "bob",

          discordUserId: "discord-bob",

          characterSlug: "ironclad",

          alive: true,
        },
      ],

      lovePartners: [],

      power: undefined,
    };

    const content = createPlayerSecretsContent(secrets);

    expect(content).toContain("Votre rôle : Ange Gardien");

    expect(content).not.toContain("Votre rôle : L'Ange");

    expect(content).toContain(
      "Protégez votre cible pendant toute l'expédition.",
    );

    expect(content).toContain("Cible :** <@discord-bob>");
  });
});
