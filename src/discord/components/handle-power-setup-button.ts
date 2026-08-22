import {
    MessageFlags,
    type ButtonInteraction,
} from "discord.js";

import type {
    GameService,
} from "../../application/game-service/game-service.js";

import {
    parseCustomId,
} from "./custom-ids.js";

import {
    createPowerSetupContent,
    createPowerSetupTargetSelect,
    type PowerSetupTargetOption,
} from "./power-setup-components.js";

export async function handlePowerSetupButton(
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
        || parsed.scope !== "power"
        || parsed.action !== "setup"
    ) {
        return false;
    }

    /*
     * On accuse réception immédiatement.
     *
     * getMyPowerSetup() peut nécessiter
     * un accès PostgreSQL.
     */
    await interaction.deferReply({
        flags:
            MessageFlags.Ephemeral,
    });

    const setup =
        await gameService
            .getMyPowerSetup(
                parsed.gameId,
                interaction.user.id,
            );

    if (
        setup === undefined
    ) {
        await interaction.editReply({
            content:
                "ℹ️ Votre rôle ne possède aucun pouvoir à configurer.",

            components: [],
        });

        return true;
    }

    if (
        setup.setupCompleted
    ) {
        await interaction.editReply({
            content: [
                `✨ **${setup.powerName}**`,
                "",
                setup.powerDescription,
                "",
                "✅ Ce pouvoir ne nécessite aucune configuration supplémentaire.",
            ].join(
                "\n",
            ),

            components: [],
        });

        return true;
    }

    const targetSelection =
        setup.targetSelection;

    /*
     * Un PowerAssignment incomplet doit
     * forcément correspondre à un setup
     * défini dans le contenu.
     */
    if (
        targetSelection === undefined
    ) {
        throw new Error(
            `Power ${setup.powerCode} is incomplete but has no setup definition.`,
        );
    }

    const eligibleTargets =
        setup.targets.filter(
            target =>
                targetSelection
                    .allowSelf
                || target.discordUserId
                    !== interaction.user.id,
        );

    if (
        eligibleTargets.length
        < targetSelection.count
    ) {
        throw new Error(
            `Not enough eligible targets to configure power ${setup.powerCode}.`,
        );
    }

    const options:
        PowerSetupTargetOption[] =
        eligibleTargets.map(
            target => {
                const discordUser =
                    interaction.client
                        .users
                        .cache
                        .get(
                            target.discordUserId,
                        );

                const character =
                    gameService
                        .getCharacter(
                            target.characterSlug,
                        );

                return {
                    playerId:
                        target.playerId,

                    label:
                        discordUser
                            === undefined
                            ? target.discordUserId
                            : `@${discordUser.username}`,

                    description:
                        character
                            === undefined
                            ? target.characterSlug
                            : character.name,
                };
            },
        );

    await interaction.editReply({
        content:
            createPowerSetupContent(
                setup,
            ),

        components: [
            createPowerSetupTargetSelect(
                parsed.gameId,
                targetSelection.count,
                options,
            ),
        ],
    });

    return true;
}