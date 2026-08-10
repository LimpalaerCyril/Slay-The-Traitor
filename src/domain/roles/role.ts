import type { Alignment } from "./alignment.js";

export interface Role {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly alignment: Alignment;
  readonly tags: readonly string[];
  readonly minimumPlayers: number;
  readonly maximumPlayers: number;
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