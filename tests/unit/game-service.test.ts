import {
    join,
} from "node:path";

import {
    describe,
    expect,
    it,
} from "vitest";

import {
    GameService,
    type GameServiceContent,
} from "../../src/application/game-service/game-service.js";

import type {
    Objective,
} from "../../src/domain/objectives/objective.js";

import type {
    Power,
} from "../../src/domain/powers/power.js";

import type {
    Role,
} from "../../src/domain/roles/role.js";

import {
    loadCharacters,
    loadCompatibilityRules,
    loadContradictionBudget,
    loadObjectives,
    loadPowers,
    loadRoles,
} from "../../src/infrastructure/content/content-loader.js";

import {
    InMemoryGameRepository,
} from "../../src/infrastructure/database/in-memory-game-repository.js";

function createRole(
    code: string,
    primaryObjectiveCode: string,
    powerCode?: string,
): Role {
    return {
        code,
        name: code,
        description: code,

        alignment: "LOYAL",

        tags: [],

        minimumPlayers: 2,

        maximumPlayers: 4,

        primaryObjectiveCode,

        ...(
            powerCode === undefined
                ? {}
                : {
                    powerCode,
                }
        ),

        supportedTrackingModes: [
            "MANUAL",
            "STS2",
        ],
    };
}

function createObjective(
    code: string,
    type:
        "PRIMARY" | "SECONDARY",
): Objective {
    return {
        code,
        name:
            code,
        description:
            code,

        category:
            "TEST",

        difficulty:
            "EASY",

        minimumPlayers:
            2,

        maximumPlayers:
            4,

        supportedTrackingModes: [
            "MANUAL",
            "STS2",
        ],

        allowedTypes: [
            type,
        ],

        requiredEvents: [],

        verificationMode:
            "DISCORD",

        compatibilityTags: [],

        score:
            type === "PRIMARY"
                ? 100
                : 35,

        hiddenProgress:
            false,
    };
}

function createPower(
    code: string,
    setup?:
        Power["setup"],
): Power {
    return {
        code,

        name:
            code,

        description:
            code,

        mode:
            "PASSIVE",

        supportedTrackingModes: [
            "MANUAL",
            "STS2",
        ],

        ...(
            setup === undefined
                ? {}
                : {
                    setup,
                }
        ),
    };
}

function createContent():
    GameServiceContent {
    return {
        characters: [
            {
                slug:
                    "character-alpha",

                name:
                    "Character Alpha",
            },

            {
                slug:
                    "character-beta",

                name:
                    "Character Beta",
            },
        ],

        roles: [
            createRole(
                "guardian",
                "guardian-primary",
            ),

            createRole(
                "miser",
                "miser-primary",
            ),
        ],

        powers: [],

        objectives: [
            createObjective(
                "guardian-primary",
                "PRIMARY",
            ),

            createObjective(
                "miser-primary",
                "PRIMARY",
            ),

            createObjective(
                "secondary",
                "SECONDARY",
            ),
        ],

        compatibilityRules: [],

        contradictionBudget: {
            "2": {
                minimum:
                    0,

                maximum:
                    0,
            },

            "3": {
                minimum:
                    0,

                maximum:
                    0,
            },

            "4": {
                minimum:
                    0,

                maximum:
                    0,
            },
        },
    };
}

function createService():
    GameService {
    return new GameService(
        createContent(),
        new InMemoryGameRepository(),
    );
}

function createServiceWithPower(
    power:
        Power,
): GameService {
    const content =
        createContent();

    return new GameService(
        {
            ...content,

            roles: [
                createRole(
                    "guardian",
                    "guardian-primary",
                    power.code,
                ),

                createRole(
                    "miser",
                    "miser-primary",
                    power.code,
                ),
            ],

            powers: [
                power,
            ],
        },

        new InMemoryGameRepository(),
    );
}

async function createGame(
    service: GameService,
): Promise<void> {
    await service.createGame({
        gameId:
            "game-1",

        guildId:
            "guild-1",

        textChannelId:
            "channel-1",

        hostDiscordUserId:
            "discord-alice",

        seed:
            "test-seed",
    });
}

