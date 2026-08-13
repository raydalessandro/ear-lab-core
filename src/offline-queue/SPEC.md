# `offline-queue`

## Cos’è

`offline-queue` contiene il nucleo **process-local e portabile** di una coda per `Operation` idempotenti. Gestisce l’accodamento, la deduplicazione tramite `idempotencyKey`, l’ordine deterministico, i tentativi e le transizioni dopo l’esito dichiarato da un adapter.

Non è un client HTTP, un worker persistente né un database. Il consumer costruisce il comando, registra l’handler di esecuzione e decide quando chiedere alla coda di processare le entry.

> **La coda conserva il comando; l’adapter lo esegue.** Il core non conosce URL, formati `FormData`, provider, credenziali o tabelle.

## Cosa esporta

| Export | Firma | Comportamento |
|---|---|---|
| `createInMemoryOperationQueue` | `() => OperationQueue` | Crea una coda isolata, non persistente e senza scheduler. |
| `OperationQueue.enqueue` | `(operation: Operation) => EnqueueResult` | Valida l’envelope e accoda o segnala un duplicato della stessa `idempotencyKey`. |
| `OperationQueue.list` | `() => QueueEntry[]` | Restituisce una snapshot ordinata per `createdAt`, poi per `id`. |
| `OperationQueue.process` | `(router, policy) => Promise<ProcessReport>` | Esegue soltanto le entry `pending`, una alla volta e in ordine. |
| `createOperationRouter` | `() => OperationRouter` | Crea un registro `type → handler` posseduto dal consumer. |
| `OperationRouter.register` | `(type, handler) => Unregister` | Aggiunge o sostituisce l’handler di un tipo; l’unregister è idempotente. |
| `ExecutionOutcome` | unione discriminata | L’adapter dichiara `succeeded`, `rejected` oppure `retryable`. |
| `RetryPolicy` | `{ maxAttempts: number }` | Stabilisce il massimo intero positivo di tentativi. |
| `QueueEntry` | operazione, stato, tentativi | Rappresenta lo stato locale: `pending`, `processing`, `failed`. |
| `ProcessReport` | contatori | Riporta successi, rifiuti, retry, fallimenti e tipi senza handler. |

## Stati e transizioni

| Stato | Esito del router | Effetto |
|---|---|---|
| `pending` | `succeeded` | L’entry viene rimossa. |
| `pending` | `rejected` | L’entry viene rimossa: il consumer ha classificato il problema come permanente. |
| `pending` | `retryable` sotto soglia | I tentativi aumentano e l’entry torna `pending`. |
| `pending` | `retryable` alla soglia | I tentativi aumentano e l’entry passa `failed`. |
| `pending` | nessun handler | Nessuna modifica; `unhandled` aumenta nel report. |
| `processing` | eccezione inattesa dell’handler | L’entry torna `pending`, non aumenta i tentativi e l’errore viene propagato. |

## Decisioni chiuse

L’enqueue convalida `Operation` tramite `OperationSchema`. La chiave di idempotenza deve dunque essere una stringa non vuota, ma la sua semantica resta una responsabilità del producer. Una chiave già presente non crea una seconda entry, persino quando la prima è `failed`: il consumer deve scegliere esplicitamente se riaprire, archiviare o sostituire il comando fallito.

Il router non interpreta codici HTTP. Un adapter può mappare una risposta 2xx a `succeeded`, un 4xx a `rejected` e una rete/5xx a `retryable`, ma questa politica è locale e sostituibile. In questo modo il core funziona anche con SDK, filesystem, BLE, database o qualsiasi trasporto diverso da HTTP.

`process()` non usa timer e non calcola ritardi. Un evento di ritorno online, un pulsante, un worker, un service worker o una pianificazione server-side sono lifecycle del consumer. Il core non esegue lavoro in background.

## Esempio d’uso

```ts
import {
  createInMemoryOperationQueue,
  createOperationRouter,
  type Operation,
} from 'ear-lab-core';

const queue = createInMemoryOperationQueue();
const router = createOperationRouter();

router.register('post.create', async (operation) => {
  const response = await consumerApi.createPost(operation.payload);
  return response.ok
    ? { kind: 'succeeded' }
    : { kind: 'retryable', reason: 'temporarily unavailable' };
});

const operation: Operation = {
  id: 'op-001',
  type: 'post.create',
  createdAt: '2026-08-13T12:00:00.000Z',
  idempotencyKey: 'post.create:request-001',
  payload: { text: 'Ciao' },
};

queue.enqueue(operation);
await queue.process(router, { maxAttempts: 3 });
```

## Cosa NON fa

Il modulo non include IndexedDB, Dexie, Supabase, storage, serializzazione, `fetch`, URL, `FormData`, service worker, Background Sync, backoff temporizzato, timer, cancellazione, optimistic update, concorrenza multi-tab/processo, lock distribuiti, autenticazione o UI.

Un adapter di persistenza potrà in futuro salvare e ripristinare `QueueEntry`; un adapter di scheduling potrà decidere quando invocare `process()`. Nessuno dei due entra nel core finché non esiste un riuso concreto e testato.

## Changelog

| Versione | Modifica |
|---|---|
| 0.1.0 | Introdotta coda in-memory per `Operation`, router consumer, deduplicazione per idempotencyKey e transizioni retry esplicite. |
