import type {
  Character,
} from "../../domain/characters/character.js";

import {
  Game,
} from "../../domain/games/game.js";

import type {
  GamePlayer,
} from "../../domain/games/game-player.js";

import type {
  GameState,
} from "../../domain/games/game-state.js";

import type {
  ContradictionBudget,
} from "../../domain/objectives/contradiction-budget.js";

import type {
  ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";

import type {
  ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import type {
  Objective,
} from "../../domain/objectives/objective.js";

import type {
  RoleAssignment,
} from "../../domain/roles/role-assignment.js";

import type {
  Role,
} from "../../domain/roles/role.js";

import {
  generateObjectiveComposition,
} from "../objective-assignment/objective-composition-engine.js";

import {
  assignRoles,
} from "../role-assignment/role-assignment-engine.js";

export interface GameServiceContent {
  readonly characters:
  readonly Character[];

  readonly roles:
  readonly Role[];

  readonly objectives:
  readonly Objective[];

  readonly compatibilityRules:
  readonly ObjectiveCompatibilityRule[];

  readonly contradictionBudget:
  ContradictionBudget;
}

export interface CreateGameInput {
  readonly gameId: string;
  readonly guildId: string;
  readonly textChannelId: string;

  readonly voiceChannelId?:
  string;

  readonly hostDiscordUserId:
  string;

  readonly seed: string;
}

export interface JoinGameInput {
  readonly gameId: string;

  readonly playerId: string;

  readonly discordUserId:
  string;

  readonly characterSlug:
  string;
}

export interface GameSnapshot {
  readonly id: string;

  readonly guildId: string;
  readonly textChannelId: string;

  readonly voiceChannelId:
  string | undefined;

  readonly lobbyMessageId:
  string | undefined;

  readonly hostDiscordUserId:
  string;

  readonly seed: string;

  readonly state: GameState;

  readonly players:
  readonly GamePlayer[];

  readonly contradiction:
  number | undefined;
}

export interface PlayerObjectiveSecret {
  readonly assignment:
  ObjectiveAssignment;

  readonly objective:
  Objective;
}

export interface PlayerSecrets {
  readonly playerId: string;

  readonly roleAssignment:
  RoleAssignment;

  readonly role:
  Role;

  readonly objectives:
  readonly PlayerObjectiveSecret[];
}

export interface PlayerReveal {
  readonly player:
  GamePlayer;

  readonly secrets:
  PlayerSecrets;
}

interface ManagedGame {
  readonly id: string;

  readonly guildId: string;
  readonly textChannelId: string;

  readonly voiceChannelId:
  string | undefined;

  readonly hostDiscordUserId:
  string;

  readonly seed: string;

  readonly game: Game;

  contradiction:
  number | undefined;

  lobbyMessageId:
  string | undefined;
}

export class GameService {
  private readonly games =
    new Map<
      string,
      ManagedGame
    >();

  public constructor(
    private readonly content:
      GameServiceContent,
  ) { }

  public createGame(
    input: CreateGameInput,
  ): GameSnapshot {
    if (
      this.games.has(
        input.gameId,
      )
    ) {
      throw new Error(
        `Game already exists: ${input.gameId}`,
      );
    }

    if (
      input.seed.trim()
        .length === 0
    ) {
      throw new Error(
        "Game seed cannot be empty.",
      );
    }

    const existingGame =
      this.findOpenManagedGameByChannel(
        input.guildId,
        input.textChannelId,
      );

    if (
      existingGame !== undefined
    ) {
      throw new Error(
        "A game is already open in this channel.",
      );
    }

    const managedGame:
      ManagedGame = {
      id:
        input.gameId,

      guildId:
        input.guildId,

      textChannelId:
        input.textChannelId,

      voiceChannelId:
        input.voiceChannelId,

      hostDiscordUserId:
        input.hostDiscordUserId,

      seed:
        input.seed,

      game:
        new Game(),

      contradiction:
        undefined,

      lobbyMessageId:
        undefined,
    };

    this.games.set(
      input.gameId,
      managedGame,
    );

    return this.createSnapshot(
      managedGame,
    );
  }

  public joinGame(
    input: JoinGameInput,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        input.gameId,
      );

    this.assertCharacterExists(
      input.characterSlug,
    );

    managedGame.game.addPlayer({
      id:
        input.playerId,

      discordUserId:
        input.discordUserId,

      characterSlug:
        input.characterSlug,

      alive:
        true,
    });

    return this.createSnapshot(
      managedGame,
    );
  }

  public leaveGame(
    gameId: string,
    discordUserId: string,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    const player =
      this.findPlayerByDiscordUserId(
        managedGame,
        discordUserId,
      );

    managedGame.game.removePlayer(
      player.id,
    );

    return this.createSnapshot(
      managedGame,
    );
  }

  public getCharacters():
    readonly Character[] {
    return this.content.characters.map(
      character => ({
        ...character,
      }),
    );
  }

  public getCharacter(
    characterSlug: string,
  ): Character | undefined {
    const character =
      this.content.characters.find(
        candidate =>
          candidate.slug
          === characterSlug,
      );

    if (
      character === undefined
    ) {
      return undefined;
    }

    return {
      ...character,
    };
  }

  public changeCharacter(
    gameId: string,
    discordUserId: string,
    characterSlug: string,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    this.assertCharacterExists(
      characterSlug,
    );

    const player =
      this.findPlayerByDiscordUserId(
        managedGame,
        discordUserId,
      );

    managedGame.game.changeCharacter(
      player.id,
      characterSlug,
    );

    return this.createSnapshot(
      managedGame,
    );
  }

  public prepareGame(
    gameId: string,
    requestedByDiscordUserId: string,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    this.assertHost(
      managedGame,
      requestedByDiscordUserId,
    );

    if (
      managedGame.game.state
      !== "LOBBY"
    ) {
      throw new Error(
        "Only a lobby game can be prepared.",
      );
    }

    const players =
      managedGame.game
        .getPlayers();

    if (
      players.length < 2
    ) {
      throw new Error(
        "At least two players are required.",
      );
    }

    /*
     * Génération AVANT lockRoster().
     *
     * Si le contenu est invalide ou si aucune
     * composition n'existe, la partie reste
     * en LOBBY et les joueurs peuvent encore
     * corriger la situation.
     */
    const roleAssignments =
      assignRoles({
        seed:
          `${managedGame.seed}:roles`,

        players,

        roles:
          this.content.roles,
      });

    const objectiveComposition =
      generateObjectiveComposition({
        seed:
          `${managedGame.seed}:objectives`,

        players,

        objectives:
          this.content.objectives,

        compatibilityRules:
          this.content
            .compatibilityRules,

        contradictionBudget:
          this.content
            .contradictionBudget,
      });

    managedGame.game.lockRoster();

    managedGame.game
      .setSecretAssignments(
        roleAssignments,
        objectiveComposition
          .assignments,
      );

    managedGame.contradiction =
      objectiveComposition
        .contradiction;

    return this.createSnapshot(
      managedGame,
    );
  }

  public startGame(
    gameId: string,
    requestedByDiscordUserId: string,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    this.assertHost(
      managedGame,
      requestedByDiscordUserId,
    );

    managedGame.game.start();

    return this.createSnapshot(
      managedGame,
    );
  }

  public finishGame(
    gameId: string,
    requestedByDiscordUserId: string,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    this.assertHost(
      managedGame,
      requestedByDiscordUserId,
    );

    managedGame.game.finish();

    return this.createSnapshot(
      managedGame,
    );
  }

  public cancelGame(
    gameId: string,
    requestedByDiscordUserId: string,
  ): GameSnapshot {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    this.assertHost(
      managedGame,
      requestedByDiscordUserId,
    );

    managedGame.game.cancel();

    return this.createSnapshot(
      managedGame,
    );
  }

  public getGameSnapshot(
    gameId: string,
  ): GameSnapshot {
    return this.createSnapshot(
      this.getManagedGame(
        gameId,
      ),
    );
  }

  public getMySecrets(
    gameId: string,
    discordUserId: string,
  ): PlayerSecrets {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    if (
      managedGame.game.state
      !== "ACTIVE"
    ) {
      throw new Error(
        "Secrets are only available during an active game.",
      );
    }

    const player =
      this.findPlayerByDiscordUserId(
        managedGame,
        discordUserId,
      );

    return this.createPlayerSecrets(
      managedGame,
      player,
    );
  }

  private getManagedGame(
    gameId: string,
  ): ManagedGame {
    const managedGame =
      this.games.get(
        gameId,
      );

    if (
      managedGame === undefined
    ) {
      throw new Error(
        `Unknown game: ${gameId}`,
      );
    }

    return managedGame;
  }

  private findPlayerByDiscordUserId(
    managedGame: ManagedGame,
    discordUserId: string,
  ): GamePlayer {
    const player =
      managedGame.game
        .getPlayers()
        .find(
          candidate =>
            candidate
              .discordUserId
            === discordUserId,
        );

    if (
      player === undefined
    ) {
      throw new Error(
        "Discord user is not part of this game.",
      );
    }

    return player;
  }

  private assertCharacterExists(
    characterSlug: string,
  ): void {
    const exists =
      this.content
        .characters
        .some(
          character =>
            character.slug
            === characterSlug,
        );

    if (!exists) {
      throw new Error(
        `Unknown character: ${characterSlug}`,
      );
    }
  }

  private assertHost(
    managedGame: ManagedGame,
    discordUserId: string,
  ): void {
    if (
      managedGame
        .hostDiscordUserId
      !== discordUserId
    ) {
      throw new Error(
        "Only the game host can perform this action.",
      );
    }
  }

  private createSnapshot(
    managedGame: ManagedGame,
  ): GameSnapshot {
    return {
      id:
        managedGame.id,

      guildId:
        managedGame.guildId,

      textChannelId:
        managedGame.textChannelId,

      voiceChannelId:
        managedGame.voiceChannelId,

      lobbyMessageId:
        managedGame.lobbyMessageId,

      hostDiscordUserId:
        managedGame.hostDiscordUserId,

      seed:
        managedGame.seed,

      state:
        managedGame.game.state,

      players:
        managedGame.game
          .getPlayers()
          .map(
            player => ({
              ...player,
            }),
          ),

      contradiction:
        managedGame.contradiction,
    };
  }

  private findOpenManagedGameByChannel(
    guildId: string,
    textChannelId: string,
  ): ManagedGame | undefined {
    return [
      ...this.games.values(),
    ].find(
      managedGame =>
        managedGame.guildId
        === guildId
        && managedGame.textChannelId
        === textChannelId
        && managedGame.game.state
        !== "FINISHED"
        && managedGame.game.state
        !== "CANCELLED",
    );
  }

  public getCurrentGameByChannel(
    guildId: string,
    textChannelId: string,
  ): GameSnapshot {
    const managedGame =
      this.findOpenManagedGameByChannel(
        guildId,
        textChannelId,
      );

    if (
      managedGame === undefined
    ) {
      throw new Error(
        "No active game exists in this channel.",
      );
    }

    return this.createSnapshot(
      managedGame,
    );
  }

  public registerLobbyMessage(
    gameId: string,
    messageId: string,
  ): GameSnapshot {
    if (
      messageId.trim().length === 0
    ) {
      throw new Error(
        "Lobby message id cannot be empty.",
      );
    }

    const managedGame =
      this.getManagedGame(
        gameId,
      );

    managedGame.lobbyMessageId =
      messageId;

    return this.createSnapshot(
      managedGame,
    );
  }

  private createPlayerSecrets(
    managedGame: ManagedGame,
    player: GamePlayer,
  ): PlayerSecrets {
    const roleAssignment =
      managedGame.game
        .getRoleAssignmentForPlayer(
          player.id,
        );

    if (
      roleAssignment === undefined
    ) {
      throw new Error(
        `No role assignment found for player ${player.id}.`,
      );
    }

    const role =
      this.content.roles.find(
        definition =>
          definition.code
          === roleAssignment.roleCode,
      );

    if (
      role === undefined
    ) {
      throw new Error(
        `Unknown role definition: ${roleAssignment.roleCode}`,
      );
    }

    const objectiveAssignments =
      managedGame.game
        .getObjectiveAssignmentsForPlayer(
          player.id,
        );

    const objectives =
      objectiveAssignments.map(
        assignment => {
          const objective =
            this.content
              .objectives
              .find(
                definition =>
                  definition.code
                  === assignment.objectiveCode,
              );

          if (
            objective === undefined
          ) {
            throw new Error(
              `Unknown objective definition: ${assignment.objectiveCode}`,
            );
          }

          return {
            assignment,
            objective,
          };
        },
      );

    return {
      playerId:
        player.id,

      roleAssignment: {
        ...roleAssignment,
      },

      role,

      objectives,
    };
  }

  public getGameReveal(
    gameId: string,
  ): readonly PlayerReveal[] {
    const managedGame =
      this.getManagedGame(
        gameId,
      );

    if (
      managedGame.game.state
      !== "FINISHED"
    ) {
      throw new Error(
        "Game reveal is only available after the game has finished.",
      );
    }

    return managedGame.game
      .getPlayers()
      .map(
        player => ({
          player: {
            ...player,
          },

          secrets:
            this.createPlayerSecrets(
              managedGame,
              player,
            ),
        }),
      );
  }
}