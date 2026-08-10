import type { Objective } from "./objective.js";
import type { ObjectiveStatus } from "./objective-status.js";
import type { ObjectiveType } from "./objective-type.js";

export type { ObjectiveType } from "./objective-type.js";

export interface ObjectiveProgress {
  readonly current: number;
  readonly target: number;
}

export interface ObjectiveAssignment {
  readonly playerId: string;
  readonly objectiveCode: string;
  readonly objectiveType: ObjectiveType;

  progress: ObjectiveProgress;
  status: ObjectiveStatus;
}

export function createObjectiveAssignment(
  playerId: string,
  objective: Objective,
  objectiveType: ObjectiveType,
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
    objective.progressRule?.type === "EVENT_COUNT"
      ? objective.progressRule.requiredCount
      : 1;

  return {
    playerId,
    objectiveCode: objective.code,
    objectiveType,

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