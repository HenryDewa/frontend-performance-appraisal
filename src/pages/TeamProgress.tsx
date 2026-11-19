import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Clock, Lock, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { PersonAvatar, SeniorityBadge } from '@/components/employee-ui.tsx';
import { api, qs } from '../api.ts';
import { Badge, Bar, Card, Loading, Page, SOURCE_LABEL, fmt, fmtDate, useLoad } from '../ui.tsx';
import { StatCard } from './Dashboard.tsx';

interface TeamAssessment { source: string; status: 'draft' | 'submitted'; project_name: string | null }
interface TeamEvaluation {
  status: string; published: boolean; final_score: number | null; classification: string | null;
  assessments_total: number; assessments_done: number; assessments: TeamAssessment[]; my_assessment: { id: number; status: 'draft' | 'submitted' } | null;
}
interface TeamMember { id: number; code: string; name: string; position: string; seniority: string; department: string; evaluation: TeamEvaluation | null }
interface TeamPeriod { id: number; name: string; start_date: string; end_date: string; deadline: string; status: string }
interface TeamOverview {
  periods: TeamPeriod[]; period: TeamPeriod | null; members: TeamMember[];
  summary: { members: number; in_period: number; published: number; complete: number; my_pending: number };
}

const STATUS_LABEL: Record<string, string> = {
  Assigned: 'Ditugaskan', 'In Progress': 'Sedang dinilai', Submitted: 'Menunggu review', 'Under Review': 'Sedang direview',
  'Needs Revision': 'Perlu revisi', Approved: 'Disetujui', Published: 'Dipublikasikan', Closed: 'Selesai',
};
const STATUS_TONE: Record<string, string> = {
  Assigned: 'gray', 'In Progress': 'blue', Submitted: 'amber', 'Under Review': 'amber', 'Needs Revision': 'red', Approved: 'blue', Published: 'green', Closed: 'green',
};

/** Tim saya (Tech Lead): progres penilaian anggota tim, dan hasil akhir hanya setelah dipublikasikan. */
export default function TeamProgress() {
  const [periodId, setPeriodId] = useState('');
  const { data, error, loading } = useLoad(() => api.get<TeamOverview>('/team/overview' + qs({ period_id: periodId })), [periodId]);
  const s = data?.summary;

  return (
    <Page title="Tim Saya" eyebrow="Evaluasi" actions={data && data.periods.length > 1 && (
      <FormSelect className="w-auto min-w-48" value={String(data.period?.id ?? '')} onChange={(e) => setPeriodId(e.target.value)} aria-label="Periode">
        {data.periods.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === 'active' ? ' (berjalan)' : ''}</option>)}
      </FormSelect>
    )}>
      <p className="-mt-2 mb-1 text-sm text-muted-foreground">Pantau progres penilaian anggota tim Anda. Skor akhir dan klasifikasi baru tampil setelah hasil dipublikasikan; skor per sumber penilai tidak ditampilkan agar penilaian tetap independen.</p>
      <Loading loading={loading && !data} error={error}>
        {data && s && (
          <>
            {data.members.length === 0 ? (
              <Card><p className="py-6 text-center text-sm text-muted-foreground">Belum ada karyawan yang menjadikan Anda Tech Lead. Hubungi HR untuk menetapkan anggota tim.</p></Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard icon={UsersRound} tone="blue" value={s.members} label="Anggota tim" sub={data.period ? `${s.in_period} ikut ${data.period.name}` : 'belum ada periode'} />
                  <StatCard icon={ClipboardCheck} tone="violet" value={`${s.complete}/${s.in_period}`} label="Semua penilai selesai" sub="seluruh penilaian sudah dikirim" />
                  <StatCard icon={CheckCircle2} tone="green" value={s.published} label="Hasil dipublikasikan" sub="skor akhir dapat dilihat" />
                  <StatCard icon={Clock} tone={s.my_pending > 0 ? 'amber' : 'green'} value={s.my_pending} label="Penilaian saya belum dikirim" sub={s.my_pending > 0 ? 'perlu Anda isi' : 'semua sudah Anda kirim'}
                    className={s.my_pending > 0 ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10 dark:ring-amber-500/20' : ''} />
                </div>

                {data.period && (
                  <Card title={data.period.name} actions={<span className="text-xs text-muted-foreground">{fmtDate(data.period.start_date)} – {fmtDate(data.period.end_date)} · tenggat {fmtDate(data.period.deadline)}</span>}>
                    <ul className="grid gap-3">
                      {data.members.map((m) => <MemberRow key={m.id} m={m} />)}
                    </ul>
                  </Card>
                )}
                {!data.period && <Card><p className="py-6 text-center text-sm text-muted-foreground">Belum ada periode berjalan yang memuat anggota tim Anda.</p></Card>}
              </>
            )}
          </>
        )}
      </Loading>
    </Page>
  );
}

function MemberRow({ m }: { m: TeamMember }) {
  const ev = m.evaluation;
  const pct = ev && ev.assessments_total ? (ev.assessments_done / ev.assessments_total) * 100 : 0;
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={m.name} className="size-10" />
          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-center gap-2"><b className="truncate">{m.name}</b><SeniorityBadge value={m.seniority} /></div>
            <div className="text-xs text-muted-foreground">{m.code} · {m.position}</div>
          </div>
        </div>
        {ev ? <Badge tone={STATUS_TONE[ev.status] ?? 'gray'}>{STATUS_LABEL[ev.status] ?? ev.status}</Badge> : <Badge tone="gray">Tidak ikut periode ini</Badge>}
      </div>

      {ev && (
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Penilaian terkirim <b className="text-foreground">{ev.assessments_done}/{ev.assessments_total}</b></span>
            </div>
            <Bar value={pct} />
            <div className="flex flex-wrap gap-1.5">
              {ev.assessments.map((a, i) => (
                <span key={i} title={`${SOURCE_LABEL[a.source] ?? a.source}${a.project_name ? ` — ${a.project_name}` : ''}: ${a.status === 'submitted' ? 'sudah dikirim' : 'belum dikirim'}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${a.status === 'submitted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-muted/40 text-muted-foreground'}`}>
                  {a.status === 'submitted' ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                  {SOURCE_LABEL[a.source] ?? a.source}{a.project_name ? ` · ${a.project_name}` : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            {ev.published && ev.final_score != null ? (
              <div className="text-right">
                <div className="text-2xl font-extrabold leading-none tracking-tight">{fmt(ev.final_score)}</div>
                {ev.classification && <div className="mt-1"><Badge>{ev.classification}</Badge></div>}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" />Skor tampil setelah dipublikasikan</div>
            )}
            {ev.my_assessment?.status === 'draft' && <Button asChild size="sm"><Link to={`/assessments/${ev.my_assessment.id}`}>Isi penilaian</Link></Button>}
          </div>
        </div>
      )}
    </li>
  );
}
