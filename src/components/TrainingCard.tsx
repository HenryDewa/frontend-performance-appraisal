import { toast } from 'sonner';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '../api.ts';
import { Badge, Card, Loading, fmtDate, useAction, useLoad } from '../ui.tsx';
import { todayWib } from '../lib/time.ts';
import { KindBadge, TRAIN_STATUS } from './career-common.tsx';

/** Training yang ditugaskan pada seorang karyawan. canManage = manajemen; isSelf = pemilik profil. */
export default function TrainingCard({ employeeId, canManage, isSelf, rev = 0, onChange }: { employeeId?: any; canManage?: any; isSelf?: any; rev?: number; onChange?: any }) {
  const list = useLoad(() => api.get(`/employees/${employeeId}/trainings`), [employeeId, rev]);
  const { busy, run } = useAction();
  const set = (t, status) => run(async () => {
    try {
      await api.patch(`/employee-trainings/${t.id}`, { status });
      toast.success('Status training diperbarui');
      onChange?.();
      list.reload();
    } catch (e) { toast.error(e.message); }
  });
  const rows = list.data ?? [];
  const todayStr = todayWib();
  return (
    <Card title="Training & pembelajaran" className="rounded-2xl">
      <Loading loading={list.loading} error={list.error}>
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Belum ada training yang ditugaskan.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((t) => {
              const [label, tone] = TRAIN_STATUS[t.status] ?? [t.status, 'gray'];
              const overdue = t.due_date && ['planned', 'in_progress'].includes(t.status) && String(t.due_date).slice(0, 10) < todayStr;
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5 transition-colors hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.title}</span>
                      <KindBadge kind={t.kind} />
                      <Badge tone={tone}>{label}</Badge>
                      {overdue && <Badge tone="red">Terlambat</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[t.provider, t.duration_hours != null && `${t.duration_hours} jam`, t.due_date && `tenggat ${fmtDate(t.due_date)}`, t.completed_at && `selesai ${fmtDate(t.completed_at)}`].filter(Boolean).join(' · ')}
                    </div>
                    {t.notes && <div className="mt-1 text-xs text-muted-foreground">{t.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.url && <Button asChild size="sm" variant="outline"><a href={t.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Buka</a></Button>}
                    {(isSelf || canManage) && t.status === 'planned' && <Button size="sm" disabled={busy} onClick={() => set(t, 'in_progress')}>Mulai</Button>}
                    {(isSelf || canManage) && t.status === 'in_progress' && <Button size="sm" disabled={busy} onClick={() => set(t, 'completed')}>Selesaikan</Button>}
                    {canManage && ['planned', 'in_progress'].includes(t.status) && <Button size="sm" variant="destructive" disabled={busy} onClick={() => set(t, 'cancelled')}>Batalkan</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Loading>
    </Card>
  );
}
