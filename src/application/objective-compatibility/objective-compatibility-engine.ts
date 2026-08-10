import type {
  ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import type {
  Objective,
} from "../../domain/objectives/objective.js";

function ruleMatchesObjectives(
  rule: ObjectiveCompatibilityRule,
  left: Objective,
  right: Objective,
): boolean {
  const directMatch =
    left.compatibilityTags.includes(
      rule.leftTag,
    )
    && right.compatibilityTags.includes(
      rule.rightTag,
    );

  const reverseMatch =
    left.compatibilityTags.includes(
      rule.rightTag,
    )
    && right.compatibilityTags.includes(
      rule.leftTag,
    );

  return directMatch || reverseMatch;
}

export function canObjectivesBeAssignedToSamePlayer(
  left: Objective,
  right: Objective,
  rules: readonly ObjectiveCompatibilityRule[],
): boolean {
  return !rules.some(
    rule =>
      rule.samePlayer === "FORBIDDEN"
      && ruleMatchesObjectives(
        rule,
        left,
        right,
      ),
  );
}

export function getContradictionCost(
  left: Objective,
  right: Objective,
  rules: readonly ObjectiveCompatibilityRule[],
): number {
  return rules.reduce(
    (total, rule) => {
      if (
        !ruleMatchesObjectives(
          rule,
          left,
          right,
        )
      ) {
        return total;
      }

      return (
        total
        + rule.partyContradictionCost
      );
    },
    0,
  );
}