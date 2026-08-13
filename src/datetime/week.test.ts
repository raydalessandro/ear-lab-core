import { describe, expect, it } from 'vitest';

import { startOfIsoWeek } from './week.js';

describe('startOfIsoWeek', () => {
  it('restituisce il lunedì locale della settimana per una domenica', () => {
    const sunday = new Date(2026, 0, 4, 12, 0, 0);

    expect(startOfIsoWeek(sunday)).toBe('2025-12-29');
  });

  it('mantiene il lunedì come inizio della settimana', () => {
    const monday = new Date(2026, 0, 5, 12, 0, 0);

    expect(startOfIsoWeek(monday)).toBe('2026-01-05');
  });

  it('usa la data locale invece della conversione UTC', () => {
    const localSundayNearMidnight = new Date(2026, 4, 3, 0, 30, 0);

    expect(startOfIsoWeek(localSundayNearMidnight)).toBe('2026-04-27');
  });

  it('non modifica l’oggetto Date ricevuto', () => {
    const input = new Date(2026, 2, 4, 17, 45, 0);
    const originalTime = input.getTime();

    startOfIsoWeek(input);

    expect(input.getTime()).toBe(originalTime);
  });

  it('rifiuta una data non valida', () => {
    expect(() => startOfIsoWeek(new Date('invalid'))).toThrow(RangeError);
  });
});
