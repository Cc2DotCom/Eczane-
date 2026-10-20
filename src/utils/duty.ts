/**
 * Nöbet günü sabah 09:00'da değişir (e-Devlet listelerinde nöbet 09:00'da biter). Gece 03:00'te bakan biri hâlâ
 * önceki günün nöbetçisini görmeli. Biçim YYYY-AA-GG; scripts/update-duty.mjs ile aynı kural.
 */
const SHIFT_HOUR = 9;
const SHIFT_MINUTE = 0;

export function dutyDayKey(now = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < SHIFT_HOUR || (d.getHours() === SHIFT_HOUR && d.getMinutes() < SHIFT_MINUTE)) {
    d.setDate(d.getDate() - 1);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dutyDayLabel(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  return fmt.format(now);
}

/** "2026-10-20T19:00:00+03:00", "2026-10-21T09:00:00+03:00" → "19:00 – yarın 09:00" */
export function dutyWindow(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const time = (iso: string) => iso.slice(11, 16);
  const sameDay = start.slice(0, 10) === end.slice(0, 10);
  return `${time(start)} – ${sameDay ? '' : 'ertesi gün '}${time(end)}`;
}

export function relativeTime(ts: number, now = Date.now()): string {
  const min = Math.round((now - ts) / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const h = Math.round(min / 60);
  return `${h} sa önce`;
}
