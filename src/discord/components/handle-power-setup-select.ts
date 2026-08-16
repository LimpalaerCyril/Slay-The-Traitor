import type {
    StringSelectMenuInteraction,
} from "discord.js";

import type {
    GameService,
} from "../../application/game-service/game-service.js";

import {
    parseCustomId,
} from "./custom-ids.js";

import {
    refreshLobbyMessage,
} from "./refresh-lobby-message.js";

export async function handlePowerSetupSelect(
    interaction:
        StringSelectMenuInteraction,
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
        || parsed.action !== "target"
    ) {
        return false;
    }

    /*
     * Le menu appartient déjà au message
     * éphémère créé par le bouton précédent.
     */
    await interaction.deferUpdate();

    const setup =
        await gameService
            .getMyPowerSetup(
                parsed.gameId,
                interaction.user.id,
            );

    if (
        setup === undefined
    ) {
        throw new Error(
            "This player has no power setup.",
        );
    }

    const selectedTargets =
        interaction.values.map(
            playerId => {
                const target =
                    setup.targets.find(
                        candidate =>
                            candidate.playerId
                            === playerId,
                    );

                if (
                    target === undefined
                ) {
                    throw new Error(
                        `Unknown selected power target: ${playerId}`,
                    );
                }

                return target;
            },
        );

    const game =
        await gameService
            .configurePowerSetup(
                parsed.gameId,
                interaction.user.id,
                interaction.values,
            );

    if (
        setup.powerCode
        === "lovers-bond"
    ) {
        await notifyLovers(
            interaction,
            selectedTargets,
        );
    }

    const message =
        game.state === "READY"
            ? [
                "✅ Votre pouvoir est configuré.",
                "",
                "🔒 Tous les choix secrets sont maintenant terminés.",
                "L'expédition est prête.",
            ].join(
                "\n",
            )
            : [
                "✅ Votre pouvoir est configuré.",
                "",
                "⏳ La partie attend encore d'autres choix secrets.",
            ].join(
                "\n",
            );

    await interaction.editReply({
        content:
            message,

        components: [],
    });

    await refreshLobbyMessage(
        interaction,
        gameService,
        game,
    );

    return true;
}

interface LoverTarget {
    readonly playerId:
    string;

    readonly discordUserId:
    string;

    readonly characterSlug:
    string;
}

async function notifyLovers(
    interaction:
        StringSelectMenuInteraction,
    targets:
        readonly LoverTarget[],
): Promise<void> {
    for (
        const target
        of targets
    ) {
        const partners =
            targets.filter(
                candidate =>
                    candidate.playerId
                    !== target.playerId,
            );

        const partnerMentions =
            partners
                .map(
                    partner =>
                        `<@${partner.discordUserId}>`,
                )
                .join(
                    ", ",
                );

        const discordUser =
            await interaction.client
                .users
                .fetch(
                    target.discordUserId,
                );

        try {
            await discordUser.send(
                [
                    "❤️ **Un lien amoureux vous unit désormais.**",
                    "",
                    partners.length === 1
                        ? `Votre partenaire est ${partnerMentions}.`
                        : `Vos partenaires sont ${partnerMentions}.`,
                    "",
                    "Votre destin restera lié jusqu'à la fin de l'acte 2.",
                    "",
                    "🤫 L'identité de Cupidon reste secrète.",
                ].join(
                    "\n",
                ),
            );
        } catch {
            console.warn(
                `Impossible d'envoyer la notification de lien amoureux à ${target.discordUserId}.`,
            );
        }
    }
}