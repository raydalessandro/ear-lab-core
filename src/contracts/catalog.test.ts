import { describe, expect, it } from 'vitest';

import { CatalogItemSchema, CatalogSnapshotSchema } from './catalog.js';

describe('CatalogItemSchema', () => {
  it('accetta una voce pubblicabile con metadati per persone e agenti', () => {
    const result = CatalogItemSchema.safeParse({
      id: 'ear-method',
      kind: 'document',
      title: 'Metodo EAR',
      status: 'published',
      revision: '1.0.0',
      slug: ['metodo', 'ear'],
      summary: 'Un metodo spec-driven.',
      tags: ['architecture', 'agents'],
      authors: ['Ray'],
      updatedAt: '2026-08-13T12:00:00.000Z',
      relatedIds: ['graph-spec-pipeline'],
      metadata: { llmDirective: 'Cita la versione.' },
    });

    expect(result.success).toBe(true);
  });

  it('fornisce collezioni vuote quando i metadati opzionali non sono presenti', () => {
    const result = CatalogItemSchema.parse({
      id: 'brief-episode-01',
      kind: 'writing-brief',
      title: 'Episodio 1',
      status: 'draft',
      revision: '2',
      slug: ['rocco-zara', 'ep01'],
    });

    expect(result.tags).toEqual([]);
    expect(result.authors).toEqual([]);
    expect(result.artifacts).toEqual([]);
    expect(result.relatedIds).toEqual([]);
  });

  it('rifiuta segmenti di slug vuoti e stati estranei al contratto', () => {
    const invalidSlug = CatalogItemSchema.safeParse({
      id: 'invalid',
      kind: 'document',
      title: 'Invalido',
      status: 'published',
      revision: '1',
      slug: ['contenuti', ''],
    });
    const invalidStatus = CatalogItemSchema.safeParse({
      id: 'invalid',
      kind: 'document',
      title: 'Invalido',
      status: 'archived',
      revision: '1',
      slug: ['contenuti'],
    });

    expect(invalidSlug.success).toBe(false);
    expect(invalidStatus.success).toBe(false);
  });
});

describe('CatalogSnapshotSchema', () => {
  it('accetta una proiezione di catalogo riproducibile', () => {
    const result = CatalogSnapshotSchema.safeParse({
      revision: 3,
      generatedAt: '2026-08-13T12:00:00.000Z',
      items: [
        {
          id: 'ear-method',
          kind: 'document',
          title: 'Metodo EAR',
          status: 'published',
          revision: '1.0.0',
          slug: ['metodo', 'ear'],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rifiuta una revisione di catalogo non positiva', () => {
    const result = CatalogSnapshotSchema.safeParse({
      revision: 0,
      generatedAt: '2026-08-13T12:00:00.000Z',
      items: [],
    });

    expect(result.success).toBe(false);
  });
});
