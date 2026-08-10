import {
    MessageFlags,
    type ButtonInteraction,
} from "discord.js";

import type {
    GameService,
} from "../../application/game-service/game-service.js";

import {
    createCharacterSelect,
} from "./character-select.js";

import {
    parseCustomId,
} from "./custom-ids.js";

import {
    createGameControls,
} from "./lobby-buttons.js";

import {
    createLobbyContent,
} from "../presenters/lobby-presenter.js";

export async function handleLobbyButton(
    interaction:
        ButtonInteraction,
    gameService:
        GameService,
): Promise<boolean> {
    const parsed =
        parseCustomId(
            interaction.customId,
        );

    if (
        parsed === undefined
        || parsed.scope !== "lobby"
    ) {
        return false;
    }

    switch (parsed.action) {
        case "join":
            await handleJoin(
                interaction,
                gameService,
                parsed.gameId,
            );

            return true;

        case "leave":
            await handleLeave(
                interaction,
                gameService,
                parsed.gameId,
            );

            return true;

        case "prepare":
            await handlePrepare(
                interaction,
                gameService,
                parsed.gameId,
            );

            return true;

        case "start":
            await handleStart(
                interaction,
                gameService,
                parsed.gameId,
            );

            return true;

        default:
            return false;
    }
}

async function handleJoin(
    interaction:
        ButtonInteraction,
    gameService:
        GameService,
    gameId: string,
): Promise<void> {
    const characters =
        gameService.getCharacters();

    await interaction.reply({
        content:
            "Choisissez le personnage avec lequel vous jouez à Slay the Spire 2 :",

        components: [
            createCharacterSelect(
                gameId,
                interaction.message.id,
                characters,
            ),
        ],

        flags:
            MessageFlags.Ephemeral,
    });
}

async function handleLeave(
    interaction:
        ButtonInteraction,
    gameService:
        GameService,
    gameId: string,
): Promise<void> {
    const game =
        gameService.leaveGame(
            gameId,
            interaction.user.id,
        );

    await interaction.update({
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

async function handlePrepare(
    interaction:
        ButtonInteraction,

    gameService:
        GameService,

    gameId: string,
): Promise<void> {
    const game =
        gameService.prepareGame(
            gameId,
            interaction.user.id,
        );

    await interaction.update({
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

async function handleStart(
    interaction:
        ButtonInteraction,

    gameService:
        GameService,

    gameId: string,
): Promise<void> {
    const game =
        gameService.startGame(
            gameId,
            interaction.user.id,
        );

    await interaction.update({
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