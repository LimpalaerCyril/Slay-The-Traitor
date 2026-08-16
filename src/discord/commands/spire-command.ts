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
          .setName(
            "create",
          )
          .setDescription(
            "Créer une partie.",
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "mode",
                )
                .setDescription(
                  "Comment suivre les événements de la partie.",
                )
                .setRequired(
                  true,
                )
                .addChoices(
                  {
                    name:
                      "Discord manuel",

                    value:
                      "MANUAL",
                  },

                  {
                    name:
                      "Intégration STS2",

                    value:
                      "STS2",
                  },
                ),
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
          .setName(
            "report",
          )
          .setDescription(
            "Déclarer manuellement un événement de l'expédition.",
          )

          .addStringOption(
            option =>
              option
                .setName(
                  "type",
                )
                .setDescription(
                  "Événement à déclarer.",
                )
                .setRequired(
                  true,
                )
                .addChoices(
                  {
                    name:
                      "🧪 Potion utilisée",

                    value:
                      "POTION_USED",
                  },

                  {
                    name:
                      "☠️ Malédiction obtenue",

                    value:
                      "CURSE_ADDED",
                  },

                  {
                    name:
                      "💰 Or actuel",

                    value:
                      "GOLD_CHANGED",
                  },

                  {
                    name:
                      "🏺 Relique obtenue",

                    value:
                      "RELIC_ACQUIRED",
                  },

                  {
                    name:
                      "🛡️ Bloc donné à un allié",

                    value:
                      "BLOCK_GRANTED_TO_ALLY",
                  },

                  {
                    name:
                      "⚔️ Ennemi tué",

                    value:
                      "ENEMY_KILLED",
                  },

                  {
                    name:
                      "💀 Joueur mort",

                    value:
                      "PLAYER_DIED",
                  },

                  {
                    name:
                      "👑 Boss vaincu",

                    value:
                      "BOSS_DEFEATED",
                  },

                  {
                    name:
                      "🚪 Acte terminé",

                    value:
                      "ACT_COMPLETED",
                  },
                ),
          )

          .addUserOption(
            option =>
              option
                .setName(
                  "joueur",
                )
                .setDescription(
                  "Joueur concerné : mort ou bénéficiaire du bloc.",
                ),
          )

          .addIntegerOption(
            option =>
              option
                .setName(
                  "valeur",
                )
                .setDescription(
                  "Valeur numérique : or actuel ou bloc accordé.",
                ),
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