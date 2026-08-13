import { describe, expect, it } from 'vitest';

import {
  applySagaLedgerPatch,
  deriveSagaLedgerPatch,
} from './ledger.js';

describe('deriveSagaLedgerPatch', () => {
  it('unisce effetti diretti e annidati, eliminando duplicati senza perdere l’ordine', () => {
    const patch = deriveSagaLedgerPatch({
      episodeId: 'ep-03',
      debtClosedIds: ['debt-a', 'debt-b'],
      seedBloomedIds: ['seed-a'],
      effects: {
        debtClosedIds: ['debt-b', 'debt-c'],
        seedBloomedIds: ['seed-a', 'seed-b'],
      },
    });

    expect(patch).toEqual({
      episodeId: 'ep-03',
      debtClosedIds: ['debt-a', 'debt-b', 'debt-c'],
      seedBloomedIds: ['seed-a', 'seed-b'],
    });
  });

  it('rifiuta un episodio o identificatore effetto vuoto', () => {
    expect(() => deriveSagaLedgerPatch({ episodeId: '' })).toThrow();
    expect(() => deriveSagaLedgerPatch({
      episodeId: 'ep-03',
      debtClosedIds: [''],
    })).toThrow();
  });
});

describe('applySagaLedgerPatch', () => {
  const ledger = {
    seeds: {
      'seed-a': { what: 'Il segno sulla mappa' },
      'seed-b': { what: 'La lanterna' },
    },
    debts: {
      'debt-a': { what: 'Ritrovare la chiave' },
      'debt-b': { what: 'Attraversare il fiume' },
    },
    tracker: { collected: ['laghi-occidente'] },
  };

  it('annota semi fioriti e debiti chiusi senza mutare ledger o entry di input', () => {
    const next = applySagaLedgerPatch(ledger, {
      episodeId: 'ep-03',
      debtClosedIds: ['debt-a'],
      seedBloomedIds: ['seed-b'],
    });

    expect(next).toEqual({
      seeds: {
        'seed-a': { what: 'Il segno sulla mappa' },
        'seed-b': { what: 'La lanterna', bloomedAt: 'ep-03' },
      },
      debts: {
        'debt-a': { what: 'Ritrovare la chiave', closedAt: 'ep-03' },
        'debt-b': { what: 'Attraversare il fiume' },
      },
      tracker: { collected: ['laghi-occidente'] },
    });
    expect(next).not.toBe(ledger);
    expect(next.seeds['seed-b']).not.toBe(ledger.seeds['seed-b']);
    expect(next.debts['debt-a']).not.toBe(ledger.debts['debt-a']);
    expect(ledger).toEqual({
      seeds: {
        'seed-a': { what: 'Il segno sulla mappa' },
        'seed-b': { what: 'La lanterna' },
      },
      debts: {
        'debt-a': { what: 'Ritrovare la chiave' },
        'debt-b': { what: 'Attraversare il fiume' },
      },
      tracker: { collected: ['laghi-occidente'] },
    });
  });

  it('ignora riferimenti assenti e conserva il ledger esistente', () => {
    const next = applySagaLedgerPatch(ledger, {
      episodeId: 'ep-03',
      debtClosedIds: ['debt-unknown'],
      seedBloomedIds: ['seed-unknown'],
    });

    expect(next).toEqual(ledger);
    expect(next).not.toBe(ledger);
  });

  it('è idempotente: applicare due volte la stessa patch non cambia il risultato logico', () => {
    const patch = {
      episodeId: 'ep-03',
      debtClosedIds: ['debt-a'],
      seedBloomedIds: ['seed-a'],
    };

    const once = applySagaLedgerPatch(ledger, patch);
    const twice = applySagaLedgerPatch(once, patch);

    expect(twice).toEqual(once);
  });
});
