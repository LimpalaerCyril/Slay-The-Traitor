import {
    randomUUID,
} from "node:crypto";

import type {
    EventSource,
} from "../../domain/events/event-source.js";

import type {
    EventType,
} from "../../domain/events/event-type.js";

import {
    rejectGameEvent,
    verifyGameEvent,
    type EventPayload,
    type GameEvent,
} from "../../domain/events/game-events.js";

import type {
    ValidationStatus,
} from "../../domain/events/validation-status.js";

import type {
    GameAct,
} from "../../domain/games/game-act.js";

import {
    applyObjectiveEvaluation,
    evaluateObjective,
} from "../../domain/objectives/objective-engine.js";

import type {
    Objective,
} from "../../domain/objectives/objective.js";

import type {
    GameEventRepository,
} from "../game-event-repository/game-event-repository.js";

import type {
    GameRepository,
    GameSession,
} from "../game-repository/game-repository.js";

import type {
    GamePlayer,
} from "../../domain/games/game-player.js";

import {
    assignSecondaryObjectives,
} from "../objective-assignment/secondary-objective-assignment-engine.js";

export interface GameEventServiceContent {
    readonly objectives:
    readonly Objective[];
}

export const MANUAL_REPORT_TYPES = [
    "POTION_USED",
    "CURSE_ADDED",
    "GOLD_CHANGED",
    "RELIC_ACQUIRED",
    "BLOCK_GRANTED_TO_ALLY",
    "ENEMY_KILLED",
    "PLAYER_DIED",
    "BOSS_DEFEATED",
    "ACT_COMPLETED",
] as const;

export type ManualReportType =
    typeof MANUAL_REPORT_TYPES[number];

export function isManualReportType(
    value:
        string,
): value is ManualReportType {
    return (
        MANUAL_REPORT_TYPES
            .includes(
                value as ManualReportType,
            )
    );
}

export interface RecordManualReportInput {
    readonly gameId:
    string;

    readonly reporterDiscordUserId:
    string;

    readonly reportType:
    ManualReportType;

    readonly targetDiscordUserId?:
    string;

    readonly value?:
    number;
}

export interface RecordGameEventInput {
    readonly id?:
    string;

    readonly gameId:
    string;

    readonly type:
    EventType;

    readonly actNumber?:
    GameAct;

    readonly actorPlayerId?:
    string;

    readonly targetPlayerId?:
    string;

    readonly payload?:
    EventPayload;

    readonly source:
    EventSource;

    readonly validationStatus:
    ValidationStatus;

    readonly createdAt?:
    Date;
}

export class GameEventService {
    public constructor(
        private readonly content:
            GameEventServiceContent,

        private readonly gameRepository:
            GameRepository,

        private readonly eventRepository:
            GameEventRepository,
    ) { }

