import {
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js";

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

import {
    randomUUID,
} from "node:crypto";

import type {
    GameService,
    GameSnapshot,
} from "../../application/game-service/game-service.js";

import type {
    GameTrackingMode,
} from "../../domain/games/game-tracking-mode.js";

import type {
    GameEventService,
} from "../../application/game-event-service/game-event-service.js";

import {
    isManualReportType,
    type ManualReportType,
} from "../../application/game-event-service/game-event-service.js";

export async function handleSpireCommand(
    interaction: ChatInputCommandInteraction,

    gameService: GameService,

    gameEventService: GameEventService,
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

        case "report":
            await handleReport(
                interaction,
                gameService,
                gameEventService,
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

    const gameSeed =
        randomUUID();

    const rawTrackingMode =
        interaction.options
            .getString(
                "mode",
                true,
            );

    if (
        rawTrackingMode !== "MANUAL"
        && rawTrackingMode !== "STS2"
    ) {
        throw new Error(
            `Unknown game tracking mode: ${rawTrackingMode}`,
        );
    }

    const trackingMode:
        GameTrackingMode =
        rawTrackingMode;

    const game =
        await gameService.createGame({
            gameId,

            guildId:
                interaction.guildId,

            textChannelId:
                interaction.channelId,

            hostDiscordUserId:
                interaction.user.id,

            seed:
                gameSeed,

            trackingMode,
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

    await gameService
        .registerLobbyMessage(
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
        await gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const secrets =
        await gameService
            .getMySecrets(
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

async function handleReport(
    interaction:
        ChatInputCommandInteraction,

    gameService:
        GameService,

    gameEventService:
        GameEventService,
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

    const game =
        await gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const rawReportType =
        interaction.options
            .getString(
                "type",
                true,
            );

    if (
        !isManualReportType(
            rawReportType,
        )
    ) {
        throw new Error(
            `Unknown manual report type: ${rawReportType}`,
        );
    }

    const reportType:
        ManualReportType =
        rawReportType;

    const targetUser =
        interaction.options
            .getUser(
                "joueur",
            );

    const value =
        interaction.options
            .getInteger(
                "valeur",
            );

    const event =
        await gameEventService
            .recordManualReport({
                gameId:
                    game.id,

                reporterDiscordUserId:
                    interaction.user.id,

                reportType,

                ...(
                    targetUser === null
                        ? {}
                        : {
                            targetDiscordUserId:
                                targetUser.id,
                        }
                ),

                ...(
                    value === null
                        ? {}
                        : {
                            value,
                        }
                ),
            });

    await interaction.editReply({
        content: [
            "✅ **Rapport enregistré.**",
            "",
            `Événement : **${getManualReportLabel(reportType)}**`,
            event.actNumber === undefined
                ? undefined
                : `Acte : **${event.actNumber}**`,
            "",
            "Votre progression a été recalculée.",
            "Utilisez `/spire moi` pour consulter vos objectifs.",
        ]
            .filter(
                (
                    line,
                ): line is string =>
                    line !== undefined,
            )
            .join(
                "\n",
            ),
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
        await gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const cancelledGame =
        await gameService
            .cancelGame(
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
        await gameService
            .getCurrentGameByChannel(
                guildId,
                channelId,
            );

    const finishedGame =
        await gameService
            .finishGame(
                currentGame.id,
                interaction.user.id,
            );

    const reveal =
        await gameService
            .getGameReveal(
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

function getManualReportLabel(
    reportType:
        ManualReportType,
): string {
    switch (
    reportType
    ) {
        case "POTION_USED":
            return "Potion utilisée";

        case "CURSE_ADDED":
            return "Malédiction obtenue";

        case "GOLD_CHANGED":
            return "Or actuel";

        case "RELIC_ACQUIRED":
            return "Relique obtenue";

        case "BLOCK_GRANTED_TO_ALLY":
            return "Bloc donné à un allié";

        case "ENEMY_KILLED":
            return "Ennemi tué";

        case "PLAYER_DIED":
            return "Joueur mort";

        case "BOSS_DEFEATED":
            return "Boss vaincu";

        case "ACT_COMPLETED":
            return "Acte terminé";
    }
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

    await gameService
        .registerLobbyMessage(
            game.id,
            replacementMessage.id,
        );
}