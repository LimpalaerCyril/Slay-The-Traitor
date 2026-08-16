import {
    Game,
} from "../../domain/games/game.js";

import type {
    GameRepository,
    GameSession,
} from "../../application/game-repository/game-repository.js";

export class InMemoryGameRepository
    implements GameRepository {
    private readonly games =
        new Map<
            string,
            GameSession
        >();

    public async save(
        session: GameSession,
    ): Promise<void> {
        this.games.set(
            session.id,
            cloneSession(
                session,
            ),
        );
    }

    public async findById(
        gameId: string,
    ): Promise<
        GameSession | undefined
    > {
        const session =
            this.games.get(
                gameId,
            );

        return session === undefined
            ? undefined
            : cloneSession(
                session,
            );
    }

    public async findOpenByChannel(
        guildId: string,
        textChannelId: string,
    ): Promise<
        GameSession | undefined
    > {
        const session =
            [
                ...this.games.values(),
            ].find(
                candidate =>
                    candidate.guildId
                    === guildId
                    && candidate.textChannelId
                    === textChannelId
                    && candidate.game.state
                    !== "FINISHED"
                    && candidate.game.state
                    !== "CANCELLED",
            );

        return session === undefined
            ? undefined
            : cloneSession(
                session,
            );
    }
}

function cloneSession(
    session: GameSession,
): GameSession {
    return {
        id:
            session.id,

        guildId:
            session.guildId,

        textChannelId:
            session.textChannelId,

        voiceChannelId:
            session.voiceChannelId,

        lobbyMessageId:
            session.lobbyMessageId,

        hostDiscordUserId:
            session.hostDiscordUserId,

        seed:
            session.seed,

        trackingMode:
            session.trackingMode,

        contradiction:
            session.contradiction,

        game:
            Game.restore(
                session.game.exportData(),
            ),
    };
}