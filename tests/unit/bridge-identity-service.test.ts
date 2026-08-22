import { describe, expect, it } from "vitest";

import { BridgeIdentityService } from "../../src/application/bridge-identity/bridge-identity-service.js";

import type {
  BridgeIdentityRepository,
  BridgePlatform,
  ClaimBridgeIdentityInput,
  ClaimBridgeIdentityResult,
  IssueBridgeLinkCodeInput,
  PlatformIdentityLink,
} from "../../src/application/bridge-identity/bridge-identity-repository.js";

class TestBridgeIdentityRepository implements BridgeIdentityRepository {
  public issued: IssueBridgeLinkCodeInput | undefined;

  public claimed: ClaimBridgeIdentityInput | undefined;

  public async issueLinkCode(input: IssueBridgeLinkCodeInput): Promise<void> {
    this.issued = input;
  }

  public async claimIdentity(
    input: ClaimBridgeIdentityInput,
  ): Promise<ClaimBridgeIdentityResult> {
    this.claimed = input;

    return {
      status: "CLAIMED",

      identity: {
        id: 1,

        discordUserId: "discord-alice",

        platform: input.platform,

        platformPlayerId: input.platformPlayerId,

        platformName: input.platformName,

        createdAt: input.claimedAt,

        updatedAt: input.claimedAt,
      },
    };
  }

  public async findIdentityByDiscordUserId(
    _discordUserId: string,

    _platform: BridgePlatform,
  ): Promise<PlatformIdentityLink | undefined> {
    return undefined;
  }

  public async authenticateCredential(
    _tokenHash: string,

    _usedAt: Date,
  ): Promise<PlatformIdentityLink | undefined> {
    return undefined;
  }
}

describe("BridgeIdentityService", () => {
  it("creates an eight-character expiring link code", async () => {
    const repository = new TestBridgeIdentityRepository();

    const now = new Date("2026-08-18T18:00:00.000Z");

    const service = new BridgeIdentityService(
      repository,

      () => now,
    );

    const result = await service.createLinkCode("discord-alice");

    expect(result.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);

    expect(result.expiresAt.getTime()).toBe(now.getTime() + 10 * 60 * 1000);

    expect(repository.issued?.discordUserId).toBe("discord-alice");
  });

  it("returns a bridge token but persists only its hash", async () => {
    const repository = new TestBridgeIdentityRepository();

    const service = new BridgeIdentityService(repository);

    const result = await service.claimIdentity({
      code: "ABCDEFGH",

      platform: "STEAM",

      platformPlayerId: "76561198000000000",

      platformName: "Alice",

      bridgeVersion: "0.1.0",

      gameVersion: "test",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected claim success.");
    }

    expect(result.bridgeToken.startsWith("sttb_v1_")).toBe(true);

    expect(repository.claimed?.tokenHash).not.toBe(result.bridgeToken);

    expect(repository.claimed?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
