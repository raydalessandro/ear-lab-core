# C2 — Nucleo `serial-story`: ledger degli effetti episodio

**Stato:** design per il branch `feat/serial-story-ledger`.  
**Decisione:** estrarre soltanto la derivazione e l’applicazione pura degli effetti di un episodio sui registri di semi e debiti. Il serializzatore completo resta nei consumer.

> **Il core governa una piccola transizione di ledger; non interpreta una saga.** Un episodio può saldare debiti e far fiorire semi. Canone, personaggi, voci, geografia, artifact, prompt e generazione restano dati e logica dei sistemi narrativi.

## Evidenza di riuso reale

Rocco-Zara contiene `saga/serializzatore`, mentre Scrivia ne contiene il backport operativo in `lib/saga`. Entrambi espongono `serializeEpisode`, `serializeEpisodeFull`, `applyEffects` e `recapArc`; Scrivia possiede inoltre test end-to-end del serializzatore e un golden cross-repository per `SeedExt`.

Le due implementazioni si sono differenziate dove è corretto: Scrivia ha generalizzato tracker e formati, Rocco-Zara conserva le particolarità del proprio canone. Il comportamento più piccolo ancora duplicato e invariato è però questo: un episodio dichiara `seeds_bloomed` e `debts_closed` sia al livello principale sia nel proprio sotto-oggetto `effects`; gli identificativi vengono annotati nei rispettivi registri con l’episodio che li ha risolti.

| Livello | Nel core | Nei consumer |
|---|---|---|
| Ledger | Contratto Zod dei registri minimi, patch derivata da un episodio e applicazione immutabile. | Registri completi con `what`, quote, tracker, canone e metadati propri. |
| Effetti | Normalizzazione di campi top-level e annidati, dedupe, semantica di `closedAt` / `bloomedAt`. | Parser dello schema sorgente o adapter che mappa `debts_closed` / `seeds_bloomed`. |
| Serializzazione | Nessuna. | `buildSagaContext`, `buildSeed`, `SeedExt`, entità, voci, PCG e audit. |
| Snapshot | Nessuno. | Fold, baseline d’arco, tracker e `world_state_baselines`. |
| Persistenza | Nessuna. | File, JSON, Supabase, store/UI e lifecycle applicativo. |

## API proposta

```ts
const patch = deriveSagaLedgerPatch({
  episodeId: 'ep-03',
  debtClosedIds: ['debt-promise'],
  effects: { seedBloomedIds: ['seed-sign'] },
});

const nextLedger = applySagaLedgerPatch(ledger, patch);
```

| Oggetto | Responsabilità |
|---|---|
| `SagaEpisodeEffects` | Input canonico dell’adapter: ID episodio e ID di semi/debiti saldati. |
| `deriveSagaLedgerPatch` | Unisce i campi diretti e annidati; ogni ID compare una sola volta. |
| `SagaLedgerPatch` | Proiezione immutabile degli aggiornamenti `id → episodeId`. |
| `SagaLedger` | Registro minimo di semi e debiti, estendibile dai consumer. |
| `applySagaLedgerPatch` | Applica la patch senza mutare il ledger o le entry in input; ignora ID non presenti. |

## Decisioni

Il core usa `closedAt` e `bloomedAt` in camelCase. Rocco-Zara e Scrivia mantengono le proprie chiavi sorgente (`closed`, `bloomed_at`, oppure altre) in un adapter piccolo: questo evita di fissare nel core una convenzione di file o database. La data non viene generata: `episodeId` è la prova seriale della transizione e il tempo appartiene al sistema sorgente.

L’applicazione ignora riferimenti a semi o debiti assenti. Questo mantiene la funzione sicura per ledger parziali e permette al consumer di eseguire separatamente audit più severi. Il core non decide se un effetto sia ammissibile, se una quota sia rispettata o se un seme sia “in ritardo”: sono invarianti del canone e dell’audit locale.

## Fuori scope

Non entrano `SeedExt`, `SagaGraph`, `Canon`, `buildSeed`, `buildSagaContext`, `auditContinuity`, PCG, snapshot, recap d’arco, entità, voci, file JSON/YAML, filesystem, generatori AI, immagini o persistenza. Questi elementi sono più ampi del ledger e hanno già divergenze intenzionali tra Rocco-Zara e Scrivia.
