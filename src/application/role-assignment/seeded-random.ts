function hashSeed(
  seed: string,
): number {
  let hash =
    2166136261;

  for (
    let index = 0;
    index < seed.length;
    index += 1
  ) {
    hash ^=
      seed.charCodeAt(
        index,
      );

    hash =
      Math.imul(
        hash,
        16777619,
      );
  }

  return hash >>> 0;
}

export function createSeededRandom(
  seed: string,
): () => number {
  let state =
    hashSeed(
      seed,
    );

  return () => {
    state =
      (
        Math.imul(
          state,
          1664525,
        )
        + 1013904223
      ) >>> 0;

    return (
      state
      / 4294967296
    );
  };
}

export function seededShuffle<T>(
  values: readonly T[],
  seed: string,
): T[] {
  const result =
    [...values];

  const random =
    createSeededRandom(
      seed,
    );

  for (
    let index =
      result.length - 1;
    index > 0;
    index -= 1
  ) {
    const targetIndex =
      Math.floor(
        random()
        * (index + 1),
      );

    const current =
      result[index];

    const target =
      result[targetIndex];

    if (
      current === undefined
      || target === undefined
    ) {
      throw new Error(
        "Unable to shuffle values.",
      );
    }

    result[index] =
      target;

    result[targetIndex] =
      current;
  }

  return result;
}