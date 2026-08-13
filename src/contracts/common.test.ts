import { describe, expect, it } from 'vitest';

import {
  ArtifactRefSchema,
  DomainEventSchema,
  OperationSchema,
} from './common.js';

describe('ArtifactRefSchema', () => {
  it('accetta un riferimento ad artefatto versionato', () => {
    const result = ArtifactRefSchema.safeParse({
      id: 'brief-episode-01',
      kind: 'writing-brief',
      version: 2,
      createdAt: '2026-08-13T12:00:00.000Z',
      metadata: { episode: 'ep01' },
    });

    expect(result.success).toBe(true);
  });

  it('rifiuta una versione non positiva', () => {
    const result = ArtifactRefSchema.safeParse({
      id: 'brief-episode-01',
      kind: 'writing-brief',
      version: 0,
      createdAt: '2026-08-13T12:00:00.000Z',
      metadata: {},
    });

    expect(result.success).toBe(false);
  });
});

describe('DomainEventSchema', () => {
  it('accetta un fatto versionato con attore e scope opzionali', () => {
    const result = DomainEventSchema.safeParse({
      id: 'event-001',
      type: 'meal-plan.published',
      version: 1,
      occurredAt: '2026-08-13T12:00:00.000Z',
      actor: { id: 'ray', kind: 'user' },
      scope: { kind: 'family', id: 'famiglia-rossi' },
      correlationId: 'import-001',
      payload: { planId: 'menu-settimana-01' },
    });

    expect(result.success).toBe(true);
  });

  it('rifiuta una versione evento non supportata', () => {
    const result = DomainEventSchema.safeParse({
      id: 'event-001',
      type: 'meal-plan.published',
      version: 2,
      occurredAt: '2026-08-13T12:00:00.000Z',
      payload: {},
    });

    expect(result.success).toBe(false);
  });
});

describe('OperationSchema', () => {
  it('richiede una chiave di idempotenza per ogni comando', () => {
    const result = OperationSchema.safeParse({
      id: 'operation-001',
      type: 'meal-plan.import',
      createdAt: '2026-08-13T12:00:00.000Z',
      actor: { id: 'ray', kind: 'user' },
      scope: { kind: 'family', id: 'famiglia-rossi' },
      payload: { planId: 'menu-settimana-01' },
    });

    expect(result.success).toBe(false);
  });

  it('accetta un comando idempotente con payload di dominio', () => {
    const result = OperationSchema.safeParse({
      id: 'operation-001',
      type: 'meal-plan.import',
      createdAt: '2026-08-13T12:00:00.000Z',
      idempotencyKey: 'meal-plan:menu-settimana-01:v1',
      payload: { planId: 'menu-settimana-01' },
    });

    expect(result.success).toBe(true);
  });
});
