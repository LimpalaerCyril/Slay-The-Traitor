import type { GameEvent } from "../../domain/events/game-events.js";
import type {
  ObjectiveActorMatch,
  ObjectiveTargetMatch,
} from "../../domain/objectives/objective-event-rule.js";
import {
  updateObjectiveProgress,
  type ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";
import type { Objective } from "../../domain/objectives/objective.js";

export interface ProcessObjectiveEventInput {
  readonly objective: Objective;
  readonly assignment: ObjectiveAssignment;
  readonly event: GameEvent;
}

function matchesActor(
  actorMatch: ObjectiveActorMatch,
  ownerPlayerId: string,
  actorPlayerId: string | undefined,
): boolean {
  switch (actorMatch) {
    case "ANY":
      return true;

    case "OWNER":
      return actorPlayerId === ownerPlayerId;
  }
}

function matchesTarget(
  targetMatch: ObjectiveTargetMatch,
  ownerPlayerId: string,
  targetPlayerId: string | undefined,
): boolean {
  switch (targetMatch) {
    case "ANY":
      return true;

    case "OWNER":
      return targetPlayerId === ownerPlayerId;

    case "OTHER":
      return (
        targetPlayerId !== undefined
        && targetPlayerId !== ownerPlayerId
      );
  }
}

export function processObjectiveEvent(
  input: ProcessObjectiveEventInput,
): boolean {
  const {
    objective,
    assignment,
    event,
  } = input;

  if (assignment.objectiveCode !== objective.code) {
    throw new Error(
      "Objective assignment does not match objective definition.",
    );
  }

  if (
    assignment.status === "COMPLETED"
    || assignment.status === "FAILED"
  ) {
    return false;
  }

  if (event.validationStatus !== "VERIFIED") {
    return false;
  }

  const rule = objective.progressRule;

  if (rule === undefined) {
    return false;
  }

  if (rule.type !== "EVENT_COUNT") {
    return false;
  }

  if (event.type !== rule.eventType) {
    return false;
  }

  if (
    !matchesActor(
      rule.actor,
      assignment.playerId,
      event.actorPlayerId,
    )
  ) {
    return false;
  }

  if (
    !matchesTarget(
      rule.target,
      assignment.playerId,
      event.targetPlayerId,
    )
  ) {
    return false;
  }

  if (rule.increment <= 0) {
    throw new Error(
      "Objective progress increment must be greater than zero.",
    );
  }

  updateObjectiveProgress(
    assignment,
    assignment.progress.current + rule.increment,
  );

  return true;
}