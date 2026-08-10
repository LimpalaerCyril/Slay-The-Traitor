import type { EventType } from "../events/event-type.js";

export type ObjectiveActorMatch =
  | "OWNER"
  | "ANY";

export type ObjectiveTargetMatch =
  | "OWNER"
  | "OTHER"
  | "ANY";

export interface EventCountObjectiveRule {
  readonly type: "EVENT_COUNT";

  readonly eventType: EventType;

  readonly actor: ObjectiveActorMatch;
  readonly target: ObjectiveTargetMatch;

  readonly increment: number;
  readonly requiredCount: number;
}

export type ObjectiveProgressRule =
  EventCountObjectiveRule;