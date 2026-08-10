import type { EventSource } from "./event-source.js";
import type { EventType } from "./event-type.js";
import type { ValidationStatus } from "./validation-status.js";

export type EventPayload = Readonly<Record<string, unknown>>;

export interface GameEvent {
  readonly id: string;
  readonly gameId: string;

  readonly type: EventType;

  readonly actorPlayerId?: string;
  readonly targetPlayerId?: string;

  readonly payload: EventPayload;

  readonly source: EventSource;
  readonly validationStatus: ValidationStatus;

  readonly createdAt: Date;
}

export function isVerifiedGameEvent(
  event: GameEvent,
): boolean {
  return event.validationStatus === "VERIFIED";
}

export function verifyGameEvent(
  event: GameEvent,
): GameEvent {
  if (event.validationStatus !== "PENDING") {
    throw new Error(
      "Only pending events can be verified.",
    );
  }

  return {
    ...event,
    validationStatus: "VERIFIED",
  };
}

export function rejectGameEvent(
  event: GameEvent,
): GameEvent {
  if (event.validationStatus !== "PENDING") {
    throw new Error(
      "Only pending events can be rejected.",
    );
  }

  return {
    ...event,
    validationStatus: "REJECTED",
  };
}