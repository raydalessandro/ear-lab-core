/**
 * Restituisce il lunedì della settimana ISO della data locale ricevuta.
 *
 * La funzione non usa `toISOString()`: quella conversione passa da UTC e può
 * spostare il giorno vicino alla mezzanotte nei consumer europei. Il tempo è
 * un input esplicito per rendere la funzione deterministica e testabile.
 */
export function startOfIsoWeek(input: Date): string {
  if (Number.isNaN(input.getTime())) {
    throw new RangeError('input deve essere una data valida');
  }

  const monday = new Date(input.getTime());
  const weekday = monday.getDay();
  const daysUntilMonday = weekday === 0 ? -6 : 1 - weekday;

  monday.setDate(monday.getDate() + daysUntilMonday);

  return formatLocalIsoDate(monday);
}

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
