import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ChevronRight, Clock, Eye, ListChecks, PartyPopper, PenLine, Send, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '../api.ts';
import { Badge, Card, Loading, fmtDate, useLoad } from '../ui.tsx';

const ICON = { assessment: PenLine, review: Eye, publish: Send, calc: AlertTriangle, late: Clock, draft: CalendarDays, ack: Target };
const SHOW = 6;

/** "Tugas saya hari ini": antrean pekerjaan sesuai role, yang terlambat/tenggat terdekat di atas. */
export function TaskQueue({ title = 'Tugas saya hari ini' }: { title?: string }) {
  const { data, error, loading } = useLoad(() => api.get('/tasks'));
  const [all, setAll] = useState(false);
  const tasks = data?.tasks ?? [];
  const shown = all ? tasks : tasks.slice(0, SHOW);

  return (
    <div data-tour="tasks">
      <Card
        title={<span className="flex items-center gap-2"><ListChecks className="size-4 text-primary" />{title}</span>}
        actions={data && tasks.length > 0 && (
          <span className="flex items-center gap-1.5">
            {data.overdue > 0 && <Badge tone="red">{data.overdue} terlambat</Badge>}
            <Badge tone="blue">{tasks.length} tugas</Badge>
          </span>
        )}
      >
        <Loading loading={loading} error={error}>
          {tasks.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              <PartyPopper className="size-5 shrink-0" />
              <div><b className="block text-sm">Semua beres!</b><span className="text-xs opacity-80">Tidak ada tugas yang menunggu Anda saat ini.</span></div>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {shown.map((t) => {
                  const Icon = ICON[t.type] ?? ListChecks;
                  return (
                    <li key={t.id}>
                      <Link to={t.to} className="group flex items-center gap-3 rounded-lg px-1 py-2.5 text-foreground transition-colors hover:bg-muted/60">
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', t.overdue ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' : 'bg-accent text-accent-foreground')}><Icon className="size-4" /></span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <b className="block truncate text-[13.5px]">{t.title}</b>
                          <small className="block truncate text-xs text-muted-foreground">{t.subtitle}</small>
                        </span>
                        {t.due && (
                          <span className={cn('hidden shrink-0 text-xs sm:block', t.overdue ? 'font-bold text-red-600 dark:text-red-300' : 'text-muted-foreground')}>
                            {t.overdue ? 'Terlambat · ' : 'Tenggat '}{fmtDate(t.due)}
                          </span>
                        )}
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {tasks.length > SHOW && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setAll(!all)}>
                  {all ? 'Tampilkan lebih sedikit' : `Lihat ${tasks.length - SHOW} tugas lainnya`}
                </Button>
              )}
            </>
          )}
        </Loading>
      </Card>
    </div>
  );
}
