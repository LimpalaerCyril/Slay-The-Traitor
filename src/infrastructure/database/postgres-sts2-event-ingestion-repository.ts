import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import type {
  PersistSts2EventBatchInput,
  PersistSts2EventBatchResult,
  ResolveSts2EventContextInput,
  ResolveSts2EventContextResult,
  Sts2EventIngestionRepository,
} from "../../application/sts2-event-ingestion/sts2-event-ingestion-repository.js";

import type {
  IgnoredSts2Event,
  Sts2EventPersistenceDisposition,
} from "../../application/sts2-event-ingestion/sts2-event-ingestion-types.js";

import type { Database } from "./database.js";

import {
  gameEventsTable,
  gamePlayersTable,
  gamesTable,
  sts2BridgeConnectionsTable,
  sts2BridgeEventReceiptsTable,
  sts2BridgeSessionsTable,
} from "./schema.js";

interface ReadyContext {
  readonly status: "READY";

  readonly gameId: string;

  readonly gamePlayerId: string;

  readonly isHost: boolean;
}

export class PostgresSts2EventIngestionRepository implements Sts2EventIngestionRepository {
  public constructor(private readonly db: Database) {}

  public async resolveContext(
    input: ResolveSts2EventContextInput,
  ): Promise<ResolveSts2EventContextResult> {
    return resolveContextFromDatabase(this.db, input, false);
  }

