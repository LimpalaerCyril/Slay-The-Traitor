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
  "Discord Custom IDs",
  () => {
    it("parses a lobby prepare button", () => {
      const parsed =
        parseCustomId(
          CustomId.lobbyPrepare(
            "game-1",
          ),
        );

      expect(
        parsed,
      ).toEqual({
        scope: "lobby",
        action: "prepare",
        gameId: "game-1",
        extra: [],
      });
    });

    it("parses a secret view button", () => {
      const parsed =
        parseCustomId(
          CustomId.secretView(
            "game-1",
          ),
        );

      expect(
        parsed,
      ).toEqual({
        scope: "secret",
        action: "view",
        gameId: "game-1",
        extra: [],
      });
    });

    it("preserves additional component data", () => {
      const parsed =
        parseCustomId(
          CustomId.characterSelect(
            "game-1",
            "message-123",
          ),
        );

      expect(
        parsed?.extra,
      ).toEqual([
        "message-123",
      ]);
    });

    it("rejects unrelated custom ids", () => {
      expect(
        parseCustomId(
          "another:button",
        ),
      ).toBeUndefined();
    });

    it(
      "parses a role setup open custom id",
      () => {
        const parsed =
          parseCustomId(
            CustomId
              .roleSetupOpen(
                "game-1",
              ),
          );

        expect(
          parsed,
        ).toEqual({
          scope:
            "setup",

          action:
            "open",

          gameId:
            "game-1",

          extra: [],
        });
      },
    );

    it(
      "parses a role setup variant custom id",
      () => {
        const parsed =
          parseCustomId(
            CustomId
              .roleSetupVariant(
                "game-1",
                "guardian",
              ),
          );

        expect(
          parsed,
        ).toEqual({
          scope:
            "setup",

          action:
            "variant",

          gameId:
            "game-1",

          extra: [
            "guardian",
          ],
        });
      },
    );

    it(
      "parses a role setup target custom id",
      () => {
        const parsed =
          parseCustomId(
            CustomId
              .roleSetupTarget(
                "game-1",
                "fallen",
              ),
          );

        expect(
          parsed,
        ).toEqual({
          scope:
            "setup",

          action:
            "target",

          gameId:
            "game-1",

          extra: [
            "fallen",
          ],
        });
      },
    );
  },
);