import {
  MessageFlags,
  type ButtonInteraction,
} from "discord.js";

import type {
  GameService,
} from "../../application/game-service/game-service.js";

import {
  createPlayerSecretsContent,
} from "../presenters/player-secrets-presenter.js";

import {
  parseCustomId,
} from "./custom-ids.js";

export async function handleSecretButton(
  interaction:
    ButtonInteraction,

  gameService:
    GameService,
): Promise<boolean> {
  const parsed =
    parseCustomId(
      interaction.customId,
    );

  if (
    parsed === undefined
    || parsed.scope !== "secret"
    || parsed.action !== "view"
  ) {
    return false;
  }

  const secrets =
    gameService.getMySecrets(
      parsed.gameId,
      interaction.user.id,
    );

  await interaction.reply({
    content:
      createPlayerSecretsContent(
        secrets,
      ),

    flags:
      MessageFlags.Ephemeral,
  });

  return true;
}