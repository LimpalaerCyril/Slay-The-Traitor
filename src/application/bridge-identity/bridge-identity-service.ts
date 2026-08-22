import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";

import type {
  BridgeIdentityRepository,
  BridgePlatform,
  PlatformIdentityLink,
} from "./bridge-identity-repository.js";

const LINK_CODE_LENGTH = 8;

const LINK_CODE_TTL_MS = 10 * 60 * 1000;

/*
 * Pas de 0/O, 1/I/L.
 *
 * Le joueur doit pouvoir recopier
 * facilement le code dans STS2.
 */
const LINK_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const BRIDGE_TOKEN_PREFIX = "sttb_v1_";

export interface BridgeLinkCodeResult {
  readonly code: string;

  readonly expiresAt: Date;
}

export interface ClaimBridgeIdentityServiceInput {
  readonly code: string;

  readonly platform: BridgePlatform;

  readonly platformPlayerId: string;

  readonly platformName: string;

  readonly bridgeVersion: string;

  readonly gameVersion: string;
}

export type ClaimBridgeIdentityServiceResult =
  | {
      readonly ok: true;

      readonly bridgeToken: string;

      readonly identity: PlatformIdentityLink;
    }
  | {
      readonly ok: false;

      readonly reason:
        | "CODE_NOT_FOUND"
        | "CODE_EXPIRED"
        | "CODE_ALREADY_USED"
        | "PLATFORM_ALREADY_LINKED"
        | "DISCORD_ALREADY_LINKED";
    };

export class BridgeIdentityService {
  public constructor(
    private readonly repository: BridgeIdentityRepository,

    private readonly now: () => Date = () => new Date(),
  ) {}

  public async createLinkCode(
    discordUserId: string,
  ): Promise<BridgeLinkCodeResult> {
    if (discordUserId.trim().length === 0) {
      throw new Error("Discord user id cannot be empty.");
    }

    const createdAt = this.now();

    const expiresAt = new Date(createdAt.getTime() + LINK_CODE_TTL_MS);

    const code = createHumanLinkCode();

    await this.repository.issueLinkCode({
      code,

      discordUserId,

      createdAt,

      expiresAt,
    });

    return {
      code,
      expiresAt,
    };
  }

  public async claimIdentity(
    input: ClaimBridgeIdentityServiceInput,
  ): Promise<ClaimBridgeIdentityServiceResult> {
    const claimedAt = this.now();

    const bridgeToken = createBridgeToken();

    const result = await this.repository.claimIdentity({
      code: input.code,

      platform: input.platform,

      platformPlayerId: input.platformPlayerId,

      platformName: input.platformName,

      credentialId: randomUUID(),

      tokenHash: hashBridgeToken(bridgeToken),

      bridgeVersion: input.bridgeVersion,

      gameVersion: input.gameVersion,

      claimedAt,
    });

    if (result.status !== "CLAIMED") {
      return {
        ok: false,

        reason: result.status,
      };
    }

    return {
      ok: true,

      bridgeToken,

      identity: result.identity,
    };
  }

  public async findIdentityByDiscordUserId(
    discordUserId: string,

    platform: BridgePlatform = "STEAM",
  ): Promise<PlatformIdentityLink | undefined> {
    return this.repository.findIdentityByDiscordUserId(discordUserId, platform);
  }

  public async authenticate(
    bridgeToken: string,
  ): Promise<PlatformIdentityLink | undefined> {
    if (!bridgeToken.startsWith(BRIDGE_TOKEN_PREFIX)) {
      return undefined;
    }

    return this.repository.authenticateCredential(
      hashBridgeToken(bridgeToken),

      this.now(),
    );
  }
}

function createHumanLinkCode(): string {
  let result = "";

  for (let index = 0; index < LINK_CODE_LENGTH; index += 1) {
    const alphabetIndex = randomInt(0, LINK_CODE_ALPHABET.length);

    result += LINK_CODE_ALPHABET[alphabetIndex];
  }

  return result;
}

function createBridgeToken(): string {
  return [BRIDGE_TOKEN_PREFIX, randomBytes(32).toString("base64url")].join("");
}

function hashBridgeToken(bridgeToken: string): string {
  return createHash("sha256").update(bridgeToken, "utf8").digest("hex");
}
