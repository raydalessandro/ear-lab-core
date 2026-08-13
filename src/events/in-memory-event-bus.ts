import {
  DomainEventSchema,
  type DomainEvent,
} from '../contracts/common.js';
import type {
  EventCatalog,
  EventFor,
  EventType,
} from './catalog.js';

/** Funzione chiamata quando un fatto di dominio viene pubblicato. */
export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => void | Promise<void>;

/** Rimuove una subscription dal bus. Può essere chiamata più volte senza effetti collaterali. */
export type Unsubscribe = () => void;

type UntypedEventHandler = EventHandler<DomainEvent>;

type BusEvent<TCatalog extends EventCatalog | undefined> =
  TCatalog extends EventCatalog
    ? EventFor<TCatalog, EventType<TCatalog>>
    : DomainEvent;

type BusEventType<TCatalog extends EventCatalog | undefined> =
  TCatalog extends EventCatalog ? EventType<TCatalog> : string;

type BusEventForType<
  TCatalog extends EventCatalog | undefined,
  TType extends BusEventType<TCatalog>,
> = TCatalog extends EventCatalog
  ? EventFor<TCatalog, Extract<TType, EventType<TCatalog>>>
  : DomainEvent;

/**
 * Porta sincrona e process-local per distribuire fatti di dominio.
 *
 * Se creata con un catalogo, collega a compile-time le chiavi evento ai loro
 * payload e li valida anche a runtime. Non garantisce persistenza, retry,
 * deduplicazione o consegna cross-process.
 */
export interface EventBus<TCatalog extends EventCatalog | undefined = undefined> {
  publish(event: BusEvent<TCatalog>): Promise<void>;
  subscribe<TType extends BusEventType<TCatalog>>(
    eventType: TType,
    handler: EventHandler<BusEventForType<TCatalog, TType>>,
  ): Unsubscribe;
  subscribeAll(handler: EventHandler<BusEvent<TCatalog>>): Unsubscribe;
}

function removeFrom<T>(entries: Set<T>, entry: T): Unsubscribe {
  let active = true;

  return () => {
    if (!active) return;
    active = false;
    entries.delete(entry);
  };
}

function validateEvent(event: DomainEvent, catalog: EventCatalog | undefined): DomainEvent {
  const validEvent = DomainEventSchema.parse(event);
  if (catalog === undefined) return validEvent;

  const payloadSchema = catalog[validEvent.type];
  if (payloadSchema === undefined) {
    throw new Error(`Event type "${validEvent.type}" is not defined in this catalog.`);
  }

  return {
    ...validEvent,
    payload: payloadSchema.parse(validEvent.payload),
  };
}

/**
 * Crea un event bus isolato in memoria.
 *
 * Senza catalogo valida il solo `DomainEvent`; con un catalogo valida anche
 * l’appartenenza della chiave e la shape del payload. Ogni chiamata costruisce
 * un registro indipendente: non esiste stato globale né una dipendenza da
 * transport, database o framework.
 */
export function createInMemoryEventBus<TCatalog extends EventCatalog>(
  catalog: TCatalog,
): EventBus<TCatalog>;
export function createInMemoryEventBus(): EventBus;
export function createInMemoryEventBus<TCatalog extends EventCatalog>(
  catalog?: TCatalog,
): EventBus<TCatalog | undefined> {
  const handlersByType = new Map<string, Set<UntypedEventHandler>>();
  const allHandlers = new Set<UntypedEventHandler>();

  const publish = async (event: DomainEvent): Promise<void> => {
    const validEvent = validateEvent(event, catalog);
    const handlers = [
      ...(handlersByType.get(validEvent.type) ?? []),
      ...allHandlers,
    ];

    await Promise.all(handlers.map(async (handler) => handler(validEvent)));
  };

  const subscribe = (eventType: string, handler: UntypedEventHandler): Unsubscribe => {
    const normalizedType = eventType.trim();
    if (normalizedType.length === 0) {
      throw new Error('An event type must be a non-empty string.');
    }

    const handlers = handlersByType.get(normalizedType) ?? new Set<UntypedEventHandler>();
    handlers.add(handler);
    handlersByType.set(normalizedType, handlers);

    return removeFrom(handlers, handler);
  };

  const subscribeAll = (handler: UntypedEventHandler): Unsubscribe => {
    allHandlers.add(handler);
    return removeFrom(allHandlers, handler);
  };

  return {
    publish,
    subscribe,
    subscribeAll,
  } as unknown as EventBus<TCatalog | undefined>;
}
