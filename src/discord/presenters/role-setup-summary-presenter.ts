import type {
    RoleSetupSnapshot,
} from "../../application/game-service/game-service.js";

function createLoveSummary(
    setup:
        RoleSetupSnapshot,
): string {
    if (
        setup.lovePartners.length
        === 0
    ) {
        return [
            "❤️ **Amoureux :** Non",
        ].join(
            "\n",
        );
    }

    const partnerNames =
        setup.lovePartners
            .map(
                partner =>
                    `<@${partner.discordUserId}>`,
            )
            .join(
                ", ",
            );

    return [
        "❤️ **Amoureux :** Oui",
        `❤️ **Partenaire :** ${partnerNames}`,
    ].join(
        "\n",
    );
}

export function createRoleSetupSummaryContent(
    setup:
        RoleSetupSnapshot,
): string {
    const selectedVariant =
        setup.setupCompleted
            ? setup.variants.find(
                variant =>
                    variant.code
                    === setup.selectedVariantCode,
            )
            : undefined;

    const displayName =
        selectedVariant?.name
        ?? setup.roleName;

    const displayDescription =
        selectedVariant?.description
        ?? setup.roleDescription;

    const lines = [
        `🎭 **${displayName}**`,
        "",
        displayDescription,
    ];

    if (
        setup.variants.length > 0
        && !setup.setupCompleted
    ) {
        lines.push(
            "",
            "⚠️ **Votre rôle nécessite une configuration.**",
            "",
            "Utilisez le bouton « Configurer mon rôle » pour choisir votre voie.",
        );
    }

    if (
        setup.setupCompleted
        && setup.selectedTargetPlayerIds
            .length > 0
    ) {
        const targetNames =
            setup.selectedTargetPlayerIds
                .map(
                    targetPlayerId => {
                        const target =
                            setup.targets.find(
                                candidate =>
                                    candidate.playerId
                                    === targetPlayerId,
                            );

                        if (
                            target === undefined
                        ) {
                            return targetPlayerId;
                        }

                        return `<@${target.discordUserId}>`;
                    },
                )
                .join(
                    ", ",
                );

        lines.push(
            "",
            setup.selectedTargetPlayerIds
                .length === 1
                ? `🎯 **Cible :** ${targetNames}`
                : `🎯 **Cibles :** ${targetNames}`,
        );
    }

    lines.push(
        "",
        createLoveSummary(
            setup,
        ),
    );

    return lines.join(
        "\n",
    );
}