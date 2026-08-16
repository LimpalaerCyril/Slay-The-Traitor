import type {
  GamePlayer,
} from "../../domain/games/game-player.js";

import type {
  PlayerObjectiveSecret,
  PlayerPowerSecret,
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
  secret:
    PlayerObjectiveSecret,
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
  ].join(
    " ",
  );
}

function createObjectiveBlock(
  title:
    string,
  secret:
    PlayerObjectiveSecret
    | undefined,
): string {
  if (
    secret === undefined
  ) {
    return [
      `### ${title}`,
      "Objectif indisponible.",
    ].join(
      "\n",
    );
  }

  return [
    `### ${title}`,
    `**${secret.objective.name}**`,
    secret.objective.description,
    "",
    createProgressText(
      secret,
    ),
  ].join(
    "\n",
  );
}

function formatTargets(
  targets:
    readonly GamePlayer[],
): string {
  return targets
    .map(
      target =>
        `<@${target.discordUserId}>`,
    )
    .join(
      ", ",
    );
}

function createRoleBlock(
  secrets:
    PlayerSecrets,
): string {
  const variant =
    secrets.roleAssignment
      .variantCode
      === undefined
      ? undefined
      : secrets.role.variants
        ?.find(
          candidate =>
            candidate.code
            === secrets
              .roleAssignment
              .variantCode,
        );

  /*
   * Pour un rôle configurable comme
   * l'Ange, la variante devient le vrai
   * nom présenté au joueur.
   */
  const displayName =
    variant?.name
    ?? secrets.role.name;

  const displayDescription =
    variant?.description
    ?? secrets.role.description;

  const lines = [
    `## 🎭 Votre rôle : ${displayName}`,
    "",
    displayDescription,
  ];

  if (
    secrets.roleTargets.length > 0
  ) {
    lines.push(
      "",
      secrets.roleTargets.length === 1
        ? `🎯 **Cible :** ${formatTargets(secrets.roleTargets)}`
        : `🎯 **Cibles :** ${formatTargets(secrets.roleTargets)}`,
    );
  }

  return lines.join(
    "\n",
  );
}

function createLoveBlock(
  secrets:
    PlayerSecrets,
): string {
  if (
    secrets.lovePartners.length
    === 0
  ) {
    return [
      "### ❤️ Statut amoureux",
      "**Non** — aucun lien amoureux.",
    ].join(
      "\n",
    );
  }

  const partners =
    formatTargets(
      secrets.lovePartners,
    );

  return [
    "### ❤️ Statut amoureux",
    "**Oui ❤️**",
    "",
    secrets.lovePartners.length === 1
      ? `Vous êtes amoureux de ${partners}.`
      : `Vous êtes amoureux de ${partners}.`,
  ].join(
    "\n",
  );
}

function getPowerModeLabel(
  power:
    PlayerPowerSecret,
): string {
  switch (
    power.power.mode
  ) {
    case "ACTIVE":
      return "Actif";

    case "PASSIVE":
      return "Passif";
  }
}

function createPowerBlock(
  power:
    PlayerPowerSecret
    | undefined,
): string {
  if (
    power === undefined
  ) {
    return [
      "### ✨ Pouvoir",
      "Aucun pouvoir associé à votre rôle.",
    ].join(
      "\n",
    );
  }

  const lines = [
    `### ✨ Pouvoir : ${power.power.name}`,
    `**Type :** ${getPowerModeLabel(power)}`,
    "",
    power.power.description,
  ];

  if (
    power.power.mode
    === "ACTIVE"
    && power.power.maxUses
    !== undefined
  ) {
    const remainingUses =
      Math.max(
        0,
        power.power.maxUses
        - power.assignment.uses,
      );

    lines.push(
      "",
      `**Utilisations restantes :** ${remainingUses}/${power.power.maxUses}`,
    );
  }

  if (
    power.targets.length > 0
  ) {
    lines.push(
      "",
      power.targets.length === 1
        ? `🎯 **Cible :** ${formatTargets(power.targets)}`
        : `🎯 **Cibles :** ${formatTargets(power.targets)}`,
    );
  }

  return lines.join(
    "\n",
  );
}

function createSecondaryTitle(
  secret:
    PlayerObjectiveSecret
    | undefined,
): string {
  const actNumber =
    secret?.assignment
      .actNumber;

  if (
    actNumber === undefined
  ) {
    return "📜 Objectif secondaire";
  }

  return `📜 Objectif secondaire — Acte ${actNumber}`;
}

export function createPlayerSecretsContent(
  secrets:
    PlayerSecrets,
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
    createRoleBlock(
      secrets,
    ),

    "",
    createLoveBlock(
      secrets,
    ),

    "",
    createPowerBlock(
      secrets.power,
    ),

    "",
    createObjectiveBlock(
      "🎯 Objectif principal",
      primary,
    ),

    "",
    createObjectiveBlock(
      createSecondaryTitle(
        secondary,
      ),
      secondary,
    ),

    "",
    "🤫 Gardez ces informations secrètes.",
  ].join(
    "\n",
  );
}