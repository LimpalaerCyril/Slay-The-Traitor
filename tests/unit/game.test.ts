import { describe, expect, it } from "vitest";

import { Game } from "../../src/domain/games/game.js";

import type { GamePlayer } from "../../src/domain/games/game-player.js";

import type { ObjectiveAssignment } from "../../src/domain/objectives/objective-assignments.js";

import type { RoleAssignment } from "../../src/domain/roles/role-assignment.js";

function createPlayer(
  id: string,
  characterSlug = "test-character",
): GamePlayer {
  return {
    id,

    discordUserId: `discord-${id}`,

    characterSlug,

    alive: true,
  };
}

function createRoleAssignments(playerIds: readonly string[]): RoleAssignment[] {
  return playerIds.map((playerId) => ({
    playerId,
    roleCode: `role-${playerId}`,
  }));
}

function createObjectiveAssignments(
  playerIds: readonly string[],
): ObjectiveAssignment[] {
  return playerIds.flatMap((playerId) => [
    {
      playerId,

      objectiveCode: `primary-${playerId}`,

      objectiveType: "PRIMARY" as const,

      progress: {
        current: 0,
        target: 1,
      },

      status: "PENDING" as const,
    },

    {
      playerId,

      objectiveCode: `secondary-${playerId}`,

      objectiveType: "SECONDARY" as const,

      progress: {
        current: 0,
        target: 1,
      },

      status: "PENDING" as const,
    },
  ]);
}

function createReadyGame(): Game {
  const game = new Game();

  game.addPlayer(createPlayer("alice"));

  game.addPlayer(createPlayer("bob"));

  game.lockRoster();

  return game;
}

function prepareSecrets(game: Game): void {
  game.setSecretAssignments(
    createRoleAssignments(["alice", "bob"]),

    createObjectiveAssignments(["alice", "bob"]),
  );
}

describe("Game", () => {
  it("starts in LOBBY state", () => {
    const game = new Game();

    expect(game.state).toBe("LOBBY");
  });

  it("allows a player to join during the lobby", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice"));

    expect(game.getPlayers()).toHaveLength(1);
  });

  it("rejects the same Discord user twice", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice"));

    expect(() => {
      game.addPlayer({
        ...createPlayer("bob"),

        discordUserId: "discord-alice",
      });
    }).toThrow("Player already joined this game.");
  });

  it("rejects duplicate player ids", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice"));

    expect(() => {
      game.addPlayer({
        ...createPlayer("alice"),

        discordUserId: "another-discord-user",
      });
    }).toThrow("Player id already exists in this game.");
  });

  it("does not allow more than four players", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice"));

    game.addPlayer(createPlayer("bob"));

    game.addPlayer(createPlayer("charlie"));

    game.addPlayer(createPlayer("diana"));

    expect(() => {
      game.addPlayer(createPlayer("eve"));
    }).toThrow("A game cannot have more than four players.");
  });

  it("allows a player to leave during the lobby", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice"));

    game.addPlayer(createPlayer("bob"));

    game.removePlayer("bob");

    expect(game.getPlayers()).toHaveLength(1);
  });

  it("rejects leaving after the roster is locked", () => {
    const game = createReadyGame();

    expect(() => {
      game.removePlayer("bob");
    }).toThrow("Players can only leave during the lobby.");
  });

  it("allows changing character during the lobby", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice", "character-a"));

    game.changeCharacter("alice", "character-b");

    expect(game.getPlayers()[0]?.characterSlug).toBe("character-b");
  });

  it("rejects changing character after the roster is locked", () => {
    const game = createReadyGame();

    expect(() => {
      game.changeCharacter("alice", "other-character");
    }).toThrow("Character can only be changed during the lobby.");
  });

  it("cannot lock the roster with fewer than two players", () => {
    const game = new Game();

    game.addPlayer(createPlayer("alice"));

    expect(() => {
      game.lockRoster();
    }).toThrow("At least two players are required.");
  });

  it("becomes READY when the roster is locked", () => {
    const game = createReadyGame();

    expect(game.state).toBe("READY");
  });

  it("does not allow players to join once ready", () => {
    const game = createReadyGame();

    expect(() => {
      game.addPlayer(createPlayer("charlie"));
    }).toThrow("Players can only join during the lobby.");
  });

  it("cannot start directly from the lobby", () => {
    const game = new Game();

    expect(() => {
      game.start();
    }).toThrow("Game can only start when ready.");
  });

  it("cannot start before secret assignments are prepared", () => {
    const game = createReadyGame();

    expect(() => {
      game.start();
    }).toThrow("Secret assignments must be prepared before starting the game.");
  });

  it("rejects missing role assignments", () => {
    const game = createReadyGame();

    expect(() => {
      game.setSecretAssignments(
        createRoleAssignments(["alice"]),

        createObjectiveAssignments(["alice", "bob"]),
      );
    }).toThrow("Every player must receive exactly one role.");
  });

  it("rejects duplicated role assignments", () => {
    const game = createReadyGame();

    expect(() => {
      game.setSecretAssignments(
        [
          {
            playerId: "alice",
            roleCode: "guardian",
          },

          {
            playerId: "bob",
            roleCode: "guardian",
          },
        ],

        createObjectiveAssignments(["alice", "bob"]),
      );
    }).toThrow("Role guardian was assigned more than once.");
  });

  it("rejects missing objective assignments", () => {
    const game = createReadyGame();

    expect(() => {
      game.setSecretAssignments(
        createRoleAssignments(["alice", "bob"]),

        createObjectiveAssignments(["alice"]),
      );
    }).toThrow("Player bob must have exactly one primary objective.");
  });

  it("accepts valid secret assignments", () => {
    const game = createReadyGame();

    prepareSecrets(game);

    expect(game.secretAssignmentsPrepared).toBe(true);
  });

  it("becomes ACTIVE after valid secrets are prepared", () => {
    const game = createReadyGame();

    prepareSecrets(game);

    game.start();

    expect(game.state).toBe("ACTIVE");
  });

  it("can retrieve one player's secret assignments", () => {
    const game = createReadyGame();

    prepareSecrets(game);

    expect(game.getRoleAssignmentForPlayer("alice")).toEqual({
      playerId: "alice",
      roleCode: "role-alice",
    });

    expect(game.getObjectiveAssignmentsForPlayer("alice")).toHaveLength(2);
  });

  it("can finish an active game", () => {
    const game = createReadyGame();

    prepareSecrets(game);

    game.start();
    game.finish();

    expect(game.state).toBe("FINISHED");
  });

  it("can cancel a lobby game", () => {
    const game = new Game();

    game.cancel();

    expect(game.state).toBe("CANCELLED");
  });
});
