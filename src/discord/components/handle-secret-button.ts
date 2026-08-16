import {
    MessageFlags,
    type ButtonInteraction,
} from "discord.js";

import type {
    GameService,
} from "../../application/game-service/game-service.js";

import {
    createPlayerSecretsContent,
} from "../presenters/player-secrets-presenter.js";

import {
    createRoleSetupSummaryContent,
} from "../presenters/role-setup-summary-presenter.js";

import {
    parseCustomId,
} from "./custom-ids.js";

export async function handleSecretButton(
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
        || parsed.scope !== "secret"
        || parsed.action !== "view"
    ) {
        return false;
    }

    const game =
        await gameService
            .getGameSnapshot(
                parsed.gameId,
            );

    /*
     * Pendant SETUP les rôles existent déjà,
     * mais les objectifs ne sont pas encore
     * forcément générés.
     *
     * On affiche donc uniquement les
     * informations du rôle.
     */
    if (
        game.state === "SETUP"
    ) {
        const setup =
            await gameService
                .getMyRoleSetup(
                    parsed.gameId,
                    interaction.user.id,
                );

        await interaction.reply({
            content:
                createRoleSetupSummaryContent(
                    setup,
                ),

            flags:
                MessageFlags.Ephemeral,
        });

        return true;
    }

    /*
     * READY et ACTIVE utilisent la vue
     * complète rôle + objectifs.
     */
    if (
        game.state !== "READY"
        && game.state !== "ACTIVE"
    ) {
        throw new Error(
            "Your role cannot be viewed at this stage of the game.",
        );
    }

    const secrets =
        await gameService
            .getMySecrets(
                parsed.gameId,
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

    return true;
}