import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import {
  defineEventCatalog,
  type EventFor,
} from './catalog.js';
import { createInMemoryEventBus } from './in-memory-event-bus.js';

const mealEvents = defineEventCatalog({
  'meal-plan.published': z.object({
    planId: z.string().min(1),
    servings: z.number().int().positive(),
  }),
});

type MealPlanPublished = EventFor<typeof mealEvents, 'meal-plan.published'>;

const mealPlanPublished: MealPlanPublished = {
  id: 'event-001',
  type: 'meal-plan.published',
  version: 1,
  occurredAt: '2026-08-13T12:00:00.000Z',
  payload: { planId: 'piano-001', servings: 4 },
};

describe('defineEventCatalog', () => {
  it('fornisce al bus il payload validato del tipo di evento sottoscritto', async () => {
    const bus = createInMemoryEventBus(mealEvents);
    const receivedPlanIds: string[] = [];

    bus.subscribe('meal-plan.published', (event) => {
      receivedPlanIds.push(event.payload.planId);
    });

    await bus.publish(mealPlanPublished);

    expect(receivedPlanIds).toEqual(['piano-001']);
  });

  it('rifiuta un payload non conforme prima di chiamare gli handler', async () => {
    const bus = createInMemoryEventBus(mealEvents);
    const received: string[] = [];
    bus.subscribe('meal-plan.published', (event) => {
      received.push(event.id);
    });

    await expect(
      bus.publish({
        ...mealPlanPublished,
        payload: { planId: '', servings: 0 },
      }),
    ).rejects.toThrow();

    expect(received).toEqual([]);
  });

  it('rifiuta al runtime tipi non presenti nel catalogo', async () => {
    const bus = createInMemoryEventBus(mealEvents);

    await expect(
      bus.publish({
        ...mealPlanPublished,
        type: 'meal-plan.archived',
      } as unknown as MealPlanPublished),
    ).rejects.toThrow('not defined in this catalog');
  });
});
