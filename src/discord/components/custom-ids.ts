export const CustomId = {
  lobbyJoin(
    gameId: string,
  ): string {
    return `spire:lobby:join:${gameId}`;
  },

  lobbyLeave(
    gameId: string,
  ): string {
    return `spire:lobby:leave:${gameId}`;
  },

  lobbyPrepare(
    gameId: string,
  ): string {
    return `spire:lobby:prepare:${gameId}`;
  },

  lobbyStart(
    gameId: string,
  ): string {
    return `spire:lobby:start:${gameId}`;
  },

  roleSetupOpen(
    gameId: string,
  ): string {
    return `spire:setup:open:${gameId}`;
  },

  roleSetupVariant(
    gameId: string,
    variantCode: string,
  ): string {
    return [
      "spire",
      "setup",
      "variant",
      gameId,
      variantCode,
    ].join(":");
  },

  roleSetupTarget(
    gameId: string,
    variantCode: string,
  ): string {
    return [
      "spire",
      "setup",
      "target",
      gameId,
      variantCode,
    ].join(":");
  },

  powerSetupOpen(
    gameId: string,
  ): string {
    return `spire:power:setup:${gameId}`;
  },

  powerSetupTarget(
    gameId: string,
  ): string {
    return `spire:power:target:${gameId}`;
  },

  characterSelect(
    gameId: string,
    lobbyMessageId: string,
  ): string {
    return [
      "spire",
      "lobby",
      "character",
      gameId,
      lobbyMessageId,
    ].join(":");
  },

  secretView(
    gameId: string,
  ): string {
    return `spire:secret:view:${gameId}`;
  },
} as const;

export interface ParsedCustomId {
  readonly scope: string;
  readonly action: string;
  readonly gameId: string;
  readonly extra:
  readonly string[];
}

export function parseCustomId(
  customId: string,
): ParsedCustomId | undefined {
  const parts =
    customId.split(":");

  if (
    parts.length < 4
    || parts[0] !== "spire"
  ) {
    return undefined;
  }

  const scope = parts[1];
  const action = parts[2];
  const gameId = parts[3];

  if (
    scope === undefined
    || action === undefined
    || gameId === undefined
  ) {
    return undefined;
  }

  return {
    scope,
    action,
    gameId,
    extra:
      parts.slice(4),
  };
}