import { useEffect, useState } from 'react';

/** Nilai yang baru berubah setelah `ms` tanpa perubahan baru; dipakai agar pencarian tidak memanggil API di setiap ketikan. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
