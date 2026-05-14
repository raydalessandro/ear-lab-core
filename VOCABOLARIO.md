# VOCABOLARIO

> Glossario tecnico personale, costruito sessione per sessione.
> Una voce per termine. Definizione breve in italiano + uso reale che
> ho incontrato + (quando serve) cosa NON è, per evitare confusione
> con cose simili.
>
> Regola di compilazione: meglio una voce in più che una in meno.
> Quando dubito se inserire qualcosa, lo inserisco.

---

## Sessione 1 — Impalcatura di `ear-lab-core` (2026-05-14)

### Repository & file

**Repo (repository)**
La cartella versionata da Git che contiene il codice sorgente di un
progetto. Può vivere localmente sul mio PC e/o su un server remoto
(GitHub, GitLab, Bitbucket). Quando dico "il repo" senza altro, intendo
di solito quello remoto su GitHub.

**Root del repo**
La cartella più esterna del repo. Contiene `package.json`, `.gitignore`,
`README.md` e le sottocartelle (`src/`, `tests/`, `.github/`). Quando
un file di config deve avere effetto su tutto il repo, va alla root.

**`.gitignore`**
File alla root del repo. Dice a Git: "questi path fai finta che non
esistano". Parla **solo con Git**. Non con Vercel, non con npm.

**`.github/`**
Cartella nascosta (il punto davanti significa "nascosta per convenzione")
con configurazione specifica per GitHub. Contiene `workflows/`,
`actions/`, eventuali template di issue/PR. Stessa logica di `.vscode/`,
`.claude/`, `.git/`: ogni tool ha la sua cartella di configurazione
nascosta.

**Branch**
Una linea di sviluppo parallela del repo. `main` è il branch principale.
Quando creo un branch da main per lavorare a una feature, i due branch
diventano **universi paralleli**: ogni commit fatto su uno non passa
sull'altro automaticamente. Servono comandi espliciti (`merge`, `rebase`)
o una PR per portare i commit da un branch all'altro.

**Commit**
Una "fotografia" del repo a un certo momento, con un messaggio che
descrive cosa è cambiato. Ogni commit ha un ID univoco (es. `6fbf155`).

**Push**
L'operazione di mandare i commit fatti in locale al repo remoto su
GitHub. `git push` carica, `git pull` scarica.

**Merge**
Portare i commit di un branch dentro un altro. Es. `git merge main`
da dentro `Test_CI` significa "prendi le novità di main e portale qui".

**PR (Pull Request)**
Una richiesta di mergiare un branch dentro un altro (di solito,
dentro `main`). Su GitHub diventa una pagina dove si fa review,
si guarda la CI, si commenta, si approva e infine si mergia.

### Sorgente vs derivato

**Sorgente (source code)**
Il codice che scrivo io. Vive nel repo, viene committato. Es. i file
`.ts` in `src/`.

**Derivato**
Tutto ciò che si **rigenera** dal sorgente: cartelle di dipendenze
(`node_modules/`), output di build (`dist/`, `.next/`, `build/`),
cache (`.eslintcache`, `.next-cache/`). Non si committa: si rigenera.

**Regola pratica:** se posso rigenerarlo da quello che ho committato,
allora lo ignoro nel `.gitignore`.

### Package manager & dipendenze

**Dipendenza**
Una libreria esterna che il mio codice usa. Es. `zod`, `react`. Le
dipendenze stanno dichiarate in `package.json`.

**`package.json`**
File alla root del repo. Parla con npm/pnpm. Contiene il nome del
progetto, la versione, le dipendenze, gli script eseguibili (`npm run X`).

**`package-lock.json`**
File generato da `npm install`. Fotografa le versioni esatte di tutte
le dipendenze (dirette e indirette). Va **sempre committato**. Garantisce
che CI, Vercel e altri sviluppatori installino esattamente le stesse
versioni che ho installato io.

**Albero delle dipendenze**
Quando installo 10 librerie, ognuna ne dipende da altre, che ne
dipendono da altre. Il totale può facilmente arrivare a 200-500
pacchetti per un progetto piccolo. È normale.

**Dipendenza diretta vs transitiva**
Diretta = quella che ho scelto io, dichiarata in `package.json`.
Transitiva = dipendenza di una dipendenza, che si è installata da
sola perché serviva a un'altra libreria. Quando un audit di sicurezza
trova problemi, di solito sono nelle transitive.

