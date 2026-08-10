function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export class SeededRandom {
  private state: number;

  public constructor(seed: string) {
    if (seed.trim().length === 0) {
      throw new Error("Seed cannot be empty.");
    }

    this.state = hashSeed(seed);
  }

  public next(): number {
    this.state = (
      Math.imul(this.state, 1664525)
      + 1013904223
    ) >>> 0;

    return this.state / 4294967296;
  }

  public nextInt(
    maxExclusive: number,
  ): number {
    if (
      !Number.isInteger(maxExclusive)
      || maxExclusive <= 0
    ) {
      throw new Error(
        "maxExclusive must be a positive integer.",
      );
    }

    return Math.floor(
      this.next() * maxExclusive,
    );
  }
}

export function shuffleWithSeed<T>(
  values: readonly T[],
  seed: string,
): T[] {
  const result = [...values];
  const random = new SeededRandom(seed);

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = random.nextInt(
      index + 1,
    );

    const currentValue = result[index]!;
    const randomValue = result[randomIndex]!;

    result[index] = randomValue;
    result[randomIndex] = currentValue;
  }

  return result;
}