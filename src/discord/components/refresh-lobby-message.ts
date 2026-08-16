import type {
    ButtonInteraction,
    StringSelectMenuInteraction,
} from "discord.js";

import type {
    GameService,
    GameSnapshot,
} from "../../application/game-service/game-service.js";

import {
    createLobbyContent,
} from "../presenters/lobby-presenter.js";

import {
    createGameControls,
} from "./lobby-buttons.js";

type RoleSetupInteraction =
    | ButtonInteraction
    | StringSelectMenuInteraction;

export async function refreshLobbyMessage(
    interaction:
        RoleSetupInteraction,
    gameService:
        GameService,
    game:
        GameSnapshot,
): Promise<void> {
    if (
        game.lobbyMessageId
        === undefined
    ) {
        return;
    }

    if (
        !interaction.inCachedGuild()
    ) {
        throw new Error(
            "The game lobby can only be refreshed from a guild.",
        );
    }

    const channel =
        interaction.channel;

    if (
        channel === null
    ) {
        throw new Error(
            "Unable to find the Discord channel.",
        );
    }

    const lobbyMessage =
        await channel.messages
            .fetch(
                game.lobbyMessageId,
            );

    await lobbyMessage.edit({
        content:
            createLobbyContent(
                game,
                gameService,
            ),

        components:
            createGameControls(
                game,
            ),
    });
}