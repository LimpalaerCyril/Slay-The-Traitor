import type {
  PlayerObjectiveSecret,
  PlayerReveal,
} from "../../application/game-service/game-service.js";

function getStatusLabel(
  secret:
    PlayerObjectiveSecret,
): string {
  switch (
    secret.assignment.status
  ) {
    case "PENDING":
      return "Non accompli";

    case "IN_PROGRESS":
      return "En cours";

    case "COMPLETED":
      return "Accompli ✅";

    case "FAILED":
      return "Échoué ❌";
  }
}

export function createGameRevealContent(
  reveal:
    readonly PlayerReveal[],
): string {
  const players =
    reveal.map(
      entry => {
        const primary =
          entry.secrets
            .objectives
            .find(
              objective =>
                objective.assignment
                  .objectiveType
                === "PRIMARY",
            );

        const secondary =
          entry.secrets
            .objectives
            .find(
              objective =>
                objective.assignment
                  .objectiveType
                === "SECONDARY",
            );

        const primaryText =
          primary === undefined
            ? "Inconnu"
            : `${primary.objective.name} — ${getStatusLabel(primary)}`;

        const secondaryText =
          secondary === undefined
            ? "Inconnu"
            : `${secondary.objective.name} — ${getStatusLabel(secondary)}`;

        return [
          `### <@${entry.player.discordUserId}>`,
          `🎭 **${entry.secrets.role.name}**`,
          `🎯 ${primaryText}`,
          `✨ ${secondaryText}`,
        ].join("\n");
      },
    )
    .join("\n\n");

  return [
    "## 🕯️ Révélation",
    "",
    players,
  ].join("\n");
}