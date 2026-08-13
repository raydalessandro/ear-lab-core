import { z } from 'zod';

import { ArtifactRefSchema } from './common.js';

const NonEmptyString = z.string().trim().min(1);
const IsoTimestamp = z.string().datetime({ offset: true });

export const CatalogStatusSchema = z.enum([
  'published',
  'draft',
  'wip',
  'coming-soon',
]);

export type CatalogStatus = z.infer<typeof CatalogStatusSchema>;

export const CatalogItemSchema = z.object({
  id: NonEmptyString,
  kind: NonEmptyString,
  title: NonEmptyString,
  status: CatalogStatusSchema,
  revision: NonEmptyString,
  slug: z.array(NonEmptyString).min(1),
  summary: z.string().optional(),
  tags: z.array(NonEmptyString).default([]),
  authors: z.array(NonEmptyString).default([]),
  updatedAt: IsoTimestamp.optional(),
  relatedIds: z.array(NonEmptyString).default([]),
  artifacts: z.array(ArtifactRefSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CatalogItem = z.infer<typeof CatalogItemSchema>;

export const CatalogSnapshotSchema = z.object({
  revision: z.number().int().positive(),
  generatedAt: IsoTimestamp,
  items: z.array(CatalogItemSchema),
});

export type CatalogSnapshot = z.infer<typeof CatalogSnapshotSchema>;
