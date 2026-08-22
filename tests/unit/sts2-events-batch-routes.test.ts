import Fastify, { type FastifyInstance } from "fastify";

import { afterEach, describe, expect, it, vi } from "vitest";

import { registerSts2EventsBatchRoutes } from "../../src/api/sts2/sts2-events-batch-routes.js";

import type { Sts2EventIngestionService } from "../../src/application/sts2-event-ingestion/sts2-event-ingestion-service.js";

const apps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createApp(
  ingestBatch: Sts2EventIngestionService["ingestBatch"],
) {
  const app = Fastify();

  apps.push(app);

  /*
   * Le test ne dépend volontairement
   * que de la méthode ingestBatch.
   *
   * On construit donc un double minimal
   * du service applicatif.
   */
  const sts2EventIngestionService = {
    ingestBatch,
  } as unknown as Sts2EventIngestionService;

  await registerSts2EventsBatchRoutes(app, {
    sts2EventIngestionService,
  });

  await app.ready();

  return app;
}

function validBody() {
  return {
    protocolVersion: 1,
    bridgeSessionId: "11111111-1111-4111-8111-111111111111",
    clientInstanceId: "22222222-2222-4222-8222-222222222222",
    platform: "STEAM",
    platformPlayerId: "76561198169032837",
    bridgeVersion: "0.1.0",
    gameVersion: "2026-08-22",
    lobbyId: "109775240917553456",
    events: [
      {
        sequence: 1,
        occurredAt: "2026-08-22T08:00:00.000Z",
        event: {
          type: "POTION_USED",
          actNumber: 1,
          actorPlatformPlayerId: "76561198169032837",
          payload: {
            potionId: "FIRE_POTION",
          },
        },
      },
    ],
  };
}

describe("POST /api/sts2/v1/events/batch", () => {
  it("requires Bearer bridgeToken", async () => {
    const ingestBatch = vi.fn();

    const app = await createApp(ingestBatch);

    const response = await app.inject({
      method: "POST",
      url: "/api/sts2/v1/events/batch",
      payload: validBody(),
    });

    expect(response.statusCode).toBe(401);
    expect(ingestBatch).not.toHaveBeenCalled();
  });

  it("rejects an invalid strict payload before service invocation", async () => {
    const ingestBatch = vi.fn();

    const app = await createApp(ingestBatch);

    const body = validBody();

    (body as any).gameId = "must-not-be-accepted";

    const response = await app.inject({
      method: "POST",
      url: "/api/sts2/v1/events/batch",
      headers: {
        authorization: "Bearer sttb_v1_test",
      },
      payload: body,
    });

    expect(response.statusCode).toBe(400);
    expect(ingestBatch).not.toHaveBeenCalled();
  });

  it("returns the definitive ACK response without gameId or secret data", async () => {
    const ingestBatch = vi.fn().mockResolvedValue({
      ok: true,
      status: "ACKNOWLEDGED",
      acknowledgedThrough: 1,
      acceptedCount: 1,
      duplicateCount: 0,
      ignoredCount: 0,
      ignored: [],
      serverTime: new Date("2026-08-22T09:00:00.000Z"),
    });

    const app = await createApp(ingestBatch);

    const response = await app.inject({
      method: "POST",
      url: "/api/sts2/v1/events/batch",
      headers: {
        authorization: "Bearer sttb_v1_test",
      },
      payload: validBody(),
    });

    expect(response.statusCode).toBe(200);

    const payload = response.json();

    expect(payload).toEqual({
      ok: true,
      status: "ACKNOWLEDGED",
      acknowledgedThrough: 1,
      acceptedCount: 1,
      duplicateCount: 0,
      ignoredCount: 0,
      ignored: [],
      serverTime: "2026-08-22T09:00:00.000Z",
    });

    expect(JSON.stringify(payload)).not.toMatch(/gameId|role|objective/i);
  });

  it("maps SEQUENCE_CONFLICT to HTTP 409", async () => {
    const app = await createApp(async () => ({
      ok: false,
      status: "SEQUENCE_CONFLICT",
      sequence: 1,
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/sts2/v1/events/batch",
      headers: {
        authorization: "Bearer sttb_v1_test",
      },
      payload: validBody(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      ok: false,
      status: "SEQUENCE_CONFLICT",
      sequence: 1,
    });
  });
});
