import { describe, expect, it } from "vitest";

import {
  isVerifiedGameEvent,
  rejectGameEvent,
  verifyGameEvent,
  type GameEvent,
} from "../../src/domain/events/game-events.js";

function createPendingEvent(): GameEvent {
  return {
    id: "event-1",
    gameId: "game-1",

    type: "CURSE_ADDED",

    actorPlayerId: "player-1",
    targetPlayerId: "player-2",

    payload: {
      curse: "unknown",
    },

    source: "MANUAL",
    validationStatus: "PENDING",

    createdAt: new Date("2026-01-01T12:00:00Z"),
  };
}

describe("GameEvent", () => {
  it("can represent a pending game event", () => {
    const event = createPendingEvent();

    expect(event.type).toBe("CURSE_ADDED");
    expect(event.source).toBe("MANUAL");
    expect(event.validationStatus).toBe("PENDING");
  });

  it("detects that a pending event is not verified", () => {
    const event = createPendingEvent();

    expect(isVerifiedGameEvent(event)).toBe(false);
  });

  it("verifies a pending event", () => {
    const event = createPendingEvent();

    const verifiedEvent = verifyGameEvent(event);

    expect(verifiedEvent.validationStatus).toBe("VERIFIED");
  });

  it("detects a verified event", () => {
    const event = createPendingEvent();

    const verifiedEvent = verifyGameEvent(event);

    expect(isVerifiedGameEvent(verifiedEvent)).toBe(true);
  });

  it("does not mutate the original event when verifying it", () => {
    const event = createPendingEvent();

    const verifiedEvent = verifyGameEvent(event);

    expect(event.validationStatus).toBe("PENDING");
    expect(verifiedEvent.validationStatus).toBe("VERIFIED");
  });

  it("rejects a pending event", () => {
    const event = createPendingEvent();

    const rejectedEvent = rejectGameEvent(event);

    expect(rejectedEvent.validationStatus).toBe("REJECTED");
  });

  it("cannot verify an already verified event", () => {
    const event = createPendingEvent();

    const verifiedEvent = verifyGameEvent(event);

    expect(() => {
      verifyGameEvent(verifiedEvent);
    }).toThrow("Only pending events can be verified.");
  });

  it("cannot reject an already verified event", () => {
    const event = createPendingEvent();

    const verifiedEvent = verifyGameEvent(event);

    expect(() => {
      rejectGameEvent(verifiedEvent);
    }).toThrow("Only pending events can be rejected.");
  });
});
