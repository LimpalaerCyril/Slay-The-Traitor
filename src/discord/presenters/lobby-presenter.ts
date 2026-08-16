import type {
    GameService,
    GameSnapshot,
} from "../../application/game-service/game-service.js";

export function createLobbyContent(
    game: GameSnapshot,
    gameService: GameService,
): string {
    const participants =
        game.players.length === 0
            ? "Aucun participant"
            : game.players
                .map(
                    player => {
                        const character =
                            gameService.getCharacter(
                                player.characterSlug,
                            );

                        const characterName =
                            character?.name
                            ?? player.characterSlug;

                        return [
                            `• <@${player.discordUserId}>`,
                            `— **${characterName}**`,
                        ].join(" ");
                    },
                )
                .join("\n");

    const trackingMode =
        formatTrackingMode(
            game.trackingMode,
        );

    return [
        "## Slay the Traitor",
        "",
        `Hôte : <@${game.hostDiscordUserId}>`,
        `État : **${game.state}**`,
        `Mode de suivi : **${trackingMode}**`,
        `Participants : **${game.players.length}/4**`,
        "",
        participants,
        "",
        getStateInstruction(
            game.state,
        ),
    ].join("\n");
}

function getStateInstruction(
    state: GameSnapshot["state"],
): string {
    switch (state) {
        case "LOBBY":
            return "⚔️ Rejoignez l'expédition et choisissez votre personnage.";

        case "SETUP":
            return [
                "🎭 Configuration secrète en cours.",
                "Consultez votre rôle et effectuez, si nécessaire, la configuration de votre rôle ou de votre pouvoir.",
            ].join(
                "\n",
            );

        case "READY":
            return "🔒 L'expédition est prête. L'hôte peut lancer la partie.";

        case "ACTIVE":
            return "🤫 La partie a commencé. Consultez vos secrets et gardez-les pour vous.";

        case "VOTING":
            return "🗳️ Une accusation est en cours.";

        case "FINISHED":
            return "🏁 La partie est terminée.";

        case "CANCELLED":
            return "❌ La partie a été annulée.";
    }
}

function formatTrackingMode(
    mode:
        GameSnapshot["trackingMode"],
): string {
    switch (
    mode
    ) {
        case "MANUAL":
            return "📝 Discord manuel";

        case "STS2":
            return "🎮 Intégration STS2";
    }
}