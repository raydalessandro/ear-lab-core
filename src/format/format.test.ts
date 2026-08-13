import { describe, expect, it } from 'vitest';

import {
  formatEuro,
  formatEuroPrecise,
  toMonthlyAmount,
} from './format.js';

describe('formatEuro', () => {
  it('formatta euro in italiano arrotondando ai valori interi', () => {
    const expected = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(1234.56);

    expect(formatEuro(1234.56)).toBe(expected);
  });

  it('mantiene i centesimi nella variante precisa', () => {
    const expected = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(1234.56);

    expect(formatEuroPrecise(1234.56)).toBe(expected);
  });

  it('rifiuta valori non finiti', () => {
    expect(() => formatEuro(Number.NaN)).toThrow(RangeError);
    expect(() => formatEuroPrecise(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('toMonthlyAmount', () => {
  it.each([
    ['monthly', 120, 120],
    ['bimonthly', 120, 60],
    ['quarterly', 120, 40],
    ['semiannual', 120, 20],
    ['annual', 120, 10],
  ] as const)('normalizza %s in valore mensile', (frequency, amount, expected) => {
    expect(toMonthlyAmount(amount, frequency)).toBe(expected);
  });

  it('rifiuta importi non finiti', () => {
    expect(() => toMonthlyAmount(Number.NEGATIVE_INFINITY, 'monthly')).toThrow(RangeError);
  });
});
