# C4 — Decisione di promozione: `lead-core`

**Stato:** non promosso nel core.  
**Branch della decisione:** `feat/lead-core-promotion-decision`.  
**Decisione:** mantenere il modello lead nel dominio Automotive finché non esiste un secondo verticale che acquisisca un prospect commerciale con consenso e audit equivalenti.

> **Condividere un modulo di consenso non significa condividere un lead.** Il consenso privacy di un preventivo, il consenso sanitario di un cliente e lo stato di una prenotazione rispondono a scopi, attori e dati differenti.

## Esito della verifica

| Sistema | Flusso osservato | Schema e consenso | Stato/audit | Compatibilità con Automotive |
|---|---|---|---|---|
| Automotive | Richiesta di preventivo per noleggio veicoli. | Ragione sociale, referente, telefono, business profile, privacy obbligatoria, marketing facoltativo, fonte e configurazione veicolo. | Transizione lead con autore e timestamp più riga di storia. | È il sistema sorgente. |
| Gestionale | Cliente già acquisito, appuntamenti e prescrizioni. | Consenso sanitario come gate per prescrizioni; consensi separati da quelli marketing. | Stati di appuntamento/prenotazione e persistenza di dominio sanitario. | Non compatibile: non è un prospect commerciale e tratta dati/scopi diversi. |
| California | Corpus narrativo e audit di integrità/schema/navigabilità/drift. | Nessun form di lead o consenso commerciale individuato. | Audit editoriale, non audit di acquisizione. | Non compatibile. |

## Invariante locale di Automotive

Automotive possiede un intake ricco e verticale: acquisisce dati personali e aziendali, segnali del fabbisogno di mobilità, configurazione del veicolo, fonte e pagina di provenienza. La validazione richiede esplicitamente il consenso privacy e conserva quello marketing come scelta separata.

La transizione commerciale produce due scritture: patch del lead con stato, autore e istante; riga di storia con lead, stato e autore. Gli esiti negativi hanno inoltre una tassonomia per il noleggio, con motivi, data di ricontatto e nota condizionale. Queste parti sono utili nel verticale Automotive, ma non sono ancora invarianti dimostrati da un altro verticale.

## Perché Gestionale non è il secondo consumer richiesto

Gestionale ha consensi e stati, ma lavora **dopo** l’acquisizione della persona come cliente. Il consenso sanitario abilita prescrizioni e richiede un trattamento di dominio diverso da una richiesta commerciale. Il contratto di appuntamento modifica disponibilità e prenotazioni; non rappresenta una pipeline lead né una proiezione di fonte/configurazione commerciale.

Forzare il consenso sanitario, le prenotazioni o il cliente nel core lead renderebbe meno chiari entrambi i sistemi e rischierebbe di confondere finalità e responsabilità. Il fatto che entrambe le applicazioni annotino chi/quando non basta a definire una stessa semantica di audit.

## Decisione di architettura

Non sono stati creati `Lead`, `Consent`, `LeadTransition`, `ConsentLog`, `LeadAudit` o adapter CRM nel core. Le funzioni pure `normalizzaIntake`, `pianoTransizione` e `validaDettagliPerso` restano nel dominio Automotive perché dipendono da lessico, configurazione e ciclo commerciale specifici.

| Resta in Automotive | Potrà entrare nel core dopo riuso reale |
|---|---|
| Campi flotta, forma giuridica, km, veicolo, configuratore e motivi di perdita. | Envelope minimo di prospect, contatto, fonte e consensi se adottato e testato da due verticali. |
| Stati commerciali, policy di ricontatto e dashboard lead. | Transizione pura con attore e istante se gli stessi stati/semantiche sono condivisi. |
| Route, Supabase, notifiche, UI e integrazione CRM. | Audit append-only o evento versionato soltanto con ownership e scopo equivalenti. |

## Criterio di riapertura

C4 può essere riaperta quando sono vere **tutte** le condizioni seguenti:

1. Un secondo verticale acquisisce un prospect commerciale prima della sua conversione a cliente e conserva almeno contatto, fonte, consenso alla privacy e stato commerciale.
2. I due consumer ratificano un vocabolario comune per consenso e stato, oppure mappano esplicitamente i propri valori in un envelope versionato senza payload opachi.
3. Entrambi testano lo stesso contratto per input valido/non valido, separazione fra consenso necessario e facoltativo, e audit con attore/istante.
4. Il core riceve solo record normalizzati: CRM, database, form, antispam, email, WhatsApp, UI e tassonomie verticali restano adapter locali.
5. I consensi con finalità speciali o dati particolari restano modelli locali finché non esiste una semantica condivisa esplicita.

## Prossimo passo consigliato

Le fasi C sono ora chiuse: C2 è stato promosso perché aveva due consumer verificati; C1, C3 e C4 hanno una decisione di non-promozione con condizioni di riapertura. Il prossimo incremento del piano è **D1 — repository ports**, da valutare fra Soldi Lab, La Famiglia e Gestionale separando interfacce pure da adapter Dexie, Supabase e in-memory.
