import { z } from 'zod';

import type { DomainEvent } from '../contracts/common.js';

/** Mappa stabile fra tipo di evento e schema Zod del suo payload. */
export type EventCatalog = Record<string, z.ZodTypeAny>;

/** Restituisce il catalogo senza perdere le chiavi letterali e l’inferenza dei payload. */
export function defineEventCatalog<const TCatalog extends EventCatalog>(
  catalog: TCatalog,
): TCatalog {
  return catalog;
}

/** Tipi di evento dichiarati dal catalogo. */
export type EventType<TCatalog extends EventCatalog> = Extract<keyof TCatalog, string>;

/** Payload valido per una chiave evento dichiarata. */
export type EventPayload<
  TCatalog extends EventCatalog,
  TType extends EventType<TCatalog>,
> = z.infer<TCatalog[TType]>;

/** Envelope comune con chiave e payload legati allo stesso catalogo. */
export type EventFor<
  TCatalog extends EventCatalog,
  TType extends EventType<TCatalog>,
> = Omit<DomainEvent, 'type' | 'payload'> & {
  type: TType;
  payload: EventPayload<TCatalog, TType>;
};
