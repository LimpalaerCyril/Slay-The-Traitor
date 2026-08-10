export interface ContradictionRange {
  readonly minimum: number;
  readonly maximum: number;
}

export interface ContradictionBudget {
  readonly "2": ContradictionRange;
  readonly "3": ContradictionRange;
  readonly "4": ContradictionRange;
}

export function getContradictionRange(
  budget: ContradictionBudget,
  playerCount: number,
): ContradictionRange {
  switch (playerCount) {
    case 2:
      return budget["2"];

    case 3:
      return budget["3"];

    case 4:
      return budget["4"];

    default:
      throw new Error(
        "Contradiction budget only supports between two and four players.",
      );
  }
}