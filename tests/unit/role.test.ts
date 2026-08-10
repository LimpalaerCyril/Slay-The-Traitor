import { describe, expect, it } from "vitest";

import {
  isRoleAvailableForPlayerCount,
  type Role,
} from "../../src/domain/roles/role.js";

function createRole(
  minimumPlayers: number,
  maximumPlayers: number,
): Role {
  return {
    code: "test-role",
    name: "Test Role",
    description: "A role used for tests.",
    alignment: "LOYAL",
    tags: [],
    minimumPlayers,
    maximumPlayers,
  };
}

describe("Role", () => {
  it("is available when the player count equals the minimum", () => {
    const role = createRole(2, 4);

    const available = isRoleAvailableForPlayerCount(role, 2);

    expect(available).toBe(true);
  });

  it("is available when the player count is between minimum and maximum", () => {
    const role = createRole(2, 4);

    const available = isRoleAvailableForPlayerCount(role, 3);

    expect(available).toBe(true);
  });

  it("is available when the player count equals the maximum", () => {
    const role = createRole(2, 4);

    const available = isRoleAvailableForPlayerCount(role, 4);

    expect(available).toBe(true);
  });

  it("is unavailable below the minimum player count", () => {
    const role = createRole(3, 4);

    const available = isRoleAvailableForPlayerCount(role, 2);

    expect(available).toBe(false);
  });

  it("is unavailable above the maximum player count", () => {
    const role = createRole(2, 3);

    const available = isRoleAvailableForPlayerCount(role, 4);

    expect(available).toBe(false);
  });

  it("supports all four alignments", () => {
    const alignments: Role["alignment"][] = [
      "LOYAL",
      "SELFISH",
      "DISRUPTIVE",
      "CHAOTIC",
    ];

    expect(alignments).toHaveLength(4);
  });
});