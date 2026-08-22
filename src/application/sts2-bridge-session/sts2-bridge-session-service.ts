import { randomInt, randomUUID } from "node:crypto";

import type {
  BridgePlatform,
  PlatformIdentityLink,
} from "../bridge-identity/bridge-identity-repository.js";

import type { GameTrackingMode } from "../../domain/games/game-tracking-mode.js";

import type { GameState } from "../../domain/games/game-state.js";

import type {
  Sts2BridgeSession,
  Sts2BridgeSessionRepository,
  Sts2BridgeRunSnapshot,
} from "./sts2-bridge-session-repository.js";

const SESSION_CODE_PREFIX = "STT-";

const SESSION_CODE_LENGTH = 6;

const SESSION_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const STS2_HEARTBEAT_INTERVAL_SECONDS = 10;

export const STS2_CONNECTION_TIMEOUT_SECONDS = 30;

const STS2_CONNECTION_TIMEOUT_MS = STS2_CONNECTION_TIMEOUT_SECONDS * 1000;

export interface BridgeIdentityAuthenticator {
  authenticate(bridgeToken: string): Promise<PlatformIdentityLink | undefined>;

  findIdentityByDiscordUserId(
    discordUserId: string,

    platform: BridgePlatform,
  ): Promise<PlatformIdentityLink | undefined>;
}

export interface BridgeGameLookupSnapshot {
  readonly id: string;

  readonly trackingMode: GameTrackingMode;

  readonly state: GameState;

  readonly players: readonly {
    readonly discordUserId: string;
  }[];
}

export interface BridgeGameLookup {
  getGameSnapshot(gameId: string): Promise<BridgeGameLookupSnapshot>;
}

export interface Sts2RosterPlayerInput {
  readonly platformPlayerId: string;

  readonly platformName: string;

  readonly characterId: string;

  readonly isLocal: boolean;

  readonly isHost: boolean;
}

export interface ConnectSts2BridgeInput {
  readonly bridgeToken: string;

  readonly protocolVersion: 1;

  readonly clientInstanceId: string;

  readonly bridgeVersion: string;

  readonly gameVersion: string;

  readonly sessionCode?: string | undefined;

  readonly platform: "STEAM";

  readonly platformPlayerId: string;

  readonly platformName: string;

  readonly lobbyId: string;

  readonly isHost: boolean;

  readonly hostPlatformPlayerId: string;

  readonly players?: readonly Sts2RosterPlayerInput[] | undefined;
}

export interface HeartbeatSts2BridgeInput {
  readonly bridgeToken: string;

  readonly protocolVersion: 1;

  readonly bridgeSessionId: string;

  readonly clientInstanceId: string;

  readonly platform: "STEAM";

  readonly platformPlayerId: string;

  readonly bridgeVersion: string;

  readonly gameVersion: string;

  readonly lobbyId: string;

  readonly run?: Sts2BridgeRunSnapshot | undefined;
}

export type HeartbeatSts2BridgeResult =
  | {
      readonly ok: true;

      readonly status: "CONNECTED";

      readonly serverTime: Date;

      readonly heartbeatIntervalSeconds: number;
    }
  | {
      readonly ok: false;

      readonly status:
        | "UNAUTHORIZED"
        | "IDENTITY_MISMATCH"
        | "SESSION_NOT_FOUND"
        | "RECONNECT_REQUIRED";
    };

export type Sts2BridgeParticipantConnectionState =
  | "NOT_LINKED"
  | "DISCONNECTED"
  | "CONNECTED";

export interface Sts2BridgeParticipantStatus {
  readonly discordUserId: string;

  readonly state: Sts2BridgeParticipantConnectionState;

  readonly platformPlayerId: string | undefined;

  readonly platformName: string | undefined;

  readonly isHost: boolean;

  readonly lastSeenAt: Date | undefined;
}

export interface Sts2BridgeLobbyStatus {
  readonly bridgeSessionId: string;

  readonly sessionCode: string;

  readonly currentLobbyId: string | undefined;

  readonly hostPlatformPlayerId: string | undefined;

  readonly participants: readonly Sts2BridgeParticipantStatus[];

  readonly readyForStart: boolean;

  readonly connectionTimeoutSeconds: number;
}

export type ConnectSts2BridgeResult =
  | {
      readonly ok: true;

      readonly status: "CONNECTED";

      readonly bridgeSessionId: string;

      readonly gameId: string;

      readonly heartbeatIntervalSeconds: number;
    }
  | {
      readonly ok: false;

      readonly status:
        | "UNAUTHORIZED"
        | "IDENTITY_MISMATCH"
        | "SESSION_CODE_REQUIRED"
        | "SESSION_CODE_NOT_FOUND"
        | "WAITING_FOR_SESSION"
        | "NOT_STS2_GAME"
        | "GAME_CLOSED"
        | "NOT_GAME_PARTICIPANT"
        | "HOST_IDENTITY_MISMATCH"
        | "INVALID_HOST_ROSTER"
        | "LOBBY_ALREADY_LINKED";
    };

export class Sts2BridgeSessionService {
  public constructor(
    private readonly repository: Sts2BridgeSessionRepository,

    private readonly identityAuthenticator: BridgeIdentityAuthenticator,

    private readonly gameLookup: BridgeGameLookup,

    private readonly now: () => Date = () => new Date(),
  ) {}

  public async ensureSessionForGame(
    gameId: string,
  ): Promise<Sts2BridgeSession> {
    const existing = await this.repository.findByGameId(gameId);

    if (existing !== undefined) {
      return existing;
    }

    const game = await this.gameLookup.getGameSnapshot(gameId);

    if (game.trackingMode !== "STS2") {
      throw new Error(
        "STS2 bridge sessions can only be created for STS2 games.",
      );
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const createdAt = this.now();

      const created = await this.repository.createSession({
        id: randomUUID(),

        gameId,

        sessionCode: createSessionCode(),

        createdAt,
      });

      if (created !== undefined) {
        return created;
      }

      /*
       * Un appel concurrent peut avoir
       * créé la session entre-temps.
       */
      const concurrent = await this.repository.findByGameId(gameId);

      if (concurrent !== undefined) {
        return concurrent;
      }
    }

    throw new Error("Unable to allocate a unique STS2 session code.");
  }

  public async connect(
    input: ConnectSts2BridgeInput,
  ): Promise<ConnectSts2BridgeResult> {
    const identity = await this.identityAuthenticator.authenticate(
      input.bridgeToken,
    );

    if (identity === undefined) {
      return {
        ok: false,

        status: "UNAUTHORIZED",
      };
    }

    if (
      identity.platform !== input.platform ||
      identity.platformPlayerId !== input.platformPlayerId
    ) {
      return {
        ok: false,

        status: "IDENTITY_MISMATCH",
      };
    }

    if (input.isHost) {
      return this.connectHost(identity, input);
    }

    return this.connectClient(identity, input);
  }

  private async connectHost(
    identity: PlatformIdentityLink,

    input: ConnectSts2BridgeInput,
  ): Promise<ConnectSts2BridgeResult> {
    if (input.hostPlatformPlayerId !== identity.platformPlayerId) {
      return {
        ok: false,

        status: "HOST_IDENTITY_MISMATCH",
      };
    }

    const sessionCode = input.sessionCode?.trim().toUpperCase();

    if (sessionCode === undefined || sessionCode.length === 0) {
      return {
        ok: false,

        status: "SESSION_CODE_REQUIRED",
      };
    }

    const bridgeSession = await this.repository.findBySessionCode(sessionCode);

    if (bridgeSession === undefined) {
      return {
        ok: false,

        status: "SESSION_CODE_NOT_FOUND",
      };
    }

    const gameValidation = await this.validateGame(bridgeSession, identity);

    if (gameValidation !== undefined) {
      return gameValidation;
    }

    const players = input.players;

    if (players === undefined || players.length === 0) {
      return {
        ok: false,

        status: "INVALID_HOST_ROSTER",
      };
    }

    const localHost = players.find(
      (player) =>
        player.platformPlayerId === identity.platformPlayerId &&
        player.isLocal &&
        player.isHost,
    );

    if (localHost === undefined) {
      return {
        ok: false,

        status: "INVALID_HOST_ROSTER",
      };
    }

    const lobbyOwner = await this.repository.findByLobbyId(input.lobbyId);

    if (lobbyOwner !== undefined && lobbyOwner.id !== bridgeSession.id) {
      return {
        ok: false,

        status: "LOBBY_ALREADY_LINKED",
      };
    }

    const now = this.now();

    const assignedSession = await this.repository.assignLobby(
      bridgeSession.id,
      input.lobbyId,
      identity.platformPlayerId,
      now,
    );

    await this.repository.upsertConnection({
      bridgeSessionId: assignedSession.id,

      identityLinkId: identity.id,

      clientInstanceId: input.clientInstanceId,

      platformName: input.platformName,

      bridgeVersion: input.bridgeVersion,

      gameVersion: input.gameVersion,

      lobbyId: input.lobbyId,

      isHost: true,

      hostPlatformPlayerId: identity.platformPlayerId,

      connectedAt: now,
    });

    return createConnectedResult(assignedSession);
  }

  private async connectClient(
    identity: PlatformIdentityLink,

    input: ConnectSts2BridgeInput,
  ): Promise<ConnectSts2BridgeResult> {
    const bridgeSession = await this.repository.findByLobbyId(input.lobbyId);

    if (bridgeSession === undefined) {
      return {
        ok: false,

        status: "WAITING_FOR_SESSION",
      };
    }

    if (bridgeSession.hostPlatformPlayerId !== input.hostPlatformPlayerId) {
      return {
        ok: false,

        status: "HOST_IDENTITY_MISMATCH",
      };
    }

    const gameValidation = await this.validateGame(bridgeSession, identity);

    if (gameValidation !== undefined) {
      return gameValidation;
    }

    const now = this.now();

    await this.repository.upsertConnection({
      bridgeSessionId: bridgeSession.id,

      identityLinkId: identity.id,

      clientInstanceId: input.clientInstanceId,

      platformName: input.platformName,

      bridgeVersion: input.bridgeVersion,

      gameVersion: input.gameVersion,

      lobbyId: input.lobbyId,

      isHost: false,

      hostPlatformPlayerId: input.hostPlatformPlayerId,

      connectedAt: now,
    });

    return createConnectedResult(bridgeSession);
  }

  private async validateGame(
    bridgeSession: Sts2BridgeSession,

    identity: PlatformIdentityLink,
  ): Promise<ConnectSts2BridgeResult | undefined> {
    const game = await this.gameLookup.getGameSnapshot(bridgeSession.gameId);

    if (game.trackingMode !== "STS2") {
      return {
        ok: false,

        status: "NOT_STS2_GAME",
      };
    }

    if (game.state === "FINISHED" || game.state === "CANCELLED") {
      return {
        ok: false,

        status: "GAME_CLOSED",
      };
    }

    const participant = game.players.some(
      (player) => player.discordUserId === identity.discordUserId,
    );

    if (!participant) {
      return {
        ok: false,

        status: "NOT_GAME_PARTICIPANT",
      };
    }

    return undefined;
  }

  public async getLobbyStatus(
    gameId: string,
  ): Promise<Sts2BridgeLobbyStatus | undefined> {
    const game = await this.gameLookup.getGameSnapshot(gameId);

    /*
     * Le mode MANUAL ne dépend jamais
     * du bridge STS2.
     */
    if (game.trackingMode !== "STS2") {
      return undefined;
    }

    const bridgeSession = await this.ensureSessionForGame(gameId);

    const connections = await this.repository.findConnectionsBySessionId(
      bridgeSession.id,
    );

    const now = this.now();

    const cutoff = now.getTime() - STS2_CONNECTION_TIMEOUT_MS;

    const participants = await Promise.all(
      game.players.map(async (player) => {
        const identity =
          await this.identityAuthenticator.findIdentityByDiscordUserId(
            player.discordUserId,
            "STEAM",
          );

        if (identity === undefined) {
          return {
            discordUserId: player.discordUserId,

            state: "NOT_LINKED" as const,

            platformPlayerId: undefined,

            platformName: undefined,

            isHost: false,

            lastSeenAt: undefined,
          };
        }

        const connection = connections.find(
          (candidate) => candidate.identityLinkId === identity.id,
        );

        const isCurrentLobby =
          connection !== undefined &&
          bridgeSession.currentLobbyId !== undefined &&
          connection.lobbyId === bridgeSession.currentLobbyId;

        const heartbeatIsRecent =
          connection !== undefined && connection.lastSeenAt.getTime() > cutoff;

        const connected = isCurrentLobby && heartbeatIsRecent;

        return {
          discordUserId: player.discordUserId,

          state: connected ? ("CONNECTED" as const) : ("DISCONNECTED" as const),

          platformPlayerId: identity.platformPlayerId,

          platformName: connection?.platformName ?? identity.platformName,

          isHost:
            bridgeSession.hostPlatformPlayerId === identity.platformPlayerId,

          lastSeenAt: connection?.lastSeenAt,
        };
      }),
    );

    const allPlayersConnected =
      participants.length > 0 &&
      participants.every((participant) => participant.state === "CONNECTED");

    const hostConnected = participants.some(
      (participant) => participant.isHost && participant.state === "CONNECTED",
    );

    return {
      bridgeSessionId: bridgeSession.id,

      sessionCode: bridgeSession.sessionCode,

      currentLobbyId: bridgeSession.currentLobbyId,

      hostPlatformPlayerId: bridgeSession.hostPlatformPlayerId,

      participants,

      readyForStart:
        bridgeSession.currentLobbyId !== undefined &&
        allPlayersConnected &&
        hostConnected,

      connectionTimeoutSeconds: STS2_CONNECTION_TIMEOUT_SECONDS,
    };
  }

  public async heartbeat(
    input: HeartbeatSts2BridgeInput,
  ): Promise<HeartbeatSts2BridgeResult> {
    const identity = await this.identityAuthenticator.authenticate(
      input.bridgeToken,
    );

    if (identity === undefined) {
      return {
        ok: false,

        status: "UNAUTHORIZED",
      };
    }

    if (
      identity.platform !== input.platform ||
      identity.platformPlayerId !== input.platformPlayerId
    ) {
      return {
        ok: false,

        status: "IDENTITY_MISMATCH",
      };
    }

    const seenAt = this.now();

    const result = await this.repository.heartbeatConnection({
      bridgeSessionId: input.bridgeSessionId,

      identityLinkId: identity.id,

      clientInstanceId: input.clientInstanceId,

      bridgeVersion: input.bridgeVersion,

      gameVersion: input.gameVersion,

      lobbyId: input.lobbyId,

      ...(input.run === undefined
        ? {}
        : {
            snapshot: input.run,
          }),

      seenAt,
    });

    if (result.status === "SESSION_NOT_FOUND") {
      return {
        ok: false,

        status: "SESSION_NOT_FOUND",
      };
    }

    if (result.status !== "UPDATED") {
      /*
       * Cela couvre :
       *
       * CONNECTION_NOT_FOUND
       * LOBBY_MISMATCH
       * CLIENT_INSTANCE_MISMATCH
       *
       * Dans ces trois cas, le bridge doit
       * simplement refaire /session/connect.
       */
      return {
        ok: false,

        status: "RECONNECT_REQUIRED",
      };
    }

    return {
      ok: true,

      status: "CONNECTED",

      serverTime: seenAt,

      heartbeatIntervalSeconds: STS2_HEARTBEAT_INTERVAL_SECONDS,
    };
  }
}

function createConnectedResult(
  session: Sts2BridgeSession,
): ConnectSts2BridgeResult {
  return {
    ok: true,

    status: "CONNECTED",

    bridgeSessionId: session.id,

    gameId: session.gameId,

    heartbeatIntervalSeconds: STS2_HEARTBEAT_INTERVAL_SECONDS,
  };
}

function createSessionCode(): string {
  let suffix = "";

  for (let index = 0; index < SESSION_CODE_LENGTH; index += 1) {
    suffix += SESSION_CODE_ALPHABET[randomInt(SESSION_CODE_ALPHABET.length)];
  }

  return [SESSION_CODE_PREFIX, suffix].join("");
}
