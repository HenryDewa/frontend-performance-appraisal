// Zona waktu aplikasi = WIB (UTC+7), sama dengan DB_TIMEZONE di backend. Semua tanggal/jam dari server adalah jam WIB tanpa penanda zona,
// dan "hari ini" harus mengikuti WIB, bukan zona browser dan bukan UTC (toISOString memberi tanggal kemarin antara 00:00-07:00 WIB).
const OFFSET = '+07:00';
const OFFSET_MS = 7 * 3600_000;

/** Tanggal hari ini (YYYY-MM-DD) menurut WIB. */
export const todayWib = (): string => new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 10);

/** Tanggal (YYYY-MM-DD) n hari dari hari ini menurut WIB; n negatif = ke belakang. */
export const addDaysWib = (n: number): string => new Date(Date.now() + OFFSET_MS + n * 86400_000).toISOString().slice(0, 10);

/** Ubah string waktu dari server ('YYYY-MM-DD HH:MM:SS' = jam WIB, atau ISO ber-zona) menjadi Date yang benar. */
export function parseServerTime(s: string | number | Date): Date {
  if (s instanceof Date || typeof s === 'number') return new Date(s);
  const v = String(s).trim().replace(' ', 'T');
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(v) || !v.includes('T') ? v : v + OFFSET);
}
