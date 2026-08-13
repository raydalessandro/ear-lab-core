# D2 — Decisione di promozione: `policy` / command gate

**Stato:** non promosso nel core.  
**Branch della decisione:** `feat/policy-gate-promotion-decision`.  
**Decisione:** mantenere nel Gestionale la policy di permessi e non introdurre ancora un command gate generico nel core; manca un secondo consumer con la stessa semantica di autorizzazione applicativa.

> **Un gate di qualità non è un gate di autorizzazione.** Validare un batch prima dell’import e decidere se un attore può eseguire un comando sono due decisioni pure diverse, con input, conseguenze e ownership differenti.

## Esito della verifica

| Sistema | Meccanismo osservato | Input e risultato | Compatibilità con un command gate |
|---|---|---|---|
| Gestionale | Matrice ruolo × permesso, letta da policy versione `v1`; decisione pura `valutaPermesso`. | Profilo, stato attivo, ruoli, capability e autenticazione; risultato allow/deny con motivo. | È il sistema sorgente. |
| Automotive | Gate CLI di qualità per batch di aziende prima dell’import. | File batch, schema, deduplica, P.IVA, email/sito; exit code e problemi di qualità. | Non compatibile: verifica dati, non autorizzazione di un attore. |
| California | Audit di integrità, schema, navigabilità e drift del corpus. | Artefatti e regole editoriali; esiti di audit. | Non compatibile: verifica editoriale, non policy di comando. |

## Invariante locale del Gestionale

Il Gestionale espone un buon nucleo puro: `valutaPermesso` riceve una capability, il profilo disponibile, la matrice policy e l’informazione di autenticazione. Restituisce una decisione esplicita con motivo di diniego; una capability assente viene negata, quindi non esiste default-allow. La funzione è poi avvolta da `richiedi`, che recupera sessione e profilo dal backend, applica il tenant e traduce gli errori per le server actions.

Questa separazione è corretta nel Gestionale, ma le capability (`ordini`, `prescrizioni`, `anonimizzazione` e simili), i ruoli e i motivi sono policy della sua piattaforma. Non sono stati dimostrati in un secondo prodotto.

## Perché Automotive e California non sono secondi consumer

Automotive possiede un gate ripetibile e bloccante, ma il suo scopo è decidere se un batch di aziende può essere importato. Il gate analizza dati e condizioni di fiducia; non riceve un attore, una capability, un tenant o una matrice di ruoli. California applica guardie sui contenuti narrativi e sulla loro coerenza, senza utenti o comandi applicativi.

Estrarre una generica `PolicyDecision` che confonda autorizzazione, validazione di import e audit editoriale produrrebbe un’etichetta comune senza comportamento comune. Estrarre solo il booleano allow/deny sarebbe ancora peggio: eliminerebbe motivazioni e precondizioni decisive per i consumer.

## Decisione di architettura

Non sono stati creati `Policy`, `CommandGate`, `PermissionMatrix`, `authorize`, `requirePermission` o adapter auth nel core. `Actor` e `Scope` esistenti restano vocabolario comune; l’interpretazione di ruoli, capability e sessione resta locale finché due applicazioni non applicano lo stesso contratto decisionale.

| Resta nel Gestionale | Potrà entrare nel core dopo riuso reale |
|---|---|
| Ruoli, matrice permessi, messaggi UX e capability del negozio. | Un envelope puro di richiesta policy con attore, scope, capability e decisione motivata, se due consumer lo adottano. |
| Recupero sessione Supabase, profilo, tenant e throw/errore di server action. | Una funzione decisionale senza provider auth, database o UI, verificata da contract test multipli. |
| Gate di import Automotive e audit California. | Validator e policy separati, se almeno due consumer condividono davvero ciascuna semantica. |

## Criterio di riapertura

D2 può essere riaperta quando sono vere **tutte** le condizioni seguenti:

1. Un secondo sistema espone comandi applicativi che richiedono decisione su attore, scope o tenant e capability, non solo validazione di dati.
2. I due consumer definiscono un input comune già normalizzato e una decisione tipizzata che conserva il motivo dell’allow/deny.
3. Gli stessi test coprono default-deny, attore assente/disabilitato, capability ignota, scope incoerente e decisione positiva.
4. Sessione, identità provider, database, tenant lookup, UI e comando esecutivo restano negli adapter locali.
5. Policy di qualità, validazione e audit non vengono fatte passare per autorizzazione solo per riusare un nome.

## Prossimo passo consigliato

Il prossimo incremento è **D3 — `notifications`**. Il core eventi già esiste; la verifica confronterà La Famiglia e 67_ENT per stabilire se serva un port di dispatch o se catalogo e bus in-memory siano già il confine corretto.
