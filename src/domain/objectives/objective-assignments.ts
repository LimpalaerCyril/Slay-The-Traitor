import type { Objective } from "./objective.js";
import type { ObjectiveStatus } from "./objective-status.js";
import type {
  GameAct,
} from "../games/game-act.js";
import type { ObjectiveType } from "./objective-type.js";

export type { ObjectiveType } from "./objective-type.js";

import type { ObjectiveRule } from "./objective-rule.js";


export interface ObjectiveProgress {
  readonly current: number;
  readonly target: number;
}

export interface ObjectiveAssignment {
  readonly playerId: string;
  readonly objectiveCode: string;
  readonly objectiveType: ObjectiveType;
  readonly actNumber?: GameAct;

  progress: ObjectiveProgress;
  status: ObjectiveStatus;
}

function getObjectiveProgressTarget(
  rule:
    ObjectiveRule | undefined,
): number {
  if (
    rule === undefined
  ) {
    return 1;
  }

  switch (
  rule.type
  ) {
    case "EVENT_COUNT":
      return rule.requiredCount;

    case "VALUE_SUM":
      return rule.targetValue;

    case "RANKING":
      return 1;

    case "CONDITION":
      return rule.operator === "ALL"
        ? rule.conditions.length
        : 1;

    case "FORBIDDEN_EVENT":
      return 1;
  }
}

export function createObjectiveAssignment(
  playerId: string,
  objective: Objective,
  objectiveType: ObjectiveType,
  actNumber?: GameAct,
): ObjectiveAssignment {
  if (
    !objective.allowedTypes.includes(
      objectiveType,
    )
  ) {
    throw new Error(
      `Objective ${objective.code} cannot be assigned as ${objectiveType}.`,
    );
  }

  const target =
    getObjectiveProgressTarget(
      objective.rule,
    );

  if (
    objectiveType === "PRIMARY"
    && actNumber !== undefined
  ) {
    throw new Error(
      "A primary objective cannot belong to an act.",
    );
  }

  const resolvedActNumber =
    objectiveType === "SECONDARY"
      ? actNumber ?? 1
      : undefined;

  return {
    playerId,
    objectiveCode: objective.code,
    objectiveType,

    ...(
      resolvedActNumber
        === undefined
        ? {}
        : {
          actNumber:
            resolvedActNumber,
        }
    ),

    progress: {
      current: 0,
      target,
    },

    status: "PENDING",
  };
}

export function updateObjectiveProgress(
  assignment: ObjectiveAssignment,
  current: number,
): void {
  if (assignment.status === "COMPLETED") {
    return;
  }

  if (assignment.status === "FAILED") {
    return;
  }

  if (current < 0) {
    throw new Error(
      "Objective progress cannot be negative.",
    );
  }

  assignment.progress = {
    ...assignment.progress,
    current,
  };

  if (
    current >= assignment.progress.target
  ) {
    assignment.status = "COMPLETED";
    return;
  }

  if (current > 0) {
    assignment.status = "IN_PROGRESS";
    return;
  }

  assignment.status = "PENDING";
}