import {
  SlashCommandBuilder,
} from "discord.js";

export const spireCommand =
  new SlashCommandBuilder()
    .setName("spire")
    .setDescription(
      "Commandes de Slay the Traitor",
    )

    .addSubcommand(
      subcommand =>
        subcommand
          .setName("create")
          .setDescription(
            "Créer une nouvelle partie",
          ),
    )

    .addSubcommand(
      subcommand =>
        subcommand
          .setName("moi")
          .setDescription(
            "Consulter votre rôle et vos objectifs",
          ),
    )

    .addSubcommand(
      subcommand =>
        subcommand
          .setName("cancel")
          .setDescription(
            "Annuler la partie en cours",
          ),
    )

    .addSubcommand(
      subcommand =>
        subcommand
          .setName("finish")
          .setDescription(
            "Terminer la partie et révéler les rôles",
          ),
    );