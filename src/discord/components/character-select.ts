import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";

import type {
    Character,
} from "../../domain/characters/character.js";

import {
    CustomId,
} from "./custom-ids.js";

export function createCharacterSelect(
    gameId: string,
    lobbyMessageId: string,
    characters:
        readonly Character[],
): ActionRowBuilder<StringSelectMenuBuilder> {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                CustomId.characterSelect(
                    gameId,
                    lobbyMessageId,
                ),
            )
            .setPlaceholder(
                "Choisissez votre personnage",
            )
            .setMinValues(1)
            .setMaxValues(1);

    const options =
        characters.map(
            character =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(
                        character.name,
                    )
                    .setValue(
                        character.slug,
                    ),
        );

    select.addOptions(
        options,
    );

    return new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            select,
        );
}