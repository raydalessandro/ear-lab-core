/**
 * ear-lab-core — entry point pubblico
 *
 * Questo file è il barrel della libreria: raccoglie e ri-esporta
 * tutti i moduli pubblici di `src/`. Chi consuma la libreria scrive:
 *
 *     import { funzione } from 'ear-lab-core'
 *
 * e l'import viene risolto qui.
 *
 * Regole:
 * - Niente logica in questo file. Solo `export * from './modulo'`.
 * - Un modulo viene aggiunto qui SOLO quando è completo (test verdi
 *   + `SPEC.md` scritto). Niente esposizioni di lavori in corso.
 *
 * Esempio futuro:
 *     export * from './datetime';
 *     export * from './types';
 */

export {};
