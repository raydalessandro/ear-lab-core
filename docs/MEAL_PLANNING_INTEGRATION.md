# Proof-of-concept — Ricette Lab → La Famiglia

**Stato:** contratto da implementare nel branch `feat/extraction-foundations`.  
**Obiettivo:** far arrivare a La Famiglia un piano settimanale costruito in Ricette Lab senza condividere database, credenziali, tabelle o identificativi interni.

> **Principio.** Ricette Lab è proprietario del piano e delle informazioni culinarie al momento dell’esportazione. La Famiglia è proprietaria della copia che salva per una famiglia. Il passaggio è uno **snapshot validato**, non un collegamento live tra due database.

## Confini

| Responsabilità | Ricette Lab | Contratto `meal-planning` | La Famiglia |
|---|---|---|---|
| Scegliere ricette e varianti | Produce. | Trasporta i campi necessari. | Visualizza e può adattare la propria copia. |
| Calcolare brief, nutrienti e spesa | Produce se disponibili. | Li rende opzionali e tipizzati. | Li conserva come riferimento non fiscale. |
| Conoscere famiglia e autorizzazione | Non persiste identità della famiglia. | Non contiene `familyId` né token. | Risolve membro/famiglia dalla sessione e applica RLS. |
| Salvare il piano | Mantiene il proprio carrello/piano locale. | Non definisce una tabella. | Crea il proprio record e il proprio ID. |
| Evolvere una ricetta | È la fonte editoriale. | Trasporta uno snapshot minimo della ricetta. | Non deve richiedere un fetch live per mostrare il piano. |

## Oggetti del contratto

```text
MealPlanSnapshot
├── source                 identità e revisione del produttore
├── title                  titolo leggibile
├── period                 data iniziale e finale locali ISO (YYYY-MM-DD)
├── meals[]                pasti pianificati nel periodo
│   ├── recipe             slug e titolo snapshot
│   ├── variant?           id/nome snapshot se scelto
│   ├── scheduledFor       data locale ISO
│   ├── mealType           colazione/pranzo/merenda/aperitivo/cena
│   └── servings           porzioni positive
├── dailyBriefs[]?         preparazioni, tempi e nutrizione per giorno
└── shoppingList?          quantità, unità, categorie e fonti ricetta
```

Il `familyId`, l’utente, la sessione, l’URL target e la chiave bearer non appartengono allo snapshot. Quando Ricette Lab richiede il salvataggio, l’adapter del consumer incapsula lo snapshot in una `Operation` con `scope: { kind: 'family', id: ... }`, attore e chiave di idempotenza. L’adapter di La Famiglia ricava lo scope dalla propria sessione; non si fida di un’identità proveniente dal producer.

## Regole di validazione

| Regola | Motivo |
|---|---|
| Le date sono stringhe locali `YYYY-MM-DD` realmente esistenti. | Un menu è un calendario umano, non un timestamp UTC. |
| `endDate >= startDate`. | Un periodo inverso non è un piano. |
| Ogni `scheduledFor` cade nel periodo. | Impedisce pasti invisibili o fuori settimana. |
| Ogni combinazione data + tipo pasto è unica. | Il consumer riceve una pianificazione non ambigua. |
| Le porzioni e le quantità di spesa sono positive. | Blocca snapshot non utilizzabili. |
| Il costo stimato è facoltativo e non negativo. | È informazione di orientamento, mai contabile/fiscale. |
| Brief e lista spesa sono opzionali. | Un piano valido non dipende dalle parti arricchite. |

## Flusso del proof-of-concept

```text
Ricette Lab
  1. Compila MealPlanSnapshot.
  2. Valida lo snapshot tramite ear-lab-core.
  3. Invia una Operation idempotente al proprio adapter.

Adapter La Famiglia
  4. Risolve sessione e family scope localmente.
  5. Rivalida snapshot e operation.
  6. Crea un record meal_plans proprietario del consumer.
  7. Restituisce il nuovo ID locale senza esporre dettagli del DB.
```

## Fuori scope di questo incremento

Questo contratto non aggiunge route, migration, UI, webhook, sincronizzazione bidirezionale, fetch remoto di ricette, notifica o lista spesa attiva. Quelle saranno responsabilità degli adapter nei rispettivi repository dopo che il contratto sarà verde e una integrazione testabile verrà scelta.

## Fonti di analisi

Il modello proviene dal webhook proposto in `Ricette_Lab/famiglia_implementations/005-webhook-contract.md` e dalla migration proposta per `meal_plans`. Il clone corrente di La Famiglia non contiene ancora tale API o migration: per questo il core definisce un contratto, non dichiara l’integrazione già operativa.
