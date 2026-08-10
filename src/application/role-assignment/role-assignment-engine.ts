import type { GamePlayer } from "../../domain/games/game-player.js";

import {
  isRoleAvailableForPlayerCount,
  type Role,
} from "../../domain/roles/role.js";

import type {
  RoleAssignment,
} from "../../domain/roles/role-assignment.js";

import {
  shuffleWithSeed,
} from "./seeded-random.js";

export interface AssignRolesInput {
  readonly seed: string;
  readonly players: readonly GamePlayer[];
  readonly roles: readonly Role[];
}

function compareStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function assertUniquePlayerIds(
  players: readonly GamePlayer[],
): void {
  const ids = new Set<string>();

  for (const player of players) {
    if (ids.has(player.id)) {
      throw new Error(
        `Duplicate player id: ${player.id}`,
      );
    }

    ids.add(player.id);
  }
}

function assertUniqueRoleCodes(
  roles: readonly Role[],
): void {
  const codes = new Set<string>();

  for (const role of roles) {
    if (codes.has(role.code)) {
      throw new Error(
        `Duplicate role code: ${role.code}`,
      );
    }

    codes.add(role.code);
  }
}

export function assignRoles(
  input: AssignRolesInput,
): readonly RoleAssignment[] {
  const {
    seed,
    players,
    roles,
  } = input;

  if (players.length < 2 || players.length > 4) {
    throw new Error(
      "Role assignment requires between two and four players.",
    );
  }

  assertUniquePlayerIds(players);
  assertUniqueRoleCodes(roles);

  const playerCount = players.length;

  const eligibleRoles = roles
    .filter(role =>
      isRoleAvailableForPlayerCount(
        role,
        playerCount,
      ),
    )
    .sort((left, right) =>
      compareStrings(
        left.code,
        right.code,
      ),
    );

  if (eligibleRoles.length < playerCount) {
    throw new Error(
      "Not enough eligible roles for this game.",
    );
  }

  const orderedPlayers = [...players]
    .sort((left, right) =>
      compareStrings(
        left.id,
        right.id,
      ),
    );

  const shuffledRoles = shuffleWithSeed(
    eligibleRoles,
    seed,
  );

  return orderedPlayers.map(
    (player, index) => ({
      playerId: player.id,
      roleCode: shuffledRoles[index]!.code,
    }),
  );
}