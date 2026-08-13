import {
  OperationSchema,
  type Operation,
} from '../contracts/common.js';

/** Stato locale di un comando in attesa di essere eseguito da un adapter. */
export type QueueEntryStatus = 'pending' | 'processing' | 'failed';

/** Operazione più metadati transitori appartenenti alla coda, non al dominio. */
export interface QueueEntry {
  operation: Operation;
  status: QueueEntryStatus;
  attempts: number;
}

/** Esito che un adapter restituisce dopo aver tentato di eseguire un’operazione. */
export type ExecutionOutcome =
  | { kind: 'succeeded' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'retryable'; reason: string };

/** Risultato aggregato di un passaggio esplicito di riconciliazione. */
export interface ProcessReport {
  succeeded: number;
  rejected: number;
  retried: number;
  failed: number;
  unhandled: number;
}

/** Limite delle esecuzioni tentabili per un singolo comando. */
export interface RetryPolicy {
  maxAttempts: number;
}

/** Handler registrato dal consumer, libero di usare rete, storage o SDK propri. */
export type OperationHandler = (
  operation: Operation,
) => ExecutionOutcome | Promise<ExecutionOutcome>;

/** Rimuove una registrazione del router; può essere chiamato più volte. */
export type Unregister = () => void;

/** Risoluzione esplicita fra tipo di comando e adapter del consumer. */
export interface OperationRouter {
  register(operationType: string, handler: OperationHandler): Unregister;
  resolve(operationType: string): OperationHandler | undefined;
}

/** Risultato dell’accodamento, che rende visibile una deduplicazione intenzionale. */
export type EnqueueResult =
  | { kind: 'enqueued'; entry: QueueEntry }
  | { kind: 'duplicate'; entry: QueueEntry };

/** Coda process-local; non persiste e non pianifica da sola l’esecuzione. */
export interface OperationQueue {
  enqueue(operation: Operation): EnqueueResult;
  list(): QueueEntry[];
  process(router: OperationRouter, policy: RetryPolicy): Promise<ProcessReport>;
}

function copyEntry(entry: QueueEntry): QueueEntry {
  return {
    operation: entry.operation,
    status: entry.status,
    attempts: entry.attempts,
  };
}

function compareByCreation(a: QueueEntry, b: QueueEntry): number {
  const createdAtDifference = Date.parse(a.operation.createdAt) - Date.parse(b.operation.createdAt);
  if (createdAtDifference !== 0) return createdAtDifference;
  return a.operation.id.localeCompare(b.operation.id);
}

function assertRetryPolicy(policy: RetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new RangeError('RetryPolicy.maxAttempts must be a positive integer.');
  }
}

/** Crea un router vuoto che il consumer popola con i propri adapter. */
export function createOperationRouter(): OperationRouter {
  const handlersByType = new Map<string, OperationHandler>();

  return {
    register(operationType, handler) {
      const normalizedType = operationType.trim();
      if (normalizedType.length === 0) {
        throw new Error('An operation type must be a non-empty string.');
      }

      handlersByType.set(normalizedType, handler);
      let active = true;

      return () => {
        if (!active) return;
        active = false;
        if (handlersByType.get(normalizedType) === handler) {
          handlersByType.delete(normalizedType);
        }
      };
    },

    resolve(operationType) {
      return handlersByType.get(operationType);
    },
  };
}

/**
 * Crea una coda isolata in memoria.
 *
 * Il consumer decide quando invocare `process()`, come eseguire un’operazione
 * e dove persistere un’eventuale proiezione delle entry. Questa implementazione
 * non importa API browser, rete, database o framework.
 */
export function createInMemoryOperationQueue(): OperationQueue {
  const entriesByIdempotencyKey = new Map<string, QueueEntry>();

  return {
    enqueue(operation) {
      const validOperation = OperationSchema.parse(operation);
      const existing = entriesByIdempotencyKey.get(validOperation.idempotencyKey);
      if (existing !== undefined) {
        return { kind: 'duplicate', entry: copyEntry(existing) };
      }

      const entry: QueueEntry = {
        operation: validOperation,
        status: 'pending',
        attempts: 0,
      };
      entriesByIdempotencyKey.set(validOperation.idempotencyKey, entry);
      return { kind: 'enqueued', entry: copyEntry(entry) };
    },

    list() {
      return [...entriesByIdempotencyKey.values()]
        .sort(compareByCreation)
        .map(copyEntry);
    },

    async process(router, policy) {
      assertRetryPolicy(policy);
      const report: ProcessReport = {
        succeeded: 0,
        rejected: 0,
        retried: 0,
        failed: 0,
        unhandled: 0,
      };
      const pendingEntries = [...entriesByIdempotencyKey.values()]
        .filter((entry) => entry.status === 'pending')
        .sort(compareByCreation);

      for (const entry of pendingEntries) {
        const handler = router.resolve(entry.operation.type);
        if (handler === undefined) {
          report.unhandled += 1;
          continue;
        }

        entry.status = 'processing';
        let outcome: ExecutionOutcome;
        try {
          outcome = await handler(entry.operation);
        } catch (error) {
          entry.status = 'pending';
          throw error;
        }

        if (outcome.kind === 'succeeded') {
          entriesByIdempotencyKey.delete(entry.operation.idempotencyKey);
          report.succeeded += 1;
          continue;
        }

        if (outcome.kind === 'rejected') {
          entriesByIdempotencyKey.delete(entry.operation.idempotencyKey);
          report.rejected += 1;
          continue;
        }

        entry.attempts += 1;
        if (entry.attempts >= policy.maxAttempts) {
          entry.status = 'failed';
          report.failed += 1;
        } else {
          entry.status = 'pending';
          report.retried += 1;
        }
      }

      return report;
    },
  };
}
