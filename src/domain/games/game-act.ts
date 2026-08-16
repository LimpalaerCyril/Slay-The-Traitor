export type GameAct =
  | 1
  | 2
  | 3;

export function isGameAct(
  value: number,
): value is GameAct {
  return (
    value === 1
    || value === 2
    || value === 3
  );
}