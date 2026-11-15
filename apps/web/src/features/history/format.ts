const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** e.g. "15 Nov, 20:48". */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** Total seconds as "3 h 12 min" or "48 min". */
export function formatListeningTime(totalSec: number): string {
  const minutes = Math.round(totalSec / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}
