# Coda offline portabile

**Stato:** design per B3 sul branch `feat/extraction-foundations`.  
**Scopo:** rendere riusabili la sequenza di una `Operation`, la deduplicazione tramite `idempotencyKey`, le transizioni di retry e un router registrato dal consumer. Il modulo non conosce browser, endpoint, formati HTTP, database o UI.

> **Una voce di coda conserva un comando già costruito; non inventa il comando.** Il core riceve una `Operation` valida e lascia al dominio la scelta di tipo, payload, attore, scope e chiave di idempotenza.

## Evidenze e confini

La Famiglia possiede una coda IndexedDB con stati `pending`, `syncing` e `failed`. Elimina le operazioni in caso di successo o risposta 4xx, e incrementa i retry per errori di rete o 5xx fino a una soglia. Nello stesso file convivono però database IndexedDB, service worker, Background Sync, `fetch`, `FormData` e mapping `create_post`/`toggle_like`/`add_comment` verso route locali: tutti elementi che devono restare nell’adapter di La Famiglia.

Moto-lollo è al momento un prototipo Next.js con dati mock e senza flusso di mutazione o sincronizzazione implementato. È quindi un **candidato**, non una prova di secondo consumer. Per rispettare la regola di promozione, B3 estrae il nucleo generico della coda e non una persistenza o un adapter Moto-lollo.

| Livello | Nel core | Nel consumer |
|---|---|---|
| Comando | `Operation` già validata e `idempotencyKey`. | Decide tipo, payload, actor e scope. |
| Stato coda | Entry, tentativi, selezione ordinata, transizioni e risultato. | Salva/ripristina da IndexedDB, Dexie, DB o memoria. |
| Routing | Registro esplicito `tipo → handler`, senza URL. | Registra un handler che chiama API, SDK o storage. |
| Scheduling | Nessuno. | Online event, service worker, cron, click utente o worker. |
| Classificazione errori | `succeeded`, `rejected`, `retryable`. | Traduce HTTP, rete o errori provider nell’esito corretto. |

## API proposta

```ts
const queue = createInMemoryOperationQueue();
const router = createOperationRouter();

router.register('post.create', async (operation) => {
  // Adapter del consumer: endpoint, auth e payload sono locali.
  return { kind: 'succeeded' };
});

queue.enqueue(operation); // Operation contiene idempotencyKey obbligatoria.
const report = await queue.process(router, { maxAttempts: 3 });
```

| Oggetto | Responsabilità |
|---|---|
| `QueueEntry` | Avvolge l’operazione con `pending`, `processing` o `failed` e contatore tentativi. |
| `createInMemoryOperationQueue` | Mantiene un’istanza isolata, deduplica per `idempotencyKey`, processa i pending per `createdAt`. |
| `createOperationRouter` | Registra handler consumer per tipo; un tipo non registrato è riportato senza cancellare l’entry. |
| `ExecutionOutcome` | L’handler dichiara successo, rifiuto permanente o condizione ritentabile; il router non interpreta HTTP. |
| `RetryPolicy` | Definisce solo `maxAttempts`; ritardi, timer e backoff sono esterni perché dipendono dallo scheduler consumer. |

## Transizioni

| Stato iniziale | Esito | Stato / effetto finale |
|---|---|---|
| `pending` | `succeeded` | Rimossa dalla coda. |
| `pending` | `rejected` | Rimossa dalla coda e conteggiata come fallimento definitivo. |
| `pending` | `retryable`, tentativi sotto soglia | Torna `pending` con tentativi incrementati. |
| `pending` | `retryable`, soglia raggiunta | Resta `failed` per ispezione o recupero esplicito. |
| `pending` | handler assente | Rimane invariata; è un difetto di configurazione, non un tentativo remoto. |

## Decisioni

La coda **non genera** ID, chiavi di idempotenza o timestamp. Questi valori devono essere creati dal producer di `Operation`; in particolare, l’idempotenza non può essere affidata a un UUID casuale generato al momento dell’enqueue.

La deduplicazione è prudenziale: una chiave già presente, anche su una entry `failed`, non crea una seconda entry. Prima di creare un nuovo comando, il consumer deve decidere esplicitamente se riaprire o archiviare quello esistente.

`process()` è invocato esplicitamente. Il core non prova a capire quando torna la rete, non avvia timer e non rimane in esecuzione in background. Questa scelta evita che una libreria condivisa diventi un processo persistente e consente al consumer di scegliere il lifecycle corretto.

## Fuori scope

Non entrano in questo incremento IndexedDB/Dexie/Supabase, fetch, endpoint, serializzazione `FormData`, service worker, Background Sync, retry temporizzato, backoff, lock distribuiti, concurrency tra tab/processi, autenticazione, UI o optimistic update. Non sono inclusi payload e route della timeline di La Famiglia.
