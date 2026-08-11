import type {
    Game,
} from "../../domain/games/game.js";

export interface GameSession {
    readonly id: string;

    readonly guildId: string;
    readonly textChannelId: string;

    readonly voiceChannelId:
    string | undefined;

    lobbyMessageId:
    string | undefined;

    readonly hostDiscordUserId:
    string;

    readonly seed: string;

    contradiction:
    number | undefined;

    readonly game:
    Game;
}

export interface GameRepository {
    save(
        session: GameSession,
    ): Promise<void>;

    findById(
        gameId: string,
    ): Promise<
        GameSession | undefined
    >;

    findOpenByChannel(
        guildId: string,
        textChannelId: string,
    ): Promise<
        GameSession | undefined
    >;
}