import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";

import type {
    Sts2EventIngestionService,
} from "../../application/sts2-event-ingestion/sts2-event-ingestion-service.js";

import {
    sts2EventsBatchBodySchema,
} from "./sts2-events-batch-schema.js";

export interface Sts2EventsBatchRouteDependencies {
    readonly sts2EventIngestionService:
        Sts2EventIngestionService;
}

export async function registerSts2EventsBatchRoutes(
    app:
        FastifyInstance,

    dependencies:
        Sts2EventsBatchRouteDependencies,
): Promise<void> {
    app.post(
        "/api/sts2/v1/events/batch",
        async (
            request,
            reply,
        ) => {
            const bridgeToken =
                readBearerToken(
                    request,
                );

            if (
                bridgeToken === undefined
            ) {
                return reply
                    .code(401)
                    .send({
                        ok:
                            false,

                        status:
                            "UNAUTHORIZED",
                    });
            }

            const parsed =
                sts2EventsBatchBodySchema
                    .safeParse(
                        request.body,
                    );

            if (
                !parsed.success
            ) {
                return reply
                    .code(400)
                    .send({
                        ok:
                            false,

                        status:
                            "INVALID_REQUEST",

                        issues:
                            parsed.error.issues
                                .map(
                                    issue => ({
                                        path:
                                            issue.path,

                                        message:
                                            issue.message,
                                    }),
                                ),
                    });
            }

            const result =
                await dependencies
                    .sts2EventIngestionService
                    .ingestBatch({
                        bridgeToken,

                        protocolVersion:
                            parsed.data
                                .protocolVersion,

                        bridgeSessionId:
                            parsed.data
                                .bridgeSessionId,

                        clientInstanceId:
                            parsed.data
                                .clientInstanceId,

                        platform:
                            parsed.data
                                .platform,

                        platformPlayerId:
                            parsed.data
                                .platformPlayerId,

                        bridgeVersion:
                            parsed.data
                                .bridgeVersion,

                        gameVersion:
                            parsed.data
                                .gameVersion,

                        lobbyId:
                            parsed.data
                                .lobbyId,

                        events:
                            parsed.data
                                .events,
                    });

            if (
                result.ok
            ) {
                return reply
                    .code(200)
                    .send({
                        ok:
                            true,

                        status:
                            "ACKNOWLEDGED",

                        acknowledgedThrough:
                            result.acknowledgedThrough,

                        acceptedCount:
                            result.acceptedCount,

                        duplicateCount:
                            result.duplicateCount,

                        ignoredCount:
                            result.ignoredCount,

                        ignored:
                            result.ignored,

                        serverTime:
                            result.serverTime
                                .toISOString(),
                    });
            }

            switch (
                result.status
            ) {
                case "UNAUTHORIZED":
                    return reply
                        .code(401)
                        .send(result);

                case "IDENTITY_MISMATCH":
                case "NOT_GAME_PARTICIPANT":
                    return reply
                        .code(403)
                        .send(result);

                case "SESSION_NOT_FOUND":
                    return reply
                        .code(404)
                        .send(result);

                case "RECONNECT_REQUIRED":
                case "NOT_STS2_GAME":
                case "GAME_NOT_ACTIVE":
                case "SEQUENCE_CONFLICT":
                    return reply
                        .code(409)
                        .send(result);
            }
        },
    );
}

function readBearerToken(
    request:
        FastifyRequest,
): string | undefined {
    const authorization =
        request.headers
            .authorization;

    if (
        authorization === undefined
    ) {
        return undefined;
    }

    const match =
        /^Bearer\s+(.+)$/i.exec(
            authorization,
        );

    const token =
        match?.[1]
            ?.trim();

    return token === undefined
        || token.length === 0
        ? undefined
        : token;
}
