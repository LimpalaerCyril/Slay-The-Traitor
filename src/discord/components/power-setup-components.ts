import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
} from "discord.js";

import type {
    PowerSetupSnapshot,
} from "../../application/game-service/game-service.js";

import {
    CustomId,
} from "./custom-ids.js";

export interface PowerSetupTargetOption {
    readonly playerId:
        string;

    readonly label:
        string;

    readonly description:
        string;
}

export function createPowerSetupContent(
    setup:
        PowerSetupSnapshot,
): string {
    const targetSelection =
        setup.targetSelection;

    if (
        targetSelection === undefined
    ) {
        return [
            `✨ **${setup.powerName}**`,
            "",
            setup.powerDescription,
        ].join(
            "\n",
        );
    }

    const instruction =
        targetSelection.count === 1
            ? "Choisissez 1 joueur."
            : `Choisissez ${targetSelection.count} joueurs.`;

    return [
        `✨ **${setup.powerName}**`,
        "",
        setup.powerDescription,
        "",
        `🎯 ${instruction}`,
    ].join(
        "\n",
    );
}

export function createPowerSetupTargetSelect(
    gameId: string,
    count: number,
    options:
        readonly PowerSetupTargetOption[],
): ActionRowBuilder<StringSelectMenuBuilder> {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                CustomId
                    .powerSetupTarget(
                        gameId,
                    ),
            )
            .setPlaceholder(
                count === 1
                    ? "Choisissez un joueur"
                    : `Choisissez ${count} joueurs`,
            )
            .setMinValues(
                count,
            )
            .setMaxValues(
                count,
            )
            .addOptions(
                options.map(
                    option => ({
                        label:
                            option.label
                                .slice(
                                    0,
                                    100,
                                ),

                        description:
                            option.description
                                .slice(
                                    0,
                                    100,
                                ),

                        value:
                            option.playerId,
                    }),
                ),
            );

    return new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            select,
        );
}