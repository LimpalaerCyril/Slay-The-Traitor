import type {
    Character,
} from "../../domain/characters/character.js";

import type {
    GamePlayer,
} from "../../domain/games/game-player.js";

import type {
    GameState,
} from "../../domain/games/game-state.js";

import type {
    GameTrackingMode,
} from "../../domain/games/game-tracking-mode.js";

import type {
    GameAct,
} from "../../domain/games/game-act.js";

import type {
    ContradictionBudget,
} from "../../domain/objectives/contradiction-budget.js";

import type {
    ObjectiveAssignment,
} from "../../domain/objectives/objective-assignments.js";

import type {
    ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import type {
    Objective,
} from "../../domain/objectives/objective.js";

import type {
    RoleAssignment,
} from "../../domain/roles/role-assignment.js";

import type {
    Role,
} from "../../domain/roles/role.js";

import type {
    Power,
} from "../../domain/powers/power.js";

import type {
    GameRepository,
    GameSession,
} from "../game-repository/game-repository.js";

import type {
    PowerAssignment,
} from "../../domain/powers/power-assignment.js";

import {
    Game,
} from "../../domain/games/game.js";

import {
    assignPrimaryObjectives,
} from "../objective-assignment/primary-objective-assignment-engine.js";

import {
    assignSecondaryObjectives,
} from "../objective-assignment/secondary-objective-assignment-engine.js";

import {
    assignRoles,
} from "../role-assignment/role-assignment-engine.js";

import {
    assignPowerAssignments,
} from "../power-engine/assign-power-assignments.js";

export interface GameServiceContent {
    readonly characters: readonly Character[];

    readonly roles: readonly Role[];

    readonly powers: readonly Power[];

    readonly objectives: readonly Objective[];

    readonly compatibilityRules: readonly ObjectiveCompatibilityRule[];

    readonly contradictionBudget: ContradictionBudget;
}

export interface CreateGameInput {
    readonly gameId: string;
    readonly guildId: string;
    readonly textChannelId: string;

    readonly voiceChannelId?: string;

    readonly hostDiscordUserId: string;

    readonly seed: string;

    readonly trackingMode?: GameTrackingMode;
}

export interface JoinGameInput {
    readonly gameId: string;

    readonly playerId: string;

    readonly discordUserId: string;

    readonly characterSlug: string;
}

export interface GameSnapshot {
    readonly id: string;

    readonly guildId: string;

    readonly textChannelId: string;

    readonly voiceChannelId: string | undefined;

    readonly lobbyMessageId: string | undefined;

    readonly hostDiscordUserId: string;

    readonly seed: string;

    readonly trackingMode: GameTrackingMode;

    readonly state: GameState;

    readonly currentAct: GameAct | undefined;

    readonly players: readonly GamePlayer[];

    readonly contradiction: number | undefined;
}

export interface RoleSetupTargetSnapshot {
    readonly playerId: string;

    readonly discordUserId: string;

    readonly characterSlug: string;
}

export interface RoleSetupVariantSnapshot {
    readonly code: string;

    readonly name: string;

    readonly description: string;

    readonly targetSelection:
    {
        readonly count: number;

        readonly allowSelf: boolean;
    } | undefined;
}

export interface RoleSetupSnapshot {
    readonly roleCode: string;

    readonly roleName: string;

    readonly roleDescription: string;

    readonly setupCompleted: boolean;

    readonly selectedVariantCode: string | undefined;

    readonly selectedTargetPlayerIds: readonly string[];

    readonly variants: readonly RoleSetupVariantSnapshot[];

    readonly targets: readonly RoleSetupTargetSnapshot[];

    readonly lovePartners: readonly RoleSetupTargetSnapshot[];
}

export interface PowerSetupSnapshot {
    readonly powerCode: string;

    readonly powerName: string;

    readonly powerDescription: string;

    readonly mode: Power["mode"];

    readonly setupCompleted: boolean;

    readonly selectedTargetPlayerIds: readonly string[];

    readonly targetSelection:
    {
        readonly count: number;

        readonly allowSelf: boolean;
    }
    | undefined;

    readonly targets: readonly RoleSetupTargetSnapshot[];
}

export interface PlayerObjectiveSecret {
    readonly assignment: ObjectiveAssignment;

    readonly objective: Objective;
}

export interface PlayerPowerSecret {
    readonly assignment: PowerAssignment;

    readonly power: Power;

    readonly targets: readonly GamePlayer[];
}

export interface PlayerSecrets {
    readonly playerId: string;

    readonly roleAssignment: RoleAssignment;

    readonly role: Role;

    readonly roleTargets: readonly GamePlayer[];

    readonly lovePartners: readonly GamePlayer[];

    readonly power: PlayerPowerSecret | undefined;

    readonly objectives: readonly PlayerObjectiveSecret[];
}

export interface PlayerReveal {
    readonly player:
    GamePlayer;

    readonly secrets:
    PlayerSecrets;
}

export class GameService {
    public constructor(
        private readonly content:
            GameServiceContent,

        private readonly repository:
            GameRepository,
    ) { }

    public getCharacters():
        readonly Character[] {
        return this.content.characters.map(
            character => ({
                ...character,
            }),
        );
    }

    public getCharacter(
        characterSlug: string,
    ): Character | undefined {
        const character =
            this.content.characters.find(
                candidate =>
                    candidate.slug
                    === characterSlug,
            );

        return character === undefined
            ? undefined
            : {
                ...character,
            };
    }

    public async createGame(
        input: CreateGameInput,
    ): Promise<GameSnapshot> {
        if (
            input.seed.trim().length
            === 0
        ) {
            throw new Error(
                "Game seed cannot be empty.",
            );
        }

        const gameWithSameId =
            await this.repository
                .findById(
                    input.gameId,
                );

        if (
            gameWithSameId !== undefined
        ) {
            throw new Error(
                `Game already exists: ${input.gameId}`,
            );
        }

        const existingGame =
            await this.repository
                .findOpenByChannel(
                    input.guildId,
                    input.textChannelId,
                );

        if (
            existingGame !== undefined
        ) {
            throw new Error(
                "A game is already open in this channel.",
            );
        }

        const session:
            GameSession = {
            id:
                input.gameId,

            guildId:
                input.guildId,

            textChannelId:
                input.textChannelId,

            voiceChannelId:
                input.voiceChannelId,

            lobbyMessageId:
                undefined,

            hostDiscordUserId:
                input.hostDiscordUserId,

            seed:
                input.seed,

            trackingMode:
                input.trackingMode
                ?? "MANUAL",

            contradiction:
                undefined,

            game:
                new Game(),
        };

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async joinGame(
        input: JoinGameInput,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                input.gameId,
            );

        this.assertCharacterExists(
            input.characterSlug,
        );

        session.game.addPlayer({
            id:
                input.playerId,

            discordUserId:
                input.discordUserId,

            characterSlug:
                input.characterSlug,

            alive:
                true,
        });

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async leaveGame(
        gameId: string,
        discordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        session.game.removePlayer(
            player.id,
        );

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async changeCharacter(
        gameId: string,
        discordUserId: string,
        characterSlug: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertCharacterExists(
            characterSlug,
        );

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        session.game.changeCharacter(
            player.id,
            characterSlug,
        );

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async prepareGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        if (
            session.game.state
            !== "LOBBY"
        ) {
            throw new Error(
                "Only a lobby game can be prepared.",
            );
        }

        const players =
            session.game.getPlayers();

        if (
            players.length < 2
        ) {
            throw new Error(
                "At least two players are required.",
            );
        }

        const eligibleRoles =
            this.getEligibleRoles(
                session.trackingMode,
            );

        const roleAssignments =
            assignRoles({
                seed:
                    session.seed,

                players,

                roles:
                    eligibleRoles,

                trackingMode:
                    session.trackingMode,
            });

        const powerAssignments =
            assignPowerAssignments({
                roleAssignments,

                roles:
                    this.content.roles,

                powers:
                    this.content.powers,

                trackingMode:
                    session.trackingMode,
            });

        session.game.beginSetup(
            roleAssignments,
            powerAssignments,
        );

        if (
            session.game
                .areSetupsComplete()
        ) {
            this.finalizeSetup(
                session,
            );
        }

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    private finalizeSetup(
        session:
            GameSession,
    ): void {
        const players =
            session.game
                .getPlayers();

        const roleAssignments =
            players.map(
                player => {
                    const assignment =
                        session.game
                            .getRoleAssignmentForPlayer(
                                player.id,
                            );

                    if (
                        assignment
                        === undefined
                    ) {
                        throw new Error(
                            `No role assignment found for player ${player.id}.`,
                        );
                    }

                    return assignment;
                },
            );

        const primaryAssignments =
            assignPrimaryObjectives({
                players,

                roleAssignments,

                roles:
                    this.content.roles,

                objectives:
                    this.content.objectives,

                trackingMode:
                    session.trackingMode,
            });

        const secondaryAssignments =
            assignSecondaryObjectives({
                seed:
                    session.seed,

                players,

                objectives:
                    this.content.objectives,

                actNumber:
                    1,

                trackingMode:
                    session.trackingMode,
            });

        session.game.completeSetup([
            ...primaryAssignments,
            ...secondaryAssignments,
        ]);

        session.contradiction =
            undefined;
    }

    public async getMyRoleSetup(
        gameId: string,
        discordUserId: string,
    ): Promise<RoleSetupSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "SETUP"
        ) {
            throw new Error(
                "This game is not waiting for role setup.",
            );
        }

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        const assignment =
            session.game
                .getRoleAssignmentForPlayer(
                    player.id,
                );

        if (
            assignment === undefined
        ) {
            throw new Error(
                `No role assignment found for player ${player.id}.`,
            );
        }

        const role =
            this.content.roles.find(
                candidate =>
                    candidate.code
                    === assignment.roleCode,
            );

        if (
            role === undefined
        ) {
            throw new Error(
                `Unknown role definition: ${assignment.roleCode}`,
            );
        }

        return {
            roleCode:
                role.code,

            roleName:
                role.name,

            roleDescription:
                role.description,

            setupCompleted:
                assignment.setupCompleted
                ?? true,

            selectedVariantCode:
                assignment.variantCode,

            selectedTargetPlayerIds:
                assignment.targetPlayerIds
                ?? [],

            variants:
                (
                    role.variants
                    ?? []
                ).map(
                    variant => ({
                        code:
                            variant.code,

                        name:
                            variant.name,

                        description:
                            variant.description,

                        targetSelection:
                            variant.targetSelection,
                    }),
                ),

            targets:
                session.game
                    .getPlayers()
                    .map(
                        target => ({
                            playerId:
                                target.id,

                            discordUserId:
                                target.discordUserId,

                            characterSlug:
                                target.characterSlug,
                        }),
                    ),

            lovePartners:
                this.getLovePartners(
                    session,
                    player.id,
                ).map(
                    partner => ({
                        playerId:
                            partner.id,

                        discordUserId:
                            partner.discordUserId,

                        characterSlug:
                            partner.characterSlug,
                    }),
                ),
        };
    }

    public async getMyPowerSetup(
        gameId: string,
        discordUserId: string,
    ): Promise<
        PowerSetupSnapshot
        | undefined
    > {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "SETUP"
        ) {
            throw new Error(
                "This game is not waiting for setup.",
            );
        }

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        const assignment =
            session.game
                .getPowerAssignmentForPlayer(
                    player.id,
                );

        /*
         * Tous les rôles n'ont pas forcément
         * de pouvoir.
         */
        if (
            assignment === undefined
        ) {
            return undefined;
        }

        const power =
            this.content.powers.find(
                candidate =>
                    candidate.code
                    === assignment.powerCode,
            );

        if (
            power === undefined
        ) {
            throw new Error(
                `Unknown power definition: ${assignment.powerCode}`,
            );
        }

        return {
            powerCode:
                power.code,

            powerName:
                power.name,

            powerDescription:
                power.description,

            mode:
                power.mode,

            setupCompleted:
                assignment.setupCompleted,

            selectedTargetPlayerIds: [
                ...assignment
                    .targetPlayerIds,
            ],

            targetSelection:
                power.setup
                    ?.targetSelection,

            targets:
                session.game
                    .getPlayers()
                    .map(
                        target => ({
                            playerId:
                                target.id,

                            discordUserId:
                                target.discordUserId,

                            characterSlug:
                                target.characterSlug,
                        }),
                    ),
        };
    }

    public async configureRoleSetup(
        gameId: string,
        discordUserId: string,
        variantCode: string,
        targetPlayerIds:
            readonly string[],
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "SETUP"
        ) {
            throw new Error(
                "This game is not waiting for role setup.",
            );
        }

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        const assignment =
            session.game
                .getRoleAssignmentForPlayer(
                    player.id,
                );

        if (
            assignment === undefined
        ) {
            throw new Error(
                `No role assignment found for player ${player.id}.`,
            );
        }

        const role =
            this.content.roles.find(
                candidate =>
                    candidate.code
                    === assignment.roleCode,
            );

        if (
            role === undefined
        ) {
            throw new Error(
                `Unknown role definition: ${assignment.roleCode}`,
            );
        }

        if (
            role.variants === undefined
            || role.variants.length === 0
        ) {
            throw new Error(
                `Role ${role.code} does not require variant setup.`,
            );
        }

        const variant =
            role.variants.find(
                candidate =>
                    candidate.code
                    === variantCode,
            );

        if (
            variant === undefined
        ) {
            throw new Error(
                `Unknown variant ${variantCode} for role ${role.code}.`,
            );
        }

        const targetSelection =
            variant.targetSelection;

        if (
            targetSelection === undefined
        ) {
            if (
                targetPlayerIds.length
                !== 0
            ) {
                throw new Error(
                    "This role variant does not accept targets.",
                );
            }
        } else {
            if (
                targetPlayerIds.length
                !== targetSelection.count
            ) {
                throw new Error(
                    `This role variant requires exactly ${targetSelection.count} target(s).`,
                );
            }

            const uniqueTargets =
                new Set(
                    targetPlayerIds,
                );

            if (
                uniqueTargets.size
                !== targetPlayerIds.length
            ) {
                throw new Error(
                    "Role setup targets must be unique.",
                );
            }

            const players =
                session.game
                    .getPlayers();

            for (
                const targetPlayerId
                of targetPlayerIds
            ) {
                const target =
                    players.find(
                        candidate =>
                            candidate.id
                            === targetPlayerId,
                    );

                if (
                    target === undefined
                ) {
                    throw new Error(
                        `Unknown target player: ${targetPlayerId}`,
                    );
                }

                if (
                    !targetSelection.allowSelf
                    && target.id
                    === player.id
                ) {
                    throw new Error(
                        "This role variant cannot target its owner.",
                    );
                }
            }
        }

        session.game.updateRoleSetup(
            player.id,
            variant.code,
            targetPlayerIds,
        );

        if (
            session.game
                .areSetupsComplete()
        ) {
            this.finalizeSetup(
                session,
            );
        }

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async configurePowerSetup(
        gameId: string,
        discordUserId: string,
        targetPlayerIds:
            readonly string[],
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "SETUP"
        ) {
            throw new Error(
                "This game is not waiting for power setup.",
            );
        }

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        const assignment =
            session.game
                .getPowerAssignmentForPlayer(
                    player.id,
                );

        if (
            assignment === undefined
        ) {
            throw new Error(
                "This player has no power assignment.",
            );
        }

        const power =
            this.content.powers.find(
                candidate =>
                    candidate.code
                    === assignment.powerCode,
            );

        if (
            power === undefined
        ) {
            throw new Error(
                `Unknown power definition: ${assignment.powerCode}`,
            );
        }

        const targetSelection =
            power.setup
                ?.targetSelection;

        if (
            targetSelection
            === undefined
        ) {
            throw new Error(
                `Power ${power.code} does not require target setup.`,
            );
        }

        if (
            targetPlayerIds.length
            !== targetSelection.count
        ) {
            throw new Error(
                `This power requires exactly ${targetSelection.count} target(s).`,
            );
        }

        const uniqueTargets =
            new Set(
                targetPlayerIds,
            );

        if (
            uniqueTargets.size
            !== targetPlayerIds.length
        ) {
            throw new Error(
                "Power setup targets must be unique.",
            );
        }

        const players =
            session.game
                .getPlayers();

        for (
            const targetPlayerId
            of targetPlayerIds
        ) {
            const target =
                players.find(
                    candidate =>
                        candidate.id
                        === targetPlayerId,
                );

            if (
                target === undefined
            ) {
                throw new Error(
                    `Unknown target player: ${targetPlayerId}`,
                );
            }

            if (
                !targetSelection.allowSelf
                && target.id
                === player.id
            ) {
                throw new Error(
                    "This power cannot target its owner.",
                );
            }
        }

        session.game.updatePowerSetup(
            player.id,
            targetPlayerIds,
        );

        if (
            session.game
                .areSetupsComplete()
        ) {
            this.finalizeSetup(
                session,
            );
        }

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async startGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        session.game.start();

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async finishGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        session.game.finish();

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async cancelGame(
        gameId: string,
        requestedByDiscordUserId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        this.assertHost(
            session,
            requestedByDiscordUserId,
        );

        session.game.cancel();

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async registerLobbyMessage(
        gameId: string,
        messageId: string,
    ): Promise<GameSnapshot> {
        if (
            messageId.trim().length
            === 0
        ) {
            throw new Error(
                "Lobby message id cannot be empty.",
            );
        }

        const session =
            await this.getSession(
                gameId,
            );

        session.lobbyMessageId =
            messageId;

        await this.repository.save(
            session,
        );

        return this.createSnapshot(
            session,
        );
    }

    public async getGameSnapshot(
        gameId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.getSession(
                gameId,
            );

        return this.createSnapshot(
            session,
        );
    }

    public async getCurrentGameByChannel(
        guildId: string,
        textChannelId: string,
    ): Promise<GameSnapshot> {
        const session =
            await this.repository
                .findOpenByChannel(
                    guildId,
                    textChannelId,
                );

        if (
            session === undefined
        ) {
            throw new Error(
                "No active game exists in this channel.",
            );
        }

        return this.createSnapshot(
            session,
        );
    }

    public async getMySecrets(
        gameId: string,
        discordUserId: string,
    ): Promise<PlayerSecrets> {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "READY"
            && session.game.state
            !== "ACTIVE"
        ) {
            throw new Error(
                "Secrets are only available when the game is ready or active.",
            );
        }

        const player =
            this.findPlayerByDiscordUserId(
                session,
                discordUserId,
            );

        return this.createPlayerSecrets(
            session,
            player,
        );
    }

    public async getGameReveal(
        gameId: string,
    ): Promise<
        readonly PlayerReveal[]
    > {
        const session =
            await this.getSession(
                gameId,
            );

        if (
            session.game.state
            !== "FINISHED"
        ) {
            throw new Error(
                "Game reveal is only available after the game has finished.",
            );
        }

        return session.game
            .getPlayers()
            .map(
                player => ({
                    player: {
                        ...player,
                    },

                    secrets:
                        this.createPlayerSecrets(
                            session,
                            player,
                        ),
                }),
            );
    }

    private async getSession(
        gameId: string,
    ): Promise<GameSession> {
        const session =
            await this.repository
                .findById(
                    gameId,
                );

        if (
            session === undefined
        ) {
            throw new Error(
                `Unknown game: ${gameId}`,
            );
        }

        return session;
    }

    private findPlayerByDiscordUserId(
        session: GameSession,
        discordUserId: string,
    ): GamePlayer {
        const player =
            session.game
                .getPlayers()
                .find(
                    candidate =>
                        candidate.discordUserId
                        === discordUserId,
                );

        if (
            player === undefined
        ) {
            throw new Error(
                "Discord user is not part of this game.",
            );
        }

        return player;
    }

    private getLovePartners(
        session:
            GameSession,
        playerId:
            string,
    ): readonly GamePlayer[] {
        const partnerIds =
            new Set<string>();

        const powerAssignments =
            session.game
                .getPowerAssignments();

        for (
            const assignment
            of powerAssignments
        ) {
            if (
                assignment.powerCode
                !== "lovers-bond"
            ) {
                continue;
            }

            /*
             * Un lien pas encore configuré
             * ne produit aucun statut amoureux.
             */
            if (
                !assignment.setupCompleted
            ) {
                continue;
            }

            if (
                !assignment
                    .targetPlayerIds
                    .includes(
                        playerId,
                    )
            ) {
                continue;
            }

            for (
                const targetPlayerId
                of assignment
                    .targetPlayerIds
            ) {
                if (
                    targetPlayerId
                    === playerId
                ) {
                    continue;
                }

                partnerIds.add(
                    targetPlayerId,
                );
            }
        }

        const players =
            session.game
                .getPlayers();

        return [
            ...partnerIds,
        ].map(
            partnerId => {
                const partner =
                    players.find(
                        candidate =>
                            candidate.id
                            === partnerId,
                    );

                if (
                    partner === undefined
                ) {
                    throw new Error(
                        `Unknown love partner player: ${partnerId}`,
                    );
                }

                return {
                    ...partner,
                };
            },
        );
    }

    private getEligibleRoles(
        trackingMode:
            GameTrackingMode,
    ): readonly Role[] {
        return this.content.roles.filter(
            role => {
                if (
                    !role.supportedTrackingModes
                        .includes(
                            trackingMode,
                        )
                ) {
                    return false;
                }

                if (
                    role.powerCode
                    === undefined
                ) {
                    return true;
                }

                const power =
                    this.content.powers.find(
                        candidate =>
                            candidate.code
                            === role.powerCode,
                    );

                if (
                    power === undefined
                ) {
                    throw new Error(
                        `Role ${role.code} references unknown power: ${role.powerCode}`,
                    );
                }

                return power
                    .supportedTrackingModes
                    .includes(
                        trackingMode,
                    );
            },
        );
    }

    private assertCharacterExists(
        characterSlug: string,
    ): void {
        const exists =
            this.content.characters
                .some(
                    character =>
                        character.slug
                        === characterSlug,
                );

        if (!exists) {
            throw new Error(
                `Unknown character: ${characterSlug}`,
            );
        }
    }

    private assertHost(
        session: GameSession,
        discordUserId: string,
    ): void {
        if (
            session.hostDiscordUserId
            !== discordUserId
        ) {
            throw new Error(
                "Only the game host can perform this action.",
            );
        }
    }

    private createPlayerSecrets(
        session: GameSession,
        player: GamePlayer,
    ): PlayerSecrets {
        const roleAssignment =
            session.game
                .getRoleAssignmentForPlayer(
                    player.id,
                );

        if (
            roleAssignment === undefined
        ) {
            throw new Error(
                `No role assignment found for player ${player.id}.`,
            );
        }

        const role =
            this.content.roles.find(
                definition =>
                    definition.code
                    === roleAssignment.roleCode,
            );

        if (
            role === undefined
        ) {
            throw new Error(
                `Unknown role definition: ${roleAssignment.roleCode}`,
            );
        }

        const players =
            session.game
                .getPlayers();

        const lovePartners =
            this.getLovePartners(
                session,
                player.id,
            );

        const roleTargetIds =
            roleAssignment
                .targetPlayerIds
            ?? [];

        const roleTargets =
            roleTargetIds.map(
                targetPlayerId => {
                    const target =
                        players.find(
                            candidate =>
                                candidate.id
                                === targetPlayerId,
                        );

                    if (
                        target === undefined
                    ) {
                        throw new Error(
                            `Unknown role target player: ${targetPlayerId}`,
                        );
                    }

                    return {
                        ...target,
                    };
                },
            );

        const powerAssignment =
            session.game
                .getPowerAssignmentForPlayer(
                    player.id,
                );

        let power:
            PlayerPowerSecret
            | undefined;

        if (
            powerAssignment
            !== undefined
        ) {
            const powerDefinition =
                this.content.powers.find(
                    candidate =>
                        candidate.code
                        === powerAssignment.powerCode,
                );

            if (
                powerDefinition === undefined
            ) {
                throw new Error(
                    `Unknown power definition: ${powerAssignment.powerCode}`,
                );
            }

            const powerTargets =
                powerAssignment
                    .targetPlayerIds
                    .map(
                        targetPlayerId => {
                            const target =
                                players.find(
                                    candidate =>
                                        candidate.id
                                        === targetPlayerId,
                                );

                            if (
                                target === undefined
                            ) {
                                throw new Error(
                                    `Unknown power target player: ${targetPlayerId}`,
                                );
                            }

                            return {
                                ...target,
                            };
                        },
                    );

            power = {
                assignment: {
                    ...powerAssignment,

                    targetPlayerIds: [
                        ...powerAssignment
                            .targetPlayerIds,
                    ],
                },

                power:
                    powerDefinition,

                targets:
                    powerTargets,
            };
        }

        const currentAct =
            session.game.currentAct;

        const objectiveAssignments =
            session.game
                .getObjectiveAssignmentsForPlayer(
                    player.id,
                )
                .filter(
                    assignment =>
                        assignment.objectiveType
                        === "PRIMARY"
                        || (
                            assignment.objectiveType
                            === "SECONDARY"
                            && assignment.actNumber
                            === currentAct
                        ),
                );

        const objectives =
            objectiveAssignments.map(
                assignment => {
                    const objective =
                        this.content
                            .objectives
                            .find(
                                definition =>
                                    definition.code
                                    === assignment
                                        .objectiveCode,
                            );

                    if (
                        objective === undefined
                    ) {
                        throw new Error(
                            `Unknown objective definition: ${assignment.objectiveCode}`,
                        );
                    }

                    return {
                        assignment,
                        objective,
                    };
                },
            );

        return {
            playerId:
                player.id,

            roleAssignment: {
                ...roleAssignment,

                ...(
                    roleAssignment
                        .targetPlayerIds
                        === undefined
                        ? {}
                        : {
                            targetPlayerIds: [
                                ...roleAssignment
                                    .targetPlayerIds,
                            ],
                        }
                ),
            },

            role,

            roleTargets,

            lovePartners,

            power,

            objectives,
        };
    }

    private createSnapshot(
        session: GameSession,
    ): GameSnapshot {
        return {
            id:
                session.id,

            guildId:
                session.guildId,

            textChannelId:
                session.textChannelId,

            voiceChannelId:
                session.voiceChannelId,

            lobbyMessageId:
                session.lobbyMessageId,

            hostDiscordUserId:
                session.hostDiscordUserId,

            seed:
                session.seed,

            trackingMode:
                session.trackingMode,

            state:
                session.game.state,

            currentAct:
                session.game.currentAct,

            players:
                session.game
                    .getPlayers()
                    .map(
                        player => ({
                            ...player,
                        }),
                    ),

            contradiction:
                session.contradiction,
        };
    }
}