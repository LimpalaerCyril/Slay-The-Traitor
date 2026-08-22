import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

import type {
  GameService,
  GameSnapshot,
} from "../../application/game-service/game-service.js";

import type { Sts2BridgeSessionService } from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { createLobbyMessagePayload } from "../presenters/lobby-message-payload.js";

type RoleSetupInteraction = ButtonInteraction | StringSelectMenuInteraction;

export async function refreshLobbyMessage(
  interaction: RoleSetupInteraction,

  gameService: GameService,

  game: GameSnapshot,

  sts2BridgeSessionService: Sts2BridgeSessionService,
): Promise<void> {
  if (game.lobbyMessageId === undefined) {
    return;
  }

  if (!interaction.inCachedGuild()) {
    throw new Error("The game lobby can only be refreshed from a guild.");
  }

  const channel = interaction.channel;

  if (channel === null) {
    throw new Error("Unable to find the Discord channel.");
  }

  const lobbyMessage = await channel.messages.fetch(game.lobbyMessageId);

  const payload = await createLobbyMessagePayload(
    game,
    gameService,
    sts2BridgeSessionService,
  );

  await lobbyMessage.edit(payload);
}
