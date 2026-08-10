import type { EventType } from "../events/event-type.js";
import type { ObjectiveProgressRule } from "./objective-event-rule.js";
import type { ObjectiveType } from "./objective-type.js";
import type { VerificationMode } from "./verification-mode.js";

export type ObjectiveDifficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export interface Objective {
  readonly code: string;
  readonly name: string;
  readonly description: string;

  readonly category: string;
  readonly difficulty: ObjectiveDifficulty;

  readonly minimumPlayers: number;
  readonly maximumPlayers: number;

  readonly allowedTypes: readonly ObjectiveType[];

  readonly requiredEvents: readonly EventType[];
  readonly verificationMode: VerificationMode;

  readonly compatibilityTags: readonly string[];

  readonly score: number;
  readonly hiddenProgress: boolean;

  readonly progressRule?: ObjectiveProgressRule;
}

export function isObjectiveAvailableForPlayerCount(
  objective: Objective,
  playerCount: number,
): boolean {
  return (
    playerCount >= objective.minimumPlayers
    && playerCount <= objective.maximumPlayers
  );
}