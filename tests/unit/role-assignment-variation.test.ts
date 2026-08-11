import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assignRoles,
} from "../../src/application/role-assignment/role-assignment-engine.js";

import type {
  GamePlayer,
} from "../../src/domain/games/game-player.js";

import type {
  Role,
} from "../../src/domain/roles/role.js";

function createPlayer(
  id: string,
): GamePlayer {
  return {
    id,

    discordUserId:
      `discord-${id}`,

    characterSlug:
      "test-character",

    alive:
      true,
  };
}

function createRole(
  code: string,
): Role {
  return {
    code,

    name:
      code,

    description:
      code,

    alignment:
      "LOYAL",

    tags: [],

    minimumPlayers:
      2,

    maximumPlayers:
      4,
  };
}

const players:
  readonly GamePlayer[] = [
    createPlayer(
      "alice",
    ),

    createPlayer(
      "bob",
    ),
  ];

const roles:
  readonly Role[] = [
    createRole(
      "angel",
    ),

    createRole(
      "cupid",
    ),

    createRole(
      "guardian",
    ),

    createRole(
      "miser",
    ),

    createRole(
      "oracle",
    ),
  ];

function createSignature(
  assignments:
    ReturnType<
      typeof assignRoles
    >,
): string {
  return [
    ...assignments,
  ]
    .sort(
      (
        left,
        right,
      ) =>
        left.playerId.localeCompare(
          right.playerId,
        ),
    )
    .map(
      assignment =>
        `${assignment.playerId}:${assignment.roleCode}`,
    )
    .join("|");
}

describe(
  "Role assignment variation",
  () => {
    it(
      "produces the same assignment with the same seed",
      () => {
        const first =
          assignRoles({
            seed:
              "same-seed",

            players,

            roles,
          });

        const second =
          assignRoles({
            seed:
              "same-seed",

            players,

            roles,
          });

        expect(
          createSignature(
            first,
          ),
        ).toBe(
          createSignature(
            second,
          ),
        );
      },
    );

    it(
      "produces different assignments across different seeds",
      () => {
        const signatures =
          new Set<string>();

        for (
          let index = 0;
          index < 20;
          index += 1
        ) {
          const assignments =
            assignRoles({
              seed:
                `variation-${index}`,

              players,

              roles,
            });

          signatures.add(
            assignments
              .map(
                assignment =>
                  `${assignment.playerId}:${assignment.roleCode}`,
              )
              .join("|"),
          );
        }

        expect(
          signatures.size,
        ).toBeGreaterThan(
          1,
        );
      },
    );

    it(
      "does not depend on the order in which players are provided",
      () => {
        const normalOrder =
          assignRoles({
            seed:
              "join-order-seed",

            players: [
              createPlayer(
                "alice",
              ),

              createPlayer(
                "bob",
              ),
            ],

            roles,
          });

        const reversedOrder =
          assignRoles({
            seed:
              "join-order-seed",

            players: [
              createPlayer(
                "bob",
              ),

              createPlayer(
                "alice",
              ),
            ],

            roles,
          });

        expect(
          createSignature(
            reversedOrder,
          ),
        ).toBe(
          createSignature(
            normalOrder,
          ),
        );
      },
    );
  },
);