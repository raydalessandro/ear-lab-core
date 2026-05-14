# ear-lab-core

> Tipi, schemi Zod, utils e logica condivisa per l'ecosistema EAR Lab Famiglia.

Libreria TypeScript privata che raccoglie i pattern e la logica ricorrente nei
miei progetti (La Famiglia, Soldi_Lab, Ricette_Lab, Spotimai, Moto-lollo, ecc.),
estratti, generalizzati e testati una volta sola.

---

## Cos'è e cosa non è

**È** una libreria di codice riusabile:
- Tipi e schemi Zod di dominio (Member, entità temporali, multi-space, ecc.)
- Repository pattern con adapter intercambiabili (Dexie, Supabase, in-memory)
- Funzioni pure di calcolo, formattazione, normalizzazione
- Primitive per auth, offline queue, notification, event bus
- Tutto coperto da test (Vitest unit + Playwright E2E quando serve)

**Non è**:
- Una knowledge base di pattern e convenzioni → quella è
  [`ear-lab-standards`](https://github.com/raydalessandro/ear-lab-standards)
- Una libreria pubblica npm → è privata, consumata dai miei repo
- Un framework → è una collezione di moduli indipendenti, ognuno con
  un'API piccola e stabile

---

## Stack

- **TypeScript** strict, target ES2022
- **Zod** per validazione runtime
- **Vitest** per unit + integration test
- **Playwright** per E2E (quando un modulo lo richiede)
- **ESM** native, no CommonJS

---

## Struttura

```
ear-lab-core/
  src/
    <modulo>/
      index.ts         ← export pubblici del modulo
      <feature>.ts     ← codice
      <feature>.test.ts← test co-locati
      SPEC.md          ← documentazione del modulo (vedi sotto)
  tests/
    setup.ts           ← setup globale Vitest
    e2e/               ← test Playwright (se necessari)
  .github/workflows/
    test.yml           ← CI che gira su ogni push e PR
  AGENTS.md            ← istruzioni per chi (umano o AI) contribuisce
  ROADMAP.md           ← ordine di estrazione dei moduli
  README.md            ← questo file
```

---

## Convenzioni di documentazione

Ogni modulo in `src/<modulo>/` ha un file `SPEC.md` con queste sezioni fisse:

1. **Cos'è** — un paragrafo che descrive il modulo
2. **Cosa esporta** — lista delle funzioni/tipi pubblici con firma
3. **Decisioni chiuse** — perché X invece di Y (con motivazione)
4. **Esempi d'uso** — 3-5 esempi reali, copiabili
5. **Cosa NON fa** — limiti espliciti, per evitare misuse
6. **Changelog** — versione → cosa è cambiato

**Niente sidecar per file singolo.** Un solo `SPEC.md` per modulo, scritto
alla fine del ciclo TDD quando il design è chiuso. Il codice TypeScript
+ i test sono già documentazione viva del comportamento; lo `SPEC.md`
documenta le intenzioni.

---

## Workflow di estrazione

Ogni modulo segue tre step (vedi `AGENTS.md` per il dettaglio):

1. **Step Tecnico** — analisi a freddo di cosa esiste oggi nei repo sorgente
2. **Step Prosa** — spiegazione alta del pattern generalizzato
3. **Step Codice** — TDD reale (test prima, codice dopo)

Tutto il lavoro su file passa da GitHub (non c'è scrittura diretta su
filesystem da parte dell'agente AI).

---

## Stato

In costruzione. Vedi [`ROADMAP.md`](./ROADMAP.md) per l'ordine di
estrazione dei moduli e lo stato di ciascuno.

---

## Licenza

Privato. Non distribuire.
