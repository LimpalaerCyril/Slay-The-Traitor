# Slay the Traitor — Guide de création de contenu

Le contenu statique de Slay the Traitor est défini dans des fichiers JSON.

Les personnages, rôles et objectifs ne doivent pas être codés directement dans TypeScript.

Les fichiers actifs sont chargés au démarrage du bot depuis :

```text
content/
├── characters/
├── roles/
├── objectives/
└── balancing/
````

Le contenu qui n'est pas encore utilisable peut être conservé dans :

```text
content/wip/
```

Après toute modification du contenu :

```bash
npm run typecheck
npm test
npm run bot
```

Le bot doit être redémarré pour recharger les fichiers JSON.

---

## Ajouter un personnage

Créer un fichier dans :

```text
content/characters/
```

Exemple :

```text
content/characters/ironclad.json
```

```json
{
  "slug": "ironclad",
  "name": "Ironclad"
}
```

### Champs

* `slug` : identifiant technique stable et unique du personnage.
* `name` : nom affiché aux joueurs.

Le nom du fichier n'a pas de valeur métier particulière, mais il est recommandé d'utiliser le même nom que le `slug`.

Plusieurs joueurs peuvent sélectionner le même personnage pendant une partie.

Exemple valide :

```text
Alice   → Ironclad
Bob     → Ironclad
Charlie → Ironclad
Diana   → Ironclad
```

---

## Ajouter un rôle

Créer un fichier dans :

```text
content/roles/
```

Exemple :

```json
{
  "code": "guardian",
  "name": "Le Gardien",
  "description": "Vos intérêts sont généralement alignés avec la survie de l'expédition.",
  "alignment": "LOYAL",
  "tags": [
    "PROTECTIVE"
  ],
  "minimumPlayers": 2,
  "maximumPlayers": 4
}
```

### Champs

* `code` : identifiant technique unique du rôle.
* `name` : nom affiché au joueur.
* `description` : description secrète du rôle.
* `alignment` : catégorie interne utilisée pour l'équilibrage.
* `tags` : caractéristiques utilisées par les moteurs de jeu.
* `minimumPlayers` : nombre minimum de joueurs pour que le rôle soit disponible.
* `maximumPlayers` : nombre maximum de joueurs pour que le rôle soit disponible.

### Alignements disponibles

```text
LOYAL
SELFISH
DISRUPTIVE
CHAOTIC
```

Les tags sont libres et servent notamment à exprimer des notions comme :

```text
PROTECTIVE
SABOTAGE
ECONOMY
INFORMATION
```

Un rôle n'est pas un objectif.

Deux parties peuvent attribuer des objectifs différents au même rôle.

Les rôles sont actuellement uniques au sein d'une même partie : deux joueurs ne reçoivent pas le même `roleCode`.

---

## Ajouter un objectif

Créer un fichier dans :

```text
content/objectives/
```

Exemple :

```json
{
  "code": "cause-two-curses",
  "name": "Présents empoisonnés",
  "description": "Provoquer l'ajout de deux malédictions à d'autres joueurs.",
  "category": "SABOTAGE",
  "difficulty": "HARD",
  "minimumPlayers": 3,
  "maximumPlayers": 4,
  "allowedTypes": [
    "PRIMARY"
  ],
  "requiredEvents": [
    "CURSE_ADDED"
  ],
  "verificationMode": "GROUP_CONFIRMED",
  "compatibilityTags": [
    "SABOTAGE",
    "REQUIRES_CURSE"
  ],
  "score": 100,
  "hiddenProgress": false,
  "progressRule": {
    "type": "EVENT_COUNT",
    "eventType": "CURSE_ADDED",
    "actor": "OWNER",
    "target": "OTHER",
    "increment": 1,
    "requiredCount": 2
  }
}
```

### Champs principaux

* `code` : identifiant technique unique.
* `name` : nom affiché.
* `description` : condition présentée au joueur.
* `category` : catégorie de game design.
* `difficulty` : `EASY`, `MEDIUM` ou `HARD`.
* `minimumPlayers` / `maximumPlayers` : disponibilité selon la taille du groupe.
* `allowedTypes` : `PRIMARY`, `SECONDARY`, ou les deux.
* `requiredEvents` : événements nécessaires à la progression.
* `verificationMode` : façon dont l'objectif peut être validé.
* `compatibilityTags` : tags utilisés pour vérifier la compatibilité avec les autres objectifs.
* `score` : points attribués.
* `hiddenProgress` : masque ou non la progression au joueur.
* `progressRule` : règle automatique de progression si elle existe.

### Modes de vérification

```text
DISCORD
SELF_REPORT
GROUP_CONFIRMED
MOD_ONLY
```

### Types d'objectifs

```text
PRIMARY
SECONDARY
```

Valeurs de score recommandées actuellement :

```text
PRIMARY   → 100
SECONDARY → 35
```

---

## Règles EVENT_COUNT

Une règle simple de progression peut compter des événements :

```json
"progressRule": {
  "type": "EVENT_COUNT",
  "eventType": "BOSS_DEFEATED",
  "actor": "ANY",
  "target": "ANY",
  "increment": 1,
  "requiredCount": 1
}
```

### Actor

```text
OWNER
ANY
```

`OWNER` signifie que l'auteur de l'événement doit être le propriétaire de l'objectif.

### Target

```text
OWNER
OTHER
ANY
```

`OWNER` : la cible doit être le propriétaire de l'objectif.

`OTHER` : la cible doit être un autre joueur.

`ANY` : aucune contrainte particulière.

---

## Compatibilité des objectifs

Les `compatibilityTags` servent à empêcher ou limiter certaines combinaisons.

Exemple :

```text
REQUIRES_PLAYER_DEATH
FORBIDS_PLAYER_DEATH
```

Une règle correspondante peut être ajoutée dans :

```text
content/balancing/compatibility-rules.json
```

Le moteur utilise également :

```text
content/balancing/contradiction-budget.json
```

pour accepter une certaine quantité de contradiction sans produire une partie complètement incohérente.

L'objectif n'est pas d'éliminer toute contradiction : une partie sans intérêts opposés serait peu intéressante.

---

## Ne jamais créer un objectif impossible

Avant d'ajouter un objectif au pool actif, vérifier que le joueur auquel il peut être attribué possède réellement les moyens de l'accomplir.

Exemple :

```text
Utiliser son pouvoir deux fois
```

n'est valide que pour un joueur ayant effectivement reçu un pouvoir.

Tant que le Power Engine et les contraintes rôle/pouvoir/objectif ne sont pas implémentés, ce type d'objectif doit être placé dans :

```text
content/wip/objectives/
```

et non dans :

```text
content/objectives/
```

Même principe pour toute mécanique qui n'est pas encore disponible.

---

## Checklist avant commit

Pour un nouveau contenu, vérifier :

1. Le `code` / `slug` est unique.
2. Le JSON respecte le schéma Zod.
3. Les limites de joueurs sont cohérentes.
4. L'objectif est réellement réalisable par les joueurs susceptibles de le recevoir.
5. Les `compatibilityTags` nécessaires sont présents.
6. Une nouvelle incompatibilité possède éventuellement une règle dans `compatibility-rules.json`.
7. Il reste suffisamment de rôles et d'objectifs disponibles pour composer une partie à 2, 3 et 4 joueurs.
8. `npm run typecheck` passe.
9. `npm test` passe.
