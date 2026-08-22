import type {
  GameService,
  GameSnapshot,
} from "../../application/game-service/game-service.js";

import type { Sts2BridgeSessionService } from "../../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { createGameControls } from "../components/lobby-buttons.js";

import { createLobbyContent } from "./lobby-presenter.js";

export async function createLobbyMessagePayload(
  game: GameSnapshot,

  gameService: GameService,

  sts2BridgeSessionService: Sts2BridgeSessionService,
) {
  const bridgeStatus = await sts2BridgeSessionService.getLobbyStatus(game.id);

  return {
    content: createLobbyContent(game, gameService, bridgeStatus),

    components: createGameControls(game),
  };
}
