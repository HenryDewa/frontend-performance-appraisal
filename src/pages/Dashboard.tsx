import { useState } from 'react';
import type { Department, DepartmentSummary } from '../types.ts';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Award, BarChart3, CheckCircle2, ClipboardList, Clock, Crown, Eye, LayoutDashboard, Send, Sparkles, Target, TrendingUp, Users,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { TaskQueue } from '@/components/TaskQueue';
import { PersonAvatar } from '@/components/employee-ui.tsx';
import type { TeamMember, TeamOverview } from './TeamProgress.tsx';
import { todayWib } from '../lib/time.ts';
import { api, qs } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Badge, Bar, Card, Loading, Page, fmt, fmtDate, useLoad } from '../ui.tsx';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'employee') return <EmployeeDashboard />;
  if (['super_admin', 'hr', 'engineering_manager'].includes(user.role)) return <ManagementDashboard />;
  if (user.role === 'tech_lead') return <TechLeadDashboard />;
  return <TaskDashboard />; // PM / client: fokus pada tugas penilaian
}

function TaskDashboard() {
  const { user } = useAuth();
  return (
    <Page title="Ringkasan Dashboard" eyebrow={`Selamat bekerja, ${user.name.split(' ')[0]}`}>
      <TaskQueue />
      <Card title="Pintasan">
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/my-evaluations">Buka My Evaluations</Link></Button>
          {user.employee_id && (
            <>
              <Button asChild variant="outline"><Link to="/results">Hasil Saya</Link></Button>
              <Button asChild variant="outline"><Link to={`/employees/${user.employee_id}`}>Profil & Karier Saya</Link></Button>
              <Button asChild variant="outline"><Link to="/dev-plans">Rencana Pengembangan</Link></Button>
            </>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Tekan Ctrl+K untuk mencari penilaian atau berpindah halaman dengan cepat.</p>
      </Card>
    </Page>
  );
}

const TONES = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/30',
  green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
  amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
  red: 'from-rose-500 to-red-600 shadow-rose-500/30',
  violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  cyan: 'from-cyan-500 to-sky-600 shadow-cyan-500/30',
};

export function StatCard({ icon: Icon, tone, value, label, sub, delta, className = '' }: { icon?: any; tone?: any; value?: any; label?: any; sub?: any; delta?: any; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-[28px] font-extrabold leading-none tracking-tight">{value}</div>
        </div>
        <div className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${TONES[tone]}`}><Icon className="size-5" /></div>
      </div>
      <div className="mt-3 flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold ${delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} dark:bg-emerald-500/10 dark:bg-red-500/10 dark:text-emerald-300 dark:text-red-300`}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{fmt(Math.abs(delta))}
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}

const CLASS_COLOR = { 'Top Performer': '#12b76a', 'Middle Performer': '#f79009', 'Low Performer': '#f04438' };

function Donut({ entries }: { entries?: any }) {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">Belum ada data.</p>;
  let acc = 0;
  const stops = entries.map(([k, v]) => {
    const a = (acc / total) * 100; acc += v; const b = (acc / total) * 100;
    return `${CLASS_COLOR[k] || '#94a3b8'} ${a}% ${b}%`;
  }).join(', ');
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="grid size-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label="Distribusi klasifikasi">
        <div className="grid size-24 place-items-center rounded-full bg-card text-center leading-tight">
          <div><b className="block text-2xl font-extrabold">{total}</b><span className="text-xs text-muted-foreground">Developer</span></div>
        </div>
      </div>
      <div className="grid min-w-48 flex-1 gap-2.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-2">
            <Badge>{k}</Badge>
            <span className="text-[13px]"><b>{v}</b> <span className="text-muted-foreground">({Math.round((v / total) * 100)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIPELINE = [
  ['Assigned', 'bg-slate-400'], ['In Progress', 'bg-blue-400'], ['Needs Revision', 'bg-rose-400'], ['Submitted', 'bg-amber-400'],
  ['Under Review', 'bg-orange-400'], ['Approved', 'bg-emerald-400'], ['Published', 'bg-emerald-600'], ['Closed', 'bg-slate-600'],
];

function Pipeline({ counts }: { counts?: any }) {
  const total = Object.values<number>(counts).reduce((s, n) => s + n, 0);
  if (!total) return <p className="text-sm text-muted-foreground">Belum ada data.</p>;
  return (
    <div>
      <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label="Pipeline status evaluasi">
        {PIPELINE.filter(([k]) => counts[k]).map(([k, c]) => <div key={k} className={c} style={{ width: `${(counts[k] / total) * 100}%` }} title={`${k}: ${counts[k]}`} />)}
      </div>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {PIPELINE.filter(([k]) => counts[k]).map(([k, c]) => (
          <div key={k} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2"><i className={`size-2.5 rounded-full ${c}`} />{k}</span><b>{counts[k]}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data?: any }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Belum ada hasil yang disetujui.</p>;
  const W = 560, H = 190, padX = 36, padTop = 18, padBot = 30;
  const scores = data.map((t) => t.avg_score);
  const lo = Math.max(0, Math.floor((Math.min(...scores) - 10) / 10) * 10);
  const hi = 100;
  const x = (i) => (data.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (data.length - 1));
  const y = (v) => padTop + ((hi - v) / (hi - lo)) * (H - padTop - padBot);
  const pts = data.map((t, i) => [x(i), y(t.avg_score)]);
  const line = pts.map(([a, b]) => `${a},${b}`).join(' ');
  const area = `${pts[0][0]},${H - padBot} ${line} ${pts[pts.length - 1][0]},${H - padBot}`;
  const grid = [lo, lo + (hi - lo) / 2, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik tren skor rata-rata per periode">
      <defs>
        <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
          <text x={padX - 8} y={y(g) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{Math.round(g)}</text>
        </g>
      ))}
      {data.length > 1 && <polygon points={area} fill="url(#trend-fill)" />}
      {data.length > 1 && <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map(([a, b], i) => (
        <g key={data[i].period_id}>
          <circle cx={a} cy={b} r="5" className="fill-card" stroke="#2563eb" strokeWidth="2.5" />
          <text x={a} y={b - 11} textAnchor="middle" className="fill-foreground text-[11px] font-bold">{fmt(data[i].avg_score)}</text>
          <text x={a} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">{data[i].period}</text>
        </g>
      ))}
    </svg>
  );
}

const scoreTone = (v) => (v >= 4 ? 'bg-emerald-500' : v >= 3 ? 'bg-amber-500' : 'bg-red-500');

export function IndicatorBars({ items }: { items?: any }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Belum ada hasil yang disetujui.</p>;
  const sorted = [...items].sort((a, b) => b.avg - a.avg);
  return (
    <div className="space-y-3">
      {sorted.map((i, idx) => (
        <div key={i.code}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="flex items-center gap-2 font-medium">
              {i.name}
              {idx === 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Terkuat</span>}
              {idx === sorted.length - 1 && sorted.length > 1 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">Perlu ditingkatkan</span>}
            </span>
            <b>{fmt(i.avg)}<span className="font-normal text-muted-foreground">/5</span></b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${scoreTone(i.avg)}`} style={{ width: `${(i.avg / 5) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function RankList({ rows, empty, tone }: { rows?: any; empty?: any; tone?: any }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link to={`/evaluations/${r.id}`} className="flex items-center gap-3 rounded-xl p-2 text-foreground transition-colors hover:bg-muted/60">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${tone === 'top' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} dark:bg-emerald-500/10 dark:bg-red-500/10 dark:text-emerald-300 dark:text-red-300`}>{tone === 'top' && i === 0 ? <Crown className="size-4" /> : i + 1}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-[13.5px]">{r.name}</b>
              <small className="text-xs text-muted-foreground">{r.code} · {r.seniority} · {r.period_name}</small>
            </span>
            <span className="text-right leading-tight"><b className="block text-base">{fmt(r.final_score)}</b><Badge className="mt-0.5">{r.classification}</Badge></span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

const ACTION_LABEL = {
  submitted: 'semua penilaian masuk', approved: 'menyetujui', returned: 'mengembalikan untuk revisi', published: 'mempublikasikan hasil',
  review_started: 'memulai review', started: 'mulai menilai', reopened: 'membuka kembali penilaian', revised: 'merevisi hasil', closed: 'menutup evaluasi',
};
const ACTION_DOT = { approved: 'bg-emerald-500', published: 'bg-emerald-600', returned: 'bg-red-500', revised: 'bg-red-500', submitted: 'bg-amber-500' };

function Activity_({ rows }: { rows?: any }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>;
  return (
    <ul className="relative space-y-4 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-border">
      {rows.map((r) => (
        <li key={r.id} className="relative pl-6">
          <i className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-card ${ACTION_DOT[r.action] ?? 'bg-blue-500'}`} />
          <div className="text-[13px] leading-snug">
            <b>{r.actor_name ?? 'Sistem'}</b> {ACTION_LABEL[r.action] ?? r.action} — <Link className="font-medium" to={`/evaluations/${r.evaluation_id}`}>{r.employee_name}</Link>
          </div>
          <div className="text-xs text-muted-foreground">{fmtDate(r.at)}{r.note ? ` · “${r.note}”` : ''}</div>
        </li>
      ))}
    </ul>
  );
}

function ManagementDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'analitik' ? 'analitik' : 'ringkasan';
  const setTab = (v) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'ringkasan') next.delete('tab'); else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };
  const [f, setF] = useState({ period_id: '', department: '', seniority: '', project_id: '', client_id: '', tech_stack: '', classification: '', status: '' });

  return (
    <Page title="Ringkasan Dashboard" eyebrow="Penilaian kinerja karyawan — Frontend Developer">
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="max-w-full">
          <TabsTrigger value="ringkasan" className="px-3"><LayoutDashboard />Ringkasan</TabsTrigger>
          <TabsTrigger value="analitik" className="px-3"><BarChart3 />Analitik</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan"><RingkasanTab onOpenAnalytics={() => setTab('analitik')} /></TabsContent>
        <TabsContent value="analitik"><AnalitikTab f={f} setF={setF} /></TabsContent>
      </Tabs>
    </Page>
  );
}

function RingkasanTab({ onOpenAnalytics }: { onOpenAnalytics?: any }) {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(() => api.get('/dashboard'), []);
  const reviewer = ['super_admin', 'engineering_manager'].includes(user.role);
  const publisher = ['super_admin', 'hr'].includes(user.role);
  const trend = data?.trend ?? [];
  const delta = trend.length > 1 ? trend[trend.length - 1].avg_score - trend[trend.length - 2].avg_score : null;
  const toReview = (data?.status_counts?.Submitted ?? 0) + (data?.status_counts?.['Under Review'] ?? 0);
  const toPublish = data?.status_counts?.Approved ?? 0;

  return (
    <div className="space-y-4">
      <section className="space-y-3" aria-label="Perlu tindakan">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Perlu tindakan</h2>
        <TaskQueue />
        {data && (data.low_without_plan > 0 || toReview > 0 || toPublish > 0) && (
          <div className="grid gap-3 md:grid-cols-3">
            {toReview > 0 && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/30">
                <Eye className="text-blue-700 dark:text-blue-300" />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-blue-800 dark:text-blue-300">
                  <span><b>{toReview}</b> evaluasi menunggu review</span>
                  {reviewer && <Button asChild size="sm"><Link to="/evaluations?filter=review">Buka antrean</Link></Button>}
                </AlertDescription>
              </Alert>
            )}
            {toPublish > 0 && (
              <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30">
                <Send className="text-emerald-700 dark:text-emerald-300" />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-emerald-800 dark:text-emerald-300">
                  <span><b>{toPublish}</b> hasil sudah disetujui, siap dipublikasikan</span>
                  {publisher && <Button asChild size="sm"><Link to="/evaluations?filter=publish">Buka daftar</Link></Button>}
                </AlertDescription>
              </Alert>
            )}
            {data.low_without_plan > 0 && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30">
                <AlertTriangle className="text-amber-700 dark:text-amber-300" />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-800 dark:text-amber-300">
                  <span><b>{data.low_without_plan}</b> Low Performer belum memiliki tindak lanjut (development plan/PIP)</span>
                  <Button asChild size="sm" variant="outline"><Link to="/dev-plans">Buka dev plan</Link></Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </section>

      <Loading loading={loading && !data} error={error}>
        {data && (
          <section className="space-y-3" aria-label="KPI utama">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Users} tone="blue" value={data.active_employees} label="Frontend Developer aktif" sub="karyawan berstatus aktif" />
              <StatCard icon={CheckCircle2} tone="violet" value={`${fmt(data.completion_pct)}%`} label="Evaluasi selesai" sub={<span className="w-full"><Bar value={data.completion_pct} /></span>} />
              <StatCard icon={Activity} tone="green" value={fmt(data.avg_score)} label="Rata-rata skor (approved)" delta={delta} sub={delta != null ? 'vs periode sebelumnya' : 'dari hasil disetujui'} />
              <StatCard
                icon={Clock}
                tone={data.late > 0 ? 'red' : 'amber'}
                value={data.late}
                label="Evaluasi terlambat"
                sub={data.late > 0 ? 'lewat tenggat, perlu ditindaklanjuti' : 'lewat tenggat, belum dikirim'}
                className={data.late > 0 ? 'border-red-300 bg-red-50/60 ring-1 ring-red-200 dark:border-red-500/40 dark:bg-red-500/10 dark:ring-red-500/20' : ''}
              />
            </div>
            <div>
              <Button variant="link" className="h-auto p-0" onClick={onOpenAnalytics}>Lihat analitik lengkap →</Button>
            </div>
          </section>
        )}
      </Loading>

      {['super_admin', 'hr'].includes(user.role) && <TalentSection />}
    </div>
  );
}

interface TalentOverview {
  employees: number; with_skills: number; without_skills: number; with_certs: number; available: number;
  skills: { distinct: number; entries: number; by_level: Record<'dasar' | 'praktisi' | 'mahir', number> };
  top_skills: { skill: string; total: number; mahir: number }[];
  rare_skills: number;
  certifications: { total: number; by_kind: { sertifikasi: number; training: number }; this_year: number; last_90_days: number };
  recent_certifications: { id: number; kind: 'sertifikasi' | 'training'; title: string; date: string; employee_id: number; name: string; department: string }[];
}

/** Ringkasan skill dan sertifikasi seluruh karyawan aktif untuk HR/Super Admin (bahan pemetaan kebutuhan resource). */
function TalentSection() {
  const { data, error, loading } = useLoad(() => api.get<TalentOverview>('/talent/overview'), []);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  return (
    <section className="space-y-3" aria-label="Skill dan sertifikasi">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Skill & sertifikasi tim</h2>
        <Button asChild variant="link" className="h-auto p-0"><Link to="/talent">Buka pemetaan skill →</Link></Button>
      </div>
      <Loading loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Sparkles} tone="violet" value={`${fmt(pct(data.with_skills, data.employees))}%`} label="Karyawan sudah mengisi skill" sub={<span className="w-full"><Bar value={pct(data.with_skills, data.employees)} /></span>} />
              <StatCard icon={Target} tone="blue" value={data.skills.distinct} label="Skill berbeda tercatat" sub={`${data.skills.entries} isian · ${data.rare_skills} skill hanya dimiliki 1 orang`} />
              <StatCard icon={Award} tone="green" value={data.certifications.this_year} label="Sertifikasi & training tahun ini" sub={`${data.certifications.by_kind.sertifikasi} sertifikasi · ${data.certifications.by_kind.training} training (semua waktu)`} />
              <StatCard
                icon={Users}
                tone={data.without_skills > 0 ? 'amber' : 'green'}
                value={data.without_skills}
                label="Belum mengisi skill"
                sub={`${data.available} karyawan belum punya project aktif`}
                className={data.without_skills > 0 ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10 dark:ring-amber-500/20' : ''}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Skill terbanyak" actions={<Sparkles className="size-4 text-muted-foreground" />}>
                {data.top_skills.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada skill yang diisi karyawan.</p> : (
                  <ul className="grid gap-2.5">
                    {data.top_skills.map((t) => (
                      <li key={t.skill} className="grid gap-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm"><b className="truncate">{t.skill}</b><span className="shrink-0 text-xs text-muted-foreground">{t.total} orang · {t.mahir} mahir</span></div>
                        <Bar value={pct(t.total, data.employees)} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Dasar <b className="text-foreground">{data.skills.by_level.dasar}</b></span>
                  <span>Praktisi <b className="text-foreground">{data.skills.by_level.praktisi}</b></span>
                  <span>Mahir <b className="text-foreground">{data.skills.by_level.mahir}</b></span>
                  <span>(seluruh isian skill)</span>
                </div>
              </Card>
              <Card title="Sertifikasi & training terbaru" actions={<Award className="size-4 text-muted-foreground" />}>
                {data.recent_certifications.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada sertifikasi atau training yang dicatat.</p> : (
                  <ul className="divide-y">
                    {data.recent_certifications.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{c.title}</div>
                          <div className="text-xs text-muted-foreground"><Link to={`/employees/${c.employee_id}`} className="hover:text-primary hover:underline">{c.name}</Link> · {c.department}</div>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground"><Badge tone={c.kind === 'sertifikasi' ? 'green' : 'blue'}>{c.kind === 'sertifikasi' ? 'Sertifikasi' : 'Training'}</Badge><div className="mt-1">{fmtDate(c.date)}</div></div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 text-xs text-muted-foreground">{data.certifications.last_90_days} dalam 90 hari terakhir · {data.with_certs} karyawan punya sertifikasi/training</div>
              </Card>
            </div>
          </>
        )}
      </Loading>
    </section>
  );
}

const CLASS_BG = { 'Top Performer': 'bg-emerald-500', 'Middle Performer': 'bg-amber-400', 'Low Performer': 'bg-red-500' };

/** Perbandingan antar-departemen (hasil yang telah disetujui); hanya tampil bila pengguna melihat lebih dari satu departemen. */
function DepartmentCompare({ rows }: { rows?: any }) {
  return (
    <Card title="Perbandingan antar-departemen" actions={<Users className="size-4 text-muted-foreground" />}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => {
          const n = Object.values<number>(d.distribution).reduce((a, b) => a + b, 0);
          return (
            <div key={d.department} className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <b className="truncate">{d.department}</b>
                <span className="text-2xl font-extrabold tracking-tight">{d.avg_score == null ? '—' : fmt(d.avg_score)}</span>
              </div>
              <div className="mb-2 text-xs text-muted-foreground">{d.completed}/{d.evaluated} evaluasi selesai</div>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Distribusi performa ${d.department}`}>
                {Object.entries<number>(d.distribution).map(([k, v]) => v > 0 && <div key={k} className={CLASS_BG[k]} style={{ width: `${(v / Math.max(1, n)) * 100}%` }} title={`${k}: ${v}`} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {Object.entries<number>(d.distribution).map(([k, v]) => <span key={k} className="flex items-center gap-1"><i className={`size-2 rounded-full ${CLASS_BG[k]}`} />{k.replace(' Performer', '')} <b>{v}</b></span>)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AnalitikTab({ f, setF }: { f?: any; setF?: any }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const opts = useLoad(() => Promise.all([api.get('/periods'), api.get('/projects'), api.get('/clients'), api.get<Department[]>('/departments')]), []);
  const { data, error, loading } = useLoad(() => api.get('/dashboard' + qs(f)), [JSON.stringify(f)]);
  const compare = useLoad(() => api.get<DepartmentSummary[]>('/reports/departments' + qs({ period_id: f.period_id })), [f.period_id]);
  const [periods, projects, clients, departments] = opts.data ?? [[], [], [], []];
  const sel = 'w-auto min-w-40';
  const trend = data?.trend ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5 rounded-2xl border bg-card p-3 shadow-sm" role="search" aria-label="Filter dashboard">
        <FormSelect className={sel} value={f.period_id} onChange={set('period_id')} aria-label="Periode"><option value="">Semua periode</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</FormSelect>
        {departments.length > 1 && <FormSelect className={sel} value={f.department} onChange={set('department')} aria-label="Departemen"><option value="">Semua departemen</option>{departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</FormSelect>}
        <FormSelect className={sel} value={f.seniority} onChange={set('seniority')} aria-label="Seniority"><option value="">Semua seniority</option><option>junior</option><option>middle</option><option>senior</option></FormSelect>
        <FormSelect className={sel} value={f.client_id} onChange={set('client_id')} aria-label="Client"><option value="">Semua client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</FormSelect>
        <FormSelect className={sel} value={f.project_id} onChange={set('project_id')} aria-label="Project"><option value="">Semua project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</FormSelect>
        <Input className="w-auto min-w-40" placeholder="Tech stack" value={f.tech_stack} onChange={set('tech_stack')} aria-label="Tech stack" />
        <FormSelect className={sel} value={f.classification} onChange={set('classification')} aria-label="Klasifikasi"><option value="">Semua klasifikasi</option><option>Low Performer</option><option>Middle Performer</option><option>Top Performer</option></FormSelect>
        <FormSelect className={sel} value={f.status} onChange={set('status')} aria-label="Status"><option value="">Semua status</option>{['Assigned', 'In Progress', 'Submitted', 'Under Review', 'Needs Revision', 'Approved', 'Published', 'Closed'].map((s) => <option key={s}>{s}</option>)}</FormSelect>
      </div>

      <Loading loading={loading && !data} error={error}>
        {data && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={ClipboardList} tone="cyan" value={data.evaluated} label="Evaluasi dalam filter" sub={`${data.late} terlambat`} />
              <StatCard icon={Target} tone="red" value={data.active_plans} label="Development plan/PIP aktif" sub="sedang berjalan" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <Card title="Tren rata-rata skor per periode" actions={<TrendingUp className="size-4 text-muted-foreground" />}>
                <TrendChart data={trend} />
              </Card>
              <Card title="Distribusi Kategori Performa">
                <Donut entries={Object.entries(data.distribution)} />
              </Card>
            </div>

            {(compare.data?.length ?? 0) > 1 && <DepartmentCompare rows={compare.data} />}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Rata-rata skor per indikator">
                <IndicatorBars items={data.indicators} />
              </Card>
              <div className="space-y-4">
                <Card title="Pipeline status evaluasi"><Pipeline counts={data.status_counts} /></Card>
                <Card title="Rata-rata per seniority">
                  {data.by_seniority.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data.</p>}
                  <div className="space-y-3">
                    {['junior', 'middle', 'senior'].map((s) => data.by_seniority.find((x) => x.seniority === s)).filter(Boolean).map((s) => (
                      <div key={s.seniority}>
                        <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium capitalize">{s.seniority} <span className="text-xs text-muted-foreground">({s.n} dev)</span></span><b>{fmt(s.avg_score)}</b></div>
                        <Bar value={s.avg_score} />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="🏆 Top 5 performer"><RankList rows={data.top} tone="top" empty="Belum ada hasil yang disetujui." /></Card>
              <Card title="⚠️ Perlu perhatian"><RankList rows={data.bottom} tone="low" empty="Belum ada hasil yang disetujui." /></Card>
            </div>

            <Card title="Aktivitas terbaru"><Activity_ rows={data.recent} /></Card>
          </div>
        )}
      </Loading>
    </div>
  );
}

const daysLeft = (d) => (d ? Math.ceil((+new Date(String(d).slice(0, 10) + 'T00:00:00') - +new Date(new Date().toDateString())) / 86400000) : null);

function tenure(joinDate) {
  if (!joinDate) return '';
  const m = Math.max(0, Math.floor((Date.now() - new Date(String(joinDate).slice(0, 10)).getTime()) / (30.44 * 86400000)));
  const y = Math.floor(m / 12);
  return [y ? `${y} tahun` : '', m % 12 || !y ? `${m % 12} bulan` : ''].filter(Boolean).join(' ');
}

function SelfStep({ a }: { a?: any }) {
  const left = daysLeft(a.deadline);
  const done = a.self_status && a.self_status !== 'draft';
  const late = !done && left != null && left < 0;
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{a.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Tenggat {fmtDate(a.deadline)}
            {left != null && (
              <span className={`ml-1.5 font-semibold ${late ? 'text-red-600 dark:text-red-400' : left <= 3 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                · {late ? `terlambat ${-left} hari` : left === 0 ? 'hari ini' : `${left} hari lagi`}
              </span>
            )}
          </div>
        </div>
        {a.self_assessment_id && a.self_status === 'draft' && (
          <Button asChild size="sm"><Link to={`/assessments/${a.self_assessment_id}`}>Isi self-assessment</Link></Button>
        )}
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        {([
          ['Self-assessment', done],
          ['Penilaian atasan & rekan', ['Under Review', 'Approved', 'Published', 'Closed'].includes(a.status)],
          ['Hasil dipublikasikan', ['Published', 'Closed'].includes(a.status)],
        ] as [string, boolean][]).map(([label, ok], i) => (
          <li key={label} className="space-y-1.5">
            <div className={`mx-auto grid size-7 place-items-center rounded-full text-[11px] font-bold ${ok ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>{ok ? <CheckCircle2 className="size-4" /> : i + 1}</div>
            <div className={ok ? 'font-medium' : 'text-muted-foreground'}>{label}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const TRAIN_STATUS = { planned: 'Direncanakan', in_progress: 'Berjalan', completed: 'Selesai' };

function EmployeeDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(() => api.get('/dashboard/me'));
  const first = user.name.split(' ')[0];

  return (
    <Page title="Dashboard Saya" eyebrow={`Halo, ${first}`}>
      <Loading loading={loading} error={error}>
        {data && (() => {
          const { profile, active, published, plans, trainings = [], mentors = [] } = data;
          const latest = published[0];
          const prev = published[1];
          const delta = latest && prev ? latest.final_score - prev.final_score : null;
          const trend = [...published].reverse().map((r) => ({ period_id: r.id, period: r.period, avg_score: r.final_score }));
          const planAct = plans.flatMap((p) => p.activities);
          const planDone = planAct.filter((a) => a.done).length;
          const trainOpen = trainings.filter((t) => t.status !== 'completed');
          const self = active[0];
          const selfLeft = self ? daysLeft(self.deadline) : null;
          const selfDone = self?.self_status && self.self_status !== 'draft';

          return (
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-600/20 sm:p-6">
                <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-14 right-24 size-36 rounded-full bg-white/5" />
                <div className="relative flex flex-wrap items-center justify-between gap-5">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-blue-100">{profile?.code}</div>
                    <div className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">{profile?.name ?? user.name}</div>
                    <div className="mt-1 text-sm text-blue-100">
                      {[profile?.position, profile?.seniority && profile.seniority[0].toUpperCase() + profile.seniority.slice(1), profile?.join_date && `bergabung ${tenure(profile.join_date)} lalu`].filter(Boolean).join(' · ')}
                    </div>
                    {profile?.tech_stack && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {profile.tech_stack.split(',').map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-blue-100">Skor terakhir</div>
                    <div className="text-4xl font-extrabold leading-tight">{latest ? fmt(latest.final_score) : '—'}</div>
                    <div className="text-xs text-blue-100">{latest ? latest.classification : 'Belum ada hasil'}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Target} tone="blue" value={latest ? fmt(latest.final_score) : '—'} label="Skor terakhir" delta={delta} sub={latest ? (prev ? 'dibanding periode lalu' : latest.period) : 'belum ada hasil'} />
                <StatCard
                  icon={ClipboardList} tone={!self ? 'cyan' : selfDone ? 'green' : selfLeft != null && selfLeft < 0 ? 'red' : 'amber'}
                  value={!self ? '—' : selfDone ? 'Terkirim' : 'Belum diisi'} label="Self-assessment"
                  sub={!self ? 'tidak ada periode aktif' : selfDone ? self.name : selfLeft != null ? (selfLeft < 0 ? `terlambat ${-selfLeft} hari` : `${selfLeft} hari lagi`) : self.name}
                />
                <StatCard icon={TrendingUp} tone="violet" value={planAct.length ? `${planDone}/${planAct.length}` : '—'} label="Aktivitas pengembangan" sub={planAct.length ? `${Math.round((planDone / planAct.length) * 100)}% selesai` : 'belum ada rencana'} />
                <StatCard icon={Clock} tone="cyan" value={trainOpen.length} label="Training berjalan" sub={trainOpen.length ? 'perlu diselesaikan' : 'tidak ada yang tertunda'} />
              </div>

              <TaskQueue />

              <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Periode evaluasi aktif">
                  {active.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada periode aktif saat ini.</p>}
                  <div className="space-y-3">{active.map((a) => <SelfStep key={a.evaluation_id} a={a} />)}</div>
                </Card>

                <Card title="Tren skor saya">
                  {trend.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hasil yang dipublikasikan.</p> : <TrendChart data={trend} />}
                </Card>

                <Card title={latest ? `Skor per indikator · ${latest.period}` : 'Skor per indikator'} actions={latest && <Button asChild variant="outline" size="sm"><Link to={`/results/${latest.id}`}>Lihat detail</Link></Button>}>
                  {latest ? <IndicatorBars items={latest.indicators.map((i) => ({ code: i.code, name: i.name, avg: i.score }))} /> : <p className="text-sm text-muted-foreground">Belum ada hasil yang dipublikasikan.</p>}
                </Card>

                <Card title="Target pengembangan" actions={plans.length > 0 && <Button asChild variant="outline" size="sm"><Link to="/dev-plans">Kelola</Link></Button>}>
                  {plans.length === 0 && <p className="text-sm text-muted-foreground">Belum ada rencana pengembangan.</p>}
                  <div className="space-y-4">
                    {plans.map((p) => {
                      const done = p.activities.filter((a) => a.done).length;
                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[13.5px] font-medium"><Badge>{p.type}</Badge> {p.goal}</span>
                            <Badge>{p.status}</Badge>
                          </div>
                          <Bar value={done} max={Math.max(p.activities.length, 1)} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{done}/{p.activities.length} aktivitas</span>
                            {p.review_date && <span>review {fmtDate(p.review_date)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Training & pembelajaran" actions={<Button asChild variant="outline" size="sm"><Link to="/training">Katalog</Link></Button>}>
                  {trainings.length === 0 && <p className="text-sm text-muted-foreground">Belum ada training yang ditugaskan.</p>}
                  <ul className="divide-y">
                    {trainings.slice(0, 6).map((t) => {
                      const left = t.status !== 'completed' ? daysLeft(t.due_date) : null;
                      return (
                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-medium">{t.url ? <a href={t.url} target="_blank" rel="noreferrer noopener">{t.title}</a> : t.title}</div>
                            <div className="text-xs text-muted-foreground">{[t.kind, t.provider, t.due_date && `tenggat ${fmtDate(t.due_date)}`].filter(Boolean).join(' · ')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {left != null && left < 0 && <span className="text-xs font-semibold text-red-600 dark:text-red-400">terlambat</span>}
                            <Badge>{TRAIN_STATUS[t.status] ?? t.status}</Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>

                <Card title="Mentor saya">
                  {mentors.length === 0 && <p className="text-sm text-muted-foreground">Belum ada mentor yang ditugaskan.</p>}
                  <div className="space-y-3">
                    {mentors.map((m) => (
                      <div key={m.id} className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{m.mentor_name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</div>
                        <div className="min-w-0 text-[13.5px]">
                          <div className="font-semibold">{m.mentor_name} <span className="font-normal text-muted-foreground">· {m.mentor_position}</span></div>
                          {m.focus && <div className="text-muted-foreground">Fokus: {m.focus}</div>}
                          <div className="text-xs text-muted-foreground">sejak {fmtDate(m.start_date)}{m.end_date ? ` sampai ${fmtDate(m.end_date)}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          );
        })()}
      </Loading>
    </Page>
  );
}

// ---------------------------------------------------------------- Tech Lead
const dayDiff = (iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(todayWib())) / 86400000);
const SRC: Record<string, string> = { self: 'Self', tech_lead: 'Tech Lead', project_manager: 'PM', client: 'Client', metrics: 'Metrik' };

interface Attention { key: string; member: TeamMember; text: string; to: string; action: string; tone: 'red' | 'amber'; rank: number }

/** Hal yang perlu perhatian, dari data Tim Saya: penilaian yang belum saya kirim, keterlambatan training/rencana, dan skor yang turun. Tanpa PIP maupun skor yang belum dipublikasikan. */
function attentionOf(members: TeamMember[]): Attention[] {
  const out: Attention[] = [];
  for (const m of members) {
    const d = m.development;
    const mine = m.evaluation?.my_assessment;
    if (mine?.status === 'draft') out.push({ key: `a${m.id}`, member: m, text: 'Penilaian Anda belum dikirim', to: `/assessments/${mine.id}`, action: 'Isi penilaian', tone: 'amber', rank: 0 });
    if (d.trainings_overdue > 0) out.push({ key: `t${m.id}`, member: m, text: `${d.trainings_overdue} training lewat tenggat`, to: `/employees/${m.id}`, action: 'Buka profil', tone: 'red', rank: 1 });
    if (d.plan_overdue > 0) out.push({ key: `p${m.id}`, member: m, text: `${d.plan_overdue} aktivitas rencana lewat tenggat`, to: `/employees/${m.id}`, action: 'Buka profil', tone: 'red', rank: 1 });
    if (d.latest && d.previous_score != null && d.latest.final_score - d.previous_score <= -3) {
      out.push({ key: `s${m.id}`, member: m, text: `Skor turun ${fmt(Math.abs(d.latest.final_score - d.previous_score))} dibanding periode sebelumnya`, to: `/employees/${m.id}`, action: 'Lihat profil', tone: 'amber', rank: 2 });
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}

function TechLeadDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(() => api.get<TeamOverview>('/team/overview'));
  const s = data?.summary;
  const period = data?.period;
  const attention = data ? attentionOf(data.members) : [];
  const days = period && period.status === 'active' ? dayDiff(period.deadline) : null;
  const inPeriod = data ? data.members.filter((m) => m.evaluation) : [];
  const overdueAll = data ? data.team.overdue_trainings + data.team.overdue_plan_activities : 0;
  return (
    <Page title="Ringkasan Dashboard" eyebrow={`Selamat bekerja, ${user.name.split(' ')[0]}`}
      actions={<Button asChild variant="outline"><Link to="/team">Buka Tim Saya</Link></Button>}>
      <TaskQueue />
      <Loading loading={loading && !data} error={error}>
        {data && s && (data.members.length === 0 ? (
          <Card><p className="py-6 text-center text-sm text-muted-foreground">Belum ada karyawan yang menjadikan Anda Tech Lead. Hubungi HR untuk menetapkan anggota tim.</p></Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={Clock} tone={s.my_pending > 0 ? 'amber' : 'green'} value={s.my_pending} label="Penilaian saya belum dikirim" sub={s.my_pending > 0 ? 'perlu Anda isi' : 'semua sudah terkirim'}
                className={s.my_pending > 0 ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10 dark:ring-amber-500/20' : ''} />
              <StatCard icon={ClipboardList} tone="violet" value={`${s.complete}/${s.in_period}`} label="Semua penilai selesai" sub={period ? period.name : 'belum ada periode'} />
              <StatCard icon={Target} tone={days != null && days <= 3 ? 'amber' : 'blue'}
                value={days == null ? '—' : `${Math.abs(days)} hr`} label={days != null && days < 0 ? 'Lewat tenggat' : 'Sisa waktu ke tenggat'}
                sub={period ? `tenggat ${fmtDate(period.deadline)}` : 'tidak ada periode berjalan'} />
              <StatCard icon={Award} tone="green" value={data.team.avg_score != null ? fmt(data.team.avg_score) : '—'} label="Rata-rata skor tim" sub={`${data.team.with_result} anggota punya hasil dipublikasikan`} />
              <StatCard icon={AlertTriangle} tone={overdueAll > 0 ? 'amber' : 'green'} value={overdueAll} label="Terlambat (training & rencana)" sub={overdueAll > 0 ? 'lihat daftar perhatian' : 'tidak ada yang tertinggal'} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Perlu perhatian" actions={attention.length > 0 && <Badge tone="amber">{attention.length}</Badge>}>
                {attention.length === 0 ? (
                  <p className="flex items-center gap-2 py-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />Tidak ada anggota tim yang perlu perhatian khusus.</p>
                ) : (
                  <ul className="divide-y">
                    {attention.slice(0, 8).map((a) => (
                      <li key={a.key} className="flex items-center gap-3 py-2.5">
                        <PersonAvatar name={a.member.name} className="size-8" />
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="truncate text-sm font-semibold">{a.member.name}</div>
                          <div className={`text-xs ${a.tone === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>{a.text}</div>
                        </div>
                        <Button asChild size="sm" variant="outline"><Link to={a.to}>{a.action}</Link></Button>
                      </li>
                    ))}
                    {attention.length > 8 && <li className="py-2 text-center text-xs text-muted-foreground">dan {attention.length - 8} lainnya di <Link className="underline" to="/team">Tim Saya</Link></li>}
                  </ul>
                )}
              </Card>

              <Card title={period ? `Progres penilaian — ${period.name}` : 'Progres penilaian'} actions={<Link className="text-xs text-primary hover:underline" to="/team">Selengkapnya</Link>}>
                {inPeriod.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Belum ada anggota tim pada periode berjalan.</p> : (
                  <ul className="space-y-3">
                    {inPeriod.map((m) => {
                      const ev = m.evaluation!;
                      const pct = ev.assessments_total ? (ev.assessments_done / ev.assessments_total) * 100 : 0;
                      return (
                        <li key={m.id}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <Link to={`/employees/${m.id}`} className="truncate font-semibold hover:underline">{m.name}</Link>
                            <span className="shrink-0 text-xs text-muted-foreground">{ev.assessments_done}/{ev.assessments_total}</span>
                          </div>
                          <Bar value={pct} />
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ev.assessments.map((a, i) => (
                              <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] ${a.status === 'submitted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-muted/40 text-muted-foreground'}`}>
                                {a.status === 'submitted' ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}{SRC[a.source] ?? a.source}
                              </span>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </>
        ))}
      </Loading>
      <Card title="Pintasan">
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/my-evaluations">Buka My Evaluations</Link></Button>
          <Button asChild variant="outline"><Link to="/team">Tim Saya</Link></Button>
          <Button asChild variant="outline"><Link to="/dev-plans">Rencana Pengembangan</Link></Button>
          {user.employee_id && (
            <>
              <Button asChild variant="outline"><Link to="/results">Hasil Saya</Link></Button>
              <Button asChild variant="outline"><Link to={`/employees/${user.employee_id}`}>Profil &amp; Karier Saya</Link></Button>
            </>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Skor akhir tim tampil setelah hasil dipublikasikan; skor per sumber penilai tidak ditampilkan agar penilaian tetap independen. Tekan Ctrl+K untuk berpindah halaman dengan cepat.</p>
      </Card>
    </Page>
  );
}
