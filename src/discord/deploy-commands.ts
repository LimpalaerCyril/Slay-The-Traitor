import {
  loadEnvFile,
} from "node:process";

import {
  REST,
  Routes,
} from "discord.js";

import {
  loadConfig,
} from "../app/config.js";

import {
  spireCommand,
} from "./commands/spire-command.js";

loadEnvFile();

const config =
  loadConfig();

const rest =
  new REST({
    version: "10",
  }).setToken(
    config.DISCORD_TOKEN,
  );

const commands = [
  spireCommand.toJSON(),
];

console.log(
  "Enregistrement des commandes Discord...",
);

console.log(
  "Commandes envoyées à Discord :",
);

console.dir(
  commands,
  {
    depth: null,
  },
);

const result =
  await rest.put(
    Routes.applicationGuildCommands(
      config.DISCORD_CLIENT_ID,
      config.DISCORD_GUILD_ID,
    ),
    {
      body: commands,
    },
  );

console.log(
  "Réponse Discord :",
);

console.dir(
  result,
  {
    depth: null,
  },
);

console.log(
  "Commandes Discord enregistrées.",
);