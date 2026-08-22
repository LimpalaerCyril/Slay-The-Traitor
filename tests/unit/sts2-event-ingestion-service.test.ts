import { describe, expect, it } from "vitest";

import type { PlatformIdentityLink } from "../../src/application/bridge-identity/bridge-identity-repository.js";

import type {
  PersistSts2EventBatchInput,
  PersistSts2EventBatchResult,
  ResolveSts2EventContextInput,
  ResolveSts2EventContextResult,
  Sts2EventIngestionRepository,
} from "../../src/application/sts2-event-ingestion/sts2-event-ingestion-repository.js";

import { Sts2EventIngestionService } from "../../src/application/sts2-event-ingestion/sts2-event-ingestion-service.js";

import type {
  AcceptedSts2GameEvent,
  SequencedSts2ModEvent,
  Sts2PotionUsedEvent,
} from "../../src/application/sts2-event-ingestion/sts2-event-ingestion-types.js";

const IDENTITY: PlatformIdentityLink = {
  id: 7,

  discordUserId: "discord-alice",

  platform: "STEAM",

  platformPlayerId: "76561198169032837",

  platformName: "Alice",

  createdAt: new Date("2026-08-22T07:00:00.000Z"),

  updatedAt: new Date("2026-08-22T07:00:00.000Z"),
};

const BASE_INPUT = {
  bridgeToken: "sttb_v1_test",

  protocolVersion: 1 as const,

  bridgeSessionId: "11111111-1111-4111-8111-111111111111",

  clientInstanceId: "22222222-2222-4222-8222-222222222222",

  platform: "STEAM" as const,

  platformPlayerId: IDENTITY.platformPlayerId,

  bridgeVersion: "0.1.0",

  gameVersion: "2026-08-22",

  lobbyId: "109775240917553456",
};

class MemoryRepository implements Sts2EventIngestionRepository {
  public context: ResolveSts2EventContextResult = {
    status: "READY",

    gameId: "game-1",

    gamePlayerId: "alice",

    isHost: false,
  };

  public readonly receipts = new Map<
    number,
    {
      readonly fingerprint: string;

      readonly disposition: "ACCEPTED" | "IGNORED";
    }
  >();

  public readonly accepted: AcceptedSts2GameEvent[] = [];

  public failAfterGameEventInsert = false;

  public async resolveContext(
    _input: ResolveSts2EventContextInput,
  ): Promise<ResolveSts2EventContextResult> {
    return this.context;
  }

  public async persistBatch(
    input: PersistSts2EventBatchInput,
  ): Promise<PersistSts2EventBatchResult> {
    if (this.context.status !== "READY") {
      return this.context;
    }

    const snapshotReceipts = new Map(this.receipts);

    const snapshotAcceptedLength = this.accepted.length;

    try {
      for (const item of input.events) {
        const existing = this.receipts.get(item.source.sequence);

        if (
          existing !== undefined &&
          existing.fingerprint !== item.fingerprint
        ) {
          return {
            status: "SEQUENCE_CONFLICT",

            sequence: item.source.sequence,
          };
        }
      }

      let acceptedCount = 0;
      let duplicateCount = 0;
      let ignoredCount = 0;
      let shouldRebuildObjectives = false;
      const ignored = [];

      for (const item of input.events) {
        const existing = this.receipts.get(item.source.sequence);

        if (existing !== undefined) {
          duplicateCount += 1;

          if (existing.disposition === "ACCEPTED") {
            shouldRebuildObjectives = true;
          }

          continue;
        }

        if (item.kind === "IGNORE") {
          this.receipts.set(item.source.sequence, {
            fingerprint: item.fingerprint,
            disposition: "IGNORED",
          });

          ignoredCount += 1;
          ignored.push({
            sequence: item.source.sequence,
            type: item.source.event.type,
            reason: item.reason,
          });

          continue;
        }

        this.accepted.push(item.gameEvent);

        if (this.failAfterGameEventInsert) {
          throw new Error("simulated receipt insert failure");
        }

        this.receipts.set(item.source.sequence, {
          fingerprint: item.fingerprint,
          disposition: "ACCEPTED",
        });

        acceptedCount += 1;
        shouldRebuildObjectives = true;
      }

      const last = input.events.at(-1)!;

      return {
        status: "ACKNOWLEDGED",
        acknowledgedThrough: last.source.sequence,
        acceptedCount,
        duplicateCount,
        ignoredCount,
        ignored,
        shouldRebuildObjectives,
        gameId: "game-1",
      };
    } catch (error) {
      this.receipts.clear();

      for (const [sequence, receipt] of snapshotReceipts) {
        this.receipts.set(sequence, receipt);
      }

      this.accepted.splice(snapshotAcceptedLength);

      throw error;
    }
  }
}

type SequencedPotionUsedEvent = Omit<SequencedSts2ModEvent, "event"> & {
  readonly event: Sts2PotionUsedEvent;
};

function createPotion(
  sequence: number,

  actorPlatformPlayerId: string = IDENTITY.platformPlayerId,
): SequencedPotionUsedEvent {
  return {
    sequence,

    occurredAt: new Date(`2026-08-22T08:00:0${sequence}.000Z`),

    event: {
      type: "POTION_USED",

      actNumber: 1,

      actorPlatformPlayerId,

      payload: {
        potionId: "FIRE_POTION",
      },
    },
  };
}

function createService(
  repository: MemoryRepository,

  options?: {
    readonly identity?: PlatformIdentityLink | undefined;

    readonly rebuild?: () => Promise<void>;
  },
) {
  let rebuildCount = 0;

  const service = new Sts2EventIngestionService(
    {
      authenticate: async () =>
        options?.identity === undefined ? IDENTITY : options.identity,
    },

    repository,

    {
      rebuildObjectivesForGame: async () => {
        rebuildCount += 1;
        await options?.rebuild?.();
      },
    },

    () => new Date("2026-08-22T09:00:00.000Z"),
  );

  return {
    service,
    getRebuildCount: () => rebuildCount,
  };
}

describe("Sts2EventIngestionService", () => {
  it("rejects an invalid bridge token", async () => {
    const repository = new MemoryRepository();

    const service = new Sts2EventIngestionService(
      {
        authenticate: async () => undefined,
      },
      repository,
      {
        rebuildObjectivesForGame: async () => {},
      },
    );

    const result = await service.ingestBatch({
      ...BASE_INPUT,
      events: [createPotion(1)],
    });

    expect(result).toEqual({
      ok: false,
      status: "UNAUTHORIZED",
    });
  });

  it("rejects platform identity mismatch", async () => {
    const repository = new MemoryRepository();

    const { service } = createService(repository);

    const result = await service.ingestBatch({
      ...BASE_INPUT,
      platformPlayerId: "76561198000000000",
      events: [createPotion(1)],
    });

    expect(result).toEqual({
      ok: false,
      status: "IDENTITY_MISMATCH",
    });
  });

  it.each([
    ["SESSION_NOT_FOUND", "SESSION_NOT_FOUND"],
    ["LOBBY_MISMATCH", "RECONNECT_REQUIRED"],
    ["CONNECTION_NOT_FOUND", "RECONNECT_REQUIRED"],
    ["CLIENT_INSTANCE_MISMATCH", "RECONNECT_REQUIRED"],
    ["NOT_STS2_GAME", "NOT_STS2_GAME"],
    ["GAME_NOT_ACTIVE", "GAME_NOT_ACTIVE"],
    ["NOT_GAME_PARTICIPANT", "NOT_GAME_PARTICIPANT"],
  ] as const)(
    "maps session context %s to %s",
    async (repositoryStatus, expectedStatus) => {
      const repository = new MemoryRepository();

      repository.context = {
        status: repositoryStatus,
      };

      const { service } = createService(repository);

      const result = await service.ingestBatch({
        ...BASE_INPUT,
        events: [createPotion(1)],
      });

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.status).toBe(expectedStatus);
      }
    },
  );

  it("accepts local-player events and converts the Steam identity to GamePlayer.id", async () => {
    const repository = new MemoryRepository();

    const { service } = createService(repository);

    const result = await service.ingestBatch({
      ...BASE_INPUT,
      events: [createPotion(1)],
    });

    expect(result.ok).toBe(true);
    expect(repository.accepted).toHaveLength(1);
    expect(repository.accepted[0]).toMatchObject({
      type: "POTION_USED",
      actorPlayerId: "alice",
    });
  });

  it("ACKs replicated local-player events as IGNORED instead of blocking the journal", async () => {
    const repository = new MemoryRepository();

    const { service } = createService(repository);

    const result = await service.ingestBatch({
      ...BASE_INPUT,
      events: [createPotion(1, "76561198000000000")],
    });

    expect(result).toMatchObject({
      ok: true,
      acknowledgedThrough: 1,
      acceptedCount: 0,
      duplicateCount: 0,
      ignoredCount: 1,
      ignored: [
        {
          sequence: 1,
          type: "POTION_USED",
          reason: "LOCAL_PLAYER_AUTHORITY_REQUIRED",
        },
      ],
    });
  });

  it("accepts global events only from the server-recorded host connection", async () => {
    const repository = new MemoryRepository();

    const { service } = createService(repository);

    const nonHost = await service.ingestBatch({
      ...BASE_INPUT,
      events: [
        {
          sequence: 1,
          occurredAt: new Date("2026-08-22T08:00:00.000Z"),
          event: {
            type: "ACT_COMPLETED",
            actNumber: 1,
            payload: {},
          },
        },
      ],
    });

    expect(nonHost).toMatchObject({
      ok: true,
      ignoredCount: 1,
    });

    const hostRepository = new MemoryRepository();

    hostRepository.context = {
      status: "READY",
      gameId: "game-1",
      gamePlayerId: "alice",
      isHost: true,
    };

    const host = createService(hostRepository).service;

    const hostResult = await host.ingestBatch({
      ...BASE_INPUT,
      events: [
        {
          sequence: 1,
          occurredAt: new Date("2026-08-22T08:00:00.000Z"),
          event: {
            type: "BOSS_DEFEATED",
            actNumber: 1,
            payload: {
              bossId: "BOSS_1",
            },
          },
        },
        {
          sequence: 2,
          occurredAt: new Date("2026-08-22T08:00:01.000Z"),
          event: {
            type: "ACT_COMPLETED",
            actNumber: 1,
            payload: {},
          },
        },
      ],
    });

    expect(hostResult).toMatchObject({
      ok: true,
      acceptedCount: 2,
      ignoredCount: 0,
    });
  });

  it("deduplicates an identical retry and rebuilds objectives again for accepted duplicates", async () => {
    const repository = new MemoryRepository();

    const harness = createService(repository);

    const first = await harness.service.ingestBatch({
      ...BASE_INPUT,
      events: [createPotion(1)],
    });

    const second = await harness.service.ingestBatch({
      ...BASE_INPUT,
      events: [createPotion(1)],
    });

    expect(first).toMatchObject({
      ok: true,
      acceptedCount: 1,
      duplicateCount: 0,
    });

    expect(second).toMatchObject({
      ok: true,
      acceptedCount: 0,
      duplicateCount: 1,
    });

    expect(repository.accepted).toHaveLength(1);
    expect(harness.getRebuildCount()).toBe(2);
  });

  it("returns SEQUENCE_CONFLICT for the same sequence with different content", async () => {
    const repository = new MemoryRepository();

    const { service } = createService(repository);

    await service.ingestBatch({
      ...BASE_INPUT,
      events: [createPotion(1)],
    });

    const changed = createPotion(1);

    const result = await service.ingestBatch({
      ...BASE_INPUT,
      events: [
        {
          ...changed,
          event: {
            ...changed.event,
            payload: {
              potionId: "DEXTERITY_POTION",
            },
          },
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      status: "SEQUENCE_CONFLICT",
      sequence: 1,
    });

    expect(repository.accepted).toHaveLength(1);
  });

  it("rolls back a GameEvent when receipt creation fails", async () => {
    const repository = new MemoryRepository();

    repository.failAfterGameEventInsert = true;

    const { service } = createService(repository);

    await expect(
      service.ingestBatch({
        ...BASE_INPUT,
        events: [createPotion(1)],
      }),
    ).rejects.toThrow("simulated receipt insert failure");

    expect(repository.accepted).toHaveLength(0);
    expect(repository.receipts.size).toBe(0);
  });
});
