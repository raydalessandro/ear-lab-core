import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);
const IsoTimestamp = z.string().datetime({ offset: true });

const LocalIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealLocalDate, 'deve essere una data locale ISO valida');

const MealTypeSchema = z.enum([
  'colazione',
  'pranzo',
  'merenda',
  'aperitivo',
  'cena',
]);

const RecipeSnapshotSchema = z
  .object({
    slug: NonEmptyString,
    title: NonEmptyString,
  })
  .strict();

const VariantSnapshotSchema = z
  .object({
    id: NonEmptyString,
    name: NonEmptyString.optional(),
  })
  .strict();

const PlannedMealSchema = z
  .object({
    scheduledFor: LocalIsoDateSchema,
    mealType: MealTypeSchema,
    recipe: RecipeSnapshotSchema,
    variant: VariantSnapshotSchema.optional(),
    servings: z.number().positive(),
  })
  .strict();

const DailyBriefMealSchema = z
  .object({
    mealType: MealTypeSchema,
    recipe: RecipeSnapshotSchema,
    variant: VariantSnapshotSchema.optional(),
    servings: z.number().positive(),
    activeMinutes: z.number().nonnegative(),
    totalMinutes: z.number().nonnegative(),
  })
  .strict();

const DailyBriefSchema = z
  .object({
    date: LocalIsoDateSchema,
    label: NonEmptyString,
    meals: z.array(DailyBriefMealSchema),
    preTasks: z.array(
      z
        .object({
          description: NonEmptyString,
          relatedRecipeSlug: NonEmptyString,
        })
        .strict(),
    ),
    nutrition: z
      .object({
        kcalTotal: z.number().nonnegative(),
        proteinTotalGrams: z.number().nonnegative(),
        carbsTotalGrams: z.number().nonnegative(),
        fatTotalGrams: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

const ShoppingItemSchema = z
  .object({
    ingredientSlug: NonEmptyString,
    displayName: NonEmptyString,
    quantity: z.number().positive(),
    roundedQuantity: z.number().positive(),
    unit: NonEmptyString,
    category: NonEmptyString,
    sourceRecipeSlugs: z.array(NonEmptyString).min(1),
    costEstimateEuro: z.number().nonnegative().optional(),
  })
  .strict();

const ShoppingListSchema = z
  .object({
    items: z.array(ShoppingItemSchema),
    totalEstimateEuro: z.number().nonnegative().optional(),
  })
  .strict();

export const MealPlanSnapshotSchema = z
  .object({
    version: z.literal(1),
    source: z
      .object({
        system: NonEmptyString,
        revision: NonEmptyString,
        exportedAt: IsoTimestamp,
      })
      .strict(),
    title: NonEmptyString,
    period: z
      .object({
        startDate: LocalIsoDateSchema,
        endDate: LocalIsoDateSchema,
      })
      .strict(),
    meals: z.array(PlannedMealSchema).min(1),
    dailyBriefs: z.array(DailyBriefSchema).optional(),
    shoppingList: ShoppingListSchema.optional(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.period.endDate < snapshot.period.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['period', 'endDate'],
        message: 'deve essere successiva o uguale a startDate',
      });
    }

    const plannedSlots = new Set<string>();
    snapshot.meals.forEach((meal, index) => {
      if (!isWithinPeriod(meal.scheduledFor, snapshot.period)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['meals', index, 'scheduledFor'],
          message: 'deve ricadere nel periodo del piano',
        });
      }

      const slot = `${meal.scheduledFor}:${meal.mealType}`;
      if (plannedSlots.has(slot)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['meals', index],
          message: 'ogni coppia data e tipo pasto deve essere unica',
        });
      }
      plannedSlots.add(slot);
    });

    const briefDates = new Set<string>();
    snapshot.dailyBriefs?.forEach((brief, index) => {
      if (!isWithinPeriod(brief.date, snapshot.period)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dailyBriefs', index, 'date'],
          message: 'deve ricadere nel periodo del piano',
        });
      }
      if (briefDates.has(brief.date)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dailyBriefs', index, 'date'],
          message: 'può comparire una sola volta nel brief giornaliero',
        });
      }
      briefDates.add(brief.date);
    });
  });

export type MealPlanSnapshot = z.infer<typeof MealPlanSnapshotSchema>;

function isWithinPeriod(
  date: string,
  period: { startDate: string; endDate: string },
): boolean {
  return date >= period.startDate && date <= period.endDate;
}

function isRealLocalDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
