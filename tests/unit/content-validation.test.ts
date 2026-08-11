import {
    describe,
    expect,
    it,
} from "vitest";

import {
    join,
} from "node:path";

import {
    loadCharacters,
    loadCompatibilityRules,
    loadContradictionBudget,
    loadObjectives,
    loadRoles,
} from "../../src/infrastructure/content/content-loader.js";

import {
    parseCompatibilityRules,
} from "../../src/infrastructure/content/schemas/compatibility-rule-schema.js";

import {
    parseObjectiveDefinition,
} from "../../src/infrastructure/content/schemas/objective-schema.js";

import {
    parseRoleDefinition,
} from "../../src/infrastructure/content/schemas/role-schema.js";

import {
    parseContradictionBudget,
} from "../../src/infrastructure/content/schemas/contradiction-budget-schema.js";

import {
    parseCharacterDefinition,
} from "../../src/infrastructure/content/schemas/character-schema.js";

describe("Content validation", () => {
    it("accepts a valid role", () => {
        const role = parseRoleDefinition({
            code: "guardian",
            name: "Le Gardien",
            description: "Test",

            alignment: "LOYAL",

            tags: [
                "PROTECTIVE",
            ],

            minimumPlayers: 2,
            maximumPlayers: 4,
        });

        expect(role.code).toBe(
            "guardian",
        );
    });

    it("rejects an invalid alignment", () => {
        expect(() => {
            parseRoleDefinition({
                code: "bad-role",
                name: "Bad Role",
                description: "Test",

                alignment: "BANANA",

                tags: [],

                minimumPlayers: 2,
                maximumPlayers: 4,
            });
        }).toThrow();
    });

    it("rejects inconsistent player limits", () => {
        expect(() => {
            parseRoleDefinition({
                code: "bad-role",
                name: "Bad Role",
                description: "Test",

                alignment: "LOYAL",

                tags: [],

                minimumPlayers: 4,
                maximumPlayers: 2,
            });
        }).toThrow();
    });

    it("accepts a valid objective", () => {
        const objective =
            parseObjectiveDefinition({
                code: "curse-test",
                name: "Curse Test",
                description: "Test",

                category: "SABOTAGE",
                difficulty: "HARD",

                minimumPlayers: 3,
                maximumPlayers: 4,

                allowedTypes: [
                    "PRIMARY",
                ],

                requiredEvents: [
                    "CURSE_ADDED",
                ],

                verificationMode:
                    "GROUP_CONFIRMED",

                compatibilityTags: [
                    "SABOTAGE",
                ],

                score: 100,
                hiddenProgress: false,

                progressRule: {
                    type: "EVENT_COUNT",

                    eventType:
                        "CURSE_ADDED",

                    actor: "OWNER",
                    target: "OTHER",

                    increment: 1,
                    requiredCount: 2,
                },
            });

        expect(
            objective.progressRule,
        ).toBeDefined();
    });

    it("rejects an unknown event type", () => {
        expect(() => {
            parseObjectiveDefinition({
                code: "bad-objective",
                name: "Bad Objective",
                description: "Test",

                category: "TEST",
                difficulty: "EASY",

                minimumPlayers: 2,
                maximumPlayers: 4,

                requiredEvents: [
                    "PLAYER_ATE_PIZZA",
                ],

                verificationMode:
                    "DISCORD",

                compatibilityTags: [],

                score: 100,
                hiddenProgress: false,
            });
        }).toThrow();
    });

    it("loads the real role and objective content", async () => {
        const rolesPath = join(
            process.cwd(),
            "content",
            "roles",
        );

        const objectivesPath = join(
            process.cwd(),
            "content",
            "objectives",
        );

        const roles =
            await loadRoles(
                rolesPath,
            );

        const objectives =
            await loadObjectives(
                objectivesPath,
            );

        expect(roles).toHaveLength(4);
        expect(objectives).toHaveLength(3);

        expect(
            roles.map(role => role.code),
        ).toEqual([
            "guardian",
            "miser",
            "oracle",
            "traitor",
        ]);

        expect(
            objectives.map(
                objective => objective.code,
            ),
        ).toEqual([
            "cause-two-curses",
            "complete-one-act",
            "defeat-one-boss",
        ]);
    });

    it("accepts valid compatibility rules", () => {
        const rules =
            parseCompatibilityRules([
                {
                    leftTag:
                        "SABOTAGE",

                    rightTag:
                        "PROTECTIVE",

                    samePlayer:
                        "ALLOWED",

                    partyContradictionCost: 2,
                },
            ]);

        expect(rules).toHaveLength(1);
    });

    it("rejects a negative contradiction cost", () => {
        expect(() => {
            parseCompatibilityRules([
                {
                    leftTag:
                        "SABOTAGE",

                    rightTag:
                        "PROTECTIVE",

                    samePlayer:
                        "ALLOWED",

                    partyContradictionCost: -1,
                },
            ]);
        }).toThrow();
    });

    it("rejects duplicate symmetric compatibility rules", () => {
        expect(() => {
            parseCompatibilityRules([
                {
                    leftTag:
                        "SABOTAGE",

                    rightTag:
                        "PROTECTIVE",

                    samePlayer:
                        "ALLOWED",

                    partyContradictionCost: 2,
                },

                {
                    leftTag:
                        "PROTECTIVE",

                    rightTag:
                        "SABOTAGE",

                    samePlayer:
                        "ALLOWED",

                    partyContradictionCost: 2,
                },
            ]);
        }).toThrow();
    });

    it("loads the real compatibility rules", async () => {
        const rulesPath = join(
            process.cwd(),
            "content",
            "balancing",
            "compatibility-rules.json",
        );

        const rules =
            await loadCompatibilityRules(
                rulesPath,
            );

        expect(rules).toHaveLength(4);

        expect(
            rules.some(
                rule =>
                    rule.leftTag
                    === "REQUIRES_PLAYER_DEATH"
                    && rule.rightTag
                    === "FORBIDS_PLAYER_DEATH",
            ),
        ).toBe(true);
    });

    it("accepts a valid contradiction budget", () => {
        const budget =
            parseContradictionBudget({
                "2": {
                    minimum: 0,
                    maximum: 1,
                },

                "3": {
                    minimum: 1,
                    maximum: 3,
                },

                "4": {
                    minimum: 2,
                    maximum: 5,
                },
            });

        expect(
            budget["4"].maximum,
        ).toBe(5);
    });

    it("rejects a contradiction budget whose minimum exceeds maximum", () => {
        expect(() => {
            parseContradictionBudget({
                "2": {
                    minimum: 2,
                    maximum: 1,
                },

                "3": {
                    minimum: 1,
                    maximum: 3,
                },

                "4": {
                    minimum: 2,
                    maximum: 5,
                },
            });
        }).toThrow();
    });

    it("loads the real contradiction budget", async () => {
        const budgetPath = join(
            process.cwd(),
            "content",
            "balancing",
            "contradiction-budget.json",
        );

        const budget =
            await loadContradictionBudget(
                budgetPath,
            );

        expect(
            budget["2"],
        ).toEqual({
            minimum: 0,
            maximum: 1,
        });

        expect(
            budget["4"],
        ).toEqual({
            minimum: 2,
            maximum: 5,
        });
    });

    it("accepts a valid character", () => {
        const character =
            parseCharacterDefinition({
                slug:
                    "character-alpha",

                name:
                    "Personnage Alpha",
            });

        expect(
            character.slug,
        ).toBe(
            "character-alpha",
        );
    });

    it("loads the real character content", async () => {
        const charactersPath = join(
            process.cwd(),
            "content",
            "characters",
        );

        const characters =
            await loadCharacters(
                charactersPath,
            );

        /*
         * Le catalogue doit contenir au moins
         * un personnage pour permettre
         * de créer une partie.
         */
        expect(
            characters.length,
        ).toBeGreaterThan(0);

        /*
         * Les slugs servent d'identifiants
         * techniques et doivent rester uniques.
         */
        const slugs =
            characters.map(
                character =>
                    character.slug,
            );

        expect(
            new Set(slugs).size,
        ).toBe(
            slugs.length,
        );

        /*
         * Les détails individuels sont déjà
         * validés par Zod lors du chargement.
         *
         * On vérifie simplement ici que le
         * catalogue réel est exploitable.
         */
        for (
            const character
            of characters
        ) {
            expect(
                character.slug.trim(),
            ).not.toBe("");

            expect(
                character.name.trim(),
            ).not.toBe("");
        }
    });
});