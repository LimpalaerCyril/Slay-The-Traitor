import type {
  GamePlayer,
} from "../../domain/games/game-player.js";

import type {
  ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import {
  createObjectiveAssignment,
  type ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";

import {
  isObjectiveAvailableForPlayerCount,
  type Objective,
} from "../../domain/objectives/objective.js";

import type {
  ObjectiveType,
} from "../../domain/objectives/objective-type.js";

import {
  canObjectivesBeAssignedToSamePlayer,
} from "../objective-compatibility/objective-compatibility-engine.js";

import {
  shuffleWithSeed,
} from "../role-assignment/seeded-random.js";

export interface AssignObjectivesInput {
  readonly seed: string;

  readonly players:
    readonly GamePlayer[];

  readonly objectives:
    readonly Objective[];

  readonly compatibilityRules?:
    readonly ObjectiveCompatibilityRule[];
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

function assertUniqueObjectiveCodes(
  objectives: readonly Objective[],
): void {
  const codes = new Set<string>();

  for (const objective of objectives) {
    if (
      codes.has(objective.code)
    ) {
      throw new Error(
        `Duplicate objective code: ${objective.code}`,
      );
    }

    codes.add(objective.code);
  }
}

function getCandidates(
  objectives: readonly Objective[],
  playerCount: number,
  type: ObjectiveType,
): Objective[] {
  return objectives
    .filter(
      objective =>
        isObjectiveAvailableForPlayerCount(
          objective,
          playerCount,
        )
        && objective.allowedTypes.includes(
          type,
        ),
    )
    .sort(
      (left, right) =>
        compareStrings(
          left.code,
          right.code,
        ),
    );
}

function chooseSecondary(
  candidates: readonly Objective[],
  index: number,
  primary: Objective,
  compatibilityRules:
    readonly ObjectiveCompatibilityRule[],
): Objective {
  for (
    let offset = 0;
    offset < candidates.length;
    offset += 1
  ) {
    const candidate =
      candidates[
        (index + offset)
        % candidates.length
      ]!;

    if (
      candidate.code
      === primary.code
    ) {
      continue;
    }

    const compatible =
      canObjectivesBeAssignedToSamePlayer(
        primary,
        candidate,
        compatibilityRules,
      );

    if (!compatible) {
      continue;
    }

    return candidate;
  }

  throw new Error(
    `No compatible secondary objective is available for primary objective ${primary.code}.`,
  );
}

export function assignObjectives(
  input: AssignObjectivesInput,
): readonly ObjectiveAssignment[] {
  const {
    seed,
    players,
    objectives,
    compatibilityRules = [],
  } = input;

  if (
    players.length < 2
    || players.length > 4
  ) {
    throw new Error(
      "Objective assignment requires between two and four players.",
    );
  }

  assertUniquePlayerIds(players);

  assertUniqueObjectiveCodes(
    objectives,
  );

  const playerCount =
    players.length;

  const orderedPlayers =
    [...players].sort(
      (left, right) =>
        compareStrings(
          left.id,
          right.id,
        ),
    );

  const primaryCandidates =
    getCandidates(
      objectives,
      playerCount,
      "PRIMARY",
    );

  const secondaryCandidates =
    getCandidates(
      objectives,
      playerCount,
      "SECONDARY",
    );

  if (
    primaryCandidates.length === 0
  ) {
    throw new Error(
      "No primary objective is available for this game.",
    );
  }

  if (
    secondaryCandidates.length === 0
  ) {
    throw new Error(
      "No secondary objective is available for this game.",
    );
  }

  const shuffledPrimary =
    shuffleWithSeed(
      primaryCandidates,
      `${seed}:primary`,
    );

  const shuffledSecondary =
    shuffleWithSeed(
      secondaryCandidates,
      `${seed}:secondary`,
    );

  const assignments:
    ObjectiveAssignment[] = [];

  orderedPlayers.forEach(
    (player, index) => {
      const primary =
        shuffledPrimary[
          index
          % shuffledPrimary.length
        ]!;

      const secondary =
        chooseSecondary(
          shuffledSecondary,

          index
            % shuffledSecondary.length,

          primary,

          compatibilityRules,
        );

      assignments.push(
        createObjectiveAssignment(
          player.id,
          primary,
          "PRIMARY",
        ),
      );

      assignments.push(
        createObjectiveAssignment(
          player.id,
          secondary,
          "SECONDARY",
        ),
      );
    },
  );

  return assignments;
}