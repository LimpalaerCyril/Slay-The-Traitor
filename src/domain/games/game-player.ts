export interface GamePlayer {
  readonly id: string;
  readonly discordUserId: string;
  readonly characterSlug: string;
  readonly alive: boolean;
}