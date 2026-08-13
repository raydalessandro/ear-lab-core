import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La libreria è logica pura: nessun modulo importa API del browser.
    // L'ambiente jsdom costava circa 5 secondi di avvio per run senza
    // essere usato da nessun test.
    environment: 'node',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: [
      'src/**/*.{test,spec}.ts',
      'tests/unit/**/*.{test,spec}.ts',
    ],
  },
});
