import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '../api.ts';
import { Badge, Card, Loading, fmt, useLoad } from '../ui.tsx';
import { AssignTrainingModal, GapBadge, KindBadge, ScoreBar } from './career-common.tsx';

/** Gap kompetensi (skor vs target) + rekomendasi pembelajaran. */
export default function GapCard({ employeeId, canManage, rev = 0, onChange }: { employeeId?: any; canManage?: any; rev?: number; onChange?: any }) {
  const { data, loading, error } = useLoad(() => api.get(`/employees/${employeeId}/gaps`), [employeeId, rev]);
  const [assign, setAssign] = useState<any>(null);
  const gaps = data?.gaps ?? [];
  return (
    <Card title="Gap kompetensi & rekomendasi" className="rounded-2xl"
      actions={data?.evaluation && <span className="text-xs text-muted-foreground">{data.evaluation.period} · target {fmt(data.targets?.[data.evaluation.seniority])}</span>}>
      <Loading loading={loading} error={error}>
        {!data?.evaluation ? <p className="text-sm text-muted-foreground">Belum ada hasil evaluasi yang dapat dianalisis.</p> : (
          <ul className="space-y-5">
            {gaps.map((g) => (
              <li key={g.code} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{g.name}</span>
                  <span className="flex items-center gap-2 text-sm">
                    <b>{fmt(g.score)}</b><span className="text-muted-foreground">/ target {fmt(g.target)}</span>
                    {g.delta != null && g.delta !== 0 && <span className={g.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{g.delta > 0 ? '▲' : '▼'} {fmt(Math.abs(g.delta))}</span>}
                    <GapBadge gap={g.gap} />
                  </span>
                </div>
                <ScoreBar score={g.score} target={g.target} />
                {g.gap > 0 && g.weak_subs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Sub-indikator lemah:</span>
                    {g.weak_subs.map((s) => <Badge key={s.name} tone="amber">{s.name} ({fmt(s.score)})</Badge>)}
                  </div>
                )}
                {g.recommendations.length > 0 && (
                  <ul className="space-y-1.5 rounded-xl bg-muted/40 p-2.5">
                    {g.recommendations.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="flex flex-wrap items-center gap-2"><KindBadge kind={t.kind} /><span>{t.title}</span>{t.duration_hours != null && <span className="text-xs text-muted-foreground">{t.duration_hours} jam</span>}</span>
                        {canManage && <Button size="sm" variant="outline" onClick={() => setAssign(t)}><Plus className="size-3.5" /> Tambahkan ke rencana</Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Loading>
      {assign && <AssignTrainingModal training={assign} employeeId={employeeId} onClose={() => setAssign(null)} onDone={onChange} />}
    </Card>
  );
}
