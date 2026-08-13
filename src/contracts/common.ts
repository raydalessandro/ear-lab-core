import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);
const IsoTimestamp = z.string().datetime({ offset: true });

export const ActorSchema = z.object({
  id: NonEmptyString,
  kind: z.enum(['user', 'system', 'agent']),
});

export type Actor = z.infer<typeof ActorSchema>;

export const ScopeSchema = z.object({
  kind: z.enum(['family', 'tenant', 'project', 'workspace']),
  id: NonEmptyString,
});

export type Scope = z.infer<typeof ScopeSchema>;

export const ArtifactRefSchema = z.object({
  id: NonEmptyString,
  kind: NonEmptyString,
  version: z.number().int().positive(),
  checksum: NonEmptyString.optional(),
  uri: z.string().url().optional(),
  createdAt: IsoTimestamp,
  metadata: z.record(z.string(), z.unknown()),
});

export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

export const DomainEventSchema = z.object({
  id: NonEmptyString,
  type: NonEmptyString,
  version: z.literal(1),
  occurredAt: IsoTimestamp,
  actor: ActorSchema.optional(),
  scope: ScopeSchema.optional(),
  correlationId: NonEmptyString.optional(),
  payload: z.unknown(),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

export const OperationSchema = z.object({
  id: NonEmptyString,
  type: NonEmptyString,
  createdAt: IsoTimestamp,
  idempotencyKey: NonEmptyString,
  actor: ActorSchema.optional(),
  scope: ScopeSchema.optional(),
  payload: z.unknown(),
});

export type Operation = z.infer<typeof OperationSchema>;
