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
    createRoleSetupTargetContent,
    createRoleSetupTargetSelect,
    createRoleSetupVariantContent,
    createRoleSetupVariantControls,
    type RoleSetupTargetOption,
} from "./role-setup-components.js";

import {
    refreshLobbyMessage,
} from "./refresh-lobby-message.js";

export async function handleRoleSetupButton(
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
        || parsed.scope !== "setup"
    ) {
        return false;
    }

    switch (
    parsed.action
    ) {
        case "open":
            await handleOpen(
                interaction,
                gameService,
                parsed.gameId,
            );

            return true;

        case "variant":
            await handleVariant(
                interaction,
                gameService,
                parsed.gameId,
                parsed.extra,
            );

            return true;

        default:
            return false;
    }
}

async function handleOpen(
    interaction:
        ButtonInteraction,
    gameService:
        GameService,
    gameId: string,
): Promise<void> {
    const setup =
        await gameService
            .getMyRoleSetup(
                gameId,
                interaction.user.id,
            );

    if (
        setup.setupCompleted
    ) {
        await interaction.reply({
            content: [
                "✅ Votre rôle ne nécessite aucune configuration supplémentaire.",
                "",
                "La partie attend encore les éventuels choix secrets des autres joueurs.",
            ].join(
                "\n",
            ),

            flags:
                MessageFlags.Ephemeral,
        });

        return;
    }

    if (
        setup.variants.length === 0
    ) {
        throw new Error(
            `Role ${setup.roleCode} requires setup but has no available variant.`,
        );
    }

    await interaction.reply({
        content:
            createRoleSetupVariantContent(
                setup,
            ),

        components:
            createRoleSetupVariantControls(
                gameId,
                setup,
            ),

        flags:
            MessageFlags.Ephemeral,
    });
}

async function handleVariant(
    interaction:
        ButtonInteraction,
    gameService:
        GameService,
    gameId: string,
    extra:
        readonly string[],
): Promise<void> {
    const variantCode =
        extra[0];

    if (
        variantCode === undefined
    ) {
        throw new Error(
            "Missing role variant code.",
        );
    }

    /*
     * Le bouton de variante se trouve déjà
     * dans un message éphémère.
     *
     * deferUpdate() accuse réception sans
     * créer de nouveau message public.
     */
    await interaction.deferUpdate();

    const setup =
        await gameService
            .getMyRoleSetup(
                gameId,
                interaction.user.id,
            );

    if (
        setup.setupCompleted
    ) {
        await interaction.editReply({
            content:
                "✅ Votre rôle est déjà configuré.",

            components: [],
        });

        return;
    }

    const variant =
        setup.variants.find(
            candidate =>
                candidate.code
                === variantCode,
        );

    if (
        variant === undefined
    ) {
        throw new Error(
            `Unknown role variant: ${variantCode}`,
        );
    }

    const targetSelection =
        variant.targetSelection;

    /*
     * Certaines futures variantes pourront
     * ne demander aucune cible.
     */
    if (
        targetSelection === undefined
    ) {
        const game =
            await gameService
                .configureRoleSetup(
                    gameId,
                    interaction.user.id,
                    variant.code,
                    [],
                );

        await interaction.editReply({
            content:
                "✅ Votre rôle est configuré.",

            components: [],
        });

        await refreshLobbyMessage(
            interaction,
            gameService,
            game,
        );

        return;
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
            `Not enough eligible targets for variant ${variant.code}.`,
        );
    }

    const options:
        RoleSetupTargetOption[] =
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
            createRoleSetupTargetContent(
                setup,
                variant,
            ),

        components: [
            createRoleSetupTargetSelect(
                gameId,
                variant.code,
                targetSelection.count,
                options,
            ),
        ],
    });
}