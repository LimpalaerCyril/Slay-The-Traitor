import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";

import type {
  GameService,
} from "../application/game-service/game-service.js";

import {
  handleSpireCommand,
} from "./commands/handle-spire-command.js";

import {
  handleLobbyButton,
} from "./components/handle-lobby-button.js";

import {
  handleSecretButton,
} from "./components/handle-secret-button.js";

import {
  handleCharacterSelect,
} from "./components/handle-character-select.js";

export interface DiscordClientDependencies {
  readonly gameService:
  GameService;
}

export function createDiscordClient(
  dependencies:
    DiscordClientDependencies,
): Client {
  const client =
    new Client({
      intents: [
        GatewayIntentBits.Guilds,
      ],
    });

  client.once(
    Events.ClientReady,
    readyClient => {
      console.log(
        `Discord connecté : ${readyClient.user.tag}`,
      );
    },
  );

  client.on(
    Events.InteractionCreate,
    async interaction => {
      try {
        if (
          interaction.isChatInputCommand()
        ) {
          if (
            interaction.commandName
            !== "spire"
          ) {
            return;
          }

          await handleSpireCommand(
            interaction,
            dependencies.gameService,
          );

          return;
        }

        if (
          interaction.isButton()
        ) {
          const lobbyHandled =
            await handleLobbyButton(
              interaction,
              dependencies.gameService,
            );

          if (lobbyHandled) {
            return;
          }

          const secretHandled =
            await handleSecretButton(
              interaction,
              dependencies.gameService,
            );

          if (secretHandled) {
            return;
          }

          console.warn(
            `Bouton Discord inconnu : ${interaction.customId}`,
          );

          return;
        }

        if (
          interaction.isStringSelectMenu()
        ) {
          await handleCharacterSelect(
            interaction,
            dependencies.gameService,
          );

          return;
        }
      } catch (error) {
        console.error(
          "Erreur Discord :",
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue.";

        if (
          !interaction.isRepliable()
        ) {
          return;
        }

        if (
          interaction.deferred
          && !interaction.replied
        ) {
          await interaction.editReply({
            content:
              `❌ ${message}`,
          });

          return;
        }

        if (
          interaction.replied
        ) {
          await interaction.followUp({
            content:
              `❌ ${message}`,

            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        await interaction.reply({
          content:
            `❌ ${message}`,

          flags:
            MessageFlags.Ephemeral,
        });

        await interaction.reply({
          content:
            `❌ ${message}`,

          flags:
            MessageFlags.Ephemeral,
        });
      }
    },
  );

  return client;
}