    public async recordManualReport(
        input:
            RecordManualReportInput,
    ): Promise<GameEvent> {
        const session =
            await this.getSession(
                input.gameId,
            );

        if (
            session.trackingMode
            !== "MANUAL"
        ) {
            throw new Error(
                "Manual reports are only available in MANUAL tracking mode.",
            );
        }

        if (
            session.game.state
            !== "ACTIVE"
        ) {
            throw new Error(
                "Manual reports can only be submitted during an active game.",
            );
        }

        const reporter =
            this.findPlayerByDiscordUserId(
                session,
                input.reporterDiscordUserId,
            );

        const target =
            input.targetDiscordUserId
                === undefined
                ? undefined
                : this.findPlayerByDiscordUserId(
                    session,
                    input.targetDiscordUserId,
                );

        switch (
        input.reportType
        ) {
            case "POTION_USED":
            case "CURSE_ADDED":
            case "RELIC_ACQUIRED":
            case "ENEMY_KILLED":
            case "BOSS_DEFEATED": {
                this.assertNoTarget(
                    target,
                    input.reportType,
                );

                this.assertNoValue(
                    input.value,
                    input.reportType,
                );

                return this.recordEvent({
                    gameId:
                        input.gameId,

                    type:
                        input.reportType,

                    actorPlayerId:
                        reporter.id,

                    source:
                        "MANUAL",

                    validationStatus:
                        "VERIFIED",
                });
            }

            case "GOLD_CHANGED": {
                this.assertNoTarget(
                    target,
                    input.reportType,
                );

                const value =
                    this.requireIntegerValue(
                        input.value,
                        0,
                        "L'or actuel",
                    );

                return this.recordEvent({
                    gameId:
                        input.gameId,

                    type:
                        "GOLD_CHANGED",

                    actorPlayerId:
                        reporter.id,

                    payload: {
                        current:
                            value,
                    },

                    source:
                        "MANUAL",

                    validationStatus:
                        "VERIFIED",
                });
            }

            case "BLOCK_GRANTED_TO_ALLY": {
                if (
                    target === undefined
                ) {
                    throw new Error(
                        "Vous devez sélectionner le joueur qui a reçu le bloc.",
                    );
                }

                if (
                    target.id
                    === reporter.id
                ) {
                    throw new Error(
                        "Le bloc doit avoir été accordé à un autre joueur.",
                    );
                }

                const value =
                    this.requireIntegerValue(
                        input.value,
                        1,
                        "Le montant de bloc",
                    );

                return this.recordEvent({
                    gameId:
                        input.gameId,

                    type:
                        "BLOCK_GRANTED_TO_ALLY",

                    actorPlayerId:
                        reporter.id,

                    targetPlayerId:
                        target.id,

                    payload: {
                        amount:
                            value,
                    },

                    source:
                        "MANUAL",

                    validationStatus:
                        "VERIFIED",
                });
            }

            case "PLAYER_DIED": {
                if (
                    target === undefined
                ) {
                    throw new Error(
                        "Vous devez sélectionner le joueur mort.",
                    );
                }

                this.assertNoValue(
                    input.value,
                    input.reportType,
                );

                return this.recordEvent({
                    gameId:
                        input.gameId,

                    type:
                        "PLAYER_DIED",

                    targetPlayerId:
                        target.id,

                    source:
                        "MANUAL",

                    validationStatus:
                        "VERIFIED",
                });
            }

            case "ACT_COMPLETED": {
                this.assertNoTarget(
                    target,
                    input.reportType,
                );

                this.assertNoValue(
                    input.value,
                    input.reportType,
                );

                if (
                    input.reporterDiscordUserId
                    !== session.hostDiscordUserId
                ) {
                    throw new Error(
                        "Seul l'hôte peut déclarer la fin d'un acte.",
                    );
                }

                return this.recordEvent({
                    gameId:
                        input.gameId,

                    type:
                        "ACT_COMPLETED",

                    source:
                        "MANUAL",

                    validationStatus:
                        "VERIFIED",
                });
            }
        }
    }

    public async recordEvent(
        input:
            RecordGameEventInput,
    ): Promise<GameEvent> {
        const session =
            await this.getSession(
                input.gameId,
            );

        if (
            session.game.state
            !== "ACTIVE"
            && session.game.state
            !== "VOTING"
        ) {
            throw new Error(
                "Game events can only be recorded during an active game.",
            );
        }

        this.assertPlayerReference(
            session,
            input.actorPlayerId,
            "actor",
        );

        this.assertPlayerReference(
            session,
            input.targetPlayerId,
            "target",
        );

        const actNumber =
            input.actNumber
            ?? session.game.currentAct;

        const event:
            GameEvent = {
            id:
                input.id
                ?? randomUUID(),

            gameId:
                input.gameId,

            type:
                input.type,

            ...(
                actNumber === undefined
                    ? {}
                    : {
                        actNumber,
                    }
            ),

            ...(
                input.actorPlayerId
                    === undefined
                    ? {}
                    : {
                        actorPlayerId:
                            input.actorPlayerId,
                    }
            ),

            ...(
                input.targetPlayerId
                    === undefined
                    ? {}
                    : {
                        targetPlayerId:
                            input.targetPlayerId,
                    }
            ),

            payload:
                input.payload
                ?? {},

            source:
                input.source,

            validationStatus:
                input.validationStatus,

            createdAt:
                input.createdAt
                ?? new Date(),
        };

        await this.eventRepository
            .append(
                event,
            );

        if (
            event.validationStatus
            === "VERIFIED"
        ) {
            await this.applyVerifiedEventBeforeEvaluation(
                event,
            );

            await this.rebuildObjectivesForGame(
                event.gameId,
            );

            await this.applyVerifiedEventAfterEvaluation(
                event,
            );
        }

        return event;
    }

