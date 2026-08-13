# ROADMAP

> Ordine di estrazione dei moduli di `ear-lab-core`.
> L'ordine è scelto per **rischio crescente**: prima ciò che è puro
> (funzione → dato → dato), poi ciò che ha stato e side effect.
>
> Il dettaglio delle fonti, dei confini e dei proof-of-concept è in
> [`docs/EXTRACTION_PLAN.md`](./docs/EXTRACTION_PLAN.md). Lo stato sotto
> descrive ciò che è presente nel repository, non ciò che è già integrato
> nei consumer.

---

## Stato dei moduli

Legenda: ⬜ da fare · 🟡 in corso · ✅ completato

### Fase 1 — Fondamenta (logica pura, alto riuso)

- 🟡 **`datetime/`** — Date italiane, formatter, parsing
  - Primo incremento: `startOfIsoWeek(Date)` estratto e testato; riceve il
    clock come input e non usa conversioni UTC implicite.
  - Sorgenti: La Famiglia, Soldi_Lab, Ricette_Lab (formattazione ovunque)
  - Perché primo: zero dipendenze, zero stato, TDD pulitissimo
- ⬜ **`types/`** — Tipi di dominio condivisi
  - `Member` / `FamilyMember` (id, nome, colore, ruolo, avatar)
  - Entità temporali generiche (`Event`, `Task`, `Activity`)
  - Pattern multi-space / multi-family
- ⬜ **`schemas/`** — Schemi Zod dei tipi sopra
  - Validatori per input esterni (API, storage, AI output)
- 🟡 **`contracts/`** — Envelope comuni versionati
  - `Actor`, `Scope`, `ArtifactRef`, `DomainEvent`, `Operation`
  - Primi contratti di proiezione: `CatalogItem` + `CatalogSnapshot`, compatibili
    con publisher documentali, e `MealPlanSnapshot` per Ricette Lab → La Famiglia.
  - Il contratto pasti è validato nel core ma non implica ancora route, migration
    o integrazione operativa nei consumer.
  - Il payload di dominio resta nel package che lo possiede; il core valida
    il solo envelope e la chiave di idempotenza.

### Fase 2 — Calcolo puro (logica di business riusabile)

- ⬜ **`calculations/`** — Funzioni di calcolo deterministiche
  - Floor / spesa strutturale (da Soldi_Lab)
  - Aggregazioni temporali (mensile/annuale/normalizzazioni)
  - Da valutare: nutrienti, stagionalità (da Ricette_Lab)
- 🟡 **`format/`** — Formatter italiani
  - Primo incremento: EUR italiano (arrotondato/preciso) e normalizzazione
    pura di frequenze mensile, bimestrale, trimestrale, semestrale e annuale.
  - Restano: numeri, percentuali e date relative ("ieri", "tra 3 giorni").

### Fase 3 — Persistenza (introduce stato controllato)

- ⬜ **`repository/`** — Repository pattern + adapter
  - Interfaccia comune
  - Adapter Dexie (locale)
  - Adapter Supabase (cloud)
  - Adapter in-memory (per test)
- ⬜ **`auth/`** — Auth & session management
  - PIN + bcrypt (pattern La Famiglia)
  - `requireAuth()` guard portabile
  - Multi-space switching

### Fase 4 — Avanzate (stato + side effect + tempo)

- ✅ **`offline-queue/`** — Coda portabile e riconciliazione esplicita
  - Coda in-memory di `Operation`, deduplicata per `idempotencyKey`, con retry e stati `pending`/`processing`/`failed`.
  - Router registrato dal consumer: il core non conosce endpoint, HTTP, SDK o provider.
  - Restano fuori persistenza, scheduler, service worker, hook React, UI e optimistic update; Moto-lollo è al momento solo un candidato senza flusso di sync implementato.
- ⬜ **`notifications/`** — Catalogo eventi tipato
  - Event catalog (da `notification-events.ts` di La Famiglia)
  - Dispatcher con fallback (Web Push → Telegram → ...)
- ✅ **`events/`** — Catalogo e bus di eventi di dominio
  - `defineEventCatalog` collega chiavi evento e schema Zod del payload.
  - Il bus in-memory valida envelope e payload, espone subscription per tipo e audit globale.
  - Non incorpora notifiche, database, webhook, retry o broker: tali adapter restano nei consumer.

---

## Idee parcheggiate (non ancora in ordine)

Cose che potrebbero diventare moduli ma vanno valutate dopo le fasi 1-3:

- Conflict resolver (da `conflict-resolver`)
- Graph-based inference (da Grafo_own, graph-spec-pipeline, EAR ontology)
- Ingest / build tools (da Ricette_Lab, Spotimai)
- `INDEX.json` machine-readable della repo (utile quando i moduli sono 5+)

---

## Principi di estrazione

1. **Si parte sempre dal puro.** Funzioni che non toccano DB, FS,
   tempo o random sono il primo target.
2. **Un modulo alla volta.** Non aprire il modulo N+1 finché N non
   ha test verdi e `SPEC.md` scritto.
3. **Generalizzare, non copiare.** Se la logica esiste solo in un repo,
   chiediti se è davvero generalizzabile o se è specifica di quel dominio.
4. **L'ordine può cambiare** se durante un'estrazione scopri che un
   modulo della fase successiva è prerequisito di quello in corso.
   Documenta la decisione in changelog.

---

## Changelog

- 2026-05-14: Roadmap iniziale. Ordine derivato dall'analisi dei repo
  sorgente e dalla logica "puro prima, stato dopo".
- 2026-08-13: Estratti `format` (EUR e frequenze) e il contratto di catalogo
  versionato; test, typecheck e build verificati sul branch dedicato.
- 2026-08-13: Estratto `MealPlanSnapshot` per il proof-of-concept Ricette Lab →
  La Famiglia, con confini espliciti fra snapshot producer e persistenza consumer.
- 2026-08-13: Estratto `events`: catalogo Zod che collega tipo e payload, più bus
  in-memory con subscription locale. Test, typecheck e build verificati sul branch
  dedicato; persistenza e notifiche restano adapter dei consumer.
- 2026-08-13: Estratto `offline-queue`: coda in-memory di `Operation` con router
  consumer, idempotenza e transizioni retry. La persistenza IndexedDB, le route e
  il Background Sync di La Famiglia restano adapter locali; Moto-lollo non ha ancora
  un flusso operativo che giustifichi un adapter condiviso.
