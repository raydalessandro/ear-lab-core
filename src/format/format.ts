const frequencyDivisors = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
} as const;

export type Frequency = keyof typeof frequencyDivisors;

const euroRoundedFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const euroPreciseFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
});

export function formatEuro(value: number): string {
  assertFinite(value);

  return euroRoundedFormatter.format(value);
}

export function formatEuroPrecise(value: number): string {
  assertFinite(value);

  return euroPreciseFormatter.format(value);
}

export function toMonthlyAmount(value: number, frequency: Frequency): number {
  assertFinite(value);

  return value / frequencyDivisors[frequency];
}

function assertFinite(value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError('value deve essere un numero finito');
  }
}
