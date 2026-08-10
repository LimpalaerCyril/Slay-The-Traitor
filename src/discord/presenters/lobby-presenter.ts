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

  return [
    "## Slay the Traitor",
    "",
    `Hôte : <@${game.hostDiscordUserId}>`,
    `État : **${game.state}**`,
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

    case "READY":
      return "🔒 L'expédition est prête. L'hôte peut lancer la partie.";

    case "ACTIVE":
      return "🎭 La partie a commencé. Consultez votre rôle et gardez vos objectifs secrets.";

    case "VOTING":
      return "🗳️ Une accusation est en cours.";

    case "FINISHED":
      return "🏁 La partie est terminée.";

    case "CANCELLED":
      return "❌ La partie a été annulée.";
  }
}