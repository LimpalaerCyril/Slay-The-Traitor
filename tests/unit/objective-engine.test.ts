import { describe, expect, it } from "vitest";

import { processObjectiveEvent } from "../../src/application/objective-engine/objective-engine.js";

import type { GameEvent } from "../../src/domain/events/game-events.js";

import {
    createObjectiveAssignment,
    type ObjectiveAssignment,
} from "../../src/domain/objectives/objective-assignments.js";

import type {
    Objective,
} from "../../src/domain/objectives/objective.js";

function createTestCurseObjective(): Objective {
    return {
        code: "test-curse-objective",

        name:
            "Test curse objective",

        description:
            "Test objective used by the Objective Engine.",

        category:
            "TEST",

        difficulty:
            "HARD",

        minimumPlayers: 2,
        maximumPlayers: 4,

        allowedTypes: [
            "PRIMARY",
        ],

        requiredEvents: [
            "CURSE_ADDED",
        ],

        verificationMode:
            "GROUP_CONFIRMED",

        compatibilityTags: [],

        score: 100,
        hiddenProgress: false,

        progressRule: {
            type:
                "EVENT_COUNT",

            eventType:
                "CURSE_ADDED",

            actor:
                "OWNER",

            target:
                "OTHER",

            requiredCount: 2,
            increment: 1,
        },
    };
}

function createAssignment(
    objective: Objective,
): ObjectiveAssignment {
    return createObjectiveAssignment(
        "alice",
        objective,
        "PRIMARY",
    );
}

function createCurseEvent(
    actorPlayerId: string,
    targetPlayerId: string,
    validationStatus: GameEvent["validationStatus"] = "VERIFIED",
): GameEvent {
    return {
        id: "event-1",
        gameId: "game-1",

        type: "CURSE_ADDED",

        actorPlayerId,
        targetPlayerId,

        payload: {
            curse: "unknown",
        },

        source: "MANUAL",
        validationStatus,

        createdAt: new Date(
            "2026-01-01T12:00:00Z",
        ),
    };
}

describe("ObjectiveEngine", () => {
    it("progresses an objective from a matching verified event", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        const event = createCurseEvent(
            "alice",
            "bob",
        );

        const consumed = processObjectiveEvent({
            objective,
            assignment,
            event,
        });

        expect(consumed).toBe(true);

        expect(
            assignment.progress.current,
        ).toBe(1);

        expect(
            assignment.status,
        ).toBe("IN_PROGRESS");
    });

    it("completes the objective when the target is reached", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        processObjectiveEvent({
            objective,
            assignment,
            event: createCurseEvent(
                "alice",
                "bob",
            ),
        });

        processObjectiveEvent({
            objective,
            assignment,
            event: createCurseEvent(
                "alice",
                "charlie",
            ),
        });

        expect(
            assignment.progress.current,
        ).toBe(2);

        expect(
            assignment.status,
        ).toBe("COMPLETED");
    });

        it("ignores a pending event", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        const event = createCurseEvent(
            "alice",
            "bob",
            "PENDING",
        );

        const consumed = processObjectiveEvent({
            objective,
            assignment,
            event,
        });

        expect(consumed).toBe(false);

        expect(
            assignment.progress.current,
        ).toBe(0);
    });

    it("ignores an event caused by another player", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        const event = createCurseEvent(
            "bob",
            "charlie",
        );

        const consumed = processObjectiveEvent({
            objective,
            assignment,
            event,
        });

        expect(consumed).toBe(false);

        expect(
            assignment.progress.current,
        ).toBe(0);
    });

    it("ignores an event targeting the objective owner", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        const event = createCurseEvent(
            "alice",
            "alice",
        );

        const consumed = processObjectiveEvent({
            objective,
            assignment,
            event,
        });

        expect(consumed).toBe(false);

        expect(
            assignment.progress.current,
        ).toBe(0);
    });

    it("ignores an unrelated event type", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        const event: GameEvent = {
            id: "event-2",
            gameId: "game-1",

            type: "GOLD_CHANGED",

            actorPlayerId: "alice",

            payload: {
                previous: 100,
                current: 150,
            },

            source: "MANUAL",
            validationStatus: "VERIFIED",

            createdAt: new Date(
                "2026-01-01T12:00:00Z",
            ),
        };

        const consumed = processObjectiveEvent({
            objective,
            assignment,
            event,
        });

        expect(consumed).toBe(false);

        expect(
            assignment.progress.current,
        ).toBe(0);
    });

    it("does not progress an already completed objective", () => {
        const objective =
            createTestCurseObjective();

        const assignment =
            createAssignment(
                objective,
            );

        assignment.progress = {
            current: 2,
            target: 2,
        };

        assignment.status = "COMPLETED";

        const consumed = processObjectiveEvent({
            objective,
            assignment,
            event: createCurseEvent(
                "alice",
                "bob",
            ),
        });

        expect(consumed).toBe(false);

        expect(
            assignment.progress.current,
        ).toBe(2);
    });

    it("rejects an assignment for another objective", () => {
        const objective =
            createTestCurseObjective();
        const assignment: ObjectiveAssignment = {
            ...createAssignment(
                objective,
            ),
            objectiveCode: "another-objective",
        };

        expect(() => {
            processObjectiveEvent({
                objective,
                assignment,
                event: createCurseEvent(
                    "alice",
                    "bob",
                ),
            });
        }).toThrow(
            "Objective assignment does not match objective definition.",
        );
    });
});