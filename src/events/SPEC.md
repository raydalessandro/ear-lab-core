# `events`

## Cos’è

`events` espone un **catalogo tipizzato e un bus in-memory per fatti di dominio**. Un producer dichiara quali tipi di evento può pubblicare e quale payload appartiene a ciascuno; gli adapter del consumer possono reagire senza che il producer conosca Supabase, push notification, Telegram, webhook, queue o persistenza.

Il modulo riusa `DomainEvent` e `DomainEventSchema` da `contracts/common`. Perciò ogni evento ha un identificativo, un tipo, una versione `1`, un istante ISO con offset e un payload, oltre ai campi opzionali per attore, scope e correlazione.

> **Un evento descrive un fatto già avvenuto.** Non è un comando, non è una notifica e non è una richiesta HTTP. Il catalogo descrive il fatto; gli adapter dei consumer decidono se e come consegnarlo.

## Cosa esporta

| Export | Firma | Comportamento |
|---|---|---|
| `defineEventCatalog` | `(catalog) => catalog` | Conserva chiavi letterali Zod e inferenza dei payload dichiarati dal consumer. |
| `EventCatalog` | `Record<string, ZodType>` | Mappa stabile tra tipo evento e schema Zod del payload. |
| `EventType` | tipo derivato | Unione delle chiavi dichiarate nel catalogo. |
| `EventPayload` | tipo derivato | Payload inferito per un tipo di evento. |
| `EventFor` | tipo derivato | Envelope comune con tipo e payload collegati al catalogo. |
| `createInMemoryEventBus` | `() => EventBus` oppure `(catalog) => EventBus` | Crea un registro isolato; con catalogo valida anche tipo e payload. |
| `EventBus.publish` | `(event) => Promise<void>` | Valida l’evento e attende gli handler del tipo e quelli globali. |
| `EventBus.subscribe` | `(eventType, handler) => Unsubscribe` | Iscrive un handler; con catalogo il suo payload è tipizzato. |
| `EventBus.subscribeAll` | `(handler) => Unsubscribe` | Iscrive un handler a tutti gli eventi; utile per audit o adapter trasversali. |
| `EventHandler` | `(event) => void \| Promise<void>` | Reazione sincrona o asincrona a un fatto validato. |
| `Unsubscribe` | `() => void` | Rimuove la subscription; è idempotente. |

## Decisioni chiuse

Il **catalogo è definito dal consumer**, non dal core. Questo evita di fingere che `meal-plan.published`, `content.approved` o `post.created` appartengano a uno stesso dominio: il core fornisce il meccanismo e l’envelope, mentre ogni applicazione dichiara soltanto i propri fatti.

Quando il bus riceve un catalogo, TypeScript lega a compile-time ogni chiave al rispettivo payload e Zod ripete il controllo a runtime. Prima convalida l’envelope comune; poi rifiuta una chiave assente dal catalogo oppure un payload che non corrisponde allo schema. Nessun handler viene chiamato nel caso di input non valido.

Ogni chiamata a `createInMemoryEventBus()` crea un’istanza indipendente. Il core non mantiene un singleton nascosto: in questo modo test, request e processi non condividono stato per errore.

`publish()` attende gli handler. Questo rende osservabili gli errori: se un adapter fallisce, la Promise è rifiutata e il chiamante può scegliere consapevolmente se attendere, registrare l’errore o avviare una politica di retry esterna. Gli handler iscritti al medesimo evento vengono avviati insieme; il modulo non stabilisce un ordine business.

## Esempio d’uso

```ts
import { z } from 'zod';
import {
  createInMemoryEventBus,
  defineEventCatalog,
  type EventFor,
} from 'ear-lab-core';

const events = defineEventCatalog({
  'meal-plan.published': z.object({
    planId: z.string().min(1),
    servings: z.number().int().positive(),
  }),
});

const bus = createInMemoryEventBus(events);

bus.subscribe('meal-plan.published', async (event) => {
  // event.payload.planId e event.payload.servings sono tipizzati.
  // Questo adapter, e non il core, può salvare una outbox o notificare.
  console.log(event.payload.planId);
});

const event: EventFor<typeof events, 'meal-plan.published'> = {
  id: 'evt-001',
  type: 'meal-plan.published',
  version: 1,
  occurredAt: '2026-08-13T12:00:00.000Z',
  payload: { planId: 'plan-001', servings: 4 },
};

await bus.publish(event);
```

È anche possibile creare un bus senza catalogo per un confine esplorativo o generico: in quel caso viene validato il solo `DomainEvent`, e il payload rimane `unknown`.

## Cosa NON fa

Il modulo non offre broker tra processi, persistenza, outbox, ordine globale, retry, dead-letter queue, deduplicazione, autorizzazione, rate limiting o consegna exactly-once. Non formatta notifiche, non calcola destinatari e non invia messaggi push, email, Telegram o webhook.

Queste responsabilità appartengono a un adapter nel repository consumer. Il successivo modulo `offline-queue` potrà aggiungere una coda portabile basata su `Operation`, senza cambiare la forma dell’evento.

## Changelog

| Versione | Modifica |
|---|---|
| 0.1.0 | Introdotti catalogo Zod tipizzato, event bus in-memory, subscription per tipo e subscription globale, con envelope e payload validati. |
