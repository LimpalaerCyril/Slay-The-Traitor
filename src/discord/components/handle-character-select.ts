import type { StringSelectMenuInteraction } from "discord.js";

import type { GameService } from "../../application/game-service/game-service.js";

import type { Sts2BridgeSessionService } from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { createLobbyMessagePayload } from "../presenters/lobby-message-payload.js";

import { parseCustomId } from "./custom-ids.js";

export async function handleCharacterSelect(
  interaction: StringSelectMenuInteraction,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,
): Promise<boolean> {
  const parsed = parseCustomId(interaction.customId);

  if (
    parsed === undefined ||
    parsed.scope !== "lobby" ||
    parsed.action !== "character"
  ) {
    return false;
  }

  const lobbyMessageId = parsed.extra[0];

  if (lobbyMessageId === undefined) {
    throw new Error("Missing lobby message id.");
  }

  const characterSlug = interaction.values[0];

  if (characterSlug === undefined) {
    throw new Error("No character selected.");
  }

  const currentGame = await gameService.getGameSnapshot(parsed.gameId);

  const alreadyJoined = currentGame.players.some(
    (player) => player.discordUserId === interaction.user.id,
  );

  const game = alreadyJoined
    ? await gameService.changeCharacter(
        parsed.gameId,
        interaction.user.id,
        characterSlug,
      )
    : await gameService.joinGame({
        gameId: parsed.gameId,

        playerId: interaction.user.id,

        discordUserId: interaction.user.id,

        characterSlug,
      });

  const character = gameService.getCharacter(characterSlug);

  await interaction.deferUpdate();

  if (interaction.channel === null || !interaction.channel.isTextBased()) {
    throw new Error("Unable to access the lobby channel.");
  }

  const lobbyPayload = await createLobbyMessagePayload(
    game,
    gameService,
    sts2BridgeSessionService,
  );

  await interaction.channel.messages.edit(lobbyMessageId, lobbyPayload);

  await interaction.editReply({
    content: `✅ Vous jouez maintenant **${character?.name ?? characterSlug}**.`,

    components: [],
  });

  return true;
}
