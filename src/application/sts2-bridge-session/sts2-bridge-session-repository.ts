export interface Sts2BridgeSession {
  readonly id: string;

  readonly gameId: string;

  readonly sessionCode: string;

  readonly currentLobbyId: string | undefined;

  readonly hostPlatformPlayerId: string | undefined;

  readonly createdAt: Date;

  readonly updatedAt: Date;
}

export interface CreateSts2BridgeSessionInput {
  readonly id: string;

  readonly gameId: string;

  readonly sessionCode: string;

  readonly createdAt: Date;
}

export interface ConnectSts2BridgeClientInput {
  readonly bridgeSessionId: string;

  readonly identityLinkId: number;

  readonly clientInstanceId: string;

  readonly platformName: string;

  readonly bridgeVersion: string;

  readonly gameVersion: string;

  readonly lobbyId: string;

  readonly isHost: boolean;

  readonly hostPlatformPlayerId: string;

  readonly connectedAt: Date;
}

export interface Sts2BridgeConnection {
  readonly bridgeSessionId: string;

  readonly identityLinkId: number;

  readonly clientInstanceId: string;

  readonly platformName: string;

  readonly bridgeVersion: string;

  readonly gameVersion: string;

  readonly lobbyId: string;

  readonly isHost: boolean;

  readonly hostPlatformPlayerId: string;

  readonly connectedAt: Date;

  readonly lastSeenAt: Date;
}

export interface Sts2BridgeRunPlayerSnapshot {
  readonly platformPlayerId: string;

  readonly hp: number;

  readonly maxHp: number;

  readonly gold: number;

  readonly alive: boolean;
}

export interface Sts2BridgeRunSnapshot {
  readonly actIndex: number;

  readonly actId: string;

  readonly players: readonly Sts2BridgeRunPlayerSnapshot[];
}

export interface HeartbeatSts2BridgeConnectionInput {
  readonly bridgeSessionId: string;

  readonly identityLinkId: number;

  readonly clientInstanceId: string;

  readonly bridgeVersion: string;

  readonly gameVersion: string;

  readonly lobbyId: string;

  readonly snapshot?: Sts2BridgeRunSnapshot | undefined;

  readonly seenAt: Date;
}

export type HeartbeatSts2BridgeConnectionResult =
  | {
      readonly status: "UPDATED";
    }
  | {
      readonly status: "SESSION_NOT_FOUND";
    }
  | {
      readonly status: "CONNECTION_NOT_FOUND";
    }
  | {
      readonly status: "LOBBY_MISMATCH";
    }
  | {
      readonly status: "CLIENT_INSTANCE_MISMATCH";
    };

export interface Sts2BridgeSessionRepository {
  findByGameId(gameId: string): Promise<Sts2BridgeSession | undefined>;

  findBySessionCode(
    sessionCode: string,
  ): Promise<Sts2BridgeSession | undefined>;

  findConnectionsBySessionId(
    bridgeSessionId: string,
  ): Promise<readonly Sts2BridgeConnection[]>;

  findByLobbyId(lobbyId: string): Promise<Sts2BridgeSession | undefined>;

  createSession(
    input: CreateSts2BridgeSessionInput,
  ): Promise<Sts2BridgeSession | undefined>;

  assignLobby(
    bridgeSessionId: string,

    lobbyId: string,

    hostPlatformPlayerId: string,

    updatedAt: Date,
  ): Promise<Sts2BridgeSession>;

  heartbeatConnection(
    input: HeartbeatSts2BridgeConnectionInput,
  ): Promise<HeartbeatSts2BridgeConnectionResult>;

  upsertConnection(input: ConnectSts2BridgeClientInput): Promise<void>;
}
