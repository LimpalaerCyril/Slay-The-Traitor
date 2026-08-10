import type {
  ContradictionBudget,
} from "../../domain/objectives/contradiction-budget.js";

import {
  getContradictionRange,
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

export interface ContradictionBreakdown {
  readonly leftPlayerId: string;
  readonly rightPlayerId: string;

  readonly leftTag: string;
  readonly rightTag: string;

  readonly cost: number;
}

export interface PartyContradictionResult {
  readonly total: number;

  readonly breakdown:
    readonly ContradictionBreakdown[];
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

function ruleMatchesTagSets(
  rule: ObjectiveCompatibilityRule,
  leftTags: ReadonlySet<string>,
  rightTags: ReadonlySet<string>,
): boolean {
  const directMatch =
    leftTags.has(rule.leftTag)
    && rightTags.has(rule.rightTag);

  const reverseMatch =
    leftTags.has(rule.rightTag)
    && rightTags.has(rule.leftTag);

  return directMatch || reverseMatch;
}

function collectPlayerTags(
  assignments:
    readonly ObjectiveAssignment[],
  objectives:
    readonly Objective[],
): Map<string, Set<string>> {
  const objectivesByCode =
    new Map(
      objectives.map(
        objective => [
          objective.code,
          objective,
        ],
      ),
    );

  const tagsByPlayer =
    new Map<string, Set<string>>();

  for (
    const assignment
    of assignments
  ) {
    const objective =
      objectivesByCode.get(
        assignment.objectiveCode,
      );

    if (objective === undefined) {
      throw new Error(
        `Unknown objective code: ${assignment.objectiveCode}`,
      );
    }

    let playerTags =
      tagsByPlayer.get(
        assignment.playerId,
      );

    if (playerTags === undefined) {
      playerTags =
        new Set<string>();

      tagsByPlayer.set(
        assignment.playerId,
        playerTags,
      );
    }

    for (
      const tag
      of objective.compatibilityTags
    ) {
      playerTags.add(tag);
    }
  }

  return tagsByPlayer;
}

export function calculatePartyContradiction(
  assignments:
    readonly ObjectiveAssignment[],
  objectives:
    readonly Objective[],
  rules:
    readonly ObjectiveCompatibilityRule[],
): PartyContradictionResult {
  const tagsByPlayer =
    collectPlayerTags(
      assignments,
      objectives,
    );

  const playerIds =
    [...tagsByPlayer.keys()]
      .sort(compareStrings);

  const breakdown:
    ContradictionBreakdown[] = [];

  let total = 0;

  for (
    let leftIndex = 0;
    leftIndex < playerIds.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex =
        leftIndex + 1;
      rightIndex < playerIds.length;
      rightIndex += 1
    ) {
      const leftPlayerId =
        playerIds[leftIndex]!;

      const rightPlayerId =
        playerIds[rightIndex]!;

      const leftTags =
        tagsByPlayer.get(
          leftPlayerId,
        )!;

      const rightTags =
        tagsByPlayer.get(
          rightPlayerId,
        )!;

      for (const rule of rules) {
        if (
          !ruleMatchesTagSets(
            rule,
            leftTags,
            rightTags,
          )
        ) {
          continue;
        }

        total +=
          rule.partyContradictionCost;

        breakdown.push({
          leftPlayerId,
          rightPlayerId,

          leftTag:
            rule.leftTag,

          rightTag:
            rule.rightTag,

          cost:
            rule.partyContradictionCost,
        });
      }
    }
  }

  return {
    total,
    breakdown,
  };
}

export function isContradictionWithinBudget(
  contradiction: number,
  playerCount: number,
  budget: ContradictionBudget,
): boolean {
  const range =
    getContradictionRange(
      budget,
      playerCount,
    );

  return (
    contradiction >= range.minimum
    && contradiction <= range.maximum
  );
}