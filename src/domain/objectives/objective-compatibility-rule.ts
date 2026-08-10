export type SamePlayerCompatibility =
  | "ALLOWED"
  | "FORBIDDEN";

export interface ObjectiveCompatibilityRule {
  readonly leftTag: string;
  readonly rightTag: string;

  readonly samePlayer: SamePlayerCompatibility;

  readonly partyContradictionCost: number;
}