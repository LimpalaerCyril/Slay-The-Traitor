import type { Alignment } from "./alignment.js";

import type {
    GameTrackingMode,
} from "../games/game-tracking-mode.js";

export interface RoleTargetSelection {
    readonly count: number;

    readonly allowSelf: boolean;
}

export interface RoleVariant {
    readonly code: string;

    readonly name: string;

    readonly description: string;

    readonly primaryObjectiveCode: string;

    readonly targetSelection?: RoleTargetSelection | undefined;
}

export interface Role {
    readonly code: string;
    readonly name: string;
    readonly description: string;

    readonly alignment: Alignment;

    readonly tags: readonly string[];

    readonly minimumPlayers: number;

    readonly maximumPlayers: number;

    readonly primaryObjectiveCode?: string | undefined;

    readonly variants?: readonly RoleVariant[] | undefined;

    readonly powerCode?: string | undefined;

    readonly supportedTrackingModes: readonly GameTrackingMode[];
}

export function isRoleAvailableForPlayerCount(
    role: Role,
    playerCount: number,
): boolean {
    return (
        playerCount >= role.minimumPlayers
        && playerCount <= role.maximumPlayers
    );
}

export function isRoleSupportedInTrackingMode(
    role: Role,
    trackingMode:
        GameTrackingMode,
): boolean {
    return role
        .supportedTrackingModes
        .includes(
            trackingMode,
        );
}