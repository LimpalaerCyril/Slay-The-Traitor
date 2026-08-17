import type {
    GameTrackingMode,
} from "../games/game-tracking-mode.js";

export type PowerMode =
    "ACTIVE"
    | "PASSIVE";

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

/*
 * GAME :
 * limite sur toute l'expédition.
 *
 * ACT :
 * limite remise à zéro à chaque acte.
 */
export type PowerUsageScope =
    "GAME"
    | "ACT";

export interface PowerUsageLimit {
    readonly scope:
    PowerUsageScope;

    readonly maxUses:
    number;
}

/*
 * Fenêtre dans laquelle le pouvoir peut
 * être déclenché.
 *
 * Ces valeurs constituent un contrat avec
 * le futur bridge STS2.
 */
export type PowerActivationTiming =
    "ANYTIME"
    | "COMBAT_START"
    | "COMBAT_ACTIVE"
    | "CAMPFIRE";

export interface PowerActivationDefinition {
    readonly timing:
    PowerActivationTiming;

    /*
     * Contrairement à setup.targetSelection,
     * cette cible est choisie AU MOMENT
     * d'utiliser le pouvoir.
     */
    readonly targetSelection?:
    PowerTargetSelection
    | undefined;
}

export interface RestartCombatPowerEffect {
    readonly type:
    "RESTART_COMBAT";
}

export interface BlockCampfireOptionPowerEffect {
    readonly type:
    "BLOCK_CAMPFIRE_OPTION";

    readonly option:
    "REST";

    readonly target:
    "SELECTED_PLAYER";
}

export interface GrantEnergyPowerEffect {
    readonly type:
    "GRANT_ENERGY";

    readonly amount:
    number;

    readonly target:
    "OWNER";

    readonly duration:
    "FIRST_TURN";
}

export type PowerEffect =
    RestartCombatPowerEffect
    | BlockCampfireOptionPowerEffect
    | GrantEnergyPowerEffect;

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

    readonly usageLimit?:
    PowerUsageLimit
    | undefined;

    readonly setup?:
    PowerSetupDefinition
    | undefined;

    readonly activation?:
    PowerActivationDefinition
    | undefined;

    readonly effect?:
    PowerEffect
    | undefined;
}