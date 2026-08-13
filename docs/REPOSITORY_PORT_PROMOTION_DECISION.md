# D1 — Decisione di promozione: repository ports

**Stato:** non promosso nel core.  
**Branch della decisione:** `feat/repository-port-promotion-decision`.  
**Decisione:** non introdurre ancora un’interfaccia `Repository<T>` o adapter condivisi; i tre sistemi osservati non condividono una frontiera di persistenza concreta né un set di operazioni con la stessa semantica.

> **Avere un database non equivale ad avere lo stesso repository.** Un port riduce l’accoppiamento soltanto quando almeno due domini chiedono le stesse operazioni allo stesso confine. Una generica interfaccia CRUD costruita in anticipo nasconderebbe query, transazioni, lifecycle e autorizzazioni importanti.

## Esito della verifica

| Sistema | Confine osservato | Tecnologia | Semantica | Compatibilità con un port comune |
|---|---|---|---|---|
| Soldi Lab | Moduli per `Space`, asset, floor, income e settings; le funzioni ricevono opzionalmente `SoldiLabDB`. | Dexie/IndexedDB. | ID e timestamp, archiviazione soft, filtri locali e transazioni multi-tabella. | È un repository locale concreto, ma specifico dei suoi aggregate finanziari. |
| La Famiglia | `storage.ts` per immagini; cache SWR e client Supabase separati. | Supabase Storage + cache client. | Upload, URL pubblici, bucket, limiti formato/dimensione e delete best-effort. | È un object-storage/media service, non un repository di aggregate. |
| Gestionale | Server actions di dominio con query Supabase dirette. | Supabase/Postgres. | Auth, tenant, RPC, slot, ordini, prescrizioni, transazioni e revalidazione UI. | È persistenza accoppiata al dominio e all’autorizzazione, senza port riusabile già adottato. |

## Perché non promuovere un CRUD generico

Soldi Lab offre le operazioni che ci si aspetta da un repository, ma include invarianti intenzionali: archiviazione soft, ordinamento, filtri e transazione per cancellare lo spazio con tutti i figli. La Famiglia non persiste gli stessi tipi: il suo confine è un file in un bucket, con URL e limiti di media. Gestionale usa Supabase direttamente perché ogni write richiede contesto di azienda, sessione e regole di dominio.

Una firma come `get(id)`, `list()`, `save(entity)`, `delete(id)` non rappresenterebbe query per scope, soft delete, file object, multi-tenancy, transazioni o auth. Forzerebbe gli adapter a perdere informazione, o costringerebbe il core a incorporare opzioni del database e del dominio: entrambi gli esiti violano il confine del core.

## Decisione di architettura

Non sono stati creati `Repository<T>`, `ReadRepository<T>`, `WriteRepository<T>`, `UnitOfWork`, adapter Dexie, adapter Supabase, cache o storage in-memory nel core. Il core continua a esporre `Scope`, `Actor`, `Operation` e contratti di dominio; ogni consumer possiede il proprio boundary I/O.

| Resta nei consumer | Potrà entrare nel core dopo riuso reale |
|---|---|
| Schema Dexie, transaction API, soft delete e filtri di Soldi Lab. | Un port mirato a una stessa capability, per esempio snapshot scoped o record append-only, adottato da almeno due consumer. |
| Bucket, URL pubblici, upload file e cache di La Famiglia. | Un contratto object-store solo se due consumer richiedono davvero upload/read/delete con stessi esiti e policy esplicitamente mappate. |
| Client Supabase, sessione, RLS, RPC e server actions di Gestionale. | Interfacce pure che ricevono `Scope`/actor e restituiscono esiti di dominio, senza token, SDK o query. |

## Criterio di riapertura

D1 può essere riaperta quando sono vere **tutte** le condizioni seguenti:

1. Due consumer chiamano la stessa capability di persistenza con uguali precondizioni, risultati ed errori rilevanti; non basta che usino entrambi un database.
2. La capability ha un fixture contract condiviso che può essere eseguito contro due adapter concreti, ad esempio in-memory e Supabase/Dexie.
3. Scope, ownership, soft delete, ordinamento, paginazione e concorrenza sono o identici, o dichiarati esplicitamente fuori dal port.
4. Il core non importa SDK, schema, URL, query builder, cache o sessioni.
5. Eventuali transazioni restano proprietà dell’adapter o di un caso d’uso di dominio finché due consumer non condividono la stessa semantica transazionale.

## Prossimo passo consigliato

Il prossimo incremento è **D2 — `policy` / command gate**. La valutazione partirà da Gestionale, Automotive e California per verificare se la decisione autorizzativa può essere separata in modo puro da auth, database e UI.