  public async persistBatch(
    input: PersistSts2EventBatchInput,
  ): Promise<PersistSts2EventBatchResult> {
    return this.db.transaction(async (transaction) => {
      /*
       * Le row lock sérialise tous les
       * uploads d'un même client bridge.
       *
       * Deux retries concurrents ne
       * peuvent donc jamais créer deux
       * GameEvent pour une même sequence.
       */
      const context = await resolveContextFromDatabase(
        transaction,
        input,
        true,
      );

      if (context.status !== "READY") {
        return context;
      }

      if (
        context.gameId !== input.expectedGameId ||
        context.gamePlayerId !== input.expectedGamePlayerId ||
        context.isHost !== input.expectedIsHost
      ) {
        return {
          status: "CLIENT_INSTANCE_MISMATCH",
        };
      }

      const sequences = input.events.map((item) => item.source.sequence);

      const existingRows = await transaction
        .select()
        .from(sts2BridgeEventReceiptsTable)
        .where(
          and(
            eq(
              sts2BridgeEventReceiptsTable.bridgeSessionId,
              input.bridgeSessionId,
            ),

            eq(
              sts2BridgeEventReceiptsTable.identityLinkId,
              input.identityLinkId,
            ),

            eq(
              sts2BridgeEventReceiptsTable.clientInstanceId,
              input.clientInstanceId,
            ),

            inArray(sts2BridgeEventReceiptsTable.sequence, sequences),
          ),
        );

      const existingBySequence = new Map<
        number,
        (typeof existingRows)[number]
      >();

      for (const row of existingRows) {
        existingBySequence.set(row.sequence, row);
      }

      /*
       * Détecte TOUS les conflits avant
       * le premier INSERT.
       *
       * Un SEQUENCE_CONFLICT ne peut donc
       * jamais valider une moitié du batch.
       */
      for (const item of input.events) {
        const existing = existingBySequence.get(item.source.sequence);

        if (
          existing !== undefined &&
          existing.eventFingerprint !== item.fingerprint
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

      const ignored: IgnoredSts2Event[] = [];

      for (const item of input.events) {
        const existing = existingBySequence.get(item.source.sequence);

        if (existing !== undefined) {
          duplicateCount += 1;

          if (existing.disposition === "ACCEPTED") {
            shouldRebuildObjectives = true;
          }

          continue;
        }

        if (item.kind === "IGNORE") {
          await transaction.insert(sts2BridgeEventReceiptsTable).values({
            bridgeSessionId: input.bridgeSessionId,

            identityLinkId: input.identityLinkId,

            clientInstanceId: input.clientInstanceId,

            sequence: item.source.sequence,

            eventType: item.source.event.type,

            eventFingerprint: item.fingerprint,

            disposition: "IGNORED",

            ignoredReason: item.reason,

            gameEventId: null,

            receivedAt: input.receivedAt,
          });

          ignoredCount += 1;

          ignored.push({
            sequence: item.source.sequence,

            type: item.source.event.type,

            reason: item.reason,
          });

          continue;
        }

        const gameEventId = randomUUID();

        await insertAcceptedGameEvent(transaction, context, item, gameEventId);

        /*
         * Le receipt est dans la même
         * transaction PostgreSQL que
         * le GameEvent.
         *
         * Si cet INSERT échoue, le
         * GameEvent est rollback aussi.
         */
        await transaction.insert(sts2BridgeEventReceiptsTable).values({
          bridgeSessionId: input.bridgeSessionId,

          identityLinkId: input.identityLinkId,

          clientInstanceId: input.clientInstanceId,

          sequence: item.source.sequence,

          eventType: item.source.event.type,

          eventFingerprint: item.fingerprint,

          disposition: "ACCEPTED",

          ignoredReason: null,

          gameEventId,

          receivedAt: input.receivedAt,
        });

        if (
          item.gameEvent.type === "PLAYER_DIED" &&
          item.gameEvent.targetPlayerId !== undefined
        ) {
          await transaction
            .update(gamePlayersTable)
            .set({
              alive: false,
            })
            .where(
              and(
                eq(gamePlayersTable.gameId, context.gameId),

                eq(gamePlayersTable.playerId, item.gameEvent.targetPlayerId),
              ),
            );
        }

        acceptedCount += 1;

        shouldRebuildObjectives = true;
      }

      const last = input.events[input.events.length - 1];

      if (last === undefined) {
        throw new Error("STS2 event batch cannot be empty.");
      }

      return {
        status: "ACKNOWLEDGED",

        acknowledgedThrough: last.source.sequence,

        acceptedCount,
        duplicateCount,
        ignoredCount,
        ignored,
        shouldRebuildObjectives,
        gameId: context.gameId,
      };
    });
  }
}

async function insertAcceptedGameEvent(
  transaction: Pick<Database, "insert">,

  context: ReadyContext,

  item: Extract<
    Sts2EventPersistenceDisposition,
    {
      readonly kind: "ACCEPT";
    }
  >,

  gameEventId: string,
): Promise<void> {
  await transaction.insert(gameEventsTable).values({
    id: gameEventId,

    gameId: context.gameId,

    eventType: item.gameEvent.type,

    actNumber: item.gameEvent.actNumber,

    actorPlayerId: item.gameEvent.actorPlayerId ?? null,

    targetPlayerId: item.gameEvent.targetPlayerId ?? null,

    payload: item.gameEvent.payload,

    source: "MOD",

    validationStatus: "VERIFIED",

    createdAt: item.gameEvent.createdAt,
  });
}

async function resolveContextFromDatabase(
  database: Pick<Database, "select">,

  input: ResolveSts2EventContextInput,

  lockConnection: boolean,
): Promise<ResolveSts2EventContextResult> {
  const sessionRows = await database
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

  const connectionRows = lockConnection
    ? await database
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
        .limit(1)
        .for("update")
    : await database
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

  if (connection.lobbyId !== input.lobbyId) {
    return {
      status: "LOBBY_MISMATCH",
    };
  }

  if (connection.clientInstanceId !== input.clientInstanceId) {
    return {
      status: "CLIENT_INSTANCE_MISMATCH",
    };
  }

  const gameRows = await database
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, session.gameId))
    .limit(1);

  const game = gameRows[0];

  if (game === undefined) {
    return {
      status: "SESSION_NOT_FOUND",
    };
  }

  if (game.trackingMode !== "STS2") {
    return {
      status: "NOT_STS2_GAME",
    };
  }

  if (game.state !== "ACTIVE" && game.state !== "VOTING") {
    return {
      status: "GAME_NOT_ACTIVE",
    };
  }

  const playerRows = await database
    .select({
      playerId: gamePlayersTable.playerId,
    })
    .from(gamePlayersTable)
    .where(
      and(
        eq(gamePlayersTable.gameId, session.gameId),

        eq(gamePlayersTable.discordUserId, input.identityDiscordUserId),
      ),
    )
    .limit(1);

  const player = playerRows[0];

  if (player === undefined) {
    return {
      status: "NOT_GAME_PARTICIPANT",
    };
  }

  return {
    status: "READY",

    gameId: session.gameId,

    gamePlayerId: player.playerId,

    isHost:
      connection.isHost &&
      session.hostPlatformPlayerId === input.authenticatedPlatformPlayerId,
  };
}
