# Wiring TypeScript à appliquer dans la branche courante

Les fichiers complets du patch sont autonomes, mais les fichiers `schema.ts`, `bootstrap.ts` et le serveur Fastify courant n'étaient pas tous disponibles dans l'environnement de génération. Il faut donc faire ces raccordements dans les versions de la branche.

## 1. Schema

Ajouter `sts2BridgeEventReceiptsTable` avec `patches/schema-addition.ts.txt`, puis :

```bash
npm run db:generate
npm run db:migrate
```

Ne pas appliquer en plus `migration-reference.sql` si Drizzle a déjà généré la migration.

## 2. Bootstrap / composition root

Créer une instance :

```ts
const sts2EventIngestionRepository =
    new PostgresSts2EventIngestionRepository(
        db,
    );

const sts2EventIngestionService =
    new Sts2EventIngestionService(
        bridgeIdentityService,
        sts2EventIngestionRepository,
        gameEventService,
    );
```

Imports :

```ts
import {
    PostgresSts2EventIngestionRepository,
} from "../infrastructure/database/postgres-sts2-event-ingestion-repository.js";

import {
    Sts2EventIngestionService,
} from "../application/sts2-event-ingestion/sts2-event-ingestion-service.js";
```

Passer `sts2EventIngestionService` au serveur Fastify qui enregistre les routes STS2.

## 3. Fastify

Dans le point d'enregistrement des routes API :

```ts
await registerSts2EventsBatchRoutes(
    app,
    {
        sts2EventIngestionService,
    },
);
```

Import :

```ts
import {
    registerSts2EventsBatchRoutes,
} from "./sts2/sts2-events-batch-routes.js";
```

Si le projet possède déjà un unique `sts2-bridge-routes.ts`, intégrer le handler de `sts2-events-batch-routes.ts` dans ce fichier plutôt que d'enregistrer deux fois les autres routes.

## 4. Important : heartbeat run optionnel

Le patch `/events/batch` suppose que la correction précédente est déjà appliquée :

```ts
readonly run?: Sts2BridgeRunSnapshot | undefined;
```

et que `heartbeatConnection()` ne touche `lastActIndex`, `lastActId`, `lastSnapshot` que lorsqu'un snapshot est fourni.

## 5. Type exact de gameEventsTable

Le repository fourni suppose les colonnes Drizzle suivantes, correspondant au modèle GameEvent existant :

```text
id
gameId
type
actNumber
actorPlayerId
targetPlayerId
payload
source
validationStatus
createdAt
```

Si la table courante nomme une propriété autrement, adapter uniquement le mapping dans `insertAcceptedGameEvent()` ; le contrat HTTP et le service applicatif ne changent pas.

## 6. Final

```bash
npm run typecheck
npm test
```
