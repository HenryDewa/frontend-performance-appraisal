import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { Badge, Bar, Card, Loading, fmt, useLoad } from '../ui.tsx';

/** Jalur karier: stepper level + kesiapan naik level. */
export default function CareerCard({ employeeId, rev = 0 }: { employeeId?: any; rev?: number }) {
  const { data, loading, error } = useLoad(() => api.get(`/employees/${employeeId}/career`), [employeeId, rev]);
  const levels = data?.levels ?? [];
  const cur = data?.current_level;
  const next = data?.next_level;
  const r = data?.readiness;
  const curIdx = levels.findIndex((l) => l.id === cur?.id);
  return (
    <Card title="Jalur karier" className="rounded-2xl">
      <Loading loading={loading} error={error}>
        {levels.length === 0 ? <p className="text-sm text-muted-foreground">Level karier belum dikonfigurasi.</p> : (
          <div className="space-y-5">
            <ol className="grid gap-4 sm:grid-flow-col sm:auto-cols-fr sm:gap-0">
              {levels.map((l, i) => {
                const done = curIdx >= 0 && i < curIdx;
                const isCur = i === curIdx;
                return (
                  <li key={l.id} className="relative sm:px-2 sm:text-center">
                    {i > 0 && <span aria-hidden className={cn('absolute left-0 top-4 hidden h-0.5 w-1/2 sm:block', done || isCur ? 'bg-primary' : 'bg-border')} />}
                    {i < levels.length - 1 && <span aria-hidden className={cn('absolute right-0 top-4 hidden h-0.5 w-1/2 sm:block', done ? 'bg-primary' : 'bg-border')} />}
                    <div className="flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2">
                      <span className={cn('relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold', done ? 'border-primary bg-primary text-primary-foreground' : isCur ? 'border-primary bg-card text-primary ring-4 ring-primary/15' : 'border-border bg-card text-muted-foreground')}>
                        {done ? <Check className="size-4" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className={cn('text-sm font-semibold', !isCur && !done && 'text-muted-foreground')}>{l.name}</div>
                        {isCur && <div className="mt-1"><Badge tone="blue">Level saat ini</Badge></div>}
                        {isCur && l.expectations.length > 0 && (
                          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-left text-xs text-muted-foreground">{l.expectations.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {!cur && <p className="text-sm text-muted-foreground">Level karier saat ini belum dapat dipetakan dari seniority.</p>}
            {cur && !next && <p className="text-sm text-muted-foreground">Sudah berada di level tertinggi dalam jalur ini.</p>}
            {next && r && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Kesiapan menuju {next.name}</div>
                  <Badge tone={r.met_all ? 'green' : 'amber'}>{r.met_all ? 'Memenuhi syarat' : `${r.progress_pct}%`}</Badge>
                </div>
                <Bar value={r.progress_pct} />
                <ul className="mt-3 space-y-1.5 text-sm">
                  {r.checks.map((c) => (
                    <li key={c.key} className="flex items-start gap-2">
                      {c.met ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                      <span>{c.label} <span className="text-muted-foreground">(saat ini {fmt(c.current)}{c.key === 'tenure' ? ' bulan' : ''})</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Berdasarkan {r.evaluations_considered} evaluasi terakhir yang terlihat.</p>
              </div>
            )}
          </div>
        )}
      </Loading>
    </Card>
  );
}