    public async verifyEvent(
        eventId:
            string,
    ): Promise<GameEvent> {
        const event =
            await this.getEvent(
                eventId,
            );

        const verified =
            verifyGameEvent(
                event,
            );

        await this.eventRepository
            .setValidationStatus(
                eventId,
                verified.validationStatus,
            );

        await this.applyVerifiedEventBeforeEvaluation(
            verified,
        );

        await this.rebuildObjectivesForGame(
            event.gameId,
        );

        await this.applyVerifiedEventAfterEvaluation(
            verified,
        );

        return verified;
    }

    public async rejectEvent(
        eventId:
            string,
    ): Promise<GameEvent> {
        const event =
            await this.getEvent(
                eventId,
            );

        const rejected =
            rejectGameEvent(
                event,
            );

        await this.eventRepository
            .setValidationStatus(
                eventId,
                rejected.validationStatus,
            );

        return rejected;
    }

    public async rebuildObjectivesForGame(
        gameId:
            string,
    ): Promise<void> {
        const session =
            await this.getSession(
                gameId,
            );

        const events =
            await this.eventRepository
                .findByGameId(
                    gameId,
                );

        const players =
            session.game
                .getPlayers();

        for (
            const player
            of players
        ) {
            const assignments =
                session.game
                    .getObjectiveAssignmentsForPlayer(
                        player.id,
                    );

            const roleAssignment =
                session.game
                    .getRoleAssignmentForPlayer(
                        player.id,
                    );

            const powerAssignment =
                session.game
                    .getPowerAssignmentForPlayer(
                        player.id,
                    );

            for (
                const assignment
                of assignments
            ) {
                const objective =
                    this.content
                        .objectives
                        .find(
                            candidate =>
                                candidate.code
                                === assignment.objectiveCode,
                        );

                if (
                    objective === undefined
                ) {
                    throw new Error(
                        `Unknown objective definition: ${assignment.objectiveCode}`,
                    );
                }

                /*
                 * Les anciennes fixtures sans règle
                 * restent autorisées pour le moment.
                 */
                if (
                    objective.rule
                    === undefined
                ) {
                    continue;
                }

                /*
                 * Le résultat final de l'expédition
                 * n'est pas encore modélisé.
                 *
                 * On ne doit donc pas faire échouer
                 * prématurément un objectif qui en
                 * dépend.
                 */
                if (
                    objective.rule.type
                    === "CONDITION"
                    && objective.rule
                        .conditions
                        .some(
                            condition =>
                                condition.type
                                === "EXPEDITION_RESULT",
                        )
                ) {
                    continue;
                }

                const evaluation =
                    evaluateObjective({
                        objective,
                        assignment,

                        events,

                        players,

                        roleTargetPlayerIds:
                            roleAssignment
                                ?.targetPlayerIds
                            ?? [],

                        powerTargetPlayerIds:
                            powerAssignment
                                ?.targetPlayerIds
                            ?? [],

                        gameFinished:
                            session.game.state
                            === "FINISHED",
                    });

                applyObjectiveEvaluation(
                    assignment,
                    evaluation,
                );

                session.game
                    .replaceObjectiveAssignment(
                        assignment,
                    );
            }
        }

        await this.gameRepository
            .save(
                session,
            );
    }

    private async applyVerifiedEventBeforeEvaluation(
        event:
            GameEvent,
    ): Promise<void> {
        if (
            event.type
            !== "PLAYER_DIED"
        ) {
            return;
        }

        const targetPlayerId =
            event.targetPlayerId;

        if (
            targetPlayerId
            === undefined
        ) {
            throw new Error(
                "PLAYER_DIED requires a target player.",
            );
        }

        const session =
            await this.getSession(
                event.gameId,
            );

        session.game
            .markPlayerDead(
                targetPlayerId,
            );

        await this.gameRepository
            .save(
                session,
            );
    }

