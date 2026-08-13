# `serial-story`

## Cos’è

`serial-story` contiene una sola primitiva di continuità narrativa già riusata da Rocco-Zara e Scrivia: la trasformazione degli **effetti di un episodio** in aggiornamenti immutabili dei registri di semi e debiti.

Il modulo non serializza un episodio in prosa e non interpreta il canone. Riceve invece una proiezione già costruita dal consumer e annota, con l’ID dell’episodio, quali elementi del ledger sono stati risolti.

> **Il core registra una risoluzione, non racconta una storia.** Il perché narrativo, la validità nel canone, il seed di prosa, le voci e gli artefatti restano nei sistemi che possiedono la saga.

## Cosa esporta

| Export | Firma | Comportamento |
|---|---|---|
| `deriveSagaLedgerPatch` | `(input: unknown) => SagaLedgerPatch` | Valida e normalizza effetti diretti e annidati di un episodio. |
| `applySagaLedgerPatch` | `(ledger, patch) => ledger` | Produce un ledger aggiornato senza mutare input o entry. |
| `SagaEpisodeEffectsSchema` | schema Zod | Contratto adapter per ID episodio e ID di debiti chiusi/semi fioriti. |
| `SagaLedgerPatchSchema` | schema Zod | Proiezione canonica degli aggiornamenti da applicare. |
| `SagaLedgerSchema` | schema Zod | Registro minimo di `seeds` e `debts`, estendibile dai consumer. |
| `SagaLedgerEntrySchema` | schema Zod | Entry con `bloomedAt` e/o `closedAt` opzionali più metadati locali. |
| Tipi derivati | TypeScript | `SagaEpisodeEffects`, `SagaLedgerPatch`, `SagaLedger`, `SagaLedgerEntry`. |

## Normalizzazione degli effetti

Un adapter può leggere un episodio con effetti al livello principale, annidati in `effects`, o in entrambi i punti. `deriveSagaLedgerPatch` conserva l’ordine del primo incontro e deduplica gli identificativi.

```ts
const patch = deriveSagaLedgerPatch({
  episodeId: 'ep-03',
  debtClosedIds: ['debt-promise'],
  effects: { seedBloomedIds: ['seed-sign'] },
});

// {
//   episodeId: 'ep-03',
//   debtClosedIds: ['debt-promise'],
//   seedBloomedIds: ['seed-sign'],
// }
```

## Applicazione immutabile

```ts
const nextLedger = applySagaLedgerPatch(ledger, patch);
```

| Elemento nel patch | Aggiornamento sull’entry esistente |
|---|---|
| `debtClosedIds` | Scrive `closedAt: episodeId`. |
| `seedBloomedIds` | Scrive `bloomedAt: episodeId`. |
| ID assente dal ledger | Nessuna eccezione e nessuna entry inventata. |

Il risultato conserva i campi extra del ledger e delle entry: `what`, quote, tracker, canone, stati custom e storage rimangono di proprietà del consumer. Applicare più volte lo stesso patch è logicamente idempotente.

## Decisioni chiuse

Il core usa chiavi camelCase (`closedAt`, `bloomedAt`) e non importa le convenzioni file/database delle fonti (`closed`, `bloomed_at`, ecc.). Un adapter locale mappa gli input e, se necessario, la proiezione in uscita.

Una entry assente viene ignorata. Il core deve poter lavorare su ledger parziali; l’errore semantico—per esempio un seme non dichiarato o un debito chiuso in ritardo—è compito dell’audit locale di Rocco-Zara o Scrivia.

## Cosa NON fa

Il modulo non contiene `SeedExt`, `SagaGraph`, `Canon`, `buildSeed`, fold dello stato, snapshot, recap d’arco, audit, PCG, personaggi, voci, entità, filesystem, YAML/JSON, AI, immagini, UI, database o rete.

Questi elementi sono intenzionalmente esclusi perché Rocco-Zara e Scrivia hanno già divergenze funzionali nei tracker e nei formati. Il ledger degli effetti è l’unica parte promossa in questo incremento perché è la transizione comune più piccola, pura e testabile.

## Changelog

| Versione | Modifica |
|---|---|
| 0.1.0 | Introdotti contratti Zod del ledger di saga, derivazione deduplicata degli effetti e applicazione immutabile. |
