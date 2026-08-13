# C1 — Decisione di promozione: `content-workflow`

**Stato:** non promosso nel core.  
**Branch della decisione:** `feat/content-workflow-promotion-decision`.  
**Decisione:** mantenere il workflow editoriale nel dominio di 67_ENT fino alla dimostrazione di un secondo consumer con il medesimo lifecycle di approvazione.

> **Non è un blocco tecnico: è una protezione contro un’astrazione falsa.** Un motore di stati condiviso è utile soltanto quando due sistemi condividono invarianti, non quando entrambi hanno generici “passaggi” o “fasi”.

## Esito della verifica

| Sistema | Evidenza osservata | Tipo di workflow | Compatibilità con 67_ENT |
|---|---|---|---|
| 67_ENT | `posts.ts` e trigger SQL `validate_post_transition`. | Approvazione editoriale: `draft → in_review → approved/rejected → published`; il rifiuto richiede una motivazione. | È il sistema sorgente. |
| Scrivia | `lib/stages.ts`, `lib/store.ts` e roadmap. | Avanzamento di produzione narrativa, derivato dalla presenza di artefatti e dal formato: `ready`, `gate`, `locked`, `done`. | Non compatibile: non esistono review, approvazione, rifiuto o pubblicazione equivalenti. |
| Isola | Snapshot di produzione, canone e check tecnico di consegna. | Validazione tecnica di file e consegne per PR. | Non compatibile: verifica conformità tecnica, non lifecycle editoriale di un contenuto. |

## Invariante locale di 67_ENT

Il workflow dei post non è una successione lineare generica. Il database consente soltanto queste transizioni:

```text
draft → in_review
in_review → approved | rejected
rejected → draft
approved → published
```

L’applicazione aggiunge responsabilità che non possono essere promosse senza un consumer equivalente: scrittura su Supabase con controllo dello stato precedente, motivazione obbligatoria del rifiuto, notifiche non fatali e semantica propria di autore, artista e post.

## Perché Scrivia non è il secondo consumer richiesto

Scrivia ha effettivamente un processo governato da gate, ma è un processo **di costruzione narrativa**. Il suo stato non è immesso da un revisore e non rappresenta un’approvazione: viene derivato dai suoi artefatti (`seed`, nodo, hook, brief, prosa, audit, libro) e dalle definizioni del formato. Spostare le sue fasi dentro una macchina `draft/in_review/approved/published` cancellerebbe le distinzioni che rendono utile Scrivia; fare il contrario renderebbe 67_ENT meno leggibile e più generico senza riuso reale.

Isola, invece, verifica la completezza tecnica di una consegna. Un check verde o rosso su file, nomi e immagini non è una transizione editoriale, né porta la stessa informazione di un rifiuto motivato da un revisore.

## Decisione di architettura

Non sono stati creati `ContentStatus`, `ContentTransition`, `canTransition()` o un repository/adapter `content-workflow` nel core. Anche una macchina a stati parametrica sarebbe oggi una generalizzazione prematura: esisterebbe un solo consumer effettivo e non ridurrebbe duplicazioni tra sistemi.

| Resta in 67_ENT | Potrà entrare nel core dopo riuso reale |
|---|---|
| Stati dei post, reason di rifiuto, ruoli, query Supabase, notifiche e copy. | Un grafo puro di transizioni soltanto se 67_ENT e un secondo consumer adottano lo stesso vocabolario e gli stessi vincoli. |
| Audit e persistenza legati alle tabelle dei post. | Un contratto `TransitionRequest`/`TransitionResult` soltanto se entrambe le applicazioni scambiano davvero queste richieste. |
| UI di review e filtri editoriali. | Validazione pura della transizione, senza DB, UI, notifiche o autorizzazione. |

## Criterio di riapertura

C1 può essere riaperta quando sono vere **tutte** le condizioni seguenti:

1. Scrivia, Isola o un altro consumer possiede una entità concreta che passa attraverso almeno tre degli stessi stati concettuali di 67_ENT, inclusi review e decisione di approvazione/rifiuto, oppure i due sistemi ratificano un vocabolario alternativo comune.
2. Entrambi i consumer usano un test contro la stessa funzione pura o lo stesso contratto versionato, con casi validi e non validi.
3. Gli equivalenti di attore, scope, motivo della decisione e artefatto revisionato sono esplicitamente mappati e non nascosti in payload opachi.
4. La persistenza, l’autorizzazione, le notifiche e le route restano adapter locali.

## Prossimo passo consigliato

Il prossimo modulo del piano non dipendente da questa condizione è **C2 `serial-story`**. Prima di estrarre qualsiasi parte da Rocco-Zara, si applicherà lo stesso test: il serializzatore entra nel core soltanto se Scrivia consuma effettivamente il medesimo contratto di saga o se l’integrazione rende verificabile una stessa proiezione.
