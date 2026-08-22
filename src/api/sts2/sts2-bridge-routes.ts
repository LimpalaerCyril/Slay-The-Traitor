import type { FastifyInstance } from "fastify";

import { z } from "zod";

import type { BridgeIdentityService } from "../../application/bridge-identity/bridge-identity-service.js";

import type { Sts2BridgeSessionService } from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

const claimBodySchema = z
  .object({
    protocolVersion: z.literal(1),

    linkCode: z.string().trim().length(8),

    platform: z.literal("STEAM"),

    /*
     * SteamID64 reste une string.
     */
    platformPlayerId: z.string().trim().regex(/^\d+$/).max(20),

    platformName: z.string().trim().min(1).max(100),

    bridgeVersion: z.string().trim().min(1).max(50),

    gameVersion: z.string().trim().min(1).max(50),
  })
  .strict();

const rosterPlayerSchema = z
  .object({
    platformPlayerId: z.string().trim().regex(/^\d+$/).max(20),

    platformName: z.string().trim().min(1).max(100),

    characterId: z.string().trim().min(1).max(100),

    isLocal: z.boolean(),

    isHost: z.boolean(),
  })
  .strict();

const connectBodySchema = z
  .object({
    protocolVersion: z.literal(1),

    clientInstanceId: z.string().uuid(),

    bridgeVersion: z.string().trim().min(1).max(50),

    gameVersion: z.string().trim().min(1).max(50),

    sessionCode: z.string().trim().min(1).max(20).optional(),

    platform: z.literal("STEAM"),

    platformPlayerId: z.string().trim().regex(/^\d+$/).max(20),

    platformName: z.string().trim().min(1).max(100),

    lobbyId: z.string().trim().regex(/^\d+$/).max(20),

    isHost: z.boolean(),

    hostPlatformPlayerId: z.string().trim().regex(/^\d+$/).max(20),

    players: z.array(rosterPlayerSchema).min(1).max(4).optional(),
  })
  .strict();

const heartbeatPlayerSchema = z
  .object({
    platformPlayerId: z.string().trim().regex(/^\d+$/).max(20),

    hp: z.number().int().nonnegative(),

    maxHp: z.number().int().positive(),

    gold: z.number().int().nonnegative(),

    alive: z.boolean(),
  })
  .strict();

const heartbeatBodySchema = z
  .object({
    protocolVersion: z.literal(1),

    bridgeSessionId: z.string().uuid(),

    clientInstanceId: z.string().uuid(),

    platform: z.literal("STEAM"),

    platformPlayerId: z.string().trim().regex(/^\d+$/).max(20),

    bridgeVersion: z.string().trim().min(1).max(50),

    gameVersion: z.string().trim().min(1).max(50),

    lobbyId: z.string().trim().regex(/^\d+$/).max(20),

    run: z
      .object({
        actIndex: z.number().int().nonnegative(),

        actId: z.string().trim().min(1).max(100),

        players: z.array(heartbeatPlayerSchema).min(1).max(4),
      })
      .strict()
      .optional(),
  })
  .strict();

export interface Sts2BridgeRouteDependencies {
  readonly bridgeIdentityService: BridgeIdentityService;

  readonly sts2BridgeSessionService: Sts2BridgeSessionService;
}

