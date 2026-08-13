# D3 — Decisione di promozione: notification dispatch

**Stato:** non promosso nel core.  
**Branch della decisione:** `feat/notification-dispatch-promotion-decision`.  
**Decisione:** non aggiungere un port di dispatch notifiche al core. Il catalogo e il bus eventi già estratti sono il confine condiviso corretto; La Famiglia e 67_ENT non hanno ancora due dispatcher con la stessa semantica.

> **Un evento informa che un fatto è avvenuto; una notifica decide come, dove e a chi consegnarlo.** Il primo confine è comune ed è già nel core. Il secondo dipende da preferenze, destinatari, UI, provider e tolleranza agli errori dei singoli sistemi.

## Esito della verifica

| Sistema | Meccanismo osservato | Responsabilità | Compatibilità con un dispatcher comune |
|---|---|---|---|
| La Famiglia | Catalogo eventi notificabili, calcolo destinatari, riga in-app, push web e Telegram. | Recipient routing, preferenze per utente/canale, bucket, Supabase, VAPID, Telegram, cleanup subscription e logging. | È un dispatcher completo ma altamente specifico. |
| 67_ENT | Lettura notifiche in-app, mark read/unread e registrazione/rimozione subscription push. | Client Supabase, inbox UI e subscription lifecycle. | Non possiede ancora un publisher/dispatcher di eventi con routing o delivery. |
| `ear-lab-core/events` | Catalogo di payload Zod e bus in-memory con subscriber specifici/globali. | Validazione evento e distribuzione locale indipendente dai consumer. | È il confine comune già estratto. |

## Perché non aggiungere un port `NotificationDispatcher`

La Famiglia riceve un evento tipizzato, costruisce titolo/corpo/link, calcola i destinatari, registra una notifica in-app e poi tenta più canali con preferenze per membro. Il suo successo non è binario: la riga in-app può esistere anche se push o Telegram falliscono; le subscription possono essere eliminate dopo certi errori; alcuni canali sono fire-and-forget.

67_ENT, invece, gestisce il lato client della inbox e delle push subscription. Non contiene un catalogo di eventi notificabili, un calcolo recipient, un invio push server-side o un dispatch multi-canale equivalente. Un’interfaccia come `dispatch(notification)` avrebbe quindi un solo implementatore reale e imporrebbe a 67_ENT concetti non ancora presenti.

## Decisione di architettura

Non sono stati creati `NotificationDispatcher`, `NotificationChannel`, `DeliveryAttempt`, `RecipientResolver` o adapter push/Telegram/email nel core. I consumer possono iscriversi al modulo `events` e implementare localmente gli effetti di consegna. La persistenza dell’inbox, le preferenze, i token, le subscription e le policy di retry restano adapter di ciascun prodotto.

| Resta in La Famiglia | Resta in 67_ENT | Potrà entrare nel core dopo riuso reale |
|---|---|---|
| Recipient routing, notification record, push, Telegram, preferenze e cleanup. | Inbox, lettura/stato e subscription push del client. | Un port di dispatch con envelope, recipient/resolution outcome e contract test eseguiti da due implementazioni. |
| Titoli, copy e link del dominio familiare. | Modello e query di notifica editoriale. | Tipi di esito del delivery solo se due prodotti condividono la stessa semantica di successo/parziale/fallimento. |

## Criterio di riapertura

D3 può essere riaperta quando sono vere **tutte** le condizioni seguenti:

1. 67_ENT o un altro consumer pubblica eventi di dominio e risolve destinatari, non solo registra subscription o legge un’inbox.
2. Due dispatcher producono lo stesso input normalizzato e gli stessi esiti osservabili per delivery, inclusa la distinzione fra persistenza in-app e canale esterno.
3. I due adapter superano un contract test comune senza condividere SDK, token, URL, VAPID, bot o query di database.
4. Copy, link, preferenze, deduplica, retry e cleanup rimangono locali finché non hanno una semantica comune esplicita.
5. Il modulo `events` resta l’unico requisito core: il dispatcher, se mai promosso, deve essere un subscriber esterno e non un canale incorporato nel bus.

## Stato conclusivo del piano

L’ordine di estrazione iniziale è completato. Il core contiene soltanto i moduli sostenuti da riuso reale: primitive datetime/format, contratti comuni/catalogo/meal planning, eventi tipizzati con bus in-memory, coda operazioni e ledger seriale. Le altre ipotesi sono state trasformate in decisioni di non-promozione con criteri verificabili, così il prossimo lavoro può partire da evidenze e non da astrazioni speculative.
