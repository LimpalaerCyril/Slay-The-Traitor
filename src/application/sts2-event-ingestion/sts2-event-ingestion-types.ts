import type {
    EventPayload,
} from "../../domain/events/game-events.js";

import type {
    GameAct,
} from "../../domain/games/game-act.js";

export type Sts2ModEventType =
    | "POTION_USED"
    | "GOLD_CHANGED"
    | "RELIC_ACQUIRED"
    | "PLAYER_HP_CHANGED"
    | "PLAYER_DIED"
    | "BOSS_DEFEATED"
    | "ACT_COMPLETED";

export interface Sts2PotionUsedEvent {
    readonly type:
        "POTION_USED";

    readonly actNumber:
        GameAct;

    readonly actorPlatformPlayerId:
        string;

    readonly payload: {
        readonly potionId:
            string;
    };
}

export interface Sts2GoldChangedEvent {
    readonly type:
        "GOLD_CHANGED";

    readonly actNumber:
        GameAct;

    readonly actorPlatformPlayerId:
        string;

    readonly payload: {
        readonly current:
            number;

        readonly delta:
            number;
    };
}

export interface Sts2RelicAcquiredEvent {
    readonly type:
        "RELIC_ACQUIRED";

    readonly actNumber:
        GameAct;

    readonly actorPlatformPlayerId:
        string;

    readonly payload: {
        readonly relicId:
            string;
    };
}

export interface Sts2PlayerHpChangedEvent {
    readonly type:
        "PLAYER_HP_CHANGED";

    readonly actNumber:
        GameAct;

    readonly targetPlatformPlayerId:
        string;

    readonly payload: {
        readonly previous:
            number;

        readonly current:
            number;

        readonly delta:
            number;

        readonly maxHp:
            number;

        readonly alive:
            boolean;
    };
}

export interface Sts2PlayerDiedEvent {
    readonly type:
        "PLAYER_DIED";

    readonly actNumber:
        GameAct;

    readonly targetPlatformPlayerId:
        string;

    readonly payload:
        Readonly<Record<string, never>>;
}

export interface Sts2BossDefeatedEvent {
    readonly type:
        "BOSS_DEFEATED";

    readonly actNumber:
        GameAct;

    readonly payload: {
        readonly bossId:
            string;
    };
}

export interface Sts2ActCompletedEvent {
    readonly type:
        "ACT_COMPLETED";

    readonly actNumber:
        GameAct;

    readonly payload:
        Readonly<Record<string, never>>;
}

export type Sts2ModEvent =
    | Sts2PotionUsedEvent
    | Sts2GoldChangedEvent
    | Sts2RelicAcquiredEvent
    | Sts2PlayerHpChangedEvent
    | Sts2PlayerDiedEvent
    | Sts2BossDefeatedEvent
    | Sts2ActCompletedEvent;

export interface SequencedSts2ModEvent {
    readonly sequence:
        number;

    readonly occurredAt:
        Date;

    readonly event:
        Sts2ModEvent;
}

export type Sts2EventIgnoreReason =
    | "LOCAL_PLAYER_AUTHORITY_REQUIRED"
    | "HOST_AUTHORITY_REQUIRED";

export interface IgnoredSts2Event {
    readonly sequence:
        number;

    readonly type:
        Sts2ModEventType;

    readonly reason:
        Sts2EventIgnoreReason;
}

export interface AcceptedSts2GameEvent {
    readonly type:
        Sts2ModEventType;

    readonly actNumber:
        GameAct;

    readonly actorPlayerId?:
        string | undefined;

    readonly targetPlayerId?:
        string | undefined;

    readonly payload:
        EventPayload;

    readonly createdAt:
        Date;
}

export type Sts2EventPersistenceDisposition =
    | {
        readonly kind:
            "ACCEPT";

        readonly fingerprint:
            string;

        readonly source:
            SequencedSts2ModEvent;

        readonly gameEvent:
            AcceptedSts2GameEvent;
    }
    | {
        readonly kind:
            "IGNORE";

        readonly fingerprint:
            string;

        readonly source:
            SequencedSts2ModEvent;

        readonly reason:
            Sts2EventIgnoreReason;
    };
