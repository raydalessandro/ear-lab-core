import { describe, expect, it } from 'vitest';

import type { DomainEvent } from '../contracts/common.js';
import { createInMemoryEventBus } from './in-memory-event-bus.js';

const mealPlanPublished: DomainEvent = {
  id: 'event-001',
  type: 'meal-plan.published',
  version: 1,
  occurredAt: '2026-08-13T12:00:00.000Z',
  payload: { planId: 'piano-001' },
};

describe('createInMemoryEventBus', () => {
  it('invia un evento agli handler del tipo e agli handler globali', async () => {
    const bus = createInMemoryEventBus();
    const receivedByType: string[] = [];
    const receivedByAudit: string[] = [];

    bus.subscribe('meal-plan.published', (event) => {
      receivedByType.push(event.id);
    });
    bus.subscribeAll((event) => {
      receivedByAudit.push(event.type);
    });

    await bus.publish(mealPlanPublished);

    expect(receivedByType).toEqual(['event-001']);
    expect(receivedByAudit).toEqual(['meal-plan.published']);
  });

  it('attende gli handler asincroni prima di risolvere publish', async () => {
    const bus = createInMemoryEventBus();
    const phases: string[] = [];

    bus.subscribe('meal-plan.published', async () => {
      await Promise.resolve();
      phases.push('handler-finished');
    });

    await bus.publish(mealPlanPublished);

    expect(phases).toEqual(['handler-finished']);
  });

  it('smette di chiamare un handler specifico dopo unsubscribe idempotente', async () => {
    const bus = createInMemoryEventBus();
    const calls: string[] = [];
    const unsubscribe = bus.subscribe('meal-plan.published', (event) => {
      calls.push(event.id);
    });

    unsubscribe();
    unsubscribe();
    await bus.publish(mealPlanPublished);

    expect(calls).toEqual([]);
  });

  it('propaga l’errore di un handler invece di nasconderlo', async () => {
    const bus = createInMemoryEventBus();
    bus.subscribe('meal-plan.published', () => {
      throw new Error('adapter unavailable');
    });

    await expect(bus.publish(mealPlanPublished)).rejects.toThrow('adapter unavailable');
  });

  it('rifiuta envelope evento non validi prima di inviarli agli handler', async () => {
    const bus = createInMemoryEventBus();
    const received: string[] = [];
    bus.subscribeAll((event) => {
      received.push(event.id);
    });

    await expect(
      bus.publish({ ...mealPlanPublished, id: '' }),
    ).rejects.toThrow();

    expect(received).toEqual([]);
  });
});
