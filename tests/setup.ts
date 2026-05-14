/**
 * Setup file per Vitest.
 *
 * Eseguito una volta come prologo prima di ogni file di test
 * (vedi `vitest.config.ts` → `setupFiles`).
 *
 * Cosa va qui:
 * - Estensioni di `expect` con matcher personalizzati
 * - Polyfill di API mancanti nell'ambiente di test (jsdom)
 * - Reset di stato globale tra test (mock, timer fake, storage)
 * - Configurazione di librerie test (es. testing-library)
 *
 * Cosa NON va qui:
 * - Logica di setup specifica di un singolo modulo
 *   (usa `beforeEach`/`beforeAll` nel file di test stesso)
 * - Dipendenze pesanti caricate "just in case"
 *   (rallentano ogni file di test, anche quelli che non le usano)
 *
 * Stato: vuoto intenzionalmente. Si popolerà quando il primo modulo
 * lo richiederà.
 */

export {};
