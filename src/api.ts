const KEY = 'fdp_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t?: string | null) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export class ApiError extends Error {
  status: number;
  details: any;
  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Kosong = origin yang sama (proxy Vite saat dev). Isi VITE_API_URL (mis. https://api.contoh.co.id) bila backend di domain lain. */
const API_BASE: string = (import.meta.env?.VITE_API_URL ?? '').replace(/\/+$/, '');

async function request(method: string, path: string, body?: any, raw?: boolean): Promise<any> {
  const res = await fetch(API_BASE + '/api' + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setToken(null);
    window.dispatchEvent(new Event('fdp-logout'));
  }
  if (!res.ok) {
    let j: any = {};
    try { j = await res.json(); } catch { /* bukan JSON */ }
    throw new ApiError(res.status, j.error || `Error ${res.status}`, j.details);
  }
  return raw ? res : res.json();
}

export const api = {
  get: <T = any>(p: string): Promise<T> => request('GET', p),
  post: <T = any>(p: string, b?: any): Promise<T> => request('POST', p, b ?? {}),
  put: <T = any>(p: string, b?: any): Promise<T> => request('PUT', p, b),
  patch: <T = any>(p: string, b?: any): Promise<T> => request('PATCH', p, b),
  del: <T = any>(p: string): Promise<T> => request('DELETE', p),
  download: async (p: string, filename?: string) => {
    const res = await request('GET', p, null, true);
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const qs = (o: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== '' && v != null && p.set(k, String(v)));
  const s = p.toString();
  return s ? '?' + s : '';
};
