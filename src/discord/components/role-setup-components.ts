import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} from "discord.js";

import type {
    RoleSetupSnapshot,
    RoleSetupVariantSnapshot,
} from "../../application/game-service/game-service.js";

import {
    CustomId,
} from "./custom-ids.js";

export interface RoleSetupTargetOption {
    readonly playerId:
    string;

    readonly label:
    string;

    readonly description:
    string;
}

export function createRoleSetupVariantContent(
    setup:
        RoleSetupSnapshot,
): string {
    const variants =
        setup.variants
            .map(
                variant => [
                    `**${variant.name}**`,
                    variant.description,
                ].join(
                    " — ",
                ),
            )
            .join(
                "\n\n",
            );

    return [
        `🎭 **${setup.roleName}**`,
        "",
        setup.roleDescription,
        "",
        "**Choisissez votre voie :**",
        "",
        variants,
    ].join(
        "\n",
    );
}

export function createRoleSetupVariantControls(
    gameId: string,
    setup:
        RoleSetupSnapshot,
): ActionRowBuilder<ButtonBuilder>[] {
    const buttons =
        setup.variants.map(
            variant =>
                new ButtonBuilder()
                    .setCustomId(
                        CustomId
                            .roleSetupVariant(
                                gameId,
                                variant.code,
                            ),
                    )
                    .setLabel(
                        variant.name
                            .slice(
                                0,
                                80,
                            ),
                    )
                    .setStyle(
                        ButtonStyle.Primary,
                    ),
        );

    const rows:
        ActionRowBuilder<ButtonBuilder>[] =
        [];

    for (
        let index = 0;
        index < buttons.length;
        index += 5
    ) {
        rows.push(
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    ...buttons.slice(
                        index,
                        index + 5,
                    ),
                ),
        );
    }

    return rows;
}

export function createRoleSetupTargetContent(
    setup:
        RoleSetupSnapshot,
    variant:
        RoleSetupVariantSnapshot,
): string {
    const count =
        variant
            .targetSelection
            ?.count
        ?? 0;

    const instruction =
        count === 1
            ? "Choisissez votre cible."
            : `Choisissez ${count} cibles.`;

    return [
        `🎭 **${setup.roleName} — ${variant.name}**`,
        "",
        variant.description,
        "",
        `🎯 ${instruction}`,
    ].join(
        "\n",
    );
}

export function createRoleSetupTargetSelect(
    gameId: string,
    variantCode: string,
    count: number,
    options:
        readonly RoleSetupTargetOption[],
): ActionRowBuilder<StringSelectMenuBuilder> {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                CustomId
                    .roleSetupTarget(
                        gameId,
                        variantCode,
                    ),
            )
            .setPlaceholder(
                count === 1
                    ? "Choisissez une cible"
                    : `Choisissez ${count} cibles`,
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