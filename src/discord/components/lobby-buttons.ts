import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";

import type {
    GameSnapshot,
} from "../../application/game-service/game-service.js";

import {
    CustomId,
} from "./custom-ids.js";

export function createGameControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder>[] {
    switch (game.state) {
        case "LOBBY":
            return [
                createLobbyControls(
                    game,
                ),
            ];

        case "READY":
            return [
                createReadyControls(
                    game,
                ),
            ];

        case "ACTIVE":
            return [
                createActiveControls(
                    game,
                ),
            ];

        case "VOTING":
        case "FINISHED":
        case "CANCELLED":
            return [];
    }
}

function createLobbyControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder> {
    const joinButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId.lobbyJoin(
                    game.id,
                ),
            )
            .setLabel("Rejoindre")
            .setEmoji("⚔️")
            .setStyle(
                ButtonStyle.Success,
            );

    const leaveButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId.lobbyLeave(
                    game.id,
                ),
            )
            .setLabel("Quitter")
            .setEmoji("🚪")
            .setStyle(
                ButtonStyle.Secondary,
            );

    const prepareButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId.lobbyPrepare(
                    game.id,
                ),
            )
            .setLabel("Préparer")
            .setEmoji("🔒")
            .setStyle(
                ButtonStyle.Primary,
            )
            .setDisabled(
                game.players.length < 2,
            );

    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            joinButton,
            leaveButton,
            prepareButton,
        );
}

function createReadyControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder> {
    const startButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId.lobbyStart(
                    game.id,
                ),
            )
            .setLabel("Lancer la partie")
            .setEmoji("▶️")
            .setStyle(
                ButtonStyle.Success,
            );

    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            startButton,
        );
}

function createActiveControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder> {
    const secretButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId.secretView(
                    game.id,
                ),
            )
            .setLabel("Voir mon rôle")
            .setEmoji("🎭")
            .setStyle(
                ButtonStyle.Primary,
            );

    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            secretButton,
        );
}