import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);
const EffectIdsSchema = z.array(NonEmptyString).default([]);

/** Effetti dichiarati in forma annidata da un episodio sorgente. */
export const NestedSagaEffectsSchema = z.object({
  debtClosedIds: EffectIdsSchema,
  seedBloomedIds: EffectIdsSchema,
});

/**
 * Input canonico dell’adapter che legge un episodio di saga.
 *
 * I consumer possono mappare qui i propri nomi sorgente (`debts_closed`,
 * `seeds_bloomed`, `effects`, …) senza trasferire il loro schema nel core.
 */
export const SagaEpisodeEffectsSchema = z.object({
  episodeId: NonEmptyString,
  debtClosedIds: EffectIdsSchema,
  seedBloomedIds: EffectIdsSchema,
  effects: NestedSagaEffectsSchema.optional(),
});

export type SagaEpisodeEffects = z.infer<typeof SagaEpisodeEffectsSchema>;

/** Patch minima e autosufficiente che annota il ledger con l’episodio risolutivo. */
export const SagaLedgerPatchSchema = z.object({
  episodeId: NonEmptyString,
  debtClosedIds: EffectIdsSchema,
  seedBloomedIds: EffectIdsSchema,
});

export type SagaLedgerPatch = z.infer<typeof SagaLedgerPatchSchema>;

/** Entry estendibile: il core conosce solo l’episodio che ha chiuso o fatto fiorire l’elemento. */
export const SagaLedgerEntrySchema = z.object({
  bloomedAt: NonEmptyString.optional(),
  closedAt: NonEmptyString.optional(),
}).passthrough();

export type SagaLedgerEntry = z.infer<typeof SagaLedgerEntrySchema>;

/** Registri minimi di saga. Campi aggiuntivi rimangono proprietà del consumer. */
export const SagaLedgerSchema = z.object({
  seeds: z.record(NonEmptyString, SagaLedgerEntrySchema),
  debts: z.record(NonEmptyString, SagaLedgerEntrySchema),
}).passthrough();

export type SagaLedger = z.infer<typeof SagaLedgerSchema>;

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Normalizza gli effetti diretti e annidati di un episodio in una patch unica.
 *
 * L’ordine del primo incontro è conservato; un riferimento duplicato non genera
 * una seconda transizione logica nel ledger.
 */
export function deriveSagaLedgerPatch(input: unknown): SagaLedgerPatch {
  const episode = SagaEpisodeEffectsSchema.parse(input);

  return {
    episodeId: episode.episodeId,
    debtClosedIds: uniqueIds([
      ...episode.debtClosedIds,
      ...(episode.effects?.debtClosedIds ?? []),
    ]),
    seedBloomedIds: uniqueIds([
      ...episode.seedBloomedIds,
      ...(episode.effects?.seedBloomedIds ?? []),
    ]),
  };
}

function applyEpisodeReference(
  entries: Record<string, SagaLedgerEntry>,
  affectedIds: Set<string>,
  field: 'bloomedAt' | 'closedAt',
  episodeId: string,
): Record<string, SagaLedgerEntry> {
  return Object.fromEntries(
    Object.entries(entries).map(([id, entry]) => [
      id,
      affectedIds.has(id) ? { ...entry, [field]: episodeId } : entry,
    ]),
  );
}

/**
 * Applica una patch al ledger senza mutare l’input.
 *
 * Un riferimento a una entry non presente viene ignorato: il consumer può
 * applicare un audit di canone più severo, ma una proiezione parziale non perde
 * gli aggiornamenti validi già disponibili.
 */
export function applySagaLedgerPatch<TLedger extends SagaLedger>(
  ledger: TLedger,
  patch: SagaLedgerPatch,
): TLedger {
  SagaLedgerSchema.parse(ledger);
  const validPatch = SagaLedgerPatchSchema.parse(patch);

  return {
    ...ledger,
    seeds: applyEpisodeReference(
      ledger.seeds,
      new Set(validPatch.seedBloomedIds),
      'bloomedAt',
      validPatch.episodeId,
    ),
    debts: applyEpisodeReference(
      ledger.debts,
      new Set(validPatch.debtClosedIds),
      'closedAt',
      validPatch.episodeId,
    ),
  } as TLedger;
}
