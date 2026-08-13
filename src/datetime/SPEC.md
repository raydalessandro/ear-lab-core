# `datetime`

## Cos’è

`datetime` raccoglie primitive pure per lavorare con date locali senza introdurre una dipendenza implicita dal clock di sistema. Il primo elemento estratto è il calcolo del lunedì della settimana ISO, presente come pattern in La Famiglia e utile per viste settimanali in altri consumer.

## Cosa esporta

| Export | Firma | Comportamento |
|---|---|---|
| `startOfIsoWeek` | `(input: Date) => string` | Restituisce il lunedì della settimana ISO dell’input nel formato locale `YYYY-MM-DD`. |

## Decisioni chiuse

La funzione richiede una `Date` come argomento e non chiama `new Date()` internamente. In questo modo non dipende dal momento reale dell’esecuzione e può essere testata in modo deterministico. Il risultato è costruito con getter locali, non tramite `toISOString()`, per evitare spostamenti di giorno causati dalla conversione UTC vicino alla mezzanotte.

La funzione non modifica l’oggetto ricevuto: crea una copia prima di spostarsi al lunedì. Una data non valida produce `RangeError`, perché un valore silenziosamente formattato sarebbe un errore difficile da diagnosticare nei consumer.

## Esempi d’uso

```ts
import { startOfIsoWeek } from '@ear-lab/core/datetime';

startOfIsoWeek(new Date(2026, 0, 4, 12));
// "2025-12-29"

startOfIsoWeek(new Date(2026, 0, 5, 12));
// "2026-01-05"
```

## Cosa NON fa

Il modulo non interpreta stringhe di data, non converte timezone, non costruisce calendari mensili e non stabilisce convenzioni di dominio come festività, ricorrenze o disponibilità. Tali responsabilità rimangono nei consumer o in futuri moduli specifici.

## Changelog

| Versione | Modifica |
|---|---|
| 0.1.0 | Prima estrazione di `startOfIsoWeek` dal pattern di settimana locale. |
