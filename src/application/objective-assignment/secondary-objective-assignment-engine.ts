import type {
  GameAct,
} from "../../domain/games/game-act.js";

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

import {
  seededShuffle,
} from "../role-assignment/seeded-random.js";

export interface AssignSecondaryObjectivesInput {
  readonly seed: string;

  readonly players:
    readonly GamePlayer[];

  readonly objectives:
    readonly Objective[];

  readonly actNumber:
    GameAct;

  readonly trackingMode:
    GameTrackingMode;
}

export function assignSecondaryObjectives(
  input:
    AssignSecondaryObjectivesInput,
): readonly ObjectiveAssignment[] {
  const playerCount =
    input.players.length;

  const players =
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

  const eligibleObjectives =
    input.objectives
      .filter(
        objective =>
          objective.allowedTypes
            .includes(
              "SECONDARY",
            )
          && isObjectiveAvailableForPlayerCount(
            objective,
            playerCount,
          )
          && objective
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
    eligibleObjectives.length
    === 0
  ) {
    throw new Error(
      `No secondary objective is available for act ${input.actNumber}.`,
    );
  }

  const shuffledPlayers =
    seededShuffle(
      players,
      `${input.seed}:secondary:act:${input.actNumber}:players`,
    );

  const shuffledObjectives =
    seededShuffle(
      eligibleObjectives,
      `${input.seed}:secondary:act:${input.actNumber}:objectives`,
    );

  const assignments =
    shuffledPlayers.map(
      (
        player,
        index,
      ) => {
        /*
         * Tant que le catalogue est petit,
         * on autorise les doublons.
         *
         * S'il y a assez d'objectifs,
         * chaque joueur reçoit naturellement
         * un objectif différent.
         */
        const objective =
          shuffledObjectives[
            index
            % shuffledObjectives.length
          ];

        if (
          objective === undefined
        ) {
          throw new Error(
            "Unable to assign a secondary objective.",
          );
        }

        return createObjectiveAssignment(
          player.id,
          objective,
          "SECONDARY",
          input.actNumber,
        );
      },
    );

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