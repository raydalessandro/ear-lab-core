# AGENTS.md

> Istruzioni operative per agenti AI (e collaboratori umani) che lavorano
> su `ear-lab-core`. Leggi questo prima di proporre qualsiasi modifica.

---

## Contesto del proprietario

- **Owner**: @raydalessandro, 32 anni, dal mondo vendite part-time,
  in transizione verso AI Orchestrator / Product Engineer.
- **Ecosistema**: La Famiglia (app madre), Soldi_Lab, Ricette_Lab,
  Spotimai, Moto-lollo (app satellite).
- **Obiettivo di questo repo**: estrarre la logica condivisa dei progetti
  sopra in una libreria solida, testata e riutilizzabile.

---

## Come lavoriamo

### Metodo a 3 step per ogni modulo

Ogni modulo estratto attraversa esattamente questi tre passaggi, nell'ordine:

**1. Step Tecnico**
Analisi fredda di cosa esiste oggi nei repo sorgente. L'agente clona
o ispeziona i repo rilevanti, identifica:
- Dove vive oggi la logica (file, funzioni)
- Come è implementata (con eventuali differenze tra repo)
- Quali dipendenze ha
- Quali alternative ci sono in letteratura

Output: una nota tecnica scritta in chat, non file nel repo.

**2. Step Prosa**
Spiegazione ad alto livello del pattern, generalizzato su più domini.
Risponde a: *qual è la forma universale di questa cosa, al di là di come
appare nel singolo repo?*

Questo è lo step che il proprietario preferisce — non saltarlo.

Output: prosa in chat, non file nel repo.

**3. Step Codice**
Estrazione reale del modulo in TDD:
1. L'agente scrive i test (in chat o come file da committare)
2. L'owner li crea su GitHub e li esegue
3. I test falliscono (red)
4. L'agente scrive il codice minimo
5. L'owner lo crea su GitHub e riesegue
6. I test passano (green)
7. Refactor se serve, ripetere

Output: file `.ts` e `.test.ts` co-locati, più `SPEC.md` del modulo
scritto alla fine.

---

## Regole non negoziabili

1. **L'agente AI non scrive file direttamente sul repo.** L'owner crea
   tutti i file su GitHub. L'agente fornisce contenuto pronto da incollare.

2. **TDD reale, non finto.** I test si scrivono **prima**. Mai consegnare
   codice senza test che lo coprono. Mai consegnare test che descrivono
   un comportamento che il codice non implementa ancora.

3. **L'owner non legge bene il codice.** Spiega ogni file con prosa
   chiara, riga per riga quando necessario. Evita gergo non spiegato.
   Quando introduci un concetto nuovo (es. "dependency injection"),
   spiegalo brevemente prima di usarlo.

4. **Tutto deve essere generale e riutilizzabile** senza adattamenti
   pesanti per ogni repo consumatore. Se un modulo richiede modifiche
   custom per ogni progetto che lo usa, è disegnato male.

5. **Una cosa alla volta.** Un turno di chat = un'unità di lavoro
   atomica (un test, un file, una decisione). Non ammucchiare 5 passi
   in un solo messaggio.

---

## Stack e convenzioni tecniche

### Test runner
- **Vitest** per unit + integration. Non Jest, non Mocha.
- **Playwright** per E2E, solo dove serve davvero.

### Naming
- File codice: `nome-feature.ts`
- File test: `nome-feature.test.ts`, **co-locato** col codice
  (stessa cartella, non in `__tests__/`)
- Cartelle moduli: kebab-case (`datetime/`, `event-bus/`)

### Stile codice
- TypeScript strict, no `any` se non in casi documentati
- Zod ai bordi (validazione di input esterni)
- Funzioni pure dove possibile
- **Dependency injection sui boundary**: funzioni che parlano con DB,
  filesystem o servizi esterni accettano la dipendenza come ultimo
  parametro opzionale con default reale. Esempio:
  ```ts
  export async function createItem(
    input: CreateItemInput,
    db: DB = getDB(),  // ← default reale, override testabile
  ): Promise<Item> { /* ... */ }
  ```

### Cosa va testato
- Funzioni pure: sempre, casi tipici + edge case + errori
- Repository / CRUD: sempre, con DB isolato per test
- Validatori Zod: sempre, validi + invalidi
- Logica di business critica: sempre, copertura difensiva

### Cosa NON va testato
- Componenti React puramente visuali (estrai la logica e testa quella)
- Wrapper triviali
- Tipi TypeScript (il compilatore è il loro test)

---

## Struttura di un modulo

Quando estrai un nuovo modulo, la struttura è sempre:

```
src/<modulo>/
  index.ts            ← export pubblici, niente logica
  <feature>.ts        ← codice
  <feature>.test.ts   ← test co-locati
  SPEC.md             ← documentazione (vedi sezioni in README.md)
```

`SPEC.md` si scrive **alla fine** del ciclo TDD, non durante.

---

## Repo sorgente da consultare

Quando fai lo Step Tecnico, parti da qui:

- **Core (questo)**: https://github.com/raydalessandro/ear-lab-core
- **Standards** (knowledge base): https://github.com/raydalessandro/ear-lab-standards
- **App madre**: https://github.com/raydalessandro/la-famiglia
- **App satellite**:
  - https://github.com/raydalessandro/Soldi_Lab
  - https://github.com/raydalessandro/Ricette_Lab
  - https://github.com/raydalessandro/Spotimai
  - https://github.com/raydalessandro/Moto-lollo

Clona con `git clone --depth 1` per velocità. Non usare `fetch`/`curl`
sui file singoli (rate limit GitHub).

---

## Ordine di estrazione

Vedi [`ROADMAP.md`](./ROADMAP.md). Non cambiare l'ordine senza discutere
prima con l'owner — l'ordine è scelto per rischio crescente, partendo
dalle cose pure e arrivando a quelle con stato.

---

## Anti-pattern da evitare

- **Estrarre tutto in un grande modulo "utils".** Ogni modulo ha uno
  scope chiaro e un nome che lo descrive.
- **Sidecar per ogni file** (es. `foo.ts` + `foo.meta.json` + `foo.md`).
  Un solo `SPEC.md` per modulo, non per file. Drift garantito altrimenti.
- **Test che testano l'implementazione.** I test descrivono comportamento
  osservabile dall'esterno, non struttura interna.
- **Mock eccessivi.** Più di 3 mock in un test = funzione mal disegnata.
  Rivedere il design, non aggiungere mock.
- **Date, random, env globali.** Tutte queste dipendenze vanno iniettate
  come parametri (`today: ISODate`, `randomSeed: number`, `config: Config`).
