import type {
    GameTrackingMode,
} from "../games/game-tracking-mode.js";

import type {
    PowerMode,
} from "./power-mode.js";

export interface PowerTargetSelection {
    readonly count:
        number;

    readonly allowSelf:
        boolean;
}

export interface PowerSetupDefinition {
    readonly targetSelection:
        PowerTargetSelection;
}

export interface Power {
    readonly code:
        string;

    readonly name:
        string;

    readonly description:
        string;

    readonly mode:
        PowerMode;

    readonly supportedTrackingModes:
        readonly GameTrackingMode[];

    /*
     * Nombre maximal d'activations décidées
     * par le joueur.
     *
     * undefined = pas de limite définie ici.
     *
     * Cela sera surtout utilisé par les
     * pouvoirs ACTIVE.
     */
    readonly maxUses?:
        number
        | undefined;

    /*
     * Le setup est indépendant du mode.
     *
     * Un pouvoir PASSIVE comme Cupidon
     * peut parfaitement nécessiter un setup.
     */
    readonly setup?:
        PowerSetupDefinition
        | undefined;
}

export function isPowerSupportedInTrackingMode(
    power: Power,
    trackingMode:
        GameTrackingMode,
): boolean {
    return power
        .supportedTrackingModes
        .includes(
            trackingMode,
        );
}

export function powerRequiresSetup(
    power: Power,
): boolean {
    return power.setup
        !== undefined;
}