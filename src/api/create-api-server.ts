import Fastify, { type FastifyInstance } from "fastify";

import type { BridgeIdentityService } from "../application/bridge-identity/bridge-identity-service.js";

import type { Sts2BridgeSessionService } from "../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { registerSts2BridgeRoutes } from "./sts2/sts2-bridge-routes.js";

import type { Sts2EventIngestionService } from "../application/sts2-event-ingestion/sts2-event-ingestion-service.js";

import { registerSts2EventsBatchRoutes } from "./sts2/sts2-events-batch-routes.js";

export interface ApiServerDependencies {
  readonly bridgeIdentityService: BridgeIdentityService;

  readonly sts2BridgeSessionService: Sts2BridgeSessionService;

  readonly sts2EventIngestionService: Sts2EventIngestionService;
}

export async function createApiServer(
  dependencies: ApiServerDependencies,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  app.get(
    "/health",

    async () => ({
      ok: true,
    }),
  );

  app.get(
    "/ready",

    async () => ({
      ok: true,
    }),
  );

  await registerSts2BridgeRoutes(app, {
    bridgeIdentityService: dependencies.bridgeIdentityService,

    sts2BridgeSessionService: dependencies.sts2BridgeSessionService,
  });

  await registerSts2EventsBatchRoutes(app, {
    sts2EventIngestionService: dependencies.sts2EventIngestionService,
  });

  return app;
}
