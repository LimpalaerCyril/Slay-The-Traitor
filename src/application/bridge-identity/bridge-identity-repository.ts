export type BridgePlatform =
    "STEAM";

export interface BridgeLinkCode {
    readonly code:
        string;

    readonly discordUserId:
        string;

    readonly createdAt:
        Date;

    readonly expiresAt:
        Date;

    readonly consumedAt:
        Date | undefined;
}

export interface PlatformIdentityLink {
    readonly id:
        number;

    readonly discordUserId:
        string;

    readonly platform:
        BridgePlatform;

    readonly platformPlayerId:
        string;

    readonly platformName:
        string;

    readonly createdAt:
        Date;

    readonly updatedAt:
        Date;
}

export interface IssueBridgeLinkCodeInput {
    readonly code:
        string;

    readonly discordUserId:
        string;

    readonly createdAt:
        Date;

    readonly expiresAt:
        Date;
}

export interface ClaimBridgeIdentityInput {
    readonly code:
        string;

    readonly platform:
        BridgePlatform;

    readonly platformPlayerId:
        string;

    readonly platformName:
        string;

    readonly credentialId:
        string;

    readonly tokenHash:
        string;

    readonly bridgeVersion:
        string;

    readonly gameVersion:
        string;

    readonly claimedAt:
        Date;
}

export type ClaimBridgeIdentityResult =
    | {
        readonly status:
            "CLAIMED";

        readonly identity:
            PlatformIdentityLink;
    }
    | {
        readonly status:
            "CODE_NOT_FOUND";
    }
    | {
        readonly status:
            "CODE_EXPIRED";
    }
    | {
        readonly status:
            "CODE_ALREADY_USED";
    }
    | {
        readonly status:
            "PLATFORM_ALREADY_LINKED";
    }
    | {
        readonly status:
            "DISCORD_ALREADY_LINKED";
    };

export interface BridgeIdentityRepository {
    issueLinkCode(
        input:
            IssueBridgeLinkCodeInput,
    ): Promise<void>;

    claimIdentity(
        input:
            ClaimBridgeIdentityInput,
    ): Promise<
        ClaimBridgeIdentityResult
    >;

    findIdentityByDiscordUserId(
        discordUserId:
            string,

        platform:
            BridgePlatform,
    ): Promise<
        PlatformIdentityLink
        | undefined
    >;

    authenticateCredential(
        tokenHash:
            string,

        usedAt:
            Date,
    ): Promise<
        PlatformIdentityLink
        | undefined
    >;
}