import { describe, expect, it } from "vitest";

import { GameEventService } from "../../src/application/game-event-service/game-event-service.js";

import { Game } from "../../src/domain/games/game.js";

import { createObjectiveAssignment } from "../../src/domain/objectives/objective-assignments.js";

import type { Objective } from "../../src/domain/objectives/objective.js";

import type { ObjectiveRule } from "../../src/domain/objectives/objective-rule.js";

import { InMemoryGameEventRepository } from "../../src/infrastructure/database/in-memory-game-event-repository.js";

import { InMemoryGameRepository } from "../../src/infrastructure/database/in-memory-game-repository.js";

function createObjective(
  code: string,

  type: "PRIMARY" | "SECONDARY",

  rule?: ObjectiveRule,
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

    requiredEvents:
      rule !== undefined && "eventType" in rule ? [rule.eventType] : [],

    verificationMode: "DISCORD",

    compatibilityTags: [],

    score: type === "PRIMARY" ? 100 : 35,

    hiddenProgress: false,

    ...(rule === undefined
      ? {}
      : {
          rule,
        }),

    supportedTrackingModes: ["MANUAL", "STS2"],
  };
}

function createContent(): readonly Objective[] {
  return [
    createObjective("primary-alice", "PRIMARY"),

    createObjective("primary-bob", "PRIMARY"),

    createObjective("alchemist", "SECONDARY", {
      type: "EVENT_COUNT",

      eventType: "POTION_USED",

      actor: "OWNER",

      target: "ANY",

      increment: 1,

      requiredCount: 3,
    }),

    createObjective("secondary-bob", "SECONDARY"),
  ];
}

function createActiveGame(objectives: readonly Objective[]): Game {
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

  const primaryAlice = objectives.find(
    (objective) => objective.code === "primary-alice",
  );

  const primaryBob = objectives.find(
    (objective) => objective.code === "primary-bob",
  );

  const alchemist = objectives.find(
    (objective) => objective.code === "alchemist",
  );

  const secondaryBob = objectives.find(
    (objective) => objective.code === "secondary-bob",
  );

  if (
    primaryAlice === undefined ||
    primaryBob === undefined ||
    alchemist === undefined ||
    secondaryBob === undefined
  ) {
    throw new Error("Missing objective test fixture.");
  }

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

      createObjectiveAssignment("alice", alchemist, "SECONDARY", 1),

      createObjectiveAssignment("bob", primaryBob, "PRIMARY"),

      createObjectiveAssignment("bob", secondaryBob, "SECONDARY", 1),
    ],
  );

  game.start();

  return game;
}

async function createServiceFixture() {
  const objectives = createContent();

  const gameRepository = new InMemoryGameRepository();

  const eventRepository = new InMemoryGameEventRepository();

  const game = createActiveGame(objectives);

  await gameRepository.save({
    id: "game-1",

    guildId: "guild-1",

    textChannelId: "channel-1",

    voiceChannelId: undefined,

    lobbyMessageId: undefined,

    hostDiscordUserId: "discord-alice",

    seed: "event-test-seed",

    trackingMode: "MANUAL",

    contradiction: undefined,

    game,
  });

  const service = new GameEventService(
    {
      objectives,
    },

    gameRepository,

    eventRepository,
  );

  return {
    service,
    gameRepository,
    eventRepository,
  };
}

describe("GameEventService", () => {
  it("rebuilds objective progress from verified game events", async () => {
    const { service, gameRepository, eventRepository } =
      await createServiceFixture();

    const firstEvent = await service.recordEvent({
      id: "event-1",

      gameId: "game-1",

      type: "POTION_USED",

      actorPlayerId: "alice",

      source: "MANUAL",

      validationStatus: "VERIFIED",

      createdAt: new Date("2026-01-01T12:00:00Z"),
    });

    /*
     * L'acte courant doit être
     * automatiquement renseigné.
     */
    expect(firstEvent.actNumber).toBe(1);

    const storedEvents = await eventRepository.findByGameId("game-1");

    expect(storedEvents).toHaveLength(1);

    expect(storedEvents[0]?.validationStatus).toBe("VERIFIED");

    const afterFirst = await gameRepository.findById("game-1");

    expect(afterFirst).toBeDefined();

    const afterFirstObjective = afterFirst?.game
      .getObjectiveAssignmentsForPlayer("alice")
      .find((assignment) => assignment.objectiveCode === "alchemist");

    expect(afterFirstObjective?.progress).toEqual({
      current: 1,

      target: 3,
    });

    expect(afterFirstObjective?.status).toBe("IN_PROGRESS");

    await service.recordEvent({
      id: "event-2",

      gameId: "game-1",

      type: "POTION_USED",

      actorPlayerId: "alice",

      source: "MANUAL",

      validationStatus: "VERIFIED",

      createdAt: new Date("2026-01-01T12:01:00Z"),
    });

    await service.recordEvent({
      id: "event-3",

      gameId: "game-1",

      type: "POTION_USED",

      actorPlayerId: "alice",

      source: "MANUAL",

      validationStatus: "VERIFIED",

      createdAt: new Date("2026-01-01T12:02:00Z"),
    });

    const afterThird = await gameRepository.findById("game-1");

    const completedObjective = afterThird?.game
      .getObjectiveAssignmentsForPlayer("alice")
      .find((assignment) => assignment.objectiveCode === "alchemist");

    expect(completedObjective?.progress).toEqual({
      current: 3,

      target: 3,
    });

    expect(completedObjective?.status).toBe("COMPLETED");
  });

  it("does not apply a pending event until it is verified", async () => {
    const { service, gameRepository, eventRepository } =
      await createServiceFixture();

    await service.recordEvent({
      id: "pending-event",

      gameId: "game-1",

      type: "POTION_USED",

      actorPlayerId: "alice",

      source: "MANUAL",

      validationStatus: "PENDING",

      createdAt: new Date("2026-01-01T12:00:00Z"),
    });

    const beforeVerification = await gameRepository.findById("game-1");

    const pendingObjective = beforeVerification?.game
      .getObjectiveAssignmentsForPlayer("alice")
      .find((assignment) => assignment.objectiveCode === "alchemist");

    expect(pendingObjective?.progress).toEqual({
      current: 0,

      target: 3,
    });

    expect(pendingObjective?.status).toBe("PENDING");

    const storedBefore = await eventRepository.findById("pending-event");

    expect(storedBefore?.validationStatus).toBe("PENDING");

    const verified = await service.verifyEvent("pending-event");

    expect(verified.validationStatus).toBe("VERIFIED");

    const storedAfter = await eventRepository.findById("pending-event");

    expect(storedAfter?.validationStatus).toBe("VERIFIED");

    const afterVerification = await gameRepository.findById("game-1");

    const verifiedObjective = afterVerification?.game
      .getObjectiveAssignmentsForPlayer("alice")
      .find((assignment) => assignment.objectiveCode === "alchemist");

    expect(verifiedObjective?.progress).toEqual({
      current: 1,

      target: 3,
    });

    expect(verifiedObjective?.status).toBe("IN_PROGRESS");
  });

  it("rejects events referencing a player outside the game", async () => {
    const { service } = await createServiceFixture();

    await expect(
      service.recordEvent({
        id: "invalid-event",

        gameId: "game-1",

        type: "POTION_USED",

        actorPlayerId: "eve",

        source: "MANUAL",

        validationStatus: "VERIFIED",
      }),
    ).rejects.toThrow("Game event references unknown actor player: eve");
  });
});
