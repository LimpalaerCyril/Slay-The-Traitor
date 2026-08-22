import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";

import type { GameService } from "../application/game-service/game-service.js";

import type { BridgeIdentityService } from "../application/bridge-identity/bridge-identity-service.js";

import type { Sts2BridgeSessionService } from "../application/sts2-bridge-session/sts2-bridge-session-service.js";

import { handleSpireCommand } from "./commands/handle-spire-command.js";

import { handleLobbyButton } from "./components/handle-lobby-button.js";

import { handleSecretButton } from "./components/handle-secret-button.js";

import { handleCharacterSelect } from "./components/handle-character-select.js";

import { handleRoleSetupButton } from "./components/handle-role-setup-button.js";

import { handleRoleSetupSelect } from "./components/handle-role-setup-select.js";

import { handlePowerSetupButton } from "./components/handle-power-setup-button.js";

import { handlePowerSetupSelect } from "./components/handle-power-setup-select.js";

import type { GameEventService } from "../application/game-event-service/game-event-service.js";

export interface DiscordClientDependencies {
  readonly gameService: GameService;

  readonly gameEventService: GameEventService;

  readonly bridgeIdentityService: BridgeIdentityService;

  readonly sts2BridgeSessionService: Sts2BridgeSessionService;
}

export function createDiscordClient(
  dependencies: DiscordClientDependencies,
): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.on(Events.Error, (error) => {
    console.error("Erreur du client Discord :", error);
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord connecté : ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName !== "spire") {
          return;
        }

        await handleSpireCommand(
          interaction,
          dependencies.gameService,
          dependencies.gameEventService,
          dependencies.bridgeIdentityService,
          dependencies.sts2BridgeSessionService,
        );

        return;
      }

      if (interaction.isButton()) {
        const lobbyHandled = await handleLobbyButton(
          interaction,
          dependencies.gameService,
          dependencies.sts2BridgeSessionService,
        );

        if (lobbyHandled) {
          return;
        }

        const roleSetupHandled = await handleRoleSetupButton(
          interaction,
          dependencies.gameService,
          dependencies.sts2BridgeSessionService,
        );

        if (roleSetupHandled) {
          return;
        }

        const powerSetupHandled = await handlePowerSetupButton(
          interaction,
          dependencies.gameService,
        );

        if (powerSetupHandled) {
          return;
        }

        const secretHandled = await handleSecretButton(
          interaction,
          dependencies.gameService,
        );

        if (secretHandled) {
          return;
        }

        console.warn(`Bouton Discord inconnu : ${interaction.customId}`);

        return;
      }

      if (interaction.isStringSelectMenu()) {
        const roleSetupHandled = await handleRoleSetupSelect(
          interaction,
          dependencies.gameService,
          dependencies.sts2BridgeSessionService,
        );

        if (roleSetupHandled) {
          return;
        }

        const powerSetupHandled = await handlePowerSetupSelect(
          interaction,
          dependencies.gameService,
          dependencies.sts2BridgeSessionService,
        );

        if (powerSetupHandled) {
          return;
        }

        await handleCharacterSelect(
          interaction,
          dependencies.gameService,
          dependencies.sts2BridgeSessionService,
        );

        return;
      }
    } catch (error) {
      console.error("Erreur Discord :", error);

      if (!interaction.isRepliable()) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: `❌ ${message}`,

            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        await interaction.reply({
          content: `❌ ${message}`,

          flags: MessageFlags.Ephemeral,
        });
      } catch (responseError) {
        console.error(
          "Impossible d'envoyer la réponse d'erreur Discord :",
          responseError,
        );
      }
    }
  });

  return client;
}
