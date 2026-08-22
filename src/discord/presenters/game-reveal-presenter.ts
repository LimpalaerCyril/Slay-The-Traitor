import type {
  PlayerObjectiveSecret,
  PlayerReveal,
} from "../../application/game-service/game-service.js";

function getStatusLabel(secret: PlayerObjectiveSecret): string {
  switch (secret.assignment.status) {
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
  reveal: readonly PlayerReveal[],
): string {
  const players = reveal
    .map((entry) => {
      const primary = entry.secrets.objectives.find(
        (objective) => objective.assignment.objectiveType === "PRIMARY",
      );

      const secondary = entry.secrets.objectives.find(
        (objective) => objective.assignment.objectiveType === "SECONDARY",
      );

      const primaryText =
        primary === undefined
          ? "Inconnu"
          : `${primary.objective.name} — ${getStatusLabel(primary)}`;

      const secondaryText =
        secondary === undefined
          ? "Inconnu"
          : `${secondary.objective.name} — ${getStatusLabel(secondary)}`;

      const variant = entry.secrets.role.variants?.find(
        (candidate) =>
          candidate.code === entry.secrets.roleAssignment.variantCode,
      );

      const roleText =
        variant === undefined
          ? entry.secrets.role.name
          : `${entry.secrets.role.name} — ${variant.name}`;

      const powerText =
        entry.secrets.power === undefined
          ? "Aucun"
          : entry.secrets.power.power.name;

      return [
        `### <@${entry.player.discordUserId}>`,
        `🎭 **${roleText}**`,
        `⚡ Pouvoir : **${powerText}**`,
        `🎯 ${primaryText}`,
        `📜 ${secondaryText}`,
      ].join("\n");
    })
    .join("\n\n");

  return ["## 🕯️ Révélation", "", players].join("\n");
}
