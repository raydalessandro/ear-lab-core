import { describe, expect, it } from 'vitest';

import { MealPlanSnapshotSchema } from './meal-planning.js';

const validSnapshot = {
  version: 1,
  source: {
    system: 'ricette-lab',
    revision: '2026.08.13',
    exportedAt: '2026-08-13T12:00:00.000Z',
  },
  title: 'Settimana 10-16 agosto',
  period: {
    startDate: '2026-08-10',
    endDate: '2026-08-16',
  },
  meals: [
    {
      scheduledFor: '2026-08-10',
      mealType: 'pranzo',
      recipe: {
        slug: 'pasta-al-pomodoro',
        title: 'Pasta al pomodoro',
      },
      servings: 4,
    },
  ],
};

describe('MealPlanSnapshotSchema', () => {
  it('accetta un piano autosufficiente e indipendente dal database del consumer', () => {
    const result = MealPlanSnapshotSchema.safeParse(validSnapshot);

    expect(result.success).toBe(true);
  });

  it('accetta brief giornaliero e lista spesa opzionali', () => {
    const result = MealPlanSnapshotSchema.safeParse({
      ...validSnapshot,
      dailyBriefs: [
        {
          date: '2026-08-10',
          label: 'Lunedì 10 agosto',
          meals: [
            {
              mealType: 'pranzo',
              recipe: { slug: 'pasta-al-pomodoro', title: 'Pasta al pomodoro' },
              servings: 4,
              activeMinutes: 10,
              totalMinutes: 25,
            },
          ],
          preTasks: [
            { description: 'Lavare il basilico', relatedRecipeSlug: 'pasta-al-pomodoro' },
          ],
          nutrition: {
            kcalTotal: 2200,
            proteinTotalGrams: 100,
            carbsTotalGrams: 260,
            fatTotalGrams: 75,
          },
        },
      ],
      shoppingList: {
        items: [
          {
            ingredientSlug: 'pomodoro',
            displayName: 'Pomodoro',
            quantity: 800,
            roundedQuantity: 800,
            unit: 'g',
            category: 'verdura',
            sourceRecipeSlugs: ['pasta-al-pomodoro'],
            costEstimateEuro: 4.5,
          },
        ],
        totalEstimateEuro: 4.5,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rifiuta pasti esterni al periodo', () => {
    const result = MealPlanSnapshotSchema.safeParse({
      ...validSnapshot,
      meals: [{ ...validSnapshot.meals[0], scheduledFor: '2026-08-17' }],
    });

    expect(result.success).toBe(false);
  });

  it('rifiuta due pasti nello stesso slot giorno e tipo', () => {
    const result = MealPlanSnapshotSchema.safeParse({
      ...validSnapshot,
      meals: [validSnapshot.meals[0], { ...validSnapshot.meals[0] }],
    });

    expect(result.success).toBe(false);
  });

  it('rifiuta una data locale inesistente', () => {
    const result = MealPlanSnapshotSchema.safeParse({
      ...validSnapshot,
      period: { startDate: '2026-02-30', endDate: '2026-03-01' },
      meals: [{ ...validSnapshot.meals[0], scheduledFor: '2026-02-30' }],
    });

    expect(result.success).toBe(false);
  });
});