export async function registerSts2BridgeRoutes(
  app: FastifyInstance,

  dependencies: Sts2BridgeRouteDependencies,
): Promise<void> {
  app.post(
    "/api/sts2/v1/link/claim",

    async (request, reply) => {
      const parsed = claimBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,

          error: {
            code: "INVALID_REQUEST",

            message: "Invalid bridge link request.",
          },
        });
      }

      const result = await dependencies.bridgeIdentityService.claimIdentity({
        code: parsed.data.linkCode,

        platform: parsed.data.platform,

        platformPlayerId: parsed.data.platformPlayerId,

        platformName: parsed.data.platformName,

        bridgeVersion: parsed.data.bridgeVersion,

        gameVersion: parsed.data.gameVersion,
      });

      if (result.ok) {
        return reply.code(200).send({
          ok: true,

          protocolVersion: 1,

          bridgeToken: result.bridgeToken,

          identity: {
            platform: result.identity.platform,

            platformPlayerId: result.identity.platformPlayerId,

            platformName: result.identity.platformName,
          },
        });
      }

      switch (result.reason) {
        case "CODE_NOT_FOUND":
          return reply.code(404).send({
            ok: false,

            error: {
              code: "LINK_CODE_NOT_FOUND",

              message: "Unknown link code.",
            },
          });

        case "CODE_EXPIRED":
          return reply.code(410).send({
            ok: false,

            error: {
              code: "LINK_CODE_EXPIRED",

              message: "The link code has expired.",
            },
          });

        case "CODE_ALREADY_USED":
          return reply.code(409).send({
            ok: false,

            error: {
              code: "LINK_CODE_ALREADY_USED",

              message: "The link code has already been used.",
            },
          });

        case "PLATFORM_ALREADY_LINKED":
          return reply.code(409).send({
            ok: false,

            error: {
              code: "PLATFORM_ALREADY_LINKED",

              message:
                "This Steam account is already linked to another Discord account.",
            },
          });

        case "DISCORD_ALREADY_LINKED":
          return reply.code(409).send({
            ok: false,

            error: {
              code: "DISCORD_ALREADY_LINKED",

              message:
                "This Discord account is already linked to another Steam account.",
            },
          });
      }
    },
  );

  app.post(
    "/api/sts2/v1/session/connect",

    async (request, reply) => {
      const authorization = request.headers.authorization;

      if (authorization === undefined || !authorization.startsWith("Bearer ")) {
        return reply.code(401).send({
          ok: false,

          error: {
            code: "UNAUTHORIZED",

            message: "Missing bridge credential.",
          },
        });
      }

      const bridgeToken = authorization.slice("Bearer ".length).trim();

      if (bridgeToken.length === 0) {
        return reply.code(401).send({
          ok: false,

          error: {
            code: "UNAUTHORIZED",

            message: "Missing bridge credential.",
          },
        });
      }

      const parsed = connectBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,

          error: {
            code: "INVALID_REQUEST",

            message: "Invalid STS2 session connection request.",
          },
        });
      }

      const result = await dependencies.sts2BridgeSessionService.connect({
        bridgeToken,

        protocolVersion: 1,

        clientInstanceId: parsed.data.clientInstanceId,

        bridgeVersion: parsed.data.bridgeVersion,

        gameVersion: parsed.data.gameVersion,

        sessionCode: parsed.data.sessionCode,

        platform: parsed.data.platform,

        platformPlayerId: parsed.data.platformPlayerId,

        platformName: parsed.data.platformName,

        lobbyId: parsed.data.lobbyId,

        isHost: parsed.data.isHost,

        hostPlatformPlayerId: parsed.data.hostPlatformPlayerId,

        players: parsed.data.players,
      });

      if (result.ok) {
        return reply.code(200).send({
          ok: true,

          status: "CONNECTED",

          bridgeSessionId: result.bridgeSessionId,

          heartbeatIntervalSeconds: result.heartbeatIntervalSeconds,
        });
      }

      if (result.status === "WAITING_FOR_SESSION") {
        return reply.code(202).send({
          ok: false,

          status: "WAITING_FOR_SESSION",

          retryAfterSeconds: 5,
        });
      }

      switch (result.status) {
        case "UNAUTHORIZED":
          return sendConnectError(
            reply,
            401,
            result.status,
            "Invalid bridge credential.",
          );

        case "IDENTITY_MISMATCH":
          return sendConnectError(
            reply,
            403,
            result.status,
            "The request identity does not match the bridge credential.",
          );

        case "SESSION_CODE_REQUIRED":
          return sendConnectError(
            reply,
            400,
            result.status,
            "The STS2 host must provide a session code.",
          );

        case "SESSION_CODE_NOT_FOUND":
          return sendConnectError(
            reply,
            404,
            result.status,
            "Unknown STT session code.",
          );

        case "NOT_STS2_GAME":
          return sendConnectError(
            reply,
            409,
            result.status,
            "The linked game is not using STS2 tracking.",
          );

        case "GAME_CLOSED":
          return sendConnectError(
            reply,
            409,
            result.status,
            "The linked game is already closed.",
          );

        case "NOT_GAME_PARTICIPANT":
          return sendConnectError(
            reply,
            403,
            result.status,
            "The linked Discord user is not a participant in this game.",
          );

        case "HOST_IDENTITY_MISMATCH":
          return sendConnectError(
            reply,
            403,
            result.status,
            "The reported STS2 host does not match the expected host.",
          );

        case "INVALID_HOST_ROSTER":
          return sendConnectError(
            reply,
            400,
            result.status,
            "The host roster does not contain the local host.",
          );

        case "LOBBY_ALREADY_LINKED":
          return sendConnectError(
            reply,
            409,
            result.status,
            "This Steam lobby is already linked to another STT game.",
          );
      }
    },
  );

  app.post(
    "/api/sts2/v1/session/heartbeat",

    async (request, reply) => {
      const authorization = request.headers.authorization;

      if (authorization === undefined || !authorization.startsWith("Bearer ")) {
        return reply.code(401).send({
          ok: false,

          error: {
            code: "UNAUTHORIZED",

            message: "Missing bridge credential.",
          },
        });
      }

      const bridgeToken = authorization.slice("Bearer ".length).trim();

      if (bridgeToken.length === 0) {
        return reply.code(401).send({
          ok: false,

          error: {
            code: "UNAUTHORIZED",

            message: "Missing bridge credential.",
          },
        });
      }

      const parsed = heartbeatBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,

          error: {
            code: "INVALID_REQUEST",

            message: "Invalid STS2 heartbeat request.",
          },
        });
      }

      const result = await dependencies.sts2BridgeSessionService.heartbeat({
        bridgeToken,

        protocolVersion: 1,

        bridgeSessionId: parsed.data.bridgeSessionId,

        clientInstanceId: parsed.data.clientInstanceId,

        platform: parsed.data.platform,

        platformPlayerId: parsed.data.platformPlayerId,

        bridgeVersion: parsed.data.bridgeVersion,

        gameVersion: parsed.data.gameVersion,

        lobbyId: parsed.data.lobbyId,

        ...(parsed.data.run === undefined
          ? {}
          : {
              run: parsed.data.run,
            }),
      });

      if (result.ok) {
        return reply.code(200).send({
          ok: true,

          status: "CONNECTED",

          serverTime: result.serverTime.toISOString(),

          heartbeatIntervalSeconds: result.heartbeatIntervalSeconds,
        });
      }

      switch (result.status) {
        case "UNAUTHORIZED":
          return sendConnectError(
            reply,
            401,
            result.status,
            "Invalid bridge credential.",
          );

        case "IDENTITY_MISMATCH":
          return sendConnectError(
            reply,
            403,
            result.status,
            "The request identity does not match the bridge credential.",
          );

        case "SESSION_NOT_FOUND":
          return sendConnectError(
            reply,
            404,
            result.status,
            "Unknown STS2 bridge session.",
          );

        case "RECONNECT_REQUIRED":
          return sendConnectError(
            reply,
            409,
            result.status,
            "The bridge must reconnect to the current STS2 session.",
          );
      }
    },
  );
}

function sendConnectError(
  reply: {
    code(statusCode: number): {
      send(payload: unknown): unknown;
    };
  },

  statusCode: number,

  code: string,

  message: string,
): unknown {
  return reply.code(statusCode).send({
    ok: false,

    error: {
      code,
      message,
    },
  });
}
