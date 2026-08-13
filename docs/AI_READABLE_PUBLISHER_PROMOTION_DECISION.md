# C3 — Decisione di promozione: `ai-readable-publisher`

**Stato:** non promosso nel core.  
**Branch della decisione:** `feat/ai-readable-publisher-decision`.  
**Decisione:** mantenere in EAR mktg website il generatore di corpus AI-readable finché Isola non produrrà e consumerà una proiezione equivalente verificata.

> **Un catalogo usato da una UI non è ancora un publisher per agenti.** Il riuso si dimostra quando almeno due sistemi costruiscono e verificano lo stesso insieme minimo di output pubblicabili, non quando entrambi serializzano dati in JSON.

## Esito della verifica

| Sistema | Output osservato | Finalità | Compatibilità con un publisher AI-readable |
|---|---|---|---|
| EAR mktg website | `index.json`, `llms.txt`, `llms-full.txt`, copie raw Markdown per URL e grafo JSON-LD. | Corpus pubblico consultabile da agenti e LLM. | È il sistema sorgente. |
| Isola | `entities.json`/`storie.json`, albero di navigazione, indice di ricerca UI e mirror per il frontend. | Catalogo operativo per frontend e produzione del canone. | Non ancora compatibile: non pubblica mappe per agenti, dump testuale, raw Markdown per entità o un contratto URL equivalente. |

## Invariante locale di EAR mktg website

Il generatore di EAR mktg website attraversa il proprio albero `content/` e costruisce un set coerente di artefatti pubblici:

```text
catalogo strutturato → index.json
mappa per LLM       → llms.txt
corpus concatenato  → llms-full.txt
sorgente per nodo   → <slug>.md
proiezione grafo    → graph.json (quando disponibile)
```

Ogni output dipende da convenzioni proprietarie: frontmatter dei documenti, sezioni `_section.md`, stato `published`, URL del sito, download canonici, direttive LLM, grafo Tesseract e filesystem di build Node. Sono responsabilità del publisher EAR, non contratti generici già consumati da Isola.

## Perché Isola non è ancora il secondo consumer richiesto

Il builder di Isola scansiona `visual/**/scheda.md` e genera un `entities.json` per il catalogo web. Le entry includono frontmatter, `body_md`, prompt, immagini, percorsi locali e breadcrumb; il file viene mirrored nel frontend Next.js. Questo è un ottimo contratto locale fra builder e UI, ma ha uno scopo differente:

| Capacità | EAR mktg website | Isola attuale |
|---|---|---|
| Catalogo strutturato pubblicabile | Sì, con URL assoluti, kind uniforme e metadati documentali. | Solo JSON locale/UI con percorsi del repository. |
| Raw Markdown raggiungibile per nodo | Sì, una copia `<slug>.md` per ogni documento/sezione. | No: `body_md` è incorporato nel JSON, senza endpoint o artefatto raw per entità. |
| Mappa/dump per agenti | Sì, `llms.txt` e `llms-full.txt`. | No. |
| Indicazioni AI, policy URL e inclusion rule | Sì, esplicitate e costruite con il corpus. | No contratto analogo; `status` è usato dal catalogo ma non governa un corpus per agenti. |
| Build e hosting | Node/Next, sito documentale. | Python + catalogo statico/Next, con mirror dati UI. |

Estrarre oggi schemi come `Catalog`, `Document`, `RawUrl` o `LlmsManifest` darebbe un package con un solo consumer reale e costringerebbe Isola a etichette non ancora utili al suo lavoro.

## Decisione di architettura

Non sono stati creati generatori, schema Zod, interfacce di filesystem o funzioni di concatenazione nel core. Il core non deve leggere directory, produrre file, scegliere URL, copiare Markdown o decidere l’inclusione di un documento: queste sono scelte di build e pubblicazione dei consumer.

| Resta in EAR mktg website | Potrà entrare nel core dopo riuso reale |
|---|---|
| Walk del filesystem, parsing del frontmatter, URL, asset copy, JSON-LD Tesseract e scrittura in `public/`. | Un contratto puro di `ReadableDocument` e `ReadableCorpus`, se le stesse property vengono generate e validate da Isola. |
| Regole editoriali `published`, download canonici e direttive LLM EAR. | Una funzione pura di proiezione, se produce lo stesso catalogo e dump testuale a partire da input già normalizzati. |
| `llms.txt` e `llms-full.txt` specifici del sito. | Template condiviso soltanto dopo un output Isola testato contro lo stesso standard. |

## Criterio di riapertura

C3 può essere riaperta quando sono vere **tutte** le condizioni seguenti:

1. Isola produce almeno catalogo strutturato, raw Markdown per entità e un indice/dump per agenti da un build ripetibile; i file possono avere nomi diversi, ma il contratto deve avere ruoli equivalenti.
2. EAR mktg website e Isola validano almeno un fixture corpus contro lo stesso schema puro, inclusi ID o slug, titolo, stato di pubblicazione, body Markdown e URL o percorso pubblico risolto dall’adapter.
3. Ogni consumer possiede localmente walk del filesystem, parsing del frontmatter, URL, hosting e scelta degli artefatti binari; il core riceve soltanto documenti già normalizzati.
4. Un test cross-repository dimostra che la stessa proiezione catalogo/dump resta stabile su dati equivalenti.

## Prossimo passo consigliato

Il prossimo modulo del piano è **C4 `lead-core`**. Anche questo richiede due verticali reali: prima della promozione verranno confrontati schema, consenso e audit trail dell’Automotive con un secondo target, senza anticipare adapter, CRM o canali di contatto.
