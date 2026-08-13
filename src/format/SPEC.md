# `format`

## Cos’è

`format` contiene trasformazioni pure per rappresentare quantità e periodicità con la convenzione italiana. La prima estrazione proviene da Soldi Lab, ma non porta nel core né classificazioni patrimoniali né decisioni finanziarie.

## Cosa esporta

| Export | Firma | Comportamento |
|---|---|---|
| `formatEuro` | `(value: number) => string` | Formatta un valore finito come EUR italiano senza centesimi. |
| `formatEuroPrecise` | `(value: number) => string` | Formatta un valore finito come EUR italiano con la precisione predefinita di `Intl`. |
| `toMonthlyAmount` | `(value: number, frequency: Frequency) => number` | Normalizza un importo periodico in valore mensile. |
| `Frequency` | unione di frequenze standard | `monthly`, `bimonthly`, `quarterly`, `semiannual`, `annual`. |

## Decisioni chiuse

La valuta e il locale sono volutamente espliciti nell’API pubblica corrente: EUR e `it-IT`. Non introduciamo ancora un formatter universale con molte opzioni perché l’unico bisogno verificato in più consumer è la presentazione italiana in euro.

La funzione di normalizzazione riceve solo una frequenza temporale. Non sa se l’importo rappresenta un reddito, una spesa, un prezzo, un abbonamento o un piano di risparmio: tali significati restano nei domini che chiamano la funzione.

Ogni valore non finito viene rifiutato con `RangeError`. Accettare `NaN` o infinito produrrebbe una stringa o un calcolo apparentemente valido, ma impossibile da usare in modo affidabile a valle.

## Esempi d’uso

```ts
import {
  formatEuro,
  formatEuroPrecise,
  toMonthlyAmount,
} from '@ear-lab/core/format';

formatEuro(1234.56);
formatEuroPrecise(1234.56);
toMonthlyAmount(120, 'quarterly'); // 40
```

## Cosa NON fa

Il modulo non gestisce conversioni fra valute, inflazione, tassi, tasse, arrotondamenti contabili, calendari di fatturazione o etichette visuali di un prodotto. Non conserva state e non legge locale/configurazione dal browser.

## Changelog

| Versione | Modifica |
|---|---|
| 0.1.0 | Estratte le primitive EUR italiano e normalizzazione frequenza da Soldi Lab. |
