# Piano di estrazione dei moduli EAR Lab

**Stato:** proposta iniziale implementata nel branch `feat/extraction-foundations`.  
**Regola:** il presente piano non sposta codice automaticamente dai repository sorgente. Definisce i confini, i contratti e l’ordine con cui estrarlo in cicli TDD piccoli.

> **Tesi.** `ear-lab-core` non deve diventare il contenitore di tutte le app. Deve fornire **primitive pure**, **contratti versionati** e **porte di integrazione**. I moduli che conoscono un dominio—una ricetta, un lead, un episodio, un ordine—restano nel loro repository finché non hanno almeno un secondo consumer reale.

## Inventario della lettura

Sono stati riletti struttura, README, manifest, roadmap e specifiche disponibili dei 26 repository: `67_ENT`, `Automotive`, `California`, `EAR_Lab_Arena`, `EAR_mind`, `EAR_mktg_website`, `Gbc_monzoro`, `Gestionale`, `Giochi_Lab`, `Grafo_own`, `Home_Exchange`, `Moto-lollo`, `Ricette_Lab`, `Rocco-Zara`, `Scrivia`, `Soldi_Lab`, `Spotimai`, `conflict-resolver`, `demo`, `ear-claude-telegram-bot`, `ear-lab-core`, `graph-spec-pipeline`, `isola_i3v_visual`, `la-famiglia`, `raydalessandro`, `retrotoyz`.

| Famiglia di capacità | Repository sorgente | Evidenza principale | Destinazione proposta |
|---|---|---|---|
| Date, formati, frequenze | La Famiglia, Soldi Lab, Ricette Lab | Stesse trasformazioni locali e italiane ricorrono in più app. | `ear-lab-core/src/datetime`, `format`. |
| Validazione ed envelope | Automotive, Ricette Lab, Soldi Lab | Zod è usato ai bordi per schema di input/corpus. | `ear-lab-core/src/contracts`. |
| Eventi, notifiche, operazioni offline | La Famiglia, 67_ENT, Gestionale | Catalogo eventi tipato, push, retry e operazioni asincrone. | `events`, poi `offline-queue`. |
| Catalogo machine-readable | EAR mktg website, Ricette Lab, Isola | Corpus Markdown/JSON e build di indici/LLM file. | Contratto `catalog`, adapter nel consumer. |
| Workflow contenuti | 67_ENT, Scrivia, Rocco-Zara, Isola | Stati, audit, revisioni, media e canali umani. | Contratto in core; package di dominio in 67_ENT. |
| Pianificazione pasti | Ricette Lab, La Famiglia | Schema, lista spesa e contratto d’integrazione già disegnato. | Contratto in core; dominio in Ricette Lab. |
| Lead multi-target | Automotive | Core append-only, stato, consenso e dati per target. | Package locale Automotive; promozione dopo secondo verticale. |
| Saga e continuità | Rocco-Zara, Scrivia, California, Isola | Grafo, serializzatore, brief, audit, dry-run. | Package locale Rocco-Zara; Scrivia primo consumer. |
| Accesso agentico sicuro | Gestionale, California, Scrivia | RLS/ruoli, dry-run, tool registry e comandi controllati. | Porte `operations`/`policy` nel core; adapter nei sistemi. |

## Struttura a tre livelli

```text
1. Primitive pure e contratti
   ear-lab-core/src/
   ├── datetime/
   ├── format/
   ├── contracts/
   ├── events/
   ├── operations/
   └── offline-queue/

2. Moduli di dominio
   <repository-sorgente>/packages/<nome>/
   ├── Ricette_Lab/packages/meal-planning/
   ├── 67_ENT/packages/content-workflow/
   ├── Rocco-Zara/packages/serial-story/
   ├── Automotive/packages/lead-core/
   └── EAR_mktg_website/packages/ai-readable-publisher/

3. Adapter di integrazione
   <repository-consumer>/src/integrations/<sorgente>/
   ├── la-famiglia/src/integrations/ricette-lab/
   ├── 67_ENT/src/integrations/content-producers/
   ├── isola_i3v_visual/src/integrations/catalog-publisher/
   └── <verticale>/src/integrations/lead-core/
```

| Livello | Può conoscere | Non può conoscere |
|---|---|---|
| Core | tipi, schema, funzione pura, interfaccia, errori e versioni | URL, tabelle, UI, provider, credenziali, copy di dominio |
| Package di dominio | invarianti proprie del dominio e artefatti canonici | DB e UI del consumer |
| Adapter | rete, storage, DB, identità e mapping del consumer | regole duplicabili del dominio sorgente |

## Ordine di estrazione

L’ordine segue la roadmap esistente: prima logica pura, poi stato, infine side effect. Nessun modulo di fase successiva parte finché il precedente non ha test verdi e uno `SPEC.md` chiaro.

### Fase A — Fondamenta da estrarre subito

| Ordine | Modulo | Fonti | Output nel core | Criterio di chiusura |
|---:|---|---|---|---|
| A1 | `datetime/week` | La Famiglia | Calcolo settimana locale ISO senza mutare input e senza dipendere da `new Date()` nascosto. | Test su lunedì, domenica, passaggio mese/anno e input valido. |
| A2 | `format/currency` e `format/frequency` | Soldi Lab | Formattazione italiana e normalizzazione frequenze esplicite. | Test su EUR, precisione e tutte le frequenze supportate. |
| A3 | `contracts/common` | Automotive, Ricette Lab, La Famiglia | Attore, scope, artefatto, evento e operazione versionati tramite Zod. | I contratti accettano input valido e rifiutano payload incompleti. |
| A4 | `contracts/catalog` | EAR mktg website, Ricette Lab, Isola | Voce di catalogo canonica e riferimento ad artefatto. | Una fonte può elencare solo item pubblicabili/versionati. |

### Fase B — Primo ciclo di integrazione reale

| Ordine | Modulo | Origine → consumer | Confine da validare | Fuori scope |
|---:|---|---|---|---|
| B1 | `contracts/meal-planning` | Ricette Lab → La Famiglia | Menu e lista spesa sono snapshot validati e appartenenti a uno scope famigliare. | Sync bidirezionale o FK live sul corpus. |
| B2 | `events` | La Famiglia, 67_ENT | Un fatto è pubblicato senza conoscere le notifiche o la persistenza dei consumer. | Dispatcher push/Telegram concreto. |
| B3 | `offline-queue` | La Famiglia → Moto-lollo | Coda, retry e idempotenza non conoscono endpoint o payload di post. | Service worker/UI/hook React. |

### Fase C — Primo riuso di dominio

| Ordine | Modulo | Origine → consumer | Condizione di promozione |
|---:|---|---|---|
| C1 | `content-workflow` | 67_ENT → Isola/Scrivia | Il secondo consumer usa davvero gli stessi stati e transizioni. |
| C2 | `serial-story` | Rocco-Zara → Scrivia | Un episodio reale passa da stato canonico a seed/audit senza copia di file. |
| C3 | `ai-readable-publisher` | EAR mktg website → Isola | Un corpus non-EAR produce catalogo, Markdown raw e indice per agenti. |
| C4 | `lead-core` | Automotive → secondo verticale | Due target con attributi diversi condividono schema core, consenso e audit trail. |

### Fase D — Stato e poteri controllati

| Ordine | Modulo | Fonti | Vincolo inderogabile |
|---:|---|---|---|
| D1 | `repository` ports | Soldi Lab, La Famiglia, Gestionale | Interfacce pure; Dexie/Supabase/in-memory sono adapter separati. |
| D2 | `policy` / command gate | Gestionale, Automotive, California | Ogni comando porta attore, scope, idempotency key e decisione autorizzativa. |
| D3 | `notifications` | La Famiglia, 67_ENT | Catalogo di eventi separato dai canali Web Push, Telegram o email. |

## Contratti portati nel core

I seguenti contratti vengono creati per primi perché non richiedono di spostare logica di business; evitano però che le future integrazioni condividano tabelle, route interne o componenti UI.

| Contratto | Forma universale | Primi casi d’uso |
|---|---|---|
| `ArtifactRef` | Riferimento immutabile e versionato a un output. | Brief, Markdown canonico, report audit, immagine, lista spesa. |
| `DomainEvent` | Un fatto già avvenuto, con tipo, versione, attore, scope e payload. | `meal-plan.published`, `content.draft-created`, `lead.received`. |
| `Operation` | Una richiesta idempotente che può avere retry e policy. | Importa menu, transizione contenuto, comando da agente. |
| `CatalogItem` | Un elemento pubblicabile con stato, versione e contenuto canonico. | Ricetta, scheda Isola, documento nodo432. |

## Contratti di integrazione da sviluppare dopo le fondamenta

| Integrazione | Evento/operazione | Proprietario del dato | Adapter |
|---|---|---|---|
| Ricette Lab → La Famiglia | `meal-plan.published` | Ricette Lab produce il piano; La Famiglia salva il proprio snapshot. | API server-side di La Famiglia con RLS. |
| Scrivia/Rocco-Zara → 67_ENT | `content.draft-created` + `content.transition` | Produttore possiede artefatti; 67_ENT possiede workflow e pubblicazione. | Importer di contenuti in 67_ENT. |
| Isola → publisher AI-readable | `CatalogSource` | Isola possiede il canone; il publisher crea una proiezione build-time. | Filesystem/catalog adapter. |
| Automotive → nuovo verticale | `lead.received` + `lead.transition` | Lead core possiede invarianti; verticale possiede attributi e UI. | Adapter per target. |
| Agente → Gestionale/California | `Operation` soggetta a `CommandGate` | Il sistema di dominio resta proprietario dei write. | Tool MCP con dry-run prima di execute. |

## Regole di estrazione

1. **Test prima del codice.** Ogni funzione pura ha test di casi normali, edge case ed errori; gli adapter hanno test d’integrazione isolati.
2. **Una dipendenza esterna al massimo per adapter.** Il core non importa Supabase, Dexie, React, API AI o SDK di messaggistica.
3. **Le migrazioni sono additive.** Un contratto attraversa repository solo tramite un evento/operazione versionata o uno snapshot; mai tramite copia di schema DB.
4. **Nessun adapter entra nel core.** URL, endpoint, auth, storage e provider sono sempre locali al consumer.
5. **Promozione dopo riuso reale.** Un package di dominio non diventa shared library per intuizione: serve un secondo consumer testato.
6. **Branch e database di test.** Ogni implementazione successiva userà branch dedicati e, quando esistono write/persistenza, solo ambienti di test.

## Prossimo incremento verificabile

Il primo incremento di questo branch introduce: `datetime/week` e `contracts/common`, con test co-locati, `SPEC.md`, barrel export e configurazione Vitest coerente con i test co-locati. È intenzionalmente piccolo: stabilisce forma, naming, test e versionamento prima che il core inizi ad accumulare logica.

## Riferimenti

[1]: https://github.com/raydalessandro/ear-lab-core "EAR Lab Core — roadmap e istruzioni di estrazione"
[2]: https://github.com/raydalessandro/la-famiglia "La Famiglia — eventi e queue offline"
[3]: https://github.com/raydalessandro/Ricette_Lab "Ricette Lab — schema, pianificazione e lista spesa"
[4]: https://github.com/raydalessandro/Soldi_Lab "Soldi Lab — formati e calcoli puri"
[5]: https://github.com/raydalessandro/67_ENT "67_ENT — workflow editoriale"
[6]: https://github.com/raydalessandro/Automotive "Automotive — lead core multi-target"
[7]: https://github.com/raydalessandro/Rocco-Zara "Rocco-Zara — serializzatore e audit"
[8]: https://github.com/raydalessandro/EAR_mktg_website "EAR mktg website — publishing AI-readable"
[9]: https://github.com/raydalessandro/Gestionale "Gestionale — accesso agentico e guardrail"
[10]: https://github.com/raydalessandro/California "California — orchestrazione idempotente"
