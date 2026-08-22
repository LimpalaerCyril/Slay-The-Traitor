import { and, eq } from "drizzle-orm";

import type {
  ConnectSts2BridgeClientInput,
  CreateSts2BridgeSessionInput,
  Sts2BridgeConnection,
  Sts2BridgeSession,
  Sts2BridgeSessionRepository,
  HeartbeatSts2BridgeConnectionInput,
  HeartbeatSts2BridgeConnectionResult,
} from "../../application/sts2-bridge-session/sts2-bridge-session-repository.js";

import type { Database } from "./database.js";

import {
  sts2BridgeConnectionsTable,
  sts2BridgeSessionsTable,
} from "./schema.js";

function mapSession(
  row: typeof sts2BridgeSessionsTable.$inferSelect,
): Sts2BridgeSession {
  return {
    id: row.id,

    gameId: row.gameId,

    sessionCode: row.sessionCode,

    currentLobbyId: row.currentLobbyId ?? undefined,

    hostPlatformPlayerId: row.hostPlatformPlayerId ?? undefined,

    createdAt: row.createdAt,

    updatedAt: row.updatedAt,
  };
}

export class PostgresSts2BridgeSessionRepository implements Sts2BridgeSessionRepository {
  public constructor(private readonly db: Database) {}

  public async findByGameId(
    gameId: string,
  ): Promise<Sts2BridgeSession | undefined> {
    const rows = await this.db
      .select()
      .from(sts2BridgeSessionsTable)
      .where(eq(sts2BridgeSessionsTable.gameId, gameId))
      .limit(1);

    const row = rows[0];

    return row === undefined ? undefined : mapSession(row);
  }

  public async findBySessionCode(
    sessionCode: string,
  ): Promise<Sts2BridgeSession | undefined> {
    const rows = await this.db
      .select()
      .from(sts2BridgeSessionsTable)
      .where(eq(sts2BridgeSessionsTable.sessionCode, sessionCode))
      .limit(1);

    const row = rows[0];

    return row === undefined ? undefined : mapSession(row);
  }

  public async findByLobbyId(
    lobbyId: string,
  ): Promise<Sts2BridgeSession | undefined> {
    const rows = await this.db
      .select()
      .from(sts2BridgeSessionsTable)
      .where(eq(sts2BridgeSessionsTable.currentLobbyId, lobbyId))
      .limit(1);

    const row = rows[0];

    return row === undefined ? undefined : mapSession(row);
  }

  public async createSession(
    input: CreateSts2BridgeSessionInput,
  ): Promise<Sts2BridgeSession | undefined> {
    const rows = await this.db
      .insert(sts2BridgeSessionsTable)
      .values({
        id: input.id,

        gameId: input.gameId,

        sessionCode: input.sessionCode,

        createdAt: input.createdAt,

        updatedAt: input.createdAt,
      })
      .onConflictDoNothing()
      .returning();

    const row = rows[0];

    return row === undefined ? undefined : mapSession(row);
  }

  public async assignLobby(
    bridgeSessionId: string,

    lobbyId: string,

    hostPlatformPlayerId: string,

    updatedAt: Date,
  ): Promise<Sts2BridgeSession> {
    const rows = await this.db
      .update(sts2BridgeSessionsTable)
      .set({
        currentLobbyId: lobbyId,

        hostPlatformPlayerId,

        updatedAt,
      })
      .where(eq(sts2BridgeSessionsTable.id, bridgeSessionId))
      .returning();

    const row = rows[0];

    if (row === undefined) {
      throw new Error(`Unknown STS2 bridge session: ${bridgeSessionId}`);
    }

    return mapSession(row);
  }