    private async applyVerifiedEventAfterEvaluation(
        event:
            GameEvent,
    ): Promise<void> {
        if (
            event.type
            !== "ACT_COMPLETED"
        ) {
            return;
        }

        const completedAct =
            event.actNumber;

        if (
            completedAct === undefined
        ) {
            throw new Error(
                "ACT_COMPLETED requires an act number.",
            );
        }

        /*
         * L'acte 3 n'a pas d'acte suivant.
         * L'événement reste toutefois utile
         * pour résoudre les objectifs de l'acte 3.
         */
        if (
            completedAct === 3
        ) {
            return;
        }

        const session =
            await this.getSession(
                event.gameId,
            );

        /*
         * Si l'acte a déjà été avancé,
         * l'opération est idempotente.
         */
        if (
            session.game.currentAct
            !== completedAct
        ) {
            return;
        }

        const nextAct:
            GameAct =
            completedAct === 1
                ? 2
                : 3;

        const secondaryAssignments =
            assignSecondaryObjectives({
                seed:
                    session.seed,

                players:
                    session.game
                        .getPlayers(),

                objectives:
                    this.content
                        .objectives,

                actNumber:
                    nextAct,

                trackingMode:
                    session.trackingMode,
            });

        session.game.advanceAct(
            nextAct,
            secondaryAssignments,
        );

        await this.gameRepository
            .save(
                session,
            );
    }

    private findPlayerByDiscordUserId(
        session:
            GameSession,

        discordUserId:
            string,
    ): GamePlayer {
        const player =
            session.game
                .getPlayers()
                .find(
                    candidate =>
                        candidate.discordUserId
                        === discordUserId,
                );

        if (
            player === undefined
        ) {
            throw new Error(
                "Discord user is not part of this game.",
            );
        }

        return player;
    }

    private assertNoTarget(
        target:
            GamePlayer | undefined,

        reportType:
            ManualReportType,
    ): void {
        if (
            target !== undefined
        ) {
            throw new Error(
                `Le rapport ${reportType} n'accepte pas de joueur cible.`,
            );
        }
    }

    private assertNoValue(
        value:
            number | undefined,

        reportType:
            ManualReportType,
    ): void {
        if (
            value !== undefined
        ) {
            throw new Error(
                `Le rapport ${reportType} n'accepte pas de valeur numérique.`,
            );
        }
    }

    private requireIntegerValue(
        value:
            number | undefined,

        minimum:
            number,

        label:
            string,
    ): number {
        if (
            value === undefined
        ) {
            throw new Error(
                `${label} est obligatoire.`,
            );
        }

        if (
            !Number.isInteger(
                value,
            )
            || value < minimum
        ) {
            throw new Error(
                `${label} doit être un entier supérieur ou égal à ${minimum}.`,
            );
        }

        return value;
    }

    private async getSession(
        gameId:
            string,
    ): Promise<GameSession> {
        const session =
            await this.gameRepository
                .findById(
                    gameId,
                );

        if (
            session === undefined
        ) {
            throw new Error(
                `Unknown game: ${gameId}`,
            );
        }

        return session;
    }

    private async getEvent(
        eventId:
            string,
    ): Promise<GameEvent> {
        const event =
            await this.eventRepository
                .findById(
                    eventId,
                );

        if (
            event === undefined
        ) {
            throw new Error(
                `Unknown game event: ${eventId}`,
            );
        }

        return event;
    }

    private assertPlayerReference(
        session:
            GameSession,

        playerId:
            string | undefined,

        kind:
            "actor" | "target",
    ): void {
        if (
            playerId === undefined
        ) {
            return;
        }

        const exists =
            session.game
                .getPlayers()
                .some(
                    player =>
                        player.id
                        === playerId,
                );

        if (
            !exists
        ) {
            throw new Error(
                `Game event references unknown ${kind} player: ${playerId}`,
            );
        }
    }
}