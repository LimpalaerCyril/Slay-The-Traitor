import {
    readdir,
    readFile,
} from "node:fs/promises";

import {
    join,
} from "node:path";

import type {
    ObjectiveCompatibilityRule,
} from "../../domain/objectives/objective-compatibility-rule.js";

import type {
    Objective,
} from "../../domain/objectives/objective.js";

import type {
    Role,
} from "../../domain/roles/role.js";

import type {
    Power,
} from "../../domain/powers/power.js";

import {
    parseCompatibilityRules,
} from "./schemas/compatibility-rule-schema.js";

import {
    parseObjectiveDefinition,
} from "./schemas/objective-schema.js";

import {
    parseRoleDefinition,
} from "./schemas/role-schema.js";

import {
    parsePowerDefinition,
} from "./schemas/power-schema.js";

import type {
    ContradictionBudget,
} from "../../domain/objectives/contradiction-budget.js";

import {
    parseContradictionBudget,
} from "./schemas/contradiction-budget-schema.js";

import type {
    Character,
} from "../../domain/characters/character.js";

import {
    parseCharacterDefinition,
} from "./schemas/character-schema.js";

type Parser<T> = (
    input: unknown,
) => T;

async function readJsonFile(
    filePath: string,
): Promise<unknown> {
    let rawContent: string;

    try {
        rawContent = await readFile(
            filePath,
            "utf8",
        );
    } catch (error) {
        throw new Error(
            `Unable to read content file: ${filePath}`,
            {
                cause: error,
            },
        );
    }

    try {
        return JSON.parse(
            rawContent,
        ) as unknown;
    } catch (error) {
        throw new Error(
            `Invalid JSON in content file: ${filePath}`,
            {
                cause: error,
            },
        );
    }
}

async function parseContentFile<T>(
    filePath: string,
    parser: Parser<T>,
): Promise<T> {
    const json =
        await readJsonFile(
            filePath,
        );

    try {
        return parser(json);
    } catch (error) {
        throw new Error(
            `Invalid content definition: ${filePath}`,
            {
                cause: error,
            },
        );
    }
}

async function loadJsonDirectory<T>(
    directoryPath: string,
    parser: Parser<T>,
): Promise<readonly T[]> {
    const entries = await readdir(
        directoryPath,
        {
            withFileTypes: true,
        },
    );

    const jsonFiles = entries
        .filter(
            entry =>
                entry.isFile()
                && entry.name.endsWith(
                    ".json",
                ),
        )
        .map(
            entry => entry.name,
        )
        .sort();

    const definitions: T[] = [];

    for (
        const fileName
        of jsonFiles
    ) {
        const filePath = join(
            directoryPath,
            fileName,
        );

        definitions.push(
            await parseContentFile(
                filePath,
                parser,
            ),
        );
    }

    return definitions;
}

export function loadRoles(
    directoryPath: string,
): Promise<readonly Role[]> {
    return loadJsonDirectory(
        directoryPath,
        parseRoleDefinition,
    );
}

export function loadObjectives(
    directoryPath: string,
): Promise<readonly Objective[]> {
    return loadJsonDirectory(
        directoryPath,
        parseObjectiveDefinition,
    );
}

export function loadPowers(
    directoryPath: string,
): Promise<readonly Power[]> {
    return loadJsonDirectory(
        directoryPath,
        parsePowerDefinition,
    );
}

export function loadCompatibilityRules(
    filePath: string,
): Promise<
    readonly ObjectiveCompatibilityRule[]
> {
    return parseContentFile(
        filePath,
        parseCompatibilityRules,
    );
}

export function loadContradictionBudget(
    filePath: string,
): Promise<ContradictionBudget> {
    return parseContentFile(
        filePath,
        parseContradictionBudget,
    );
}

export function loadCharacters(
    directoryPath: string,
): Promise<readonly Character[]> {
    return loadJsonDirectory(
        directoryPath,
        parseCharacterDefinition,
    );
}