**`npm install`**
Comando che legge `package.json`, risolve le versioni e installa le
dipendenze in `node_modules/`. Genera o aggiorna `package-lock.json`.
Lo uso in sviluppo quando aggiungo/rimuovo dipendenze.

**`npm ci`** (clean install)
Comando che legge `package-lock.json` e installa esattamente quelle
versioni, senza risolvere niente. Più veloce e riproducibile. È
quello che usa la CI. **Fallisce se manca `package-lock.json`.**

**Lockfile**
Nome generico per `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm),
`yarn.lock` (yarn). Stesso concetto, formati diversi.

### Build, test, CI

**Build**
Il processo di trasformare il sorgente in output eseguibile/distribuibile.
Per una libreria TS: `tsc` compila i `.ts` in `.js` dentro `dist/`.
Per un'app Next: `next build` genera `.next/`.

**Compile / compilation**
Specificamente, il passaggio da un linguaggio a un altro. TypeScript
viene compilato in JavaScript. Build è il termine più ampio,
compile è uno dei suoi passi.

**TypeScript strict**
Modalità di TypeScript che attiva tutti i controlli rigidi (no `any`
impliciti, no variabili usate prima di essere definite, ecc.).
Configurato in `tsconfig.json` con `"strict": true`.

**Typecheck**
Controllo dei tipi TypeScript senza generare output (`tsc --noEmit`).
Cattura errori di tipo prima ancora di compilare. Lo eseguo come job
separato in CI per fallire veloce.

**Lint / linting**
Controllo automatico di coerenza stilistica e bug comuni del codice.
ESLint è il linter standard per JS/TS. Si configura con un file
`eslint.config.js` (formato nuovo, v9+) o `.eslintrc` (formato vecchio).

**Test runner**
Il programma che esegue i test. Vitest per unit + integration,
Playwright per E2E. Si esegue con `npm run test`.

**Unit test**
Test di una singola funzione/unità isolata, senza dipendenze esterne
(DB, network, FS). Veloci, deterministici.

**Integration test**
Test che combina più unità per verificare che lavorino bene insieme.
Più lento di unit, più realistico.

**E2E test (end-to-end)**
Test che simula un utente vero che usa l'app: clicca bottoni, naviga,
verifica risultati. Playwright o Cypress. Lento ma copre flussi completi.

**TDD (Test-Driven Development)**
Metodo: scrivo prima il test, lo vedo fallire (red), scrivo il codice
minimo per farlo passare (green), refactor. Ripeto.

**CI (Continuous Integration)**
Sistema che esegue automaticamente lint, test, build su ogni push/PR.
Su GitHub si fa con GitHub Actions. Si configura con file YAML in
`.github/workflows/`.

**CD (Continuous Deployment)**
Estensione del CI: dopo che la CI è verde, il codice viene anche
deployato automaticamente (es. Vercel deploya da main).

**GitHub Actions**
Il "robot di GitHub" che esegue cose quando succede qualcosa nel repo
(push, PR, schedule). Configurato con file YAML in `.github/workflows/`.

**Workflow**
Un file YAML che definisce un processo CI/CD. Si attiva su un evento
(`on: push`, `on: pull_request`) ed esegue uno o più job.

**Job**
Una sequenza di step in un workflow. I job di un workflow girano
in parallelo di default, su macchine virtuali separate.

**Step**
Una singola azione dentro un job. Può essere un comando bash
(`run: npm install`) o l'invocazione di un'altra action
(`uses: actions/checkout@v4`).

**Action**
Un blocco riutilizzabile di logica CI. `actions/checkout@v4` è
un'action ufficiale di GitHub che clona il repo. `actions/setup-node@v4`
installa Node.js. Si possono usare action di terzi o crearne di proprie.

**Composite action**
Una mia action custom, definita in `.github/actions/<nome>/action.yml`.
Centralizza step ripetuti tra job. Richiamata con
`uses: ./.github/actions/<nome>`.

**Runner**
La macchina virtuale fornita da GitHub che esegue un job. Di solito
Ubuntu Linux. Affittata per la durata del job, poi scartata.

**Exit code**
Numero che un comando restituisce quando finisce. `0` = successo,
qualsiasi altro = errore. In CI un job fallisce se uno qualsiasi
dei suoi step esce con exit code diverso da `0`.

### Pattern di design

**Pattern facade**
Un punto d'ingresso pubblico che nasconde la complessità interna.
Dall'esterno si vede solo l'interfaccia stretta, dentro c'è
implementazione larga che può cambiare liberamente.

Esempi che ho incontrato:
- `src/index.ts` (barrel) di una libreria
- `package.json` campo `"exports"`
- API REST: route pubbliche vs interne
- Composite action: una riga che nasconde 4 step
- Componente React: props stabili vs stato interno
- nodo432.com: un URL che serve HTML o Markdown a seconda del client

**Barrel file**
File `index.ts` di una cartella che ri-esporta i simboli pubblici
del modulo. Centralizza l'API. Pattern facade applicato ai moduli.

**Co-locazione**
Tenere il test accanto al file testato, non in una cartella separata
`__tests__/`. Es. `format.ts` e `format.test.ts` nella stessa cartella.
Convenzione che ho adottato.

**Dependency injection**
Passare le dipendenze (DB, FS, tempo) come parametri di una funzione,
invece di leggerle da variabili globali. Rende le funzioni testabili
senza mock complicati.

Esempio:
```ts
function createItem(input, db = getRealDB()) { /* ... */ }
// in test: createItem(input, makeTestDB())
```

**Funzione pura**
Funzione che, dato lo stesso input, restituisce sempre lo stesso output,
senza side effect (no scrittura su DB, no `new Date()`, no `Math.random()`,
no `process.env`). Si testa con `expect(fn(input)).toEqual(output)`.

**Side effect**
Qualsiasi cosa che cambia stato fuori dalla funzione: scrivere su DB,
fare una richiesta HTTP, scrivere un file, leggere `Date.now()`.
Le funzioni con side effect sono difficili da testare e vanno limitate.

### Linguaggi & ambienti

**Node.js**
Runtime che permette di eseguire JavaScript fuori dal browser. Lo uso
per script, build, test, server. La versione conta (Node 20, 22, 24...).

**npm / pnpm / yarn**
Package manager per Node. Stessa funzione, design diversi. pnpm è
più efficiente con lo spazio disco, yarn è alternativo a npm.
Si distinguono dal lockfile presente nel repo.

**ESM (ECMAScript Modules)**
Lo standard moderno di moduli JS: `import` / `export`. Sostituisce
CommonJS (`require` / `module.exports`). Si attiva mettendo
`"type": "module"` in `package.json`.

**Codespaces (GitHub)**
Servizio che affitta una macchina virtuale Linux dentro il browser,
con VS Code completo + terminale. Utile quando non ho un PC vicino.
60 ore gratis al mese su account personale.

### Vercel & deploy

**Vercel**
Piattaforma di hosting che deploya da GitHub automaticamente.
Quando pusho su main, Vercel cucina la mia "ricetta" (clone, install,
build) e mette online il risultato.

**Build fallita (su Vercel)**
Quando Vercel non riesce a completare il processo di build. Di solito
è un problema della ricetta (codice che non compila, dipendenza
mancante, variabile d'ambiente non settata su Vercel).

### Sicurezza & ambienti

**Variabili d'ambiente (env vars)**
Configurazione che cambia tra ambienti (sviluppo, test, produzione)
senza modificare il codice. Es. l'URL del DB, una API key.
In sviluppo locale vivono in `.env.local`. **Non si committano mai.**

**`.env.example`**
File committato che mostra **quali variabili servono** ma senza valori
veri. Serve come traccia per chi clona il repo per la prima volta.

**Segreto (secret)**
Una variabile sensibile: API key, password, token. Va trattata
con cura: non committata, non loggata, non condivisa in chiaro.

**CVE (Common Vulnerabilities and Exposures)**
Database pubblico di vulnerabilità note nelle librerie. `npm audit`
controlla se le mie dipendenze contengono CVE.

---

## Voci da inserire in sessioni future (parking lot)

Termini che ho sentito ma non ho ancora la definizione precisa:
- Submodule, subtree, monorepo (Git advanced)
- Rebase vs merge (Git workflow)
- Squash merge
- Semantic versioning (semver: major.minor.patch)
- Tree-shaking
- Hoisting (npm vs pnpm)
- Workspace (in package.json)
- Peer dependencies
