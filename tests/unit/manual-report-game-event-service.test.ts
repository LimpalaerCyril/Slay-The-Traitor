import { describe, expect, it } from "vitest";

import { GameEventService } from "../../src/application/game-event-service/game-event-service.js";

import { Game } from "../../src/domain/games/game.js";

import { createObjectiveAssignment } from "../../src/domain/objectives/objective-assignments.js";

import type { Objective } from "../../src/domain/objectives/objective.js";

import { InMemoryGameEventRepository } from "../../src/infrastructure/database/in-memory-game-event-repository.js";

import { InMemoryGameRepository } from "../../src/infrastructure/database/in-memory-game-repository.js";

function createObjective(
  code: string,

  type: "PRIMARY" | "SECONDARY",
): Objective {
  return {
    code,

    name: code,

    description: code,

    category: "TEST",

    difficulty: "EASY",

    minimumPlayers: 2,

    maximumPlayers: 4,

    allowedTypes: [type],

    requiredEvents: [],

    verificationMode: "DISCORD",

    compatibilityTags: [],

    score: type === "PRIMARY" ? 100 : 35,

    hiddenProgress: false,

    supportedTrackingModes: ["MANUAL", "STS2"],
  };
}

async function createFixture(trackingMode: "MANUAL" | "STS2" = "MANUAL") {
  const objectives = [
    createObjective("primary-alice", "PRIMARY"),

    createObjective("primary-bob", "PRIMARY"),

    createObjective("secondary", "SECONDARY"),
  ];

  const primaryAlice = objectives[0]!;

  const primaryBob = objectives[1]!;

  const secondary = objectives[2]!;

  const game = new Game();

  game.addPlayer({
    id: "alice",

    discordUserId: "discord-alice",

    characterSlug: "silent",

    alive: true,
  });

  game.addPlayer({
    id: "bob",

    discordUserId: "discord-bob",

    characterSlug: "ironclad",

    alive: true,
  });

  game.lockRoster();

  game.setSecretAssignments(
    [
      {
        playerId: "alice",

        roleCode: "role-alice",

        targetPlayerIds: [],

        setupCompleted: true,
      },

      {
        playerId: "bob",

        roleCode: "role-bob",

        targetPlayerIds: [],

        setupCompleted: true,
      },
    ],

    [
      createObjectiveAssignment("alice", primaryAlice, "PRIMARY"),

      createObjectiveAssignment("alice", secondary, "SECONDARY", 1),

      createObjectiveAssignment("bob", primaryBob, "PRIMARY"),

      createObjectiveAssignment("bob", secondary, "SECONDARY", 1),
    ],
  );

  game.start();

  const gameRepository = new InMemoryGameRepository();

  const eventRepository = new InMemoryGameEventRepository();

  await gameRepository.save({
    id: "game-1",

    guildId: "guild-1",

    textChannelId: "channel-1",

    voiceChannelId: undefined,

    lobbyMessageId: undefined,

    hostDiscordUserId: "discord-alice",

    seed: "manual-report-seed",

    trackingMode,

    contradiction: undefined,

    game,
  });

  return {
    gameRepository,

    eventRepository,

    service: new GameEventService(
      {
        objectives,
      },

      gameRepository,

      eventRepository,
    ),
  };
}

describe("manual game reports", () => {
  it("records a verified potion event for the reporter", async () => {
    const { service } = await createFixture();

    const event = await service.recordManualReport({
      gameId: "game-1",

      reporterDiscordUserId: "discord-alice",

      reportType: "POTION_USED",
    });

    expect(event.type).toBe("POTION_USED");

    expect(event.actorPlayerId).toBe("alice");

    expect(event.actNumber).toBe(1);

    expect(event.source).toBe("MANUAL");

    expect(event.validationStatus).toBe("VERIFIED");
  });

  it("records block amount and target", async () => {
    const { service } = await createFixture();

    const event = await service.recordManualReport({
      gameId: "game-1",

      reporterDiscordUserId: "discord-alice",

      reportType: "BLOCK_GRANTED_TO_ALLY",

      targetDiscordUserId: "discord-bob",

      value: 12,
    });

    expect(event.actorPlayerId).toBe("alice");

    expect(event.targetPlayerId).toBe("bob");

    expect(event.payload).toEqual({
      amount: 12,
    });
  });

  it("marks a reported dead player as dead", async () => {
    const { service, gameRepository } = await createFixture();

    await service.recordManualReport({
      gameId: "game-1",

      reporterDiscordUserId: "discord-alice",

      reportType: "PLAYER_DIED",

      targetDiscordUserId: "discord-bob",
    });

    const restored = await gameRepository.findById("game-1");

    const bob = restored?.game
      .getPlayers()
      .find((player) => player.id === "bob");

    expect(bob?.alive).toBe(false);
  });

  it("advances to act 2 and assigns new secondary objectives", async () => {
    const { service, gameRepository } = await createFixture();

    const event = await service.recordManualReport({
      gameId: "game-1",

      reporterDiscordUserId: "discord-alice",

      reportType: "ACT_COMPLETED",
    });

    expect(event.actNumber).toBe(1);

    const restored = await gameRepository.findById("game-1");

    expect(restored?.game.currentAct).toBe(2);

    for (const player of restored?.game.getPlayers() ?? []) {
      const actTwoSecondary = restored?.game
        .getObjectiveAssignmentsForPlayer(player.id)
        .find(
          (assignment) =>
            assignment.objectiveType === "SECONDARY" &&
            assignment.actNumber === 2,
        );

      expect(actTwoSecondary).toBeDefined();
    }
  });

  it("rejects manual reports in STS2 mode", async () => {
    const { service } = await createFixture("STS2");

    await expect(
      service.recordManualReport({
        gameId: "game-1",

        reporterDiscordUserId: "discord-alice",

        reportType: "POTION_USED",
      }),
    ).rejects.toThrow(
      "Manual reports are only available in MANUAL tracking mode.",
    );
  });

  it("only allows the host to report act completion", async () => {
    const { service } = await createFixture();

    await expect(
      service.recordManualReport({
        gameId: "game-1",

        reporterDiscordUserId: "discord-bob",

        reportType: "ACT_COMPLETED",
      }),
    ).rejects.toThrow("Seul l'hôte peut déclarer la fin d'un acte.");
  });
});
