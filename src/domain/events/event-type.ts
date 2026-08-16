export const EVENT_TYPES = [
    "PLAYER_DIED",
    "PLAYER_HP_CHANGED",
    "CURSE_ADDED",
    "GOLD_CHANGED",
    "RELIC_ACQUIRED",
    "BOSS_DEFEATED",
    "ACT_COMPLETED",
    "PLAYER_MUTED",
    "VOTE_CAST",
    "POWER_USED",
    "POTION_USED",
    "BLOCK_GRANTED_TO_ALLY",
    "ENEMY_KILLED",
] as const;

export type EventType = typeof EVENT_TYPES[number];