  public async upsertConnection(
    input: ConnectSts2BridgeClientInput,
  ): Promise<void> {
    await this.db
      .insert(sts2BridgeConnectionsTable)
      .values({
        bridgeSessionId: input.bridgeSessionId,

        identityLinkId: input.identityLinkId,

        clientInstanceId: input.clientInstanceId,

        platformName: input.platformName,

        bridgeVersion: input.bridgeVersion,

        gameVersion: input.gameVersion,

        lobbyId: input.lobbyId,

        isHost: input.isHost,

        hostPlatformPlayerId: input.hostPlatformPlayerId,

        connectedAt: input.connectedAt,

        lastSeenAt: input.connectedAt,
      })
      .onConflictDoUpdate({
        target: [
          sts2BridgeConnectionsTable.bridgeSessionId,

          sts2BridgeConnectionsTable.identityLinkId,
        ],

        set: {
          clientInstanceId: input.clientInstanceId,

          platformName: input.platformName,

          bridgeVersion: input.bridgeVersion,

          gameVersion: input.gameVersion,

          lobbyId: input.lobbyId,

          isHost: input.isHost,

          hostPlatformPlayerId: input.hostPlatformPlayerId,

          connectedAt: input.connectedAt,

          lastSeenAt: input.connectedAt,
        },
      });
  }

  public async heartbeatConnection(
    input: HeartbeatSts2BridgeConnectionInput,
  ): Promise<HeartbeatSts2BridgeConnectionResult> {
    return this.db.transaction(async (transaction) => {
      const sessionRows = await transaction
        .select()
        .from(sts2BridgeSessionsTable)
        .where(eq(sts2BridgeSessionsTable.id, input.bridgeSessionId))
        .limit(1);

      const session = sessionRows[0];

      if (session === undefined) {
        return {
          status: "SESSION_NOT_FOUND",
        };
      }

      if (session.currentLobbyId !== input.lobbyId) {
        return {
          status: "LOBBY_MISMATCH",
        };
      }

      const connectionRows = await transaction
        .select()
        .from(sts2BridgeConnectionsTable)
        .where(
          and(
            eq(
              sts2BridgeConnectionsTable.bridgeSessionId,
              input.bridgeSessionId,
            ),

            eq(sts2BridgeConnectionsTable.identityLinkId, input.identityLinkId),
          ),
        )
        .limit(1);

      const connection = connectionRows[0];

      if (connection === undefined) {
        return {
          status: "CONNECTION_NOT_FOUND",
        };
      }

      if (connection.clientInstanceId !== input.clientInstanceId) {
        return {
          status: "CLIENT_INSTANCE_MISMATCH",
        };
      }

      const connectionSelector = and(
        eq(sts2BridgeConnectionsTable.bridgeSessionId, input.bridgeSessionId),

        eq(sts2BridgeConnectionsTable.identityLinkId, input.identityLinkId),
      );

      if (input.snapshot === undefined) {
        await transaction
          .update(sts2BridgeConnectionsTable)
          .set({
            bridgeVersion: input.bridgeVersion,

            gameVersion: input.gameVersion,

            lastSeenAt: input.seenAt,
          })
          .where(connectionSelector);
      } else {
        await transaction
          .update(sts2BridgeConnectionsTable)
          .set({
            bridgeVersion: input.bridgeVersion,

            gameVersion: input.gameVersion,

            lastSeenAt: input.seenAt,

            lastActIndex: input.snapshot.actIndex,

            lastActId: input.snapshot.actId,

            lastSnapshot: input.snapshot,
          })
          .where(connectionSelector);
      }

      return {
        status: "UPDATED",
      };
    });
  }

  public async findConnectionsBySessionId(
    bridgeSessionId: string,
  ): Promise<readonly Sts2BridgeConnection[]> {
    const rows = await this.db
      .select()
      .from(sts2BridgeConnectionsTable)
      .where(eq(sts2BridgeConnectionsTable.bridgeSessionId, bridgeSessionId));

    return rows.map((row) => ({
      bridgeSessionId: row.bridgeSessionId,

      identityLinkId: row.identityLinkId,

      clientInstanceId: row.clientInstanceId,

      platformName: row.platformName,

      bridgeVersion: row.bridgeVersion,

      gameVersion: row.gameVersion,

      lobbyId: row.lobbyId,

      isHost: row.isHost,

      hostPlatformPlayerId: row.hostPlatformPlayerId,

      connectedAt: row.connectedAt,

      lastSeenAt: row.lastSeenAt,
    }));
  }
}
