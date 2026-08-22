import type { GamePlayer } from "../../domain/games/game-player.js";

import type { RoleAssignment } from "../../domain/roles/role-assignment.js";

import { isRoleAvailableForPlayerCount, type Role } from "../../domain/roles/role.js";

import { seededShuffle } from "./seeded-random.js";

import { GameTrackingMode } from "../../domain/games/game-tracking-mode.js";

export interface AssignRolesInput {
  readonly seed: string;

  readonly players:
  readonly GamePlayer[];

  readonly roles:
  readonly Role[];

  readonly trackingMode: GameTrackingMode;
}

export function assignRoles(
  input: AssignRolesInput,
): readonly RoleAssignment[] {
  validatePlayers(
    input.players,
  );

  validateRoles(
    input.roles,
  );

  const playerCount =
    input.players.length;

  if (
    playerCount < 2
    || playerCount > 4
  ) {
    throw new Error(
      "Role assignment requires between two and four players.",
    );
  }

  /*
   * Étape 1 :
   * on trie d'abord les joueurs.
   *
   * Leur ordre d'arrivée dans le lobby
   * ne peut donc plus influencer le tirage.
   */
  const canonicalPlayers =
    [...input.players]
      .sort(
        (
          left,
          right,
        ) =>
          left.id.localeCompare(
            right.id,
          ),
      );

  /*
   * Étape 2 :
   * on filtre les rôles compatibles
   * avec le nombre de joueurs.
   */
  const eligibleRoles =
    input.roles
      .filter(
        role =>
          isRoleAvailableForPlayerCount(
            role,
            playerCount,
          )
          && role
            .supportedTrackingModes
            .includes(
              input.trackingMode,
            ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.code.localeCompare(
            right.code,
          ),
      );

  if (
    eligibleRoles.length
    < playerCount
  ) {
    throw new Error(
      `Not enough roles are available for ${playerCount} players.`,
    );
  }

  /*
   * Les joueurs et les rôles utilisent
   * deux flux pseudo-aléatoires distincts.
   *
   * Ainsi, ils ne sont pas simplement
   * mélangés de la même manière.
   */
  const shuffledPlayers =
    seededShuffle(
      canonicalPlayers,
      `${input.seed}:players`,
    );

  const shuffledRoles =
    seededShuffle(
      eligibleRoles,
      `${input.seed}:roles`,
    );

  const assignments:
    RoleAssignment[] = [];

  for (
    let index = 0;
    index < shuffledPlayers.length;
    index += 1
  ) {
    const player =
      shuffledPlayers[index];

    const role =
      shuffledRoles[index];

    if (
      player === undefined
      || role === undefined
    ) {
      throw new Error(
        "Unable to create role assignment.",
      );
    }

    const requiresSetup =
      role.variants !== undefined
      && role.variants.length > 0;

    assignments.push({
      playerId:
        player.id,

      roleCode:
        role.code,

      targetPlayerIds: [],

      setupCompleted:
        !requiresSetup,
    });
  }

  /*
   * On remet uniquement la SORTIE dans
   * un ordre canonique.
   *
   * Cela ne change pas le tirage :
   * cela rend simplement le résultat
   * plus stable pour les tests, logs
   * et la persistence.
   */
  return assignments.sort(
    (
      left,
      right,
    ) =>
      left.playerId.localeCompare(
        right.playerId,
      ),
  );
}

function validatePlayers(
  players:
    readonly GamePlayer[],
): void {
  const playerIds =
    new Set<string>();

  for (
    const player
    of players
  ) {
    if (
      playerIds.has(
        player.id,
      )
    ) {
      throw new Error(
        `Duplicate player id: ${player.id}`,
      );
    }

    playerIds.add(
      player.id,
    );
  }
}

function validateRoles(
  roles:
    readonly Role[],
): void {
  const roleCodes =
    new Set<string>();

  for (
    const role
    of roles
  ) {
    if (
      roleCodes.has(
        role.code,
      )
    ) {
      throw new Error(
        `Duplicate role code: ${role.code}`,
      );
    }

    roleCodes.add(
      role.code,
    );
  }
}