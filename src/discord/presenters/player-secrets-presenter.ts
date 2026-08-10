import type {
  PlayerObjectiveSecret,
  PlayerSecrets,
} from "../../application/game-service/game-service.js";

function getStatusLabel(
  status:
    PlayerObjectiveSecret["assignment"]["status"],
): string {
  switch (status) {
    case "PENDING":
      return "Non commencé";

    case "IN_PROGRESS":
      return "En cours";

    case "COMPLETED":
      return "Accompli";

    case "FAILED":
      return "Échoué";
  }
}

function createProgressText(
  secret: PlayerObjectiveSecret,
): string {
  if (
    secret.objective.hiddenProgress
  ) {
    return "Progression : **masquée**";
  }

  return [
    "Progression :",
    `**${secret.assignment.progress.current}/${secret.assignment.progress.target}**`,
    `— ${getStatusLabel(secret.assignment.status)}`,
  ].join(" ");
}

function createObjectiveBlock(
  title: string,
  secret:
    PlayerObjectiveSecret | undefined,
): string {
  if (
    secret === undefined
  ) {
    return [
      `### ${title}`,
      "Objectif indisponible.",
    ].join("\n");
  }

  return [
    `### ${title}`,
    `**${secret.objective.name}**`,
    secret.objective.description,
    "",
    createProgressText(
      secret,
    ),
  ].join("\n");
}

export function createPlayerSecretsContent(
  secrets: PlayerSecrets,
): string {
  const primary =
    secrets.objectives.find(
      entry =>
        entry.assignment
          .objectiveType
        === "PRIMARY",
    );

  const secondary =
    secrets.objectives.find(
      entry =>
        entry.assignment
          .objectiveType
        === "SECONDARY",
    );

  return [
    `## 🎭 Votre rôle : ${secrets.role.name}`,
    "",
    secrets.role.description,

    "",
    createObjectiveBlock(
      "🎯 Objectif principal",
      primary,
    ),

    "",
    createObjectiveBlock(
      "✨ Objectif secondaire",
      secondary,
    ),

    "",
    "🤫 Gardez ces informations secrètes.",
  ].join("\n");
}