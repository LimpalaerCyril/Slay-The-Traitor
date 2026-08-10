import {
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js";

import type {
  GameService,
  GameSnapshot,
} from "../../application/game-service/game-service.js";

import {
    createGameControls,
} from "../components/lobby-buttons.js";

import {
    createLobbyContent,
} from "../presenters/lobby-presenter.js";

import {
    createPlayerSecretsContent,
} from "../presenters/player-secrets-presenter.js";

import {
    createGameRevealContent,
} from "../presenters/game-reveal-presenter.js";

export async function handleSpireCommand(
    interaction:
        ChatInputCommandInteraction,
    gameService: GameService,
): Promise<void> {
    const subcommand =
        interaction.options
            .getSubcommand();

    switch (subcommand) {
        case "create":
            await handleCreate(
                interaction,
                gameService,
            );

            return;

        case "moi":
            await handleMe(
                interaction,
                gameService,
            );

            return;

        case "cancel":
            await handleCancel(
                interaction,
                gameService,
            );

            return;

        case "finish":
            await handleFinish(
                interaction,
                gameService,
            );

            return;

        default:
            throw new Error(
                `Unknown /spire subcommand: ${subcommand}`,
            );
    }
}

async function handleCreate(
    interaction:
        ChatInputCommandInteraction,

    gameService:
        GameService,
): Promise<void> {
    if (
        interaction.guildId === null
        || interaction.channelId === null
    ) {
        throw new Error(
            "A game can only be created inside a Discord server.",
        );
    }

    /*
     * L'ID de l'interaction Discord est unique
     * et nous sert temporairement d'identifiant
     * de partie.
     *
     * Plus tard PostgreSQL générera notre ID.
     */
    const gameId =
        interaction.id;

    const game =
        gameService.createGame({
            gameId,

            guildId:
                interaction.guildId,

            textChannelId:
                interaction.channelId,

            hostDiscordUserId:
                interaction.user.id,

            /*
             * Pour le MVP, utiliser l'interaction
             * comme seed rend la partie
             * reproductible.
             */
            seed:
                interaction.id,
        });

    await interaction.reply({
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

    const lobbyMessage =
        await interaction.fetchReply();

    gameService.registerLobbyMessage(
        game.id,
        lobbyMessage.id,
    );
}

async function handleMe(
    interaction:
        ChatInputCommandInteraction,

    gameService:
        GameService,
): Promise<void> {
    const {
        guildId,
        channelId,
    } =
        getInteractionGameContext(
            interaction,
        );

    const game =
        gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const secrets =
        gameService.getMySecrets(
            game.id,
            interaction.user.id,
        );

    await interaction.reply({
        content:
            createPlayerSecretsContent(
                secrets,
            ),

        flags:
            MessageFlags.Ephemeral,
    });
}

async function handleCancel(
    interaction:
        ChatInputCommandInteraction,

    gameService:
        GameService,
): Promise<void> {
    await interaction.deferReply({
        flags:
            MessageFlags.Ephemeral,
    });

    const {
        guildId,
        channelId,
    } =
        getInteractionGameContext(
            interaction,
        );

    const currentGame =
        gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const cancelledGame =
        gameService.cancelGame(
            currentGame.id,
            interaction.user.id,
        );

    await refreshGameMessage(
        interaction,
        gameService,
        cancelledGame,
    );

    await interaction.editReply({
        content:
            "❌ La partie a été annulée.",
    });
}

async function handleFinish(
    interaction:
        ChatInputCommandInteraction,

    gameService:
        GameService,
): Promise<void> {
    await interaction.deferReply({
        flags:
            MessageFlags.Ephemeral,
    });

    const {
        guildId,
        channelId,
    } =
        getInteractionGameContext(
            interaction,
        );

    const currentGame =
        gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const finishedGame =
        gameService.finishGame(
            currentGame.id,
            interaction.user.id,
        );

    const reveal =
        gameService.getGameReveal(
            finishedGame.id,
        );

    await refreshGameMessage(
        interaction,
        gameService,
        finishedGame,
        createGameRevealContent(
            reveal,
        ),
    );

    await interaction.editReply({
        content:
            "🏁 Partie terminée. Les rôles ont été révélés.",
    });
}

function getInteractionGameContext(
    interaction:
        ChatInputCommandInteraction,
): {
    guildId: string;
    channelId: string;
} {
    if (
        interaction.guildId === null
        || interaction.channelId === null
    ) {
        throw new Error(
            "This command can only be used inside a Discord server.",
        );
    }

    return {
        guildId:
            interaction.guildId,

        channelId:
            interaction.channelId,
    };
}

async function refreshGameMessage(
    interaction:
        ChatInputCommandInteraction,

    gameService:
        GameService,

    game:
        GameSnapshot,

    additionalContent?:
        string,
): Promise<void> {
    const channel =
        interaction.channel;

    if (
        channel === null
        || !channel.isSendable()
    ) {
        return;
    }

    const content = [
        createLobbyContent(
            game,
            gameService,
        ),

        additionalContent,
    ]
        .filter(
            value =>
                value !== undefined,
        )
        .join("\n\n");

    const messageOptions = {
        content,

        components:
            createGameControls(
                game,
            ),
    };

    if (
        game.lobbyMessageId
        !== undefined
    ) {
        try {
            await channel.messages.edit(
                game.lobbyMessageId,
                messageOptions,
            );

            return;
        } catch (error) {
            console.warn(
                "Impossible de modifier l'ancien lobby. Un nouveau message va être créé.",
                error,
            );
        }
    }

    const replacementMessage =
        await channel.send(
            messageOptions,
        );

    gameService.registerLobbyMessage(
        game.id,
        replacementMessage.id,
    );
}