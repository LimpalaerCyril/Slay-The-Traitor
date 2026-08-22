import type {
    GameTrackingMode,
} from "../../domain/games/game-tracking-mode.js";

import type {
    Power,
} from "../../domain/powers/power.js";

import type {
    PowerAssignment,
} from "../../domain/powers/power-assignment.js";

import type {
    Role,
} from "../../domain/roles/role.js";

import type {
    RoleAssignment,
} from "../../domain/roles/role-assignment.js";

export interface AssignPowerAssignmentsInput {
    readonly roleAssignments:
    readonly RoleAssignment[];

    readonly roles:
    readonly Role[];

    readonly powers:
    readonly Power[];

    readonly trackingMode:
    GameTrackingMode;
}

export function assignPowerAssignments(
    input:
        AssignPowerAssignmentsInput,
): readonly PowerAssignment[] {
    const assignments:
        PowerAssignment[] = [];

    for (
        const roleAssignment
        of input.roleAssignments
    ) {
        const role =
            input.roles.find(
                candidate =>
                    candidate.code
                    === roleAssignment.roleCode,
            );

        if (
            role === undefined
        ) {
            throw new Error(
                `Unknown role in role assignment: ${roleAssignment.roleCode}`,
            );
        }

        if (
            role.powerCode
            === undefined
        ) {
            continue;
        }

        const power =
            input.powers.find(
                candidate =>
                    candidate.code
                    === role.powerCode,
            );

        if (
            power === undefined
        ) {
            throw new Error(
                `Role ${role.code} references unknown power: ${role.powerCode}`,
            );
        }

        if (
            !power.supportedTrackingModes
                .includes(
                    input.trackingMode,
                )
        ) {
            throw new Error(
                `Power ${power.code} is not supported in tracking mode ${input.trackingMode}.`,
            );
        }

        assignments.push({
            playerId:
                roleAssignment.playerId,

            powerCode:
                power.code,

            targetPlayerIds: [],

            setupCompleted:
                power.setup
                === undefined,

            uses:
                0,
        });
    }

    return assignments;
}