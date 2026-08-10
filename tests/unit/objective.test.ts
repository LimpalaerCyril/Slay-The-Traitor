import { describe, expect, it } from "vitest";

import {
    isObjectiveAvailableForPlayerCount,
    type Objective,
} from "../../src/domain/objectives/objective.js";

import {
    createObjectiveAssignment,
    updateObjectiveProgress,
    type ObjectiveAssignment,
} from "../../src/domain/objectives/objective-assignments.js";

function createObjective(
    minimumPlayers = 2,
    maximumPlayers = 4,
): Objective {
    return {
        code: "test-objective",
        name: "Test Objective",
        description: "An objective used for tests.",
        category: "TEST",
        difficulty: "MEDIUM",

        minimumPlayers,
        maximumPlayers,

        allowedTypes: [
            "PRIMARY",
            "SECONDARY",
        ],

        requiredEvents: [],
        verificationMode: "DISCORD",

        compatibilityTags: [],

        score: 100,
        hiddenProgress: false,
    };
}

function createAssignment(
    target = 2,
): ObjectiveAssignment {
    return {
        playerId: "player-1",
        objectiveCode: "test-objective",
        objectiveType: "PRIMARY",

        progress: {
            current: 0,
            target,
        },

        status: "PENDING",
    };
}

describe("Objective", () => {
    it("is available for a valid player count", () => {
        const objective = createObjective(2, 4);

        expect(
            isObjectiveAvailableForPlayerCount(objective, 3),
        ).toBe(true);
    });

    it("is unavailable below its minimum player count", () => {
        const objective = createObjective(3, 4);

        expect(
            isObjectiveAvailableForPlayerCount(objective, 2),
        ).toBe(false);
    });

    it("is unavailable above its maximum player count", () => {
        const objective = createObjective(2, 3);

        expect(
            isObjectiveAvailableForPlayerCount(objective, 4),
        ).toBe(false);
    });

    it("starts with pending progress", () => {
        const assignment = createAssignment();

        expect(assignment.progress.current).toBe(0);
        expect(assignment.status).toBe("PENDING");
    });

    it("becomes IN_PROGRESS when progress starts", () => {
        const assignment = createAssignment(2);

        updateObjectiveProgress(assignment, 1);

        expect(assignment.progress.current).toBe(1);
        expect(assignment.status).toBe("IN_PROGRESS");
    });

    it("becomes COMPLETED when the target is reached", () => {
        const assignment = createAssignment(2);

        updateObjectiveProgress(assignment, 2);

        expect(assignment.progress.current).toBe(2);
        expect(assignment.status).toBe("COMPLETED");
    });

    it("becomes COMPLETED when progress exceeds the target", () => {
        const assignment = createAssignment(2);

        updateObjectiveProgress(assignment, 3);

        expect(assignment.status).toBe("COMPLETED");
    });

    it("rejects negative progress", () => {
        const assignment = createAssignment();

        expect(() => {
            updateObjectiveProgress(assignment, -1);
        }).toThrow("Objective progress cannot be negative.");
    });

    it("does not modify an already completed objective", () => {
        const assignment = createAssignment(1);

        updateObjectiveProgress(assignment, 1);
        updateObjectiveProgress(assignment, 0);

        expect(assignment.progress.current).toBe(1);
        expect(assignment.status).toBe("COMPLETED");
    });

    it("creates an assignment using the objective required count", () => {
        const objective: Objective = {
            ...createObjective(),
            allowedTypes: [
                "PRIMARY",
            ],

            progressRule: {
                type: "EVENT_COUNT",
                eventType: "CURSE_ADDED",

                actor: "OWNER",
                target: "OTHER",

                increment: 1,
                requiredCount: 3,
            },
        };

        const assignment =
            createObjectiveAssignment(
                "alice",
                objective,
                "PRIMARY",
            );

        expect(
            assignment.progress,
        ).toEqual({
            current: 0,
            target: 3,
        });

        expect(
            assignment.status,
        ).toBe("PENDING");
    });

    it("rejects an objective type not allowed by the definition", () => {
        const objective: Objective = {
            ...createObjective(),

            allowedTypes: [
                "SECONDARY",
            ],
        };

        expect(() => {
            createObjectiveAssignment(
                "alice",
                objective,
                "PRIMARY",
            );
        }).toThrow(
            "Objective test-objective cannot be assigned as PRIMARY.",
        );
    });
});