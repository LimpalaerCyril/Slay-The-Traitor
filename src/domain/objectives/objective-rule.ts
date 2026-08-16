import type {
    EventType,
} from "../events/event-type.js";

export type ObjectiveParticipantSelector =
    | "OWNER"
    | "OTHER"
    | "ANY";

export type ObjectiveResolution =
    | "ACT_END"
    | "GAME_END";

export interface EventCountObjectiveRule {
    readonly type:
    "EVENT_COUNT";

    readonly eventType:
    EventType;

    readonly actor:
    ObjectiveParticipantSelector;

    readonly target:
    ObjectiveParticipantSelector;

    readonly increment:
    number;

    readonly requiredCount:
    number;
}

export interface ValueSumObjectiveRule {
    readonly type:
    "VALUE_SUM";

    readonly eventType:
    EventType;

    readonly actor:
    ObjectiveParticipantSelector;

    readonly target:
    ObjectiveParticipantSelector;

    /*
     * Clé numérique du payload.
     *
     * Exemple :
     * payload.amount
     */
    readonly payloadField:
    string;

    readonly targetValue:
    number;
}

export type RankingParticipant =
    | "ACTOR"
    | "TARGET";

export type RankingAggregation =
    | "COUNT"
    | "SUM"
    | "LATEST";

export type RankingOrder =
    | "HIGHEST"
    | "LOWEST";

export interface RankingObjectiveRule {
    readonly type:
    "RANKING";

    readonly eventType:
    EventType;

    /*
     * Quel participant reçoit la valeur
     * mesurée par l'événement ?
     */
    readonly participant:
    RankingParticipant;

    readonly aggregation:
    RankingAggregation;

    /*
     * Obligatoire pour SUM et LATEST.
     * Inutile pour COUNT.
     */
    readonly payloadField?:
    string | undefined;

    readonly order:
    RankingOrder;

    /*
     * true :
     * deux joueurs à égalité en première
     * position réussissent tous les deux.
     */
    readonly allowTies:
    boolean;

    readonly resolveAt:
    ObjectiveResolution;
}

export type ObjectiveConditionPlayer =
    | "OWNER"
    | "ROLE_TARGET";

export interface PlayerAliveObjectiveCondition {
    readonly type:
    "PLAYER_ALIVE";

    readonly player:
    ObjectiveConditionPlayer;

    readonly expected:
    boolean;
}

export interface ExpeditionResultObjectiveCondition {
    readonly type:
    "EXPEDITION_RESULT";

    readonly result:
    "WON"
    | "LOST";
}

export type ObjectiveCondition =
    | PlayerAliveObjectiveCondition
    | ExpeditionResultObjectiveCondition;

export interface ConditionObjectiveRule {
    readonly type:
    "CONDITION";

    readonly operator:
    "ALL"
    | "ANY";

    readonly conditions:
    readonly ObjectiveCondition[];

    /*
     * IMMEDIATE :
     * dès que les conditions sont vraies,
     * l'objectif est réussi.
     *
     * RESOLUTION :
     * on attend resolveAt pour valider.
     */
    readonly completeAt:
    "IMMEDIATE"
    | "RESOLUTION";

    /*
     * C'est aussi la deadline :
     * si les conditions ne sont pas remplies
     * à ce moment-là, l'objectif échoue.
     */
    readonly resolveAt:
    ObjectiveResolution;
}

export interface ForbiddenEventObjectiveRule {
    readonly type:
    "FORBIDDEN_EVENT";

    readonly eventType:
    EventType;

    readonly actor:
    ObjectiveParticipantSelector;

    readonly target:
    ObjectiveParticipantSelector;

    /*
     * L'événement interdit fait échouer
     * immédiatement.
     *
     * En son absence, l'objectif est réussi
     * à la résolution.
     */
    readonly resolveAt:
    ObjectiveResolution;
}

export type ObjectiveRule =
    | EventCountObjectiveRule
    | ValueSumObjectiveRule
    | RankingObjectiveRule
    | ConditionObjectiveRule
    | ForbiddenEventObjectiveRule;