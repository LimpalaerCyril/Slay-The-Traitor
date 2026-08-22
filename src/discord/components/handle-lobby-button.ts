import { MessageFlags, type ButtonInteraction } from "discord.js";

import type { GameService } from "../../application/game-service/game-service.js";

import type { Sts2BridgeSessionService } from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { createCharacterSelect } from "./character-select.js";

import { parseCustomId } from "./custom-ids.js";

import { createLobbyMessagePayload } from "../presenters/lobby-message-payload.js";

import { createSts2StartBlockedContent } from "../presenters/lobby-presenter.js";

export async function handleLobbyButton(
  interaction: ButtonInteraction,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,
): Promise<boolean> {
  const parsed = parseCustomId(interaction.customId);

  if (parsed === undefined || parsed.scope !== "lobby") {
    return false;
  }

  switch (parsed.action) {
    case "join":
      await handleJoin(interaction, gameService, parsed.gameId);

      return true;

    case "leave":
      await handleLeave(
        interaction,
        gameService,
        sts2BridgeSessionService,
        parsed.gameId,
      );

      return true;

    case "prepare":
      await handlePrepare(
        interaction,
        gameService,
        sts2BridgeSessionService,
        parsed.gameId,
      );

      return true;

    case "start":
      await handleStart(
        interaction,
        gameService,
        sts2BridgeSessionService,
        parsed.gameId,
      );

      return true;

    default:
      return false;
  }
}

async function handleJoin(
  interaction: ButtonInteraction,

  gameService: GameService,

  gameId: string,
): Promise<void> {
  const characters = gameService.getCharacters();

  await interaction.reply({
    content:
      "Choisissez le personnage avec lequel vous jouez à Slay the Spire 2 :",

    components: [
      createCharacterSelect(gameId, interaction.message.id, characters),
    ],

    flags: MessageFlags.Ephemeral,
  });
}

async function handleLeave(
  interaction: ButtonInteraction,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,

  gameId: string,
): Promise<void> {
  const game = await gameService.leaveGame(gameId, interaction.user.id);

  const payload = await createLobbyMessagePayload(
    game,
    gameService,
    sts2BridgeSessionService,
  );

  await interaction.update(payload);
}

async function handlePrepare(
  interaction: ButtonInteraction,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,

  gameId: string,
): Promise<void> {
  const game = await gameService.prepareGame(gameId, interaction.user.id);

  const payload = await createLobbyMessagePayload(
    game,
    gameService,
    sts2BridgeSessionService,
  );

  await interaction.update(payload);
}

async function handleStart(
  interaction: ButtonInteraction,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,

  gameId: string,
): Promise<void> {
  const currentGame = await gameService.getGameSnapshot(gameId);

  if (currentGame.trackingMode === "STS2") {
    const bridgeStatus = await sts2BridgeSessionService.getLobbyStatus(gameId);

    if (bridgeStatus === undefined) {
      throw new Error("Unable to determine the STS2 bridge status.");
    }

    if (!bridgeStatus.readyForStart) {
      await interaction.reply({
        content: createSts2StartBlockedContent(bridgeStatus),

        flags: MessageFlags.Ephemeral,
      });

      return;
    }
  }

  const game = await gameService.startGame(gameId, interaction.user.id);

  const payload = await createLobbyMessagePayload(
    game,
    gameService,
    sts2BridgeSessionService,
  );

  await interaction.update(payload);
}
