import type {
  GameService,
  GameSnapshot,
} from "../../application/game-service/game-service.js";

import type {
  Sts2BridgeLobbyStatus,
  Sts2BridgeParticipantStatus,
} from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

export function createLobbyContent(
  game: GameSnapshot,

  gameService: GameService,

  bridgeStatus?: Sts2BridgeLobbyStatus | undefined,
): string {
  const participants =
    game.players.length === 0
      ? "Aucun participant"
      : game.players
          .map((player) => {
            const character = gameService.getCharacter(player.characterSlug);

            const characterName = character?.name ?? player.characterSlug;

            return [
              `• <@${player.discordUserId}>`,
              `— **${characterName}**`,
            ].join(" ");
          })
          .join("\n");

  const trackingMode = formatTrackingMode(game.trackingMode);

  const bridgeSection =
    game.trackingMode === "STS2"
      ? createBridgeSection(bridgeStatus)
      : undefined;

  return [
    "## Slay the Traitor",
    "",
    `Hôte : <@${game.hostDiscordUserId}>`,
    `État : **${game.state}**`,
    `Mode de suivi : **${trackingMode}**`,
    `Participants : **${game.players.length}/4**`,
    "",
    participants,

    ...(bridgeSection === undefined ? [] : ["", bridgeSection]),

    "",
    getStateInstruction(game.state, bridgeStatus),
  ].join("\n");
}

export function createSts2StartBlockedContent(
  status: Sts2BridgeLobbyStatus,
): string {
  return [
    "## ❌ Impossible de lancer la partie STS2",
    "",
    "Tous les participants doivent avoir lié leur compte Steam et disposer d'un bridge actif dans le lobby courant.",
    "",
    ...status.participants.map(createParticipantBridgeLine),
    "",
    `Un client est considéré déconnecté après **${status.connectionTimeoutSeconds} secondes** sans heartbeat.`,
  ].join("\n");
}

function createBridgeSection(
  status: Sts2BridgeLobbyStatus | undefined,
): string {
  if (status === undefined) {
    return [
      "## 🔌 Connexion Slay the Spire 2",
      "",
      "⚠️ Statut du bridge indisponible.",
    ].join("\n");
  }

  return [
    "## 🔌 Connexion Slay the Spire 2",
    "",
    `Code de session : **${status.sessionCode}**`,
    status.currentLobbyId === undefined
      ? "Lobby Steam : ⏳ **en attente de l'hôte STS2**"
      : "Lobby Steam : ✅ **associé**",
    "",
    ...(status.participants.length === 0
      ? ["Aucun participant Discord inscrit."]
      : status.participants.map(createParticipantBridgeLine)),
    "",
    status.readyForStart
      ? "✅ **Tous les clients STS2 sont prêts.**"
      : "⏳ **La connexion STS2 n'est pas encore complète.**",
  ].join("\n");
}

function createParticipantBridgeLine(
  participant: Sts2BridgeParticipantStatus,
): string {
  const hostSuffix = participant.isHost ? " — 👑 Hôte STS2" : "";

  switch (participant.state) {
    case "NOT_LINKED":
      return [
        `❌ <@${participant.discordUserId}>`,
        "— compte Steam non lié",
      ].join(" ");

    case "DISCONNECTED":
      return [
        `⚠️ <@${participant.discordUserId}>`,
        "— Steam lié, bridge absent",
        hostSuffix,
      ].join(" ");

    case "CONNECTED":
      return [
        `✅ <@${participant.discordUserId}>`,
        "— bridge connecté",
        hostSuffix,
      ].join(" ");
  }
}

function getStateInstruction(
  state: GameSnapshot["state"],

  bridgeStatus?: Sts2BridgeLobbyStatus | undefined,
): string {
  switch (state) {
    case "LOBBY":
      return "⚔️ Rejoignez l'expédition et choisissez votre personnage.";

    case "SETUP":
      return [
        "🎭 Configuration secrète en cours.",
        "Consultez votre rôle et effectuez, si nécessaire, la configuration de votre rôle ou de votre pouvoir.",
      ].join("\n");

    case "READY":
      if (bridgeStatus !== undefined && !bridgeStatus.readyForStart) {
        return "⏳ Les secrets sont prêts, mais les clients STS2 doivent encore se connecter.";
      }

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

function formatTrackingMode(mode: GameSnapshot["trackingMode"]): string {
  switch (mode) {
    case "MANUAL":
      return "📝 Discord manuel";

    case "STS2":
      return "🎮 Intégration STS2";
  }
}
