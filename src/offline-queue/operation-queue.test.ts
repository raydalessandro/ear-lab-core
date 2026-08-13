import { describe, expect, it } from 'vitest';

import {
  createInMemoryOperationQueue,
  createOperationRouter,
  type ExecutionOutcome,
} from './operation-queue.js';

function operation(overrides: Partial<{ id: string; idempotencyKey: string; createdAt: string }> = {}) {
  return {
    id: overrides.id ?? 'operation-001',
    type: 'post.create',
    createdAt: overrides.createdAt ?? '2026-08-13T12:00:00.000Z',
    idempotencyKey: overrides.idempotencyKey ?? 'post.create:request-001',
    payload: { text: 'Ciao' },
  };
}

describe('createInMemoryOperationQueue', () => {
  it('accoda un’operazione valida come pending', () => {
    const queue = createInMemoryOperationQueue();

    const result = queue.enqueue(operation());

    expect(result.kind).toBe('enqueued');
    expect(queue.list()).toEqual([
      expect.objectContaining({
        operation: operation(),
        status: 'pending',
        attempts: 0,
      }),
    ]);
  });

  it('non accoda due volte la stessa idempotencyKey, anche con id differente', () => {
    const queue = createInMemoryOperationQueue();
    queue.enqueue(operation());

    const duplicate = queue.enqueue(operation({ id: 'operation-002' }));

    expect(duplicate.kind).toBe('duplicate');
    expect(queue.list()).toHaveLength(1);
    expect(queue.list()[0]?.operation.id).toBe('operation-001');
  });

  it('processa le entry pending in ordine di createdAt e rimuove quelle riuscite', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    const processedIds: string[] = [];
    router.register('post.create', async (queuedOperation) => {
      processedIds.push(queuedOperation.id);
      return { kind: 'succeeded' };
    });

    queue.enqueue(operation({ id: 'late', idempotencyKey: 'late', createdAt: '2026-08-13T12:02:00.000Z' }));
    queue.enqueue(operation({ id: 'early', idempotencyKey: 'early', createdAt: '2026-08-13T12:01:00.000Z' }));

    const report = await queue.process(router, { maxAttempts: 3 });

    expect(processedIds).toEqual(['early', 'late']);
    expect(report).toEqual({ succeeded: 2, rejected: 0, retried: 0, failed: 0, unhandled: 0 });
    expect(queue.list()).toEqual([]);
  });

  it('rimuove un’operazione rifiutata in modo permanente', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    router.register('post.create', (): ExecutionOutcome => ({ kind: 'rejected', reason: 'invalid content' }));
    queue.enqueue(operation());

    const report = await queue.process(router, { maxAttempts: 3 });

    expect(report).toEqual({ succeeded: 0, rejected: 1, retried: 0, failed: 0, unhandled: 0 });
    expect(queue.list()).toEqual([]);
  });

  it('rimette pending un esito retryable sotto la soglia e segna failed al suo raggiungimento', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    router.register('post.create', (): ExecutionOutcome => ({ kind: 'retryable', reason: 'network unavailable' }));
    queue.enqueue(operation());

    const firstReport = await queue.process(router, { maxAttempts: 2 });
    expect(firstReport).toEqual({ succeeded: 0, rejected: 0, retried: 1, failed: 0, unhandled: 0 });
    expect(queue.list()).toEqual([
      expect.objectContaining({ status: 'pending', attempts: 1 }),
    ]);

    const secondReport = await queue.process(router, { maxAttempts: 2 });
    expect(secondReport).toEqual({ succeeded: 0, rejected: 0, retried: 0, failed: 1, unhandled: 0 });
    expect(queue.list()).toEqual([
      expect.objectContaining({ status: 'failed', attempts: 2 }),
    ]);
  });

  it('non riaccoda una idempotencyKey che appartiene a un’entry failed', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    router.register('post.create', (): ExecutionOutcome => ({ kind: 'retryable', reason: 'network unavailable' }));
    queue.enqueue(operation());

    await queue.process(router, { maxAttempts: 1 });
    const duplicate = queue.enqueue(operation({ id: 'operation-002' }));

    expect(duplicate.kind).toBe('duplicate');
    expect(queue.list()).toEqual([
      expect.objectContaining({
        operation: expect.objectContaining({ id: 'operation-001' }),
        status: 'failed',
        attempts: 1,
      }),
    ]);
  });

  it('mantiene invariata un’operazione senza handler e la riporta al chiamante', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    queue.enqueue(operation());

    const report = await queue.process(router, { maxAttempts: 3 });

    expect(report).toEqual({ succeeded: 0, rejected: 0, retried: 0, failed: 0, unhandled: 1 });
    expect(queue.list()).toEqual([
      expect.objectContaining({ status: 'pending', attempts: 0 }),
    ]);
  });

  it('rifiuta un’operazione che non rispetta il contratto comune', () => {
    const queue = createInMemoryOperationQueue();

    expect(() => queue.enqueue({ ...operation(), idempotencyKey: '' })).toThrow();
    expect(queue.list()).toEqual([]);
  });

  it('rifiuta una politica retry senza tentativi possibili', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    queue.enqueue(operation());

    await expect(queue.process(router, { maxAttempts: 0 })).rejects.toThrow(RangeError);
    expect(queue.list()).toEqual([
      expect.objectContaining({ status: 'pending', attempts: 0 }),
    ]);
  });

  it('propaga l’errore inatteso dell’adapter senza perdere o ritentare implicitamente l’entry', async () => {
    const queue = createInMemoryOperationQueue();
    const router = createOperationRouter();
    router.register('post.create', () => {
      throw new Error('adapter unavailable');
    });
    queue.enqueue(operation());

    await expect(queue.process(router, { maxAttempts: 3 })).rejects.toThrow('adapter unavailable');
    expect(queue.list()).toEqual([
      expect.objectContaining({ status: 'pending', attempts: 0 }),
    ]);
  });
});
