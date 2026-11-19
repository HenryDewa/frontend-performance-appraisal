import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Settings2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { api } from '../api.ts';
import { useAuth, isHR } from '../auth.tsx';
import { Badge, Card, ErrorBox, Field, Loading, Modal, Page, fmt, useAction, useLoad } from '../ui.tsx';
import { GapBadge, KindBadge, ScoreBar, SENIORITY_LABEL } from '../components/career-common.tsx';

function TargetsModal({ targets, onClose, onSaved }: { targets?: any; onClose?: any; onSaved?: any }) {
  const [f, setF] = useState({ junior: targets.junior, middle: targets.middle, senior: targets.senior });
  const { busy, error, run } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api.put('/gaps/targets', { junior: Number(f.junior), middle: Number(f.middle), senior: Number(f.senior) });
      toast.success('Target skor disimpan');
      onSaved();
    });
  };
  return (
    <Modal title="Atur target skor" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mb-3 text-sm text-muted-foreground">Target skor per seniority pada skala 1–5. Gap = target dikurangi skor indikator.</p>
        <div className="grid gap-x-4 sm:grid-cols-3">
          {Object.entries(SENIORITY_LABEL).map(([k, l]) => (
            <Field key={k} label={l}><Input type="number" min="1" max="5" step="0.1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></Field>
          ))}
        </div>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <Button disabled={busy}>Simpan</Button>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Gaps() {
  const { user } = useAuth();
  const periods = useLoad(() => api.get('/periods'));
  const [pid, setPid] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (pid || !periods.data?.length) return;
    setPid(String((periods.data.find((p) => p.status === 'closed') ?? periods.data[0]).id));
  }, [periods.data, pid]);

  const { data, error, loading, reload } = useLoad(() => (pid ? api.get(`/gaps/summary?period_id=${pid}`) : Promise.resolve(null)), [pid]);
  const indicators = data?.indicators ?? [];

  return (
    <Page
      eyebrow="Pengembangan"
      title="Analisis Gap Kompetensi"
      actions={(
        <>
          <FormSelect value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Periode" className="w-auto min-w-48">
            {(periods.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FormSelect>
          {isHR(user) && data && <Button variant="outline" onClick={() => setEditing(true)}><Settings2 className="size-4" /> Atur target skor</Button>}
        </>
      )}
    >
      <Loading loading={loading || periods.loading} error={error || periods.error}>
        {data && (
          <>
            <Card title="Rata-rata skor per indikator vs target" className="rounded-2xl"
              actions={<span className="flex items-center gap-1 text-xs text-muted-foreground"><Target className="size-3.5" /> Target: {Object.entries(data.targets).map(([k, v]) => `${SENIORITY_LABEL[k]} ${fmt(v)}`).join(' · ')}</span>}>
              {indicators.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hasil yang disetujui pada periode ini.</p> : (
                <ul className="space-y-4">
                  {indicators.map((i) => (
                    <li key={i.code} className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{i.name}</span>
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          <b>{fmt(i.avg_score)}</b><span className="text-muted-foreground">/ target {fmt(i.avg_target)}</span>
                          <span className="text-xs text-muted-foreground">{i.below_target_count} dari {i.total} di bawah target</span>
                          <GapBadge gap={i.avg_gap} />
                        </span>
                      </div>
                      <ScoreBar score={i.avg_score} target={i.avg_target} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Developer dengan gap terbesar" className="rounded-2xl">
                {data.employees.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada developer di bawah target.</p> : (
                  <ol className="divide-y">
                    {data.employees.map((e, n) => (
                      <li key={e.evaluation_id}>
                        <Link to={`/employees/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg py-2.5 transition-colors hover:bg-muted/50">
                          <span className="flex items-center gap-3">
                            <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-bold">{n + 1}</span>
                            <span>
                              <span className="block text-sm font-semibold">{e.name}</span>
                              <span className="block text-xs text-muted-foreground">{e.code} · {SENIORITY_LABEL[e.seniority] ?? e.seniority}{e.worst_indicator && ` · terlemah: ${e.worst_indicator.name}`}</span>
                            </span>
                          </span>
                          <Badge tone={e.total_gap >= 3 ? 'red' : 'amber'}>Total gap {fmt(e.total_gap)}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card title="Rekomendasi pembelajaran paling dibutuhkan" className="rounded-2xl">
                {data.recommended.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada rekomendasi untuk periode ini.</p> : (
                  <ul className="divide-y">
                    {data.recommended.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                        <span className="flex flex-wrap items-center gap-2 text-sm"><KindBadge kind={t.kind} /><span className="font-semibold">{t.title}</span></span>
                        <Badge tone="blue">{t.needed_by} developer</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-muted-foreground">Menghitung training aktif yang cocok dengan indikator di bawah target dan belum ditugaskan.</p>
              </Card>
            </div>
          </>
        )}
      </Loading>
      {editing && data && <TargetsModal targets={data.targets} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
    </Page>
  );
}