async function joinAliceAndBob(
    service: GameService,
): Promise<void> {
    await service.joinGame({
        gameId:
            "game-1",

        playerId:
            "alice",

        discordUserId:
            "discord-alice",

        characterSlug:
            "character-alpha",
    });

    await service.joinGame({
        gameId:
            "game-1",

        playerId:
            "bob",

        discordUserId:
            "discord-bob",

        characterSlug:
            "character-beta",
    });
}

describe(
    "GameService",
    () => {
        it(
            "creates a lobby game",
            async () => {
                const service =
                    createService();

                const game =
                    await service.createGame({
                        gameId:
                            "game-1",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-alice",

                        seed:
                            "test-seed",
                    });

                expect(
                    game.state,
                ).toBe(
                    "LOBBY",
                );

                expect(
                    game.players,
                ).toHaveLength(
                    0,
                );
            },
        );

        it(
            "allows players to join with a known character",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                const game =
                    await service.joinGame({
                        gameId:
                            "game-1",

                        playerId:
                            "alice",

                        discordUserId:
                            "discord-alice",

                        characterSlug:
                            "character-alpha",
                    });

                expect(
                    game.players,
                ).toHaveLength(
                    1,
                );
            },
        );

        it(
            "rejects an unknown character",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await expect(
                    service.joinGame({
                        gameId:
                            "game-1",

                        playerId:
                            "alice",

                        discordUserId:
                            "discord-alice",

                        characterSlug:
                            "unknown-character",
                    }),
                ).rejects.toThrow(
                    "Unknown character: unknown-character",
                );
            },
        );

        it(
            "only allows the host to prepare the game",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await expect(
                    service.prepareGame(
                        "game-1",
                        "discord-bob",
                    ),
                ).rejects.toThrow(
                    "Only the game host can perform this action.",
                );
            },
        );

        it(
            "prepares roles and objectives and moves the game to READY",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const game =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "READY",
                );

                expect(
                    game.currentAct,
                ).toBe(
                    1,
                );
            },
        );

        it(
            "moves directly to READY when assigned powers do not require setup",
            async () => {
                const service =
                    createServiceWithPower(
                        createPower(
                            "instant-power",
                        ),
                    );

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const game =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "READY",
                );

                expect(
                    game.currentAct,
                ).toBe(
                    1,
                );
            },
        );

        it(
            "exposes the assigned power in player secrets",
            async () => {
                const service =
                    createServiceWithPower(
                        createPower(
                            "secret-power",
                        ),
                    );

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const prepared =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    prepared.state,
                ).toBe(
                    "READY",
                );

                const secrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    secrets.power,
                ).toBeDefined();

                expect(
                    secrets.power?.power.code,
                ).toBe(
                    "secret-power",
                );

                expect(
                    secrets.power
                        ?.assignment
                        .playerId,
                ).toBe(
                    "alice",
                );

                expect(
                    secrets.power
                        ?.assignment
                        .uses,
                ).toBe(
                    0,
                );

                expect(
                    secrets.power
                        ?.targets,
                ).toEqual([]);
            },
        );

        it(
            "exposes no power for a role without a power",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                const secrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    secrets.power,
                ).toBeUndefined();

                expect(
                    secrets.roleTargets,
                ).toEqual([]);
            },
        );

        it(
            "does not assign a role whose power is unsupported by the tracking mode",
            async () => {
                const content =
                    createContent();

                const service =
                    new GameService(
                        {
                            ...content,

                            roles: [
                                createRole(
                                    "guardian",
                                    "guardian-primary",
                                ),

                                createRole(
                                    "miser",
                                    "miser-primary",
                                ),

                                {
                                    ...createRole(
                                        "cupid",
                                        "guardian-primary",
                                        "lovers-bond",
                                    ),

                                    supportedTrackingModes: [
                                        "MANUAL",
                                        "STS2",
                                    ],
                                },
                            ],

                            powers: [
                                {
                                    code:
                                        "lovers-bond",

                                    name:
                                        "Lovers Bond",

                                    description:
                                        "Link two players.",

                                    mode:
                                        "PASSIVE",

                                    supportedTrackingModes: [
                                        "STS2",
                                    ],

                                    setup: {
                                        targetSelection: {
                                            count:
                                                2,

                                            allowSelf:
                                                true,
                                        },
                                    },
                                },
                            ],
                        },

                        new InMemoryGameRepository(),
                    );

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const game =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "READY",
                );

                const alice =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                const bob =
                    await service.getMySecrets(
                        "game-1",
                        "discord-bob",
                    );

                expect(
                    alice.role.code,
                ).not.toBe(
                    "cupid",
                );

                expect(
                    bob.role.code,
                ).not.toBe(
                    "cupid",
                );
            },
        );

        it(
            "allows a role when both the role and its power support the tracking mode",
            async () => {
                const content =
                    createContent();

                const service =
                    new GameService(
                        {
                            ...content,

                            roles: [
                                createRole(
                                    "guardian",
                                    "guardian-primary",
                                    "shared-power",
                                ),

                                createRole(
                                    "miser",
                                    "miser-primary",
                                    "shared-power",
                                ),
                            ],

                            powers: [
                                {
                                    code:
                                        "shared-power",

                                    name:
                                        "Shared Power",

                                    description:
                                        "Supported power.",

                                    mode:
                                        "PASSIVE",

                                    supportedTrackingModes: [
                                        "MANUAL",
                                        "STS2",
                                    ],
                                },
                            ],
                        },

                        new InMemoryGameRepository(),
                    );

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const game =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "READY",
                );
            },
        );

        it(
            "stays in SETUP until every power setup is completed",
            async () => {
                const service =
                    createServiceWithPower(
                        createPower(
                            "target-power",
                            {
                                targetSelection: {
                                    count:
                                        2,

                                    allowSelf:
                                        true,
                                },
                            },
                        ),
                    );

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const prepared =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    prepared.state,
                ).toBe(
                    "SETUP",
                );

                expect(
                    prepared.currentAct,
                ).toBeUndefined();

                const aliceSetup =
                    await service.getMyPowerSetup(
                        "game-1",
                        "discord-alice",
                    );

                const bobSetup =
                    await service.getMyPowerSetup(
                        "game-1",
                        "discord-bob",
                    );

                expect(
                    aliceSetup,
                ).toBeDefined();

                expect(
                    bobSetup,
                ).toBeDefined();

                expect(
                    aliceSetup?.powerCode,
                ).toBe(
                    "target-power",
                );

                expect(
                    aliceSetup?.setupCompleted,
                ).toBe(
                    false,
                );

                expect(
                    aliceSetup?.targetSelection,
                ).toEqual({
                    count:
                        2,

                    allowSelf:
                        true,
                });

                const afterAlice =
                    await service.configurePowerSetup(
                        "game-1",
                        "discord-alice",
                        [
                            "alice",
                            "bob",
                        ],
                    );

                /*
                 * Bob n'a pas encore configuré
                 * son pouvoir.
                 */
                expect(
                    afterAlice.state,
                ).toBe(
                    "SETUP",
                );

                const afterBob =
                    await service.configurePowerSetup(
                        "game-1",
                        "discord-bob",
                        [
                            "alice",
                            "bob",
                        ],
                    );

                /*
                 * Tous les RoleSetup et PowerSetup
                 * sont maintenant terminés.
                 */
                expect(
                    afterBob.state,
                ).toBe(
                    "READY",
                );

                expect(
                    afterBob.currentAct,
                ).toBe(
                    1,
                );

                const aliceSecrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    aliceSecrets.power,
                ).toBeDefined();

                expect(
                    aliceSecrets.power
                        ?.power
                        .code,
                ).toBe(
                    "target-power",
                );

                expect(
                    aliceSecrets.power
                        ?.targets
                        .map(
                            target =>
                                target.id,
                        ),
                ).toEqual([
                    "alice",
                    "bob",
                ]);
            },
        );

        it(
            "exposes lovers-bond partners during setup and in player secrets",
            async () => {
                const service =
                    createServiceWithPower(
                        createPower(
                            "lovers-bond",
                            {
                                targetSelection: {
                                    count:
                                        2,

                                    allowSelf:
                                        true,
                                },
                            },
                        ),
                    );

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const prepared =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    prepared.state,
                ).toBe(
                    "SETUP",
                );

                /*
                 * Alice configure son lovers-bond.
                 * Bob possède encore un setup
                 * incomplet dans cette fixture,
                 * donc la partie reste en SETUP.
                 */
                const afterAlice =
                    await service.configurePowerSetup(
                        "game-1",
                        "discord-alice",
                        [
                            "alice",
                            "bob",
                        ],
                    );

                expect(
                    afterAlice.state,
                ).toBe(
                    "SETUP",
                );

                /*
                 * Bob doit déjà savoir qu'Alice
                 * est son amoureuse.
                 */
                const bobRoleSetup =
                    await service.getMyRoleSetup(
                        "game-1",
                        "discord-bob",
                    );

                expect(
                    bobRoleSetup
                        .lovePartners
                        .map(
                            partner =>
                                partner.playerId,
                        ),
                ).toEqual([
                    "alice",
                ]);

                /*
                 * Bob termine ensuite son setup.
                 */
                const afterBob =
                    await service.configurePowerSetup(
                        "game-1",
                        "discord-bob",
                        [
                            "alice",
                            "bob",
                        ],
                    );

                expect(
                    afterBob.state,
                ).toBe(
                    "READY",
                );

                const aliceSecrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                const bobSecrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-bob",
                    );

                expect(
                    aliceSecrets
                        .lovePartners
                        .map(
                            partner =>
                                partner.id,
                        ),
                ).toEqual([
                    "bob",
                ]);

                expect(
                    bobSecrets
                        .lovePartners
                        .map(
                            partner =>
                                partner.id,
                        ),
                ).toEqual([
                    "alice",
                ]);
            },
        );

        it(
            "starts a prepared game",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                const game =
                    await service.startGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "ACTIVE",
                );
            },
        );

        it(
            "exposes only the requesting player's secrets",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await service.startGame(
                    "game-1",
                    "discord-alice",
                );

                const secrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    secrets.playerId,
                ).toBe(
                    "alice",
                );

                expect(
                    secrets.role,
                ).toBeDefined();

                expect(
                    secrets.objectives,
                ).toHaveLength(
                    2,
                );

                expect(
                    secrets.objectives.some(
                        (entry) =>
                            entry.assignment
                                .objectiveType
                            === "PRIMARY",
                    ),
                ).toBe(
                    true,
                );

                expect(
                    secrets.objectives.some(
                        (entry) =>
                            entry.assignment
                                .objectiveType
                            === "SECONDARY",
                    ),
                ).toBe(
                    true,
                );
            },
        );

        it(
            "exposes secrets when the game is ready",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                const prepared =
                    await service.prepareGame(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    prepared.state,
                ).toBe(
                    "READY",
                );

                const secrets =
                    await service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    secrets.role,
                ).toBeDefined();

                expect(
                    secrets.objectives,
                ).toHaveLength(
                    2,
                );
            },
        );

        it(
            "rejects secret access from someone outside the game",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await service.startGame(
                    "game-1",
                    "discord-alice",
                );

                await expect(
                    service.getMySecrets(
                        "game-1",
                        "discord-eve",
                    ),
                ).rejects.toThrow(
                    "Discord user is not part of this game.",
                );
            },
        );

        it(
            "is deterministic with the same seed and players",
            async () => {
                const first =
                    createService();

                const second =
                    createService();

                await createGame(
                    first,
                );

                await createGame(
                    second,
                );

                await joinAliceAndBob(
                    first,
                );

                await joinAliceAndBob(
                    second,
                );

                await first.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await second.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await first.startGame(
                    "game-1",
                    "discord-alice",
                );

                await second.startGame(
                    "game-1",
                    "discord-alice",
                );

                const firstSecrets =
                    await first.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                const secondSecrets =
                    await second.getMySecrets(
                        "game-1",
                        "discord-alice",
                    );

                expect(
                    firstSecrets.role.code,
                ).toBe(
                    secondSecrets.role.code,
                );

                expect(
                    firstSecrets.objectives.map(
                        (entry) =>
                            entry.objective.code,
                    ),
                ).toEqual(
                    secondSecrets.objectives.map(
                        (entry) =>
                            entry.objective.code,
                    ),
                );
            },
        );

        it(
            "can prepare and start a two-player game using the real content files",
            async () => {
                const characters =
                    await loadCharacters(
                        join(
                            process.cwd(),
                            "content",
                            "characters",
                        ),
                    );

                const roles =
                    await loadRoles(
                        join(
                            process.cwd(),
                            "content",
                            "roles",
                        ),
                    );

                const powers =
                    await loadPowers(
                        join(
                            process.cwd(),
                            "content",
                            "powers",
                        ),
                    );

                const objectives =
                    await loadObjectives(
                        join(
                            process.cwd(),
                            "content",
                            "objectives",
                        ),
                    );

                const compatibilityRules =
                    await loadCompatibilityRules(
                        join(
                            process.cwd(),
                            "content",
                            "balancing",
                            "compatibility-rules.json",
                        ),
                    );

                const contradictionBudget =
                    await loadContradictionBudget(
                        join(
                            process.cwd(),
                            "content",
                            "balancing",
                            "contradiction-budget.json",
                        ),
                    );

                const character =
                    characters[0];

                if (
                    character === undefined
                ) {
                    throw new Error(
                        "At least one character is required to run the real-content integration test.",
                    );
                }

                const service =
                    new GameService(
                        {
                            characters,
                            roles,
                            powers,
                            objectives,
                            compatibilityRules,
                            contradictionBudget,
                        },

                        new InMemoryGameRepository(),
                    );

                await service.createGame({
                    gameId:
                        "real-game",

                    guildId:
                        "guild-1",

                    textChannelId:
                        "channel-1",

                    hostDiscordUserId:
                        "discord-alice",

                    seed:
                        "real-content-seed",
                });

                /*
                 * Les doublons de personnages
                 * sont volontairement autorisés.
                 */
                await service.joinGame({
                    gameId:
                        "real-game",

                    playerId:
                        "alice",

                    discordUserId:
                        "discord-alice",

                    characterSlug:
                        character.slug,
                });

                await service.joinGame({
                    gameId:
                        "real-game",

                    playerId:
                        "bob",

                    discordUserId:
                        "discord-bob",

                    characterSlug:
                        character.slug,
                });

                const preparedGame =
                    await service.prepareGame(
                        "real-game",
                        "discord-alice",
                    );

                /*
                 * Certains rôles du contenu réel
                 * peuvent demander une configuration
                 * secrète avant que la partie puisse
                 * passer en READY.
                 *
                 * Le test ne dépend volontairement
                 * d'aucun rôle ou variante spécifique.
                 */
                if (
                    preparedGame.state
                    === "SETUP"
                ) {
                    const participants = [
                        {
                            playerId:
                                "alice",

                            discordUserId:
                                "discord-alice",
                        },

                        {
                            playerId:
                                "bob",

                            discordUserId:
                                "discord-bob",
                        },
                    ];

                    /*
                     * IMPORTANT :
                     *
                     * On récupère TOUS les setups avant
                     * d'en compléter un.
                     *
                     * La dernière configuration peut faire
                     * passer automatiquement SETUP → READY.
                     */
                    const setupStates =
                        await Promise.all(
                            participants.map(
                                async participant => ({
                                    participant,

                                    roleSetup:
                                        await service
                                            .getMyRoleSetup(
                                                "real-game",
                                                participant
                                                    .discordUserId,
                                            ),

                                    powerSetup:
                                        await service
                                            .getMyPowerSetup(
                                                "real-game",
                                                participant
                                                    .discordUserId,
                                            ),
                                }),
                            ),
                        );

                    const pendingRoleSetups =
                        setupStates.filter(
                            entry =>
                                !entry
                                    .roleSetup
                                    .setupCompleted,
                        );

                    const pendingPowerSetups =
                        setupStates.filter(
                            entry =>
                                entry.powerSetup
                                !== undefined
                                && !entry.powerSetup
                                    .setupCompleted,
                        );

                    /*
                     * Si le jeu est en SETUP,
                     * au moins un RoleSetup ou PowerSetup
                     * doit réellement être en attente.
                     */
                    expect(
                        pendingRoleSetups.length
                        + pendingPowerSetups.length,
                    ).toBeGreaterThan(
                        0,
                    );

                    /*
                     * 1. On termine d'abord les setups
                     *    propres aux rôles.
                     */
                    for (
                        const {
                            participant,
                            roleSetup,
                        }
                        of pendingRoleSetups
                    ) {
                        const variant =
                            roleSetup.variants[0];

                        if (
                            variant === undefined
                        ) {
                            throw new Error(
                                `Role ${roleSetup.roleCode} requires setup but has no variant.`,
                            );
                        }

                        const targetSelection =
                            variant.targetSelection;

                        let targetPlayerIds:
                            string[] = [];

                        if (
                            targetSelection
                            !== undefined
                        ) {
                            const eligibleTargets =
                                roleSetup.targets
                                    .filter(
                                        target =>
                                            targetSelection
                                                .allowSelf
                                            || target.playerId
                                            !== participant
                                                .playerId,
                                    );

                            targetPlayerIds =
                                eligibleTargets
                                    .slice(
                                        0,
                                        targetSelection
                                            .count,
                                    )
                                    .map(
                                        target =>
                                            target.playerId,
                                    );

                            if (
                                targetPlayerIds.length
                                !== targetSelection.count
                            ) {
                                throw new Error(
                                    `Not enough valid targets to configure role ${roleSetup.roleCode}.`,
                                );
                            }
                        }

                        await service
                            .configureRoleSetup(
                                "real-game",
                                participant
                                    .discordUserId,
                                variant.code,
                                targetPlayerIds,
                            );
                    }

                    /*
                     * 2. Puis on termine les setups
                     *    propres aux pouvoirs.
                     */
                    for (
                        const {
                            participant,
                            powerSetup,
                        }
                        of pendingPowerSetups
                    ) {
                        if (
                            powerSetup === undefined
                        ) {
                            continue;
                        }

                        const targetSelection =
                            powerSetup.targetSelection;

                        if (
                            targetSelection
                            === undefined
                        ) {
                            throw new Error(
                                `Power ${powerSetup.powerCode} is incomplete but has no target setup.`,
                            );
                        }

                        const eligibleTargets =
                            powerSetup.targets
                                .filter(
                                    target =>
                                        targetSelection
                                            .allowSelf
                                        || target.playerId
                                        !== participant
                                            .playerId,
                                );

                        const targetPlayerIds =
                            eligibleTargets
                                .slice(
                                    0,
                                    targetSelection.count,
                                )
                                .map(
                                    target =>
                                        target.playerId,
                                );

                        if (
                            targetPlayerIds.length
                            !== targetSelection.count
                        ) {
                            throw new Error(
                                `Not enough valid targets to configure power ${powerSetup.powerCode}.`,
                            );
                        }

                        await service
                            .configurePowerSetup(
                                "real-game",
                                participant
                                    .discordUserId,
                                targetPlayerIds,
                            );
                    }
                }

                const readyGame =
                    await service
                        .getGameSnapshot(
                            "real-game",
                        );

                expect(
                    readyGame.state,
                ).toBe(
                    "READY",
                );

                const game =
                    await service.startGame(
                        "real-game",
                        "discord-alice",
                    );

                expect(
                    game.state,
                ).toBe(
                    "ACTIVE",
                );

                expect(
                    game.players,
                ).toHaveLength(
                    2,
                );

                expect(
                    game.players.every(
                        (player) =>
                            player.characterSlug
                            === character.slug,
                    ),
                ).toBe(
                    true,
                );

                const alice =
                    await service.getMySecrets(
                        "real-game",
                        "discord-alice",
                    );

                const bob =
                    await service.getMySecrets(
                        "real-game",
                        "discord-bob",
                    );

                expect(
                    alice.role,
                ).toBeDefined();

                expect(
                    bob.role,
                ).toBeDefined();

                expect(
                    alice.objectives,
                ).toHaveLength(
                    2,
                );

                expect(
                    bob.objectives,
                ).toHaveLength(
                    2,
                );
            },
        );

        it(
            "finds the current game by Discord channel",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                const game =
                    await service
                        .getCurrentGameByChannel(
                            "guild-1",
                            "channel-1",
                        );

                expect(
                    game.id,
                ).toBe(
                    "game-1",
                );
            },
        );

        it(
            "prevents two open games in the same channel",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await expect(
                    service.createGame({
                        gameId:
                            "game-2",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-bob",

                        seed:
                            "second-seed",
                    }),
                ).rejects.toThrow(
                    "A game is already open in this channel.",
                );
            },
        );

        it(
            "allows a new game after the previous game is cancelled",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await service.cancelGame(
                    "game-1",
                    "discord-alice",
                );

                const game =
                    await service.createGame({
                        gameId:
                            "game-2",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-alice",

                        seed:
                            "second-seed",
                    });

                expect(
                    game.state,
                ).toBe(
                    "LOBBY",
                );
            },
        );

        it(
            "stores the Discord lobby message id",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                const game =
                    await service
                        .registerLobbyMessage(
                            "game-1",
                            "message-123",
                        );

                expect(
                    game.lobbyMessageId,
                ).toBe(
                    "message-123",
                );
            },
        );

        it(
            "reveals all players after the game finishes",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await service.prepareGame(
                    "game-1",
                    "discord-alice",
                );

                await service.startGame(
                    "game-1",
                    "discord-alice",
                );

                await service.finishGame(
                    "game-1",
                    "discord-alice",
                );

                const reveal =
                    await service.getGameReveal(
                        "game-1",
                    );

                expect(
                    reveal,
                ).toHaveLength(
                    2,
                );

                expect(
                    reveal.every(
                        (entry) =>
                            entry.secrets
                                .objectives
                                .length === 2,
                    ),
                ).toBe(
                    true,
                );
            },
        );

        it(
            "uses MANUAL tracking by default",
            async () => {
                const service =
                    createService();

                const game =
                    await service.createGame({
                        gameId:
                            "game-1",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-alice",

                        seed:
                            "test-seed",
                    });

                expect(
                    game.trackingMode,
                ).toBe(
                    "MANUAL",
                );
            },
        );

        it(
            "stores the selected game tracking mode",
            async () => {
                const service =
                    createService();

                const game =
                    await service.createGame({
                        gameId:
                            "game-1",

                        guildId:
                            "guild-1",

                        textChannelId:
                            "channel-1",

                        hostDiscordUserId:
                            "discord-alice",

                        seed:
                            "test-seed",

                        trackingMode:
                            "STS2",
                    });

                expect(
                    game.trackingMode,
                ).toBe(
                    "STS2",
                );

                const restored =
                    await service
                        .getGameSnapshot(
                            "game-1",
                        );

                expect(
                    restored.trackingMode,
                ).toBe(
                    "STS2",
                );
            },
        );

        it(
            "does not expose secrets during the lobby",
            async () => {
                const service =
                    createService();

                await createGame(
                    service,
                );

                await joinAliceAndBob(
                    service,
                );

                await expect(
                    service.getMySecrets(
                        "game-1",
                        "discord-alice",
                    ),
                ).rejects.toThrow(
                    "Secrets are only available when the game is ready or active.",
                );
            },
        );
    },
);