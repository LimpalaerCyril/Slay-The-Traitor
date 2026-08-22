import {
    and,
    eq,
    isNull,
} from "drizzle-orm";

import type {
    BridgeIdentityRepository,
    BridgePlatform,
    ClaimBridgeIdentityInput,
    ClaimBridgeIdentityResult,
    IssueBridgeLinkCodeInput,
    PlatformIdentityLink,
} from "../../application/bridge-identity/bridge-identity-repository.js";

import type {
    Database,
} from "./database.js";

import {
    bridgeCredentialsTable,
    bridgeLinkCodesTable,
    platformIdentityLinksTable,
} from "./schema.js";

function mapIdentity(
    row:
        typeof platformIdentityLinksTable
            .$inferSelect,
): PlatformIdentityLink {
    return {
        id:
            row.id,

        discordUserId:
            row.discordUserId,

        platform:
            row.platform,

        platformPlayerId:
            row.platformPlayerId,

        platformName:
            row.platformName,

        createdAt:
            row.createdAt,

        updatedAt:
            row.updatedAt,
    };
}

export class PostgresBridgeIdentityRepository
implements BridgeIdentityRepository {
    public constructor(
        private readonly db:
            Database,
    ) { }

    public async issueLinkCode(
        input:
            IssueBridgeLinkCodeInput,
    ): Promise<void> {
        await this.db.transaction(
            async transaction => {
                /*
                 * Tout ancien code encore actif
                 * devient inutilisable.
                 *
                 * /spire link génère donc
                 * toujours un seul code courant.
                 */
                await transaction
                    .update(
                        bridgeLinkCodesTable,
                    )
                    .set({
                        consumedAt:
                            input.createdAt,
                    })
                    .where(
                        and(
                            eq(
                                bridgeLinkCodesTable
                                    .discordUserId,
                                input.discordUserId,
                            ),

                            isNull(
                                bridgeLinkCodesTable
                                    .consumedAt,
                            ),
                        ),
                    );

                await transaction
                    .insert(
                        bridgeLinkCodesTable,
                    )
                    .values({
                        code:
                            input.code,

                        discordUserId:
                            input.discordUserId,

                        createdAt:
                            input.createdAt,

                        expiresAt:
                            input.expiresAt,
                    });
            },
        );
    }

    public async claimIdentity(
        input:
            ClaimBridgeIdentityInput,
    ): Promise<
        ClaimBridgeIdentityResult
    > {
        return this.db.transaction(
            async transaction => {
                const codeRows =
                    await transaction
                        .select()
                        .from(
                            bridgeLinkCodesTable,
                        )
                        .where(
                            eq(
                                bridgeLinkCodesTable
                                    .code,
                                input.code,
                            ),
                        )
                        .limit(
                            1,
                        )
                        .for(
                            "update",
                        );

                const codeRow =
                    codeRows[0];

                if (
                    codeRow === undefined
                ) {
                    return {
                        status:
                            "CODE_NOT_FOUND",
                    };
                }

                if (
                    codeRow.consumedAt
                    !== null
                ) {
                    return {
                        status:
                            "CODE_ALREADY_USED",
                    };
                }

                if (
                    codeRow.expiresAt
                        .getTime()
                    <= input.claimedAt
                        .getTime()
                ) {
                    return {
                        status:
                            "CODE_EXPIRED",
                    };
                }

                /*
                 * Vérifie qu'un SteamID
                 * n'appartient pas déjà à
                 * un autre compte Discord.
                 */
                const existingPlatformRows =
                    await transaction
                        .select()
                        .from(
                            platformIdentityLinksTable,
                        )
                        .where(
                            and(
                                eq(
                                    platformIdentityLinksTable
                                        .platform,
                                    input.platform,
                                ),

                                eq(
                                    platformIdentityLinksTable
                                        .platformPlayerId,
                                    input.platformPlayerId,
                                ),
                            ),
                        )
                        .limit(
                            1,
                        );

                const existingPlatform =
                    existingPlatformRows[0];

                if (
                    existingPlatform
                    !== undefined
                    && existingPlatform
                        .discordUserId
                    !== codeRow.discordUserId
                ) {
                    return {
                        status:
                            "PLATFORM_ALREADY_LINKED",
                    };
                }

                /*
                 * Vérifie également qu'un
                 * utilisateur Discord ne change
                 * pas silencieusement de SteamID.
                 */
                const existingDiscordRows =
                    await transaction
                        .select()
                        .from(
                            platformIdentityLinksTable,
                        )
                        .where(
                            and(
                                eq(
                                    platformIdentityLinksTable
                                        .discordUserId,
                                    codeRow.discordUserId,
                                ),

                                eq(
                                    platformIdentityLinksTable
                                        .platform,
                                    input.platform,
                                ),
                            ),
                        )
                        .limit(
                            1,
                        );

                const existingDiscord =
                    existingDiscordRows[0];

                if (
                    existingDiscord
                    !== undefined
                    && existingDiscord
                        .platformPlayerId
                    !== input.platformPlayerId
                ) {
                    return {
                        status:
                            "DISCORD_ALREADY_LINKED",
                    };
                }

                let identity:
                    PlatformIdentityLink;

                if (
                    existingDiscord
                    !== undefined
                ) {
                    const updatedRows =
                        await transaction
                            .update(
                                platformIdentityLinksTable,
                            )
                            .set({
                                platformName:
                                    input.platformName,

                                updatedAt:
                                    input.claimedAt,
                            })
                            .where(
                                eq(
                                    platformIdentityLinksTable
                                        .id,
                                    existingDiscord.id,
                                ),
                            )
                            .returning();

                    const updated =
                        updatedRows[0];

                    if (
                        updated === undefined
                    ) {
                        throw new Error(
                            "Unable to update platform identity.",
                        );
                    }

                    identity =
                        mapIdentity(
                            updated,
                        );
                } else {
                    const insertedRows =
                        await transaction
                            .insert(
                                platformIdentityLinksTable,
                            )
                            .values({
                                discordUserId:
                                    codeRow.discordUserId,

                                platform:
                                    input.platform,

                                platformPlayerId:
                                    input.platformPlayerId,

                                platformName:
                                    input.platformName,

                                createdAt:
                                    input.claimedAt,

                                updatedAt:
                                    input.claimedAt,
                            })
                            .returning();

                    const inserted =
                        insertedRows[0];

                    if (
                        inserted === undefined
                    ) {
                        throw new Error(
                            "Unable to create platform identity.",
                        );
                    }

                    identity =
                        mapIdentity(
                            inserted,
                        );
                }

                /*
                 * Une nouvelle liaison/réinstallation
                 * invalide l'ancien credential.
                 *
                 * Pour la V1 :
                 * 1 identité = 1 token actif.
                 */
                await transaction
                    .update(
                        bridgeCredentialsTable,
                    )
                    .set({
                        revokedAt:
                            input.claimedAt,
                    })
                    .where(
                        and(
                            eq(
                                bridgeCredentialsTable
                                    .identityLinkId,
                                identity.id,
                            ),

                            isNull(
                                bridgeCredentialsTable
                                    .revokedAt,
                            ),
                        ),
                    );

                await transaction
                    .insert(
                        bridgeCredentialsTable,
                    )
                    .values({
                        id:
                            input.credentialId,

                        identityLinkId:
                            identity.id,

                        tokenHash:
                            input.tokenHash,

                        bridgeVersion:
                            input.bridgeVersion,

                        gameVersion:
                            input.gameVersion,

                        createdAt:
                            input.claimedAt,
                    });

                await transaction
                    .update(
                        bridgeLinkCodesTable,
                    )
                    .set({
                        consumedAt:
                            input.claimedAt,
                    })
                    .where(
                        eq(
                            bridgeLinkCodesTable
                                .code,
                            input.code,
                        ),
                    );

                return {
                    status:
                        "CLAIMED",

                    identity,
                };
            },
        );
    }

    public async findIdentityByDiscordUserId(
        discordUserId:
            string,

        platform:
            BridgePlatform,
    ): Promise<
        PlatformIdentityLink
        | undefined
    > {
        const rows =
            await this.db
                .select()
                .from(
                    platformIdentityLinksTable,
                )
                .where(
                    and(
                        eq(
                            platformIdentityLinksTable
                                .discordUserId,
                            discordUserId,
                        ),

                        eq(
                            platformIdentityLinksTable
                                .platform,
                            platform,
                        ),
                    ),
                )
                .limit(
                    1,
                );

        const row =
            rows[0];

        return row === undefined
            ? undefined
            : mapIdentity(
                row,
            );
    }

    public async authenticateCredential(
        tokenHash:
            string,

        usedAt:
            Date,
    ): Promise<
        PlatformIdentityLink
        | undefined
    > {
        const rows =
            await this.db
                .select({
                    credentialId:
                        bridgeCredentialsTable
                            .id,

                    identity:
                        platformIdentityLinksTable,
                })
                .from(
                    bridgeCredentialsTable,
                )
                .innerJoin(
                    platformIdentityLinksTable,

                    eq(
                        bridgeCredentialsTable
                            .identityLinkId,
                        platformIdentityLinksTable
                            .id,
                    ),
                )
                .where(
                    and(
                        eq(
                            bridgeCredentialsTable
                                .tokenHash,
                            tokenHash,
                        ),

                        isNull(
                            bridgeCredentialsTable
                                .revokedAt,
                        ),
                    ),
                )
                .limit(
                    1,
                );

        const row =
            rows[0];

        if (
            row === undefined
        ) {
            return undefined;
        }

        await this.db
            .update(
                bridgeCredentialsTable,
            )
            .set({
                lastUsedAt:
                    usedAt,
            })
            .where(
                eq(
                    bridgeCredentialsTable
                        .id,
                    row.credentialId,
                ),
            );

        return mapIdentity(
            row.identity,
        );
    }
}