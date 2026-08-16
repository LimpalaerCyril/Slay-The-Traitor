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

        case "SETUP":
            return [
                createSetupControls(
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

function createSetupControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder> {
    const secretButton =
        createSecretButton(
            game,
            "Voir mon rôle",
        );

    const roleSetupButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId
                    .roleSetupOpen(
                        game.id,
                    ),
            )
            .setLabel(
                "Configurer mon rôle",
            )
            .setEmoji(
                "⚙️",
            )
            .setStyle(
                ButtonStyle.Primary,
            );

    const powerSetupButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId
                    .powerSetupOpen(
                        game.id,
                    ),
            )
            .setLabel(
                "Configurer mon pouvoir",
            )
            .setEmoji(
                "✨",
            )
            .setStyle(
                ButtonStyle.Primary,
            );

    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            secretButton,
            roleSetupButton,
            powerSetupButton,
        );
}

function createSecretButton(
    game: GameSnapshot,
    label: string,
): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId(
            CustomId.secretView(
                game.id,
            ),
        )
        .setLabel(
            label,
        )
        .setEmoji(
            "🎭",
        )
        .setStyle(
            ButtonStyle.Secondary,
        );
}

function createReadyControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder> {
    const secretButton =
        createSecretButton(
            game,
            "Voir mes secrets",
        );

    const startButton =
        new ButtonBuilder()
            .setCustomId(
                CustomId.lobbyStart(
                    game.id,
                ),
            )
            .setLabel(
                "Lancer la partie",
            )
            .setEmoji(
                "▶️",
            )
            .setStyle(
                ButtonStyle.Success,
            );

    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            secretButton,
            startButton,
        );
}

function createActiveControls(
    game: GameSnapshot,
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            createSecretButton(
                game,
                "Voir mes secrets",
            ),
        );
}