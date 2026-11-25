/** pt-PT number formatting: decimal comma, narrow space for thousands ("2 400"). */
const oneDecimal = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatKg(value: number): string {
  return oneDecimal.format(value);
}

export function formatThousands(value: number): string {
  const rounded = Math.round(value);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** 84 → "01:24" */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Wall-clock time for chat bubbles: "14:05". */
export function formatTimeOfDay(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const weekday = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

/** "Terça, 24 de novembro" */
export function formatToday(date: Date): string {
  const text = weekday.format(date).replace('-feira', '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 20) return 'Boa tarde';
  return 'Boa noite';
}
