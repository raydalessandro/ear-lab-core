# Nucleo eventi di dominio

**Stato:** implementato nel branch `feat/extraction-foundations`.  
**Scopo:** offrire ai moduli un catalogo Zod tipizzato e un modo sincrono per pubblicare fatti di dominio e reagire localmente, senza incorporare notifiche, webhook, queue, database o rete.

> **Un evento descrive un fatto già avvenuto.** Non è un comando, non è una notifica e non è una richiesta HTTP. Il suo payload appartiene al dominio; il core porta soltanto l’envelope comune e il meccanismo minimo di subscription.

## Osservazioni dalle fonti

La Famiglia concentra in un catalogo la definizione di eventi che producono notifiche, ma la definizione contiene anche recipienti, database, copy e canali push/Telegram. 67_ENT conserva notifiche nel proprio adapter Supabase. Entrambe le scelte confermano che **consegna e persistenza sono responsabilità dei consumer**, non del core.

| Livello | Nel core | Nel consumer |
|---|---|---|
| Fatto | `DomainEvent` con tipo, versione, istante, attore, scope e payload. | Definisce il payload specifico (`meal-plan.published`, `content.approved`, …). |
| Subscription | Registro in-memory di handler e unsubscribe. | Sceglie chi sottoscrive in un processo o request. |
| Consegna | Nessuna. | Web Push, Telegram, email, log, analytics, webhook, queue. |
| Persistenza | Nessuna. | Outbox, tabella notification, audit log, broker o database. |
| Errore handler | Rilevato e riportato al publisher. | Sceglie retry, dead-letter, osservabilità o isolamento. |

## API minima

```ts
const events = defineEventCatalog({
  'meal-plan.published': MealPlanSnapshotSchema,
});
const bus = createInMemoryEventBus(events);

const unsubscribe = bus.subscribe('meal-plan.published', async (event) => {
  // `event.payload` è un MealPlanSnapshot validato.
  // L’adapter del consumer può salvare, notificare o accodare fuori dal core.
});

await bus.publish({
  id: 'event-001',
  type: 'meal-plan.published',
  version: 1,
  occurredAt: '2026-08-13T12:00:00.000Z',
  payload: /* MealPlanSnapshot */,
});

unsubscribe();
```

## Decisioni

| Decisione | Motivo |
|---|---|
| Catalogo dichiarato dal consumer con `defineEventCatalog`. | Le chiavi letterali e gli schemi Zod rendono tipizzati e validati i payload, senza imporre eventi di un dominio al core. |
| Bus in-memory, creato esplicitamente. | Nessuno stato globale o accoppiamento tra test e processi. |
| Handler async e `publish()` attende tutti gli handler. | Il chiamante decide se attendere o rendere fire-and-forget l’adapter; il core non nasconde errori. |
| `subscribe(type, handler)` e `subscribeAll(handler)`. | Supporta reazioni specifiche e audit/telemetria sul catalogo dichiarato dal consumer. |
| Unsubscribe idempotente. | Evita leak nei test, in hook o in lifecycle di request. |
| Nessun retry o dedupe nel bus. | Idempotenza è proprietà delle `Operation`/queue e degli adapter, non di un dispatcher volatile. |

## Fuori scope

Il nucleo non assicura consegna una volta-e-una-sola, ordine globale, persistenza dopo restart, cross-process, autorizzazione, retry o throttling. Quando serve uno di questi requisiti, il consumer userà un adapter fuori dal core—per esempio una outbox su Supabase o una queue offline—senza cambiare la forma di `DomainEvent`.

## Primo caso d’uso

Il primo consumer previsto è un adapter Ricette Lab → La Famiglia: una volta validato `MealPlanSnapshot`, il producer può costruire un evento `meal-plan.published`; un adapter dedicato decide come trasformarlo in una `Operation` autenticata nel consumer. Il core non apre l’HTTP call.
