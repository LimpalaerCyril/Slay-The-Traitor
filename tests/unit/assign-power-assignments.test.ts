import {
    describe,
    expect,
    it,
} from "vitest";

import {
    assignPowerAssignments,
} from "../../src/application/power-engine/assign-power-assignments.js";

import type {
    Power,
} from "../../src/domain/powers/power.js";

import type {
    Role,
} from "../../src/domain/roles/role.js";

function createRole(
    code: string,
    powerCode?: string,
): Role {
    return {
        code,

        name:
            code,

        description:
            code,

        alignment:
            "LOYAL",

        tags: [],

        minimumPlayers:
            2,

        maximumPlayers:
            4,

        primaryObjectiveCode:
            `${code}-primary`,

        ...(
            powerCode === undefined
                ? {}
                : {
                    powerCode,
                }
        ),

        supportedTrackingModes: [
            "MANUAL",
            "STS2",
        ],
    };
}

function createPower(
    overrides:
        Partial<Power> = {},
): Power {
    return {
        code:
            "test-power",

        name:
            "Test Power",

        description:
            "Test power",

        mode:
            "ACTIVE",

        supportedTrackingModes: [
            "MANUAL",
            "STS2",
        ],

        ...overrides,
    };
}

describe(
    "assignPowerAssignments",
    () => {
        it(
            "assigns the power referenced by a role",
            () => {
                const assignments =
                    assignPowerAssignments({
                        roleAssignments: [
                            {
                                playerId:
                                    "alice",

                                roleCode:
                                    "guardian",

                                targetPlayerIds: [],

                                setupCompleted:
                                    true,
                            },
                        ],

                        roles: [
                            createRole(
                                "guardian",
                                "test-power",
                            ),
                        ],

                        powers: [
                            createPower(),
                        ],

                        trackingMode:
                            "MANUAL",
                    });

                expect(
                    assignments,
                ).toEqual([
                    {
                        playerId:
                            "alice",

                        powerCode:
                            "test-power",

                        targetPlayerIds: [],

                        setupCompleted:
                            true,

                        uses:
                            0,
                    },
                ]);
            },
        );

        it(
            "does not create an assignment for a role without a power",
            () => {
                const assignments =
                    assignPowerAssignments({
                        roleAssignments: [
                            {
                                playerId:
                                    "alice",

                                roleCode:
                                    "guardian",

                                targetPlayerIds: [],

                                setupCompleted:
                                    true,
                            },
                        ],

                        roles: [
                            createRole(
                                "guardian",
                            ),
                        ],

                        powers: [
                            createPower(),
                        ],

                        trackingMode:
                            "MANUAL",
                    });

                expect(
                    assignments,
                ).toEqual([]);
            },
        );

        it(
            "marks a power setup as incomplete",
            () => {
                const assignments =
                    assignPowerAssignments({
                        roleAssignments: [
                            {
                                playerId:
                                    "alice",

                                roleCode:
                                    "cupid",

                                targetPlayerIds: [],

                                setupCompleted:
                                    true,
                            },
                        ],

                        roles: [
                            createRole(
                                "cupid",
                                "lovers-bond",
                            ),
                        ],

                        powers: [
                            createPower({
                                code:
                                    "lovers-bond",

                                mode:
                                    "PASSIVE",

                                setup: {
                                    targetSelection: {
                                        count:
                                            2,

                                        allowSelf:
                                            true,
                                    },
                                },
                            }),
                        ],

                        trackingMode:
                            "MANUAL",
                    });

                expect(
                    assignments[0]
                        ?.setupCompleted,
                ).toBe(
                    false,
                );
            },
        );

        it(
            "rejects an unknown referenced power",
            () => {
                expect(() => {
                    assignPowerAssignments({
                        roleAssignments: [
                            {
                                playerId:
                                    "alice",

                                roleCode:
                                    "guardian",

                                targetPlayerIds: [],

                                setupCompleted:
                                    true,
                            },
                        ],

                        roles: [
                            createRole(
                                "guardian",
                                "missing-power",
                            ),
                        ],

                        powers: [],

                        trackingMode:
                            "MANUAL",
                    });
                }).toThrow(
                    "Role guardian references unknown power: missing-power",
                );
            },
        );

        it(
            "rejects a power unsupported by the tracking mode",
            () => {
                expect(() => {
                    assignPowerAssignments({
                        roleAssignments: [
                            {
                                playerId:
                                    "alice",

                                roleCode:
                                    "cupid",

                                targetPlayerIds: [],

                                setupCompleted:
                                    true,
                            },
                        ],

                        roles: [
                            createRole(
                                "cupid",
                                "lovers-bond",
                            ),
                        ],

                        powers: [
                            createPower({
                                code:
                                    "lovers-bond",

                                mode:
                                    "PASSIVE",

                                supportedTrackingModes: [
                                    "STS2",
                                ],
                            }),
                        ],

                        trackingMode:
                            "MANUAL",
                    });
                }).toThrow(
                    "Power lovers-bond is not supported in tracking mode MANUAL.",
                );
            },
        );
    },
);