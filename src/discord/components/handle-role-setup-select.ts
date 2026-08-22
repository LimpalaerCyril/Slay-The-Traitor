import type { StringSelectMenuInteraction } from "discord.js";

import type { GameService } from "../../application/game-service/game-service.js";

import type { Sts2BridgeSessionService } from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { parseCustomId } from "./custom-ids.js";

import { refreshLobbyMessage } from "./refresh-lobby-message.js";

export async function handleRoleSetupSelect(
  interaction: StringSelectMenuInteraction,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,
): Promise<boolean> {
  const parsed = parseCustomId(interaction.customId);

  if (
    parsed === undefined ||
    parsed.scope !== "setup" ||
    parsed.action !== "target"
  ) {
    return false;
  }

  const variantCode = parsed.extra[0];

  if (variantCode === undefined) {
    throw new Error("Missing role variant code.");
  }

  /*
   * Le menu se trouve dans le message
   * éphémère du setup.
   */
  await interaction.deferUpdate();

  const game = await gameService.configureRoleSetup(
    parsed.gameId,
    interaction.user.id,
    variantCode,
    interaction.values,
  );

  const message =
    game.state === "READY"
      ? [
          "✅ Votre rôle est configuré.",
          "",
          "🔒 Tous les choix secrets sont terminés.",
          "L'expédition est maintenant prête.",
        ].join("\n")
      : [
          "✅ Votre rôle est configuré.",
          "",
          "⏳ La partie attend encore d'autres choix secrets.",
        ].join("\n");

  await interaction.editReply({
    content: message,

    components: [],
  });

  await refreshLobbyMessage(
    interaction,
    gameService,
    game,
    sts2BridgeSessionService,
  );

  return true;
}
