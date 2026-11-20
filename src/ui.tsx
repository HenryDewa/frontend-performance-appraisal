import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Card as UiCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export function useLoad<T = any>(fn: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<{ data: T | null; error: any; loading: boolean }>({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const reload = useCallback(() => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => n === seq.current && setState({ data, error: null, loading: false }))
      .catch((error) => n === seq.current && setState({ data: null, error, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(reload, [reload]);
  return { ...state, reload };
}

export const ErrorBox = ({ error, className }: { error?: any; className?: any }) =>
  error ? (
    <Alert variant="destructive" className={cn('my-3 border-destructive/30 bg-destructive/5', className)}>
      <AlertCircle />
      <AlertDescription className="text-destructive">{error.message || String(error)}</AlertDescription>
    </Alert>
  ) : null;

export function Loading({ loading, error, children }: { loading?: any; error?: any; children?: React.ReactNode }) {
  if (error) return <ErrorBox error={error} />;
  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-label="Memuat">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }
  return children;
}

export const Page = ({ title, eyebrow, actions, children }: { title?: any; eyebrow?: any; actions?: any; children?: React.ReactNode }) => (
  <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </section>
);

export const Card = ({ title, children, actions, className }: { title?: any; children?: React.ReactNode; actions?: any; className?: any }) => (
  <UiCard className={cn('gap-4 py-5 shadow-sm', className)}>
    {(title || actions) && (
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
    )}
    <CardContent>{children}</CardContent>
  </UiCard>
);

export function Modal({ title, onClose, children, wide }: { title?: any; onClose?: any; children?: React.ReactNode; wide?: any }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn('no-scrollbar max-h-[90vh] overflow-y-auto', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function Drawer({ title, onClose, children, wide }: { title?: any; onClose?: any; children?: React.ReactNode; wide?: any }) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className={cn('no-scrollbar w-full gap-0 overflow-y-auto bg-card', wide ? 'sm:max-w-4xl' : 'sm:max-w-2xl')}>
        <SheetHeader className="border-b bg-card">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{title}</SheetDescription>
        </SheetHeader>
        <div className="bg-card p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export const Field = ({ label, hint, children, className }: { label?: any; hint?: any; children?: React.ReactNode; className?: any }) => (
  <label className={cn('mb-3 grid gap-1.5', className)}>
    <span className="text-[13px] font-semibold">{label}</span>
    {children}
    {hint && <small className="text-xs text-muted-foreground">{hint}</small>}
  </label>
);

const TONE: Record<string, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  red: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  gray: 'border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};
const STATUS_CLS: Record<string, string> = {
  Draft: 'gray', Assigned: 'blue', 'In Progress': 'blue', Submitted: 'amber', 'Under Review': 'amber',
  'Needs Revision': 'red', Approved: 'green', Published: 'green', Closed: 'gray',
  draft: 'gray', active: 'green', closed: 'gray', submitted: 'green', completed: 'green', cancelled: 'gray', inactive: 'gray',
  'Top Performer': 'green', 'Middle Performer': 'amber', 'Low Performer': 'red', pip: 'red', development: 'blue',
};
/** Badge status/klasifikasi; `tone` memaksa warna (green|amber|red|blue|gray). */
export const Badge = ({ children, tone, className }: { children?: React.ReactNode; tone?: any; className?: any }) => (
  <UiBadge variant="outline" className={cn('gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[tone || STATUS_CLS[children as string] || 'gray'], className)}>
    <span className="size-1.5 rounded-full bg-current" />
    {children}
  </UiBadge>
);

export const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 }));
/** Tanggal tampilan DD-MM-YYYY dari 'YYYY-MM-DD' (atau datetime). Penyimpanan dan pengiriman ke API tetap YYYY-MM-DD. */
export const fmtDate = (s) => {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s ? String(s) : '—';
};
/** DD-MM-YYYY HH:MM[:SS] dari 'YYYY-MM-DD HH:MM:SS'. */
export const fmtDateTime = (s) => {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/.exec(String(s)) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : fmtDate(s);
};
export const SOURCE_LABEL = { tech_lead: 'Tech Lead / EM', project_manager: 'Project Manager', client: 'Client', self: 'Self-assessment', metrics: 'Objective Metrics' };

/** Jalankan aksi async dengan state busy + error. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const run = async <T,>(fn: () => Promise<T> | T): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try { return await fn(); } catch (e) { setError(e); return undefined; } finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}

export const Bar = ({ value, max = 100, label, className }: { value?: any; max?: number; label?: any; className?: any }) => (
  <Progress value={Math.min(100, (value / max) * 100)} title={label} className={cn('h-2 min-w-20', className)} />
);

/** Teks kecil redup yang sering dipakai. */
export const Muted = ({ children, className }: { children?: React.ReactNode; className?: any }) => <span className={cn('text-xs text-muted-foreground', className)}>{children}</span>;
