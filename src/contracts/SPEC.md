# `contracts`

## Cos’è

`contracts` definisce le forme minime con cui due moduli dell’ecosistema possono cooperare senza condividere un database, una route interna o un componente UI. Gli schemi validano **l’envelope**; ciascun dominio valida separatamente il proprio payload con uno schema più specifico.

## Cosa esporta

| Export | Scopo |
|---|---|
| `ActorSchema` / `Actor` | Identifica chi ha originato un fatto o un comando: utente, sistema o agente. |
| `ScopeSchema` / `Scope` | Limita un evento/operazione a famiglia, tenant, progetto o workspace. |
| `ArtifactRefSchema` / `ArtifactRef` | Descrive un output immutabile e versionato prodotto da un modulo. |
| `DomainEventSchema` / `DomainEvent` | Rappresenta un fatto già avvenuto con tipo, versione, timestamp e payload. |
| `OperationSchema` / `Operation` | Rappresenta una richiesta idempotente destinata a un handler o adapter. |

## Decisioni chiuse

Gli schemi richiedono identificativi non vuoti e timestamp ISO con offset. Un evento è fermato alla versione `1`: quando il suo significato dovrà cambiare in modo incompatibile, introdurremo esplicitamente una nuova versione anziché trasformare in silenzio il vecchio contratto.

`DomainEvent` non possiede una chiave di idempotenza perché descrive un fatto. `Operation` la richiede perché domanda un’azione e può essere ritentata dalla queue, da un webhook o da un tool agentico.

Il campo `payload` resta `unknown`: il core non deve conoscere la forma di un menu, un post, un lead o una storia. Il package di dominio deve comporre il proprio schema sopra questo envelope.

## Esempi d’uso

```ts
import { DomainEventSchema } from '@ear-lab/core/contracts';

const result = DomainEventSchema.safeParse({
  id: 'event-001',
  type: 'meal-plan.published',
  version: 1,
  occurredAt: '2026-08-13T12:00:00.000Z',
  scope: { kind: 'family', id: 'famiglia-rossi' },
  payload: { planId: 'menu-settimana-01' },
});
```

```ts
import { OperationSchema } from '@ear-lab/core/contracts';

const result = OperationSchema.safeParse({
  id: 'operation-001',
  type: 'content.transition',
  createdAt: '2026-08-13T12:00:00.000Z',
  idempotencyKey: 'content:episodio-01:approve:v1',
  payload: { contentId: 'episodio-01', to: 'approved' },
});
```

## Cosa NON fa

Il modulo non pubblica eventi, non esegue operazioni, non autorizza attori e non conserva artefatti. Quelle capacità appartengono rispettivamente ai futuri moduli `events`, `operations`, `policy` e agli adapter di storage dei consumer.

## Changelog

| Versione | Modifica |
|---|---|
| 0.1.0 | Primo envelope condiviso per artefatti, eventi e operazioni. |


## Catalogo versionato

`CatalogItemSchema` e `CatalogSnapshotSchema` estraggono la forma comune degli indici generati dal publisher EAR mktg website e dagli archivi documentali. Un item espone identità, tipo, stato editoriale, revisione, slug, metadati e riferimenti ad artefatti; uno snapshot dichiara inoltre quando e a quale revisione è stata prodotta l’intera proiezione.

| Campo | Garanzia | Non decide |
|---|---|---|
| `id`, `kind`, `revision` | Identità stabile e versione leggibile. | La politica di generazione degli ID. |
| `status` | Uno fra `published`, `draft`, `wip`, `coming-soon`. | Le transizioni o l’autorizzazione editoriale. |
| `slug` | Percorso logico non vuoto, indipendente dal filesystem. | URL, dominio web o routing del consumer. |
| `artifacts` | Collegamenti ad output immutabili attraverso `ArtifactRef`. | Dove gli artifact sono salvati o pubblicati. |
| `metadata` | Spazio estensibile per dati specifici del publisher. | Un vocabolario globale prematuro di metadati. |

Il contratto non legge Markdown, non interpreta frontmatter, non ordina il catalogo, non renderizza pagine e non scrive su filesystem. Il publisher sorgente conserva tali responsabilità; il core mette a disposizione soltanto la forma verificabile attraversabile dagli adapter.

```ts
import { CatalogSnapshotSchema } from '@ear-lab/core/contracts';

const snapshot = CatalogSnapshotSchema.parse({
  revision: 3,
  generatedAt: '2026-08-13T12:00:00.000Z',
  items: [
    {
      id: 'ear-method',
      kind: 'document',
      title: 'Metodo EAR',
      status: 'published',
      revision: '1.0.0',
      slug: ['metodo', 'ear'],
    },
  ],
});
```

| Versione | Modifica |
|---|---|
| 0.1.1 | Aggiunto il contratto di catalogo e snapshot versionato. |
