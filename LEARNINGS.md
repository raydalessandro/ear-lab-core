# LEARNINGS

> Diario tecnico mentre costruisco `ear-lab-core`.
> Non è un manuale, non è una lista di tip. Sono cose che capisco mentre
> lavoro e che mi serviranno di nuovo. Le scrivo come parlerei a un me
> futuro che le ha dimenticate.

---

## Chi parla con chi nello stack

Ogni file di configurazione ha **un solo interlocutore**. Confonderli rende
impossibile debuggare.

| File | Parla con | Lavoro |
|---|---|---|
| `.gitignore` | Git | "Ignora questi path" |
| `package.json` | npm / pnpm | "Installa queste dipendenze, esegui questi script" |
| `tsconfig.json` | TypeScript | "Compila così" |
| `vercel.json` | Vercel | "Deploya così" (opzionale) |
| `.env.local` | la mia app a runtime | "Ecco le variabili segrete" |
| `.npmignore` | npm publish | "Quando pubblico su npm, escludi questi file" |

**Implicazione pratica:** quando devo decidere dove va una configurazione,
mi chiedo prima "chi è il destinatario?". Quello mi dice il file giusto.

---

## Cos'è davvero un repo (l'illuminazione architetturale)

Il repo Git è il **codice sorgente**, cioè la materia prima. La materia
prima viene poi **trasformata** in cose diverse a seconda di dove gira.

| Cosa | Metafora | Chi lo produce | Dove vive |
|---|---|---|---|
| Repo Git | La ricetta (ingredienti + istruzioni) | Io | GitHub |
| `node_modules/` | Il sacchetto della spesa (ingredienti veri) | `npm install` | Sul mio PC, su Vercel, ovunque giri |
| `dist/`, `.next/`, `build/` | Il piatto cucinato | `npm run build` | Sul mio PC, su Vercel |

**Conseguenze che ora vedo:**
- Nel repo non c'è mai il "piatto cucinato". Per questo non vedo mai `dist/`.
- Quando Vercel dice "build fallita", è il **cuoco** che non è riuscito a
  cucinare la ricetta. Il problema è quasi sempre nella ricetta, non nel
  cuoco.
- Non devo committare il sacchetto della spesa: chiunque clona la ricetta
  va a comprare gli ingredienti a casa sua (`npm install` legge
  `package.json` e scarica tutto).

**Principio generalizzabile:** la differenza tra **sorgente** e **derivato**
è la cosa più importante in un progetto software. Il repo contiene solo
sorgenti. I derivati si rigenerano da soli quando serve. Se non lo capisco,
finisco a committare cose che non dovevo, o a non capire perché certi
ambienti producono certi errori.

---

## Errori che ho già fatto sulla pelle (e cosa mi hanno insegnato)

- **`.env` committato per errore** → 15 euro di API DeepSeek bucate.
  Lezione: i segreti non si committano mai, **anche** sui repo privati.
  Gli scraper trovano le chiavi in minuti.
- **Build Vercel infinite/fallite** → quasi sempre era un problema di
  derivati (`dist/`, cache) non gestiti bene, o variabili d'ambiente non
  configurate su Vercel.
- (Probabilmente altre cose simili che non ho notato.)

Conseguenza operativa: **prima di ogni primo push di un repo nuovo,
controllo che `.gitignore` sia alla root, che copra tutti i `.env*`,
e che `node_modules` non sia già in stage.**

---

## `.gitignore` — cosa fa davvero (2026-05-14)

### La trappola mentale
Pensavo che `.gitignore` parlasse con Vercel o npm. Sbagliato.
`.gitignore` parla **solo con Git**. Dice una cosa sola: "questi path
fai finta che non esistano".

L'effetto a valle (Vercel si rigenera `node_modules`, npm reinstalla, ecc.)
è una **conseguenza** del fatto che quei file non sono nel repo. Ma il
`.gitignore` di per sé non sa nemmeno chi sia Vercel.

### La regola che spiega tutto
> Se posso rigenerarlo da quello che è committato, allora lo ignoro.

- `node_modules` → rigenerabile da `package.json` → ignoro
- `dist/` → rigenerabile da `src/` + `tsconfig.json` → ignoro
- `src/datetime/format.ts` → l'ho scritto io, non rigenerabile → committo
- `.env.local` → unico al mio computer + contiene segreti → ignoro,
  ma committo `.env.example` come traccia

### Dove va il file (l'illuminazione)
Alla **root del repo**. Sempre. Mai in `/src`.

Git cerca il `.gitignore` partendo dalla root del repo e scende. Le regole
nel `.gitignore` di root valgono per **tutto** il repo. Se lo metto in
`/src`, le regole valgono solo dentro `/src` — quindi `node_modules` (che
sta alla root, non in `/src`) non viene ignorato, e il prossimo
`npm install` me lo committa. Disastro.

**Principio generalizzabile:** ogni file di configurazione ha uno *scope*
che dipende da dove lo metto. La root copre tutto, le sottocartelle solo
sé stesse. Vale per `.gitignore` ma anche per altri file (es. nidificare
un `package.json` in una sottocartella crea un workspace separato).
Posizionare = dichiarare lo scope.

### Gravità di una dimenticanza
- **Catastrofico:** dimenticare `.env*` → committo segreti, restano nello
  storico, qualcuno li trova in minuti. Categoria zero, da prevenire.
- **Grave:** dimenticare `node_modules` → repo gonfio, clone lento,
  conflitti su lockfile.
- **Fastidioso:** dimenticare `.DS_Store`, `coverage/`, `*.log` →
  rumore visivo, niente di rotto.

### Cosa NON serve sapere
- Lo slash iniziale (`/node_modules` vs `node_modules`) cambia poco
  nei casi pratici. Senza slash è più sicuro = ignora ovunque.
- `.gitignore` è **uguale in tutti gli ambienti** (dev, test, prod).
  Non si modifica per ambiente. Quello che cambia sono i valori dentro
  `.env.*`, non il fatto che siano ignorati.

---

## Fabbrica vs banco di lavoro: dove vivono le cose di test (2026-05-14)

> GitHub Actions è la fabbrica che fa partire i test.
> `setup.ts` è quello che ogni test trova preparato sul banco quando inizia.
> La fabbrica non si occupa del banco. Il banco non sa nemmeno che la
> fabbrica esiste.

Esistono due strati distinti che è facile confondere:

| Strato | Cos'è | Esempio nei miei repo |
|---|---|---|
| **Fabbrica** | Come l'ambiente esterno fa partire i test | `.github/workflows/test.yml` |
| **Banco di lavoro** | Cosa ogni test trova pronto quando inizia | `tests/setup.ts` |

La fabbrica è infrastruttura di **esecuzione**: clona il repo, installa
dipendenze, lancia `npm run test`, raccoglie i risultati. Non sa niente
del contenuto dei test.

Il banco di lavoro è infrastruttura **interna ai test**: polyfill,
matcher custom, reset di mock e timer fake. Non sa che esiste GitHub
Actions, sa solo cosa preparare prima di ogni file di test.

**Conseguenza pratica per debugging:**
- Test passano in locale ma falliscono in CI → problema della fabbrica
  (Node version diverso, env mancante, cache stale)
- Test falliscono ovunque uguale → problema del banco di lavoro
  (o del codice testato)

Questa distinzione vale per ogni progetto, non solo per `ear-lab-core`.

---

## Il pattern facade — un confine esplicito tra dentro e fuori (2026-05-14)

Quando avevo fatto **nodo432.com** AI-friendly, avevo un singolo URL
che serviva HTML al browser e Markdown agli scraper AI. Un punto
d'ingresso, dietro cui c'erano due implementazioni diverse.

`src/index.ts` (barrel) fa una cosa concettualmente identica per la
libreria: un punto d'ingresso che decide cosa è visibile dall'esterno.
Tutto quello che esiste in `src/` ma non viene ri-esportato da `index.ts`
è **invisibile** a chi importa la libreria.

**Il pattern generale (facade):** quando hai un sistema con tante parti
interne, **dichiari un confine esplicito** tra dentro e fuori. Da fuori
si vede solo ciò che hai deciso di mostrare. L'interno può cambiare
liberamente senza rompere chi sta fuori.

**Dove lo ritrovi (è ovunque, ed è la cosa importante):**
- `index.ts` di una libreria
- `package.json` campo `"exports"`
- Endpoint pubblici di un'API REST vs route interne
- Metodi `public` vs `private` in una classe
- Props "stabili" di un componente React vs il suo stato interno
- Un URL come `nodo432.com/`, che dietro fa cose diverse

**Differenze tecniche tra i due casi che ho incontrato:**

| | nodo432 (content negotiation) | `index.ts` (barrel) |
|---|---|---|
| Quando decide | A runtime, per ogni richiesta | A compile time, una volta |
| Cosa decide | Quale formato servire | Quali simboli esporre |
| Client | Browser / AI esterni | Codice che importa |
| Dinamico | Sì | No |

Capire che è lo stesso *pattern astratto* sotto due forme diverse è
la cosa da portarsi via. Quando lo ri-incontrerò in un contesto nuovo
(es. tra qualche modulo, in un'API), saprò già come ragionare.

**Implicazione importante per software AI-friendly:** quello che espongo
dal confine non è solo "ciò che fa la libreria". È il **contratto** con
cui le AI ragionano sulla libreria. Un barrel `index.ts` ordinato, con
nomi parlanti e tipi precisi, è leggibile dalle AI così com'è — niente
docs da generare, niente schemi separati da mantenere. Un barrel
caotico (con esportazioni interne mischiate a quelle pubbliche, simboli
con nomi opachi) costringe le AI a ricostruire l'intento dal codice
interno, e questo è esattamente ciò che cerco di evitare.

Conseguenza operativa: ogni volta che esporto qualcosa da `index.ts`,
mi chiedo "questo nome è leggibile da un essere umano e da una AI senza
contesto?". Se la risposta è no, lo rinomino prima di esporlo.

---

## Cache, riavvii, lentezze (2026-05-14)

`node_modules` non si rigenera al riavvio. Si rigenera solo quando faccio
`npm install` (manuale, o automatico al clone / cambio di `package.json`).

Quello che è lento al riavvio sono i **dev server** (Vite, Next.js): caricano
in RAM una versione precompilata dei file, e ricostruirla costa.
Le cache su disco (`.next-cache`, `.vite/`, `.cache/`) salvano questo lavoro
tra riavvii.

**Perché ignoro le cache nel `.gitignore`:**
- Sono enormi
- Cambiano continuamente
- Sono **specifiche della mia macchina** (la cache di Vite sul mio Mac
  non funzionerebbe su Vercel)

---

## Composite action — il pattern facade applicato al CI (2026-05-14)

Nel workflow CI ho 5 job (lint, typecheck, test, build, e2e), e ognuno
deve fare le stesse 3-4 cose iniziali: clonare il repo, rilevare npm/pnpm,
installare le dipendenze. Copiarle 5 volte significa che ogni modifica
va replicata 5 volte.

La **composite action** è un mini-workflow estratto in
`.github/actions/install/action.yml`, richiamabile da ogni job con una
sola riga: `uses: ./.github/actions/install`.

**È di nuovo il pattern facade:** un punto d'ingresso che nasconde la
complessità interna. Da fuori vedi solo `uses: ./.github/actions/install`.
Dentro c'è la logica vera di setup. Lo modifico in un posto, lo applico
a 5 job.

**Convenzione fissa di GitHub Actions:** se la cartella si chiama
`install/`, il file deve chiamarsi esattamente `action.yml`. Non
`install.yml`, non altro. GitHub cerca quello.

---

## Cose da capire più avanti (parcheggio)

- Come si rimuove un file dallo storico di Git (quando ho già committato
  un segreto per errore). Cercato: `git filter-repo` o `BFG Repo-Cleaner`.
- Differenza tra `.gitignore`, `.npmignore`, `.dockerignore`. Tre file
  che sembrano simili ma parlano con tool diversi.
- Quando serve un `.gitignore` in sottocartelle (es. un `.gitignore`
  dentro `/tests`). Per ora non serve, ma esiste.
- `npm audit` — capire le 5 vulnerabilità moderate trovate, valutare
  se aggiornare. **NON usare `npm audit fix --force`** alla cieca: può
  rompere il lockfile aggiornando librerie a major version diverse.

---

## I branch sono universi paralleli (2026-05-14)

Quando creo un branch da `main`, all'inizio sono identici. Ma da quel
momento vivono **indipendenti**. Ogni commit su `main` resta su `main`.
Ogni commit su `feature/X` resta su `feature/X`. **Non si parlano
da soli.**

Esempio concreto (mi è successo oggi):
1. Creo branch `Test_CI` da `main` al commit X
2. Pusho `package-lock.json` su `main`
3. Pusho una modifica README su `Test_CI`
4. CI gira su `Test_CI` ma **non trova il lockfile** perché non l'ho
   portato dentro `Test_CI`

Per portare i commit di un branch nell'altro servono comandi espliciti:
- `git merge main` (da dentro Test_CI) — porta i commit di main qui
- `git rebase main` (alternativa) — "riscrive" i commit sopra main
- PR + merge — il flusso standard quando il lavoro è finito

**Conseguenza operativa:** quando lavoro su un branch e nel frattempo
`main` viene aggiornato (perché ho mergiato un'altra PR o ho fatto
fix urgenti), devo allineare il branch a main prima che la CI o i
test possano dare risultati sensati. Altrimenti sto testando una
versione vecchia + le mie modifiche.

---

## `package-lock.json` — il fotografo delle versioni (2026-05-14)

---

## `package.json` come contratto col CI (2026-05-14)

Quando il workflow CI è **standard condiviso** tra più repo, non lo
modifico per repo. Modifico il `package.json` del repo per allinearsi
ai nomi che il workflow si aspetta.

**Nomi standard che ho fissato:**
- `test` → unit + integration (vitest run)
- `test:watch` → versione interattiva
- `test:e2e` → playwright
- `typecheck` → tsc --noEmit (NO trattino: `typecheck`, non `type-check`)
- `lint` → eslint
- `build` → compilazione

Se nel repo uso nomi diversi (es. `test:unit` invece di `test`), il
workflow non li trova e **salta silenziosamente** quel job. Il PR
diventa verde ma in realtà i test non sono stati eseguiti. Disastro
silenzioso, peggio del disastro rumoroso.

**Generalizzazione:** ogni volta che ho un'infrastruttura condivisa
(workflow CI, sync script, template), il consumer (il repo) si adatta
all'infrastruttura, non viceversa. Altrimenti l'infrastruttura
diventa N varianti, una per consumer, e non è più infrastruttura.

---

## `package-lock.json` — il fotografo delle versioni (2026-05-14)

`package.json` dice cosa **voglio** (es. `"zod": "^3.23.8"` = "3.x.x più
recente di 3.23.8"). Lascia libertà di scelta a npm.

`package-lock.json` fotografa cosa è **stato effettivamente scelto**
quando ho fatto `npm install`: versione esatta + hash di tutte le
librerie e di tutte le loro dipendenze.

**Differenza pratica tra `npm install` e `npm ci`:**
- `npm install` legge `package.json`, risolve le versioni, aggiorna
  `package-lock.json`. Lo uso in sviluppo quando aggiungo dipendenze.
- `npm ci` (clean install) legge `package-lock.json` e installa
  esattamente quelle versioni. Più veloce, riproducibile, è quello
  che usa la CI.

**Conseguenza:** `package-lock.json` va SEMPRE committato. Non è
"spazzatura generata", è parte integrante del repo. Se manca, la CI
fallisce con "Dependencies lock file is not found".

**Quando si aggiorna:**
- Quando aggiungo/rimuovo una dipendenza in `package.json`
- Quando faccio `npm update` per aggiornare versioni
- Quando un audit di sicurezza mi obbliga a salire di versione

Tutte queste operazioni rigenerano il lockfile, e devo committarlo
nello stesso commit della modifica al `package.json`.

---

## Micro-tip TypeScript

- `export {}` alla fine di un file senza altri export forza TypeScript
  a trattarlo come **modulo** invece che come **script globale**. Senza
  quello, certi file (es. `setup.ts` quando non ha esportazioni vere)
  generano warning o comportamenti strani. Convenzione standard nei file
  di config/setup vuoti.
