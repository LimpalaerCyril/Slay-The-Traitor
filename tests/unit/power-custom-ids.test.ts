import {
    describe,
    expect,
    it,
} from "vitest";

import {
    CustomId,
    parseCustomId,
} from "../../src/discord/components/custom-ids.js";

describe(
    "power custom ids",
    () => {
        it(
            "parses the power setup custom id",
            () => {
                expect(
                    parseCustomId(
                        CustomId
                            .powerSetupOpen(
                                "game-1",
                            ),
                    ),
                ).toEqual({
                    scope:
                        "power",

                    action:
                        "setup",

                    gameId:
                        "game-1",

                    extra: [],
                });
            },
        );

        it(
            "parses the power target custom id",
            () => {
                expect(
                    parseCustomId(
                        CustomId
                            .powerSetupTarget(
                                "game-1",
                            ),
                    ),
                ).toEqual({
                    scope:
                        "power",

                    action:
                        "target",

                    gameId:
                        "game-1",

                    extra: [],
                });
            },
        );
    },
);