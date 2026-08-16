import type {
  GamePlayer,
} from "../../domain/games/game-player.js";

import type {
  GameTrackingMode,
} from "../../domain/games/game-tracking-mode.js";

import {
  createObjectiveAssignment,
  type ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";

import {
  isObjectiveAvailableForPlayerCount,
  type Objective,
} from "../../domain/objectives/objective.js";

import type {
  RoleAssignment,
} from "../../domain/roles/role-assignment.js";

import type {
  Role,
} from "../../domain/roles/role.js";

export interface AssignPrimaryObjectivesInput {
  readonly players:
  readonly GamePlayer[];

  readonly roleAssignments:
  readonly RoleAssignment[];

  readonly roles:
  readonly Role[];

  readonly objectives:
  readonly Objective[];

  readonly trackingMode:
  GameTrackingMode;
}

export function assignPrimaryObjectives(
  input:
    AssignPrimaryObjectivesInput,
): readonly ObjectiveAssignment[] {
  const playerCount =
    input.players.length;

  const playerIds =
    new Set(
      input.players.map(
        player =>
          player.id,
      ),
    );

  return input.roleAssignments.map(
    roleAssignment => {
      if (
        !playerIds.has(
          roleAssignment.playerId,
        )
      ) {
        throw new Error(
          `Role assignment references unknown player: ${roleAssignment.playerId}`,
        );
      }

      const role =
        input.roles.find(
          candidate =>
            candidate.code
            === roleAssignment.roleCode,
        );

      if (
        role === undefined
      ) {
        throw new Error(
          `Unknown role definition: ${roleAssignment.roleCode}`,
        );
      }

      let primaryObjectiveCode:
        string;

      if (
        role.variants !== undefined
        && role.variants.length > 0
      ) {
        if (
          roleAssignment.variantCode
          === undefined
        ) {
          throw new Error(
            `Role ${role.code} requires a variant before its primary objective can be assigned.`,
          );
        }

        const variant =
          role.variants.find(
            candidate =>
              candidate.code
              === roleAssignment.variantCode,
          );

        if (
          variant === undefined
        ) {
          throw new Error(
            `Unknown variant ${roleAssignment.variantCode} for role ${role.code}.`,
          );
        }

        primaryObjectiveCode =
          variant.primaryObjectiveCode;
      } else {
        if (
          role.primaryObjectiveCode
          === undefined
        ) {
          throw new Error(
            `Role ${role.code} has no primary objective.`,
          );
        }

        primaryObjectiveCode =
          role.primaryObjectiveCode;
      }

      const objective =
        input.objectives.find(
          candidate =>
            candidate.code
            === primaryObjectiveCode,
        );

      if (
        objective === undefined
      ) {
        throw new Error(
          `Role ${role.code} references unknown primary objective: ${primaryObjectiveCode}`,
        );
      }

      if (
        !objective.allowedTypes
          .includes(
            "PRIMARY",
          )
      ) {
        throw new Error(
          `Objective ${objective.code} cannot be used as a primary objective.`,
        );
      }

      if (
        !isObjectiveAvailableForPlayerCount(
          objective,
          playerCount,
        )
      ) {
        throw new Error(
          `Primary objective ${objective.code} is not available for ${playerCount} players.`,
        );
      }

      if (
        !objective
          .supportedTrackingModes
          .includes(
            input.trackingMode,
          )
      ) {
        throw new Error(
          `Primary objective ${objective.code} does not support tracking mode ${input.trackingMode}.`,
        );
      }

      return createObjectiveAssignment(
        roleAssignment.playerId,
        objective,
        "PRIMARY",
      );
    },
  );
}