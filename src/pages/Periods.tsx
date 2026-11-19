import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { useConfirm } from '@/components/ConfirmProvider';
import { useEffect, useState } from 'react';
import type { Paged } from '../types.ts';
import { PaginationBar } from '@/components/Pagination.tsx';
import { useDebounced } from '../lib/useDebounced.ts';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.ts';
import { useAuth, isHR } from '../auth.tsx';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock, FileText, Gauge, LayoutGrid, List, ListChecks, Lock, Play, Plus, Search, Settings2, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonAvatar, SeniorityBadge } from '@/components/employee-ui.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, Bar, Card, ErrorBox, Field, Loading, Modal, Page, SOURCE_LABEL, fmt, fmtDate, useAction, useLoad } from '../ui.tsx';

function EmployeePicker({ selected, setSelected }: { selected?: any; setSelected?: any }) {
  const { data, error, loading } = useLoad(() => api.get('/employees?status=active&size=100'));
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Loading loading={loading} error={error}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setSelected((data?.rows ?? []).map((e) => e.id))}>Pilih semua</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setSelected([])}>Kosongkan</Button>
        <span className="text-xs text-muted-foreground">{selected.length} dipilih</span>
      </div>
      <div className="rounded-lg border p-2">
        {(data?.rows ?? []).map((e) => (
          <label key={e.id} className="flex cursor-pointer flex-wrap items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
            <Checkbox checked={selected.includes(e.id)} onCheckedChange={() => toggle(e.id)} /> {e.code} — {e.name} <span className="text-xs text-muted-foreground">({e.seniority})</span>
          </label>
        ))}
      </div>
    </Loading>
  );
}

const STATUS_LABEL = { active: 'Aktif', draft: 'Draft', closed: 'Ditutup' };
const STATUS_ACCENT = { active: 'from-emerald-400 to-emerald-600', draft: 'from-slate-300 to-slate-400', closed: 'from-slate-500 to-slate-700' };
const STATUS_ORDER = { active: 0, draft: 1, closed: 2 };
const LIST_FILTERS = [['all', 'Semua'], ['active', 'Aktif'], ['draft', 'Draft'], ['closed', 'Ditutup']];

/** Penghitung mundur tenggat untuk daftar periode. */
function deadlineInfo(p) {
  if (p.status === 'closed') return { text: 'Ditutup', cls: 'bg-muted text-muted-foreground' };
  if (p.status === 'draft') return { text: `Mulai ${longDate(p.start_date)}`, cls: 'bg-muted text-muted-foreground' };
  const left = daysBetween(todayStr(), p.deadline);
  if (left < 0) return { text: `Terlambat ${-left} hari`, cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' };
  if (left === 0) return { text: 'Tenggat hari ini', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' };
  return { text: `${left} hari lagi`, cls: left <= 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' };
}
const lateOf = (p) => (p.status === 'active' && p.deadline < todayStr() ? p.pending : 0);

function MiniBar({ label, value, max, tone = 'bg-primary' }: { label?: any; value?: any; max?: any; tone?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11.5px]"><span className="text-muted-foreground">{label}</span><b>{value}/{max} <span className="font-normal text-muted-foreground">({pct}%)</span></b></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function PeriodCard({ p }: { p?: any }) {
  const dl = deadlineInfo(p);
  const late = lateOf(p);
  return (
    <Link
      to={`/periods/${p.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <div className={cn('h-1.5 bg-gradient-to-r', STATUS_ACCENT[p.status])} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-extrabold tracking-tight group-hover:text-primary">{p.name}</h3>
            {p.department && <div className="mt-0.5"><Badge tone="blue">{p.department}</Badge></div>}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{longDate(p.start_date)} – {longDate(p.end_date)}</div>
          </div>
          <Badge>{p.status}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', dl.cls)}><Clock className="size-3.5" />{dl.text}</span>
          {late > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300"><AlertTriangle className="size-3.5" />{late} terlambat</span>}
          {p.review > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{p.review} perlu review</span>}
        </div>

        {p.total > 0 ? (
          <div className="space-y-2.5">
            <MiniBar label="Penilaian masuk" value={p.asm_done} max={p.asm_total} tone="bg-violet-500" />
            <MiniBar label="Evaluasi selesai" value={p.done} max={p.total} tone="bg-emerald-500" />
          </div>
        ) : <p className="text-[13px] text-muted-foreground">Belum ada karyawan pada periode ini.</p>}

        <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs">
          <span className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1"><UsersRound className="size-3.5" /><b className="text-foreground">{p.total}</b> karyawan</span>
            <span className="flex items-center gap-1"><Gauge className="size-3.5" />{p.avg_score == null ? '—' : <b className="text-foreground">{fmt(p.avg_score)}</b>}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">Buka<ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}

export default function Periods() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());
  const { data, error, loading } = useLoad(() => api.get<Paged<any, any>>('/periods' + qs({ page, size: 12, status: filter === 'all' ? '' : filter, q: dq })), [page, filter, dq]);
  const [view, setView] = useState(() => { try { return localStorage.getItem('fdp_period_view') === 'table' ? 'table' : 'cards'; } catch { return 'cards'; } });
  const pickView = (v) => { setView(v); try { localStorage.setItem('fdp_period_view', v); } catch { /* abaikan */ } };

  const rows: any[] = data?.rows ?? [];
  const sum = data?.summary;
  const count = (k) => sum?.counts?.[k] ?? 0; // ringkasan seluruh periode, tidak mengikuti filter/halaman
  const activeNames: string[] = sum?.active_names ?? [];
  const lateTotal = sum?.late ?? 0;
  const reviewTotal = sum?.review ?? 0;
  // halaman terakhir yang kosong (mis. filter berubah) mundur satu halaman
  useEffect(() => { if (data && data.rows.length === 0 && page > 1) setPage(page - 1); }, [data, page]);

  return (
    <Page eyebrow="Evaluasi berkala" title="Periode Evaluasi" actions={isHR(user) && <Button asChild><Link to="/periods/new"><Plus />Buat periode</Link></Button>}>
      <Loading loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile icon={Play} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" label="Periode aktif" value={activeNames.length}
                sub={activeNames.length ? activeNames.join(', ') : 'Tidak ada periode berjalan'} />
              <StatTile icon={AlertTriangle} tone={lateTotal ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'}
                label="Perlu tindakan" value={lateTotal + reviewTotal} sub={`${lateTotal} terlambat · ${reviewTotal} menunggu review`} />
              <StatTile icon={FileText} tone="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" label="Draft & arsip" value={`${count('draft')} · ${count('closed')}`} sub="draft · ditutup" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border bg-card p-3 shadow-sm">
              <div role="group" aria-label="Filter status" className="inline-flex rounded-lg border bg-card p-0.5">
                {LIST_FILTERS.map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }}
                    className={cn('rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', filter === k ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                    {label}<span className="ml-1.5 text-[11px] opacity-70">{count(k)}</span>
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari periode…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Cari periode" />
              </div>
              <div className="ml-auto inline-flex rounded-lg border p-0.5" role="group" aria-label="Tampilan">
                <Button variant={view === 'cards' ? 'secondary' : 'ghost'} size="icon" className="size-8" aria-pressed={view === 'cards'} aria-label="Tampilan kartu" onClick={() => pickView('cards')}><LayoutGrid /></Button>
                <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="size-8" aria-pressed={view === 'table'} aria-label="Tampilan tabel" onClick={() => pickView('table')}><List /></Button>
              </div>
            </div>

            {rows.length === 0 ? (
              <Card>
                <div className="grid place-items-center gap-2 py-10 text-center">
                  <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"><CalendarDays className="size-7" /></span>
                  <b>{count('all') === 0 ? 'Belum ada periode evaluasi' : 'Tidak ada periode yang cocok'}</b>
                  <span className="text-sm text-muted-foreground">{count('all') === 0 ? 'Buat periode pertama untuk memulai siklus penilaian.' : 'Ubah filter atau kata kunci pencarian.'}</span>
                  {count('all') === 0 && isHR(user) && <Button asChild size="sm"><Link to="/periods/new"><Plus />Buat periode</Link></Button>}
                </div>
              </Card>
            ) : view === 'cards' ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((p) => <PeriodCard key={p.id} p={p} />)}</div>
            ) : (
              <Card className="py-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={HEAD}>Periode</TableHead>
                      <TableHead className={HEAD}>Status</TableHead>
                      <TableHead className={HEAD}>Tenggat</TableHead>
                      <TableHead className={`${HEAD} text-right`}>Karyawan</TableHead>
                      <TableHead className={HEAD}>Penilaian masuk</TableHead>
                      <TableHead className={HEAD}>Selesai</TableHead>
                      <TableHead className={`${HEAD} text-right`}>Rata-rata</TableHead>
                      <TableHead className={HEAD}>Perlu tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => {
                      const dl = deadlineInfo(p);
                      const late = lateOf(p);
                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => nav(`/periods/${p.id}`)}>
                          <TableCell>
                            <Link to={`/periods/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-foreground hover:text-primary hover:underline">{p.name}</Link>
                            <div className="text-xs text-muted-foreground">{p.department ? `${p.department} · ` : ''}{longDate(p.start_date)} – {longDate(p.end_date)}</div>
                          </TableCell>
                          <TableCell><Badge>{p.status}</Badge></TableCell>
                          <TableCell><span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', dl.cls)}>{p.status === 'closed' || p.status === 'draft' ? dl.text : `${longDate(p.deadline)} · ${dl.text}`}</span></TableCell>
                          <TableCell className="text-right font-semibold">{p.total}</TableCell>
                          <TableCell className="w-40"><div className="mb-1 text-xs font-semibold">{p.asm_done}/{p.asm_total}</div><Bar value={p.asm_done} max={p.asm_total || 1} /></TableCell>
                          <TableCell className="w-36"><div className="mb-1 text-xs font-semibold">{p.done}/{p.total}</div><Bar value={p.done} max={p.total || 1} /></TableCell>
                          <TableCell className="text-right font-bold">{p.avg_score == null ? '—' : fmt(p.avg_score)}</TableCell>
                          <TableCell className="whitespace-normal text-xs">
                            {late > 0 && <div className="font-bold text-red-600 dark:text-red-300">{late} terlambat</div>}
                            {p.review > 0 && <div className="text-amber-700 dark:text-amber-300">{p.review} perlu review</div>}
                            {late === 0 && p.review === 0 && <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
            <PaginationBar page={data.page} size={data.size} total={data.total} onPage={setPage} unit="periode" />
          </>
        )}
      </Loading>
    </Page>
  );
}

function StatTile({ icon: Icon, tone, label, value, sub }: { icon?: any; tone?: any; label?: any; value?: any; sub?: any }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-6" /></span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-extrabold leading-tight tracking-tight">{value}</div>
        <div className="truncate text-xs text-muted-foreground" title={typeof sub === 'string' ? sub : undefined}>{sub}</div>
      </div>
    </div>
  );
}


// ---------- Detail periode: komponen tampilan ----------
const HEAD = 'text-xs uppercase tracking-wide text-muted-foreground';
const DAY = 86400000;
const daysBetween = (a, b) => Math.round((+new Date(b) - +new Date(a)) / DAY);
const todayStr = () => new Date().toISOString().slice(0, 10);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const longDate = (s) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const FINAL = ['Approved', 'Published', 'Closed'];
const PENDING = ['Assigned', 'In Progress', 'Needs Revision'];
const FILTERS = [
  { key: 'all', label: 'Semua', statuses: null },
  { key: 'review', label: 'Perlu review', statuses: ['Submitted', 'Under Review'] },
  { key: 'progress', label: 'Dalam pengisian', statuses: PENDING },
  { key: 'late', label: 'Terlambat', statuses: PENDING, late: true },
  { key: 'done', label: 'Selesai', statuses: FINAL },
];
const PIPELINE = [
  ['Draft', 'bg-slate-300'], ['Assigned', 'bg-slate-400'], ['In Progress', 'bg-blue-400'], ['Needs Revision', 'bg-rose-400'], ['Submitted', 'bg-amber-400'],
  ['Under Review', 'bg-orange-400'], ['Approved', 'bg-emerald-400'], ['Published', 'bg-emerald-600'], ['Closed', 'bg-slate-600'],
];
const CLASS_BAR = { 'Top Performer': 'bg-emerald-500', 'Middle Performer': 'bg-amber-500', 'Low Performer': 'bg-red-500' };

function StatCard({ icon: Icon, tone, label, value, sub, children }: { icon?: any; tone?: any; label?: any; value?: any; sub?: any; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
        </div>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span>
      </div>
      <div className="mt-3 min-h-4 text-xs text-muted-foreground">{children ?? sub}</div>
    </div>
  );
}

function PeriodHero({ p, lateCount }: { p?: any; lateCount?: any }) {
  const today = todayStr();
  const total = Math.max(1, daysBetween(p.start_date, p.end_date));
  const elapsed = clamp(daysBetween(p.start_date, today), 0, total);
  const pct = p.status === 'closed' ? 100 : (elapsed / total) * 100;
  const dlPct = clamp((daysBetween(p.start_date, p.deadline) / total) * 100, 0, 100);
  const left = daysBetween(today, p.deadline);
  const countdown = p.status === 'closed'
    ? { text: 'Periode ditutup', cls: 'bg-white/15 text-white' }
    : p.status === 'draft'
      ? { text: 'Belum dimulai', cls: 'bg-white/15 text-white' }
      : left < 0
        ? { text: `Tenggat terlewat ${-left} hari`, cls: 'bg-red-500/90 text-white' }
        : left === 0
          ? { text: 'Tenggat hari ini', cls: 'bg-amber-400 text-amber-950' }
          : { text: `${left} hari lagi menuju tenggat`, cls: left <= 3 ? 'bg-amber-400 text-amber-950' : 'bg-white/15 text-white' };
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e1a2c] via-[#12284a] to-blue-700 p-6 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-blue-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="border-white/25 bg-white/15 text-white [&>span]:bg-white">{p.status}</Badge>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', countdown.cls)}><Clock className="size-3.5" />{countdown.text}</span>
            {lateCount > 0 && p.status === 'active' && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold"><AlertTriangle className="size-3.5" />{lateCount} evaluasi terlambat</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div><div className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Mulai</div><div className="text-[15px] font-bold">{longDate(p.start_date)}</div></div>
            <div><div className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Akhir</div><div className="text-[15px] font-bold">{longDate(p.end_date)}</div></div>
            <div><div className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Tenggat pengisian</div><div className="text-[15px] font-bold">{longDate(p.deadline)}</div></div>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-blue-100/90">
            <span>Rentang penilaian · {total} hari</span>
            <span>{p.status === 'draft' ? 'belum berjalan' : `hari ke-${Math.max(1, elapsed)}`}</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-white/15" role="img" aria-label={`Rentang periode terlewati ${Math.round(pct)}%`}>
            <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-white" style={{ width: `${p.status === 'draft' ? 0 : pct}%` }} />
            {p.deadline <= p.end_date && p.deadline >= p.start_date && <span className="absolute -top-1 h-4.5 w-0.5 bg-amber-300" style={{ left: `${dlPct}%`, height: 18 }} title={`Tenggat ${longDate(p.deadline)}`} />}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-blue-200/70"><span>{longDate(p.start_date)}</span><span>{longDate(p.end_date)}</span></div>
        </div>
      </div>
    </div>
  );
}

function Readiness({ r, periodId }: { r?: any; periodId?: any }) {
  const noEval = r.missing_evaluators.length;
  const items = [
    { ok: r.employees > 0, title: 'Cakupan karyawan', text: r.employees > 0 ? `${r.employees} karyawan masuk periode` : 'Belum ada karyawan — gunakan "Ubah cakupan"' },
    {
      ok: noEval === 0, title: 'Evaluator ditetapkan',
      text: noEval === 0 ? 'Setiap karyawan punya evaluator' : `${noEval} karyawan belum punya evaluator (selain self-assessment)`,
      extra: noEval > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {r.missing_evaluators.slice(0, 6).map((m) => <Link key={m.id} to={`/evaluations/${m.id}`} className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:underline dark:bg-amber-500/15 dark:text-amber-300">{m.name}</Link>)}
          {noEval > 6 && <span className="text-[11px] text-muted-foreground">+{noEval - 6} lainnya</span>}
        </div>
      ),
    },
    {
      ok: r.config.ok, title: 'Konfigurasi penilaian',
      text: r.config.ok ? 'Indikator, bobot, dan ambang valid' : r.config.error,
      extra: !r.config.ok && <Link to="/config" className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">Perbaiki di Konfigurasi →</Link>,
    },
  ];
  const ready = items.every((i) => i.ok);
  return (
    <Card
      title={<span className="flex items-center gap-2"><ListChecks className="size-4 text-primary" />Kesiapan memulai periode</span>}
      actions={<Badge tone={ready ? 'green' : 'amber'}>{ready ? 'Siap dimulai' : 'Belum siap'}</Badge>}
    >
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.title} className="flex gap-3">
            <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', i.ok ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300')}>
              {i.ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
            </span>
            <div className="min-w-0 text-sm"><b>{i.title}</b><div className="text-[13px] text-muted-foreground">{i.text}</div>{i.extra}</div>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Saat periode dimulai, konfigurasi dibekukan sebagai snapshot dan setiap evaluator menerima notifikasi penugasan.</p>
    </Card>
  );
}

function Distribution({ evaluations }: { evaluations?: any }) {
  const total = evaluations.length;
  const by: Record<string, number> = {};
  evaluations.forEach((e) => { by[e.status] = (by[e.status] ?? 0) + 1; });
  const cls: Record<string, number> = {};
  evaluations.filter((e) => FINAL.includes(e.status) && e.classification).forEach((e) => { cls[e.classification] = (cls[e.classification] ?? 0) + 1; });
  const clsTotal = Object.values<number>(cls).reduce((s, n) => s + n, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Pipeline status evaluasi">
        {total === 0 ? <p className="text-sm text-muted-foreground">Belum ada evaluasi.</p> : (
          <>
            <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label="Pipeline status evaluasi">
              {PIPELINE.filter(([k]) => by[k]).map(([k, c]) => <div key={k} className={c} style={{ width: `${(by[k] / total) * 100}%` }} title={`${k}: ${by[k]}`} />)}
            </div>
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {PIPELINE.filter(([k]) => by[k]).map(([k, c]) => (
                <div key={k} className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2"><i className={cn('size-2.5 rounded-full', c)} />{k}</span><b>{by[k]}</b></div>
              ))}
            </div>
          </>
        )}
      </Card>
      <Card title="Sebaran kategori (hasil disetujui)">
        {clsTotal === 0 ? <p className="text-sm text-muted-foreground">Belum ada hasil yang disetujui pada periode ini.</p> : (
          <div className="space-y-3">
            {['Top Performer', 'Middle Performer', 'Low Performer'].map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-[13px]"><Badge>{k}</Badge><span><b>{cls[k] ?? 0}</b> <span className="text-xs text-muted-foreground">({Math.round(((cls[k] ?? 0) / clsTotal) * 100)}%)</span></span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', CLASS_BAR[k])} style={{ width: `${((cls[k] ?? 0) / clsTotal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EvaluationsTab({ p, isLate }: { p?: any; isLate?: any }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const rows = p.evaluations;
  const match = (f, e) => (!f.statuses || f.statuses.includes(e.status)) && (!f.late || isLate(e));
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter((e) => match(f, e)).length]));
  const active = FILTERS.find((f) => f.key === filter);
  const term = q.trim().toLowerCase();
  const shown = rows.filter((e) => match(active, e) && (!term || e.name.toLowerCase().includes(term) || e.code.toLowerCase().includes(term)));
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter status" className="flex flex-wrap gap-1.5">
          {FILTERS.filter((f) => f.key !== 'late' || p.status === 'active').map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? 'default' : 'outline'} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}<span className={cn('rounded-full px-1.5 text-[11px] font-bold', filter === f.key ? 'bg-white/25' : 'bg-muted text-muted-foreground', f.key === 'late' && counts.late > 0 && filter !== 'late' && 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300')}>{counts[f.key]}</span>
            </Button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari karyawan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari karyawan" />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={HEAD}>Karyawan</TableHead>
            <TableHead className={HEAD}>Seniority</TableHead>
            <TableHead className={HEAD}>Status</TableHead>
            <TableHead className={HEAD}>Penilaian masuk</TableHead>
            <TableHead className={`${HEAD} text-right`}>Skor</TableHead>
            <TableHead className={HEAD}>Kategori</TableHead>
            <TableHead className={HEAD}><span className="sr-only">Aksi</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((e) => (
            <TableRow key={e.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-3">
                  <PersonAvatar name={e.name} />
                  <div className="min-w-0 leading-tight">
                    <Link to={`/evaluations/${e.id}`} className="block truncate font-semibold text-foreground hover:text-primary hover:underline">{e.name}</Link>
                    <span className="text-xs text-muted-foreground">{e.code} · {e.department}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell><SeniorityBadge value={e.seniority} /></TableCell>
              <TableCell className="whitespace-normal">
                <Badge>{e.status}</Badge>
                {isLate(e) && <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-300"><AlertTriangle className="size-3" />terlambat</span>}
                {e.calc_error && <div className="mt-1 max-w-56 text-xs text-destructive">{e.calc_error}</div>}
              </TableCell>
              <TableCell className="w-44">
                <div className="mb-1 flex items-center justify-between text-xs"><b>{e.assessments_done}/{e.assessments_total}</b>{p.status === 'draft' && e.evaluators_count === 0 && <span className="font-semibold text-amber-600 dark:text-amber-300">tanpa evaluator</span>}</div>
                <Bar value={e.assessments_done} max={e.assessments_total || 1} />
              </TableCell>
              <TableCell className="text-right font-bold">{e.final_score == null ? '—' : fmt(e.final_score)}</TableCell>
              <TableCell>{e.classification ? <Badge>{e.classification}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to={`/evaluations/${e.id}`}>Detail</Link></Button></TableCell>
            </TableRow>
          ))}
          {shown.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{rows.length === 0 ? 'Belum ada karyawan pada periode ini.' : 'Tidak ada evaluasi yang cocok dengan filter.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

const SRC_COLOR = { tech_lead: 'bg-blue-500', project_manager: 'bg-violet-500', client: 'bg-emerald-500', self: 'bg-amber-500', metrics: 'bg-cyan-500' };

function ConfigTab({ snap, status }: { snap?: any; status?: any }) {
  if (!snap) {
    return (
      <Card>
        <div className="grid place-items-center gap-2 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Lock className="size-6" /></span>
          <b>Konfigurasi belum dibekukan</b>
          <span className="max-w-md text-sm text-muted-foreground">{status === 'draft' ? 'Indikator, bobot, dan ambang dibekukan sebagai snapshot saat periode dimulai. Sebelum itu, perubahan di menu Konfigurasi masih berpengaruh.' : 'Periode ini tidak memiliki snapshot.'}</span>
          <Button asChild variant="outline" size="sm"><Link to="/config">Buka Konfigurasi</Link></Button>
        </div>
      </Card>
    );
  }
  const th = snap.thresholds;
  const flat = typeof th?.middle === 'number';
  const sw = Object.entries<number>(snap.sourceWeights ?? {}).filter(([, v]) => v > 0);
  const swTotal = sw.reduce((s, [, v]) => s + v, 0) || 1;
  const sens = ['junior', 'middle', 'senior'];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Kebijakan sumber hilang">
          <Badge tone={snap.missingPolicy === 'block' ? 'red' : 'amber'}>{snap.missingPolicy === 'block' ? 'Blokir kalkulasi' : 'Redistribusi bobot'}</Badge>
          <p className="mt-2 text-[13px] text-muted-foreground">{snap.missingPolicy === 'block' ? 'Skor tidak dihitung sampai semua sumber yang relevan terisi.' : 'Bobot dibagi ulang ke sumber yang tersedia dan ditandai pada hasil.'}</p>
          <p className="mt-3 text-xs text-muted-foreground">Dibekukan {snap.created_at ? longDate(snap.created_at) : '—'}</p>
        </Card>
        <Card title="Ambang klasifikasi">
          <Table>
            <TableHeader><TableRow><TableHead className={HEAD}>Seniority</TableHead><TableHead className={`${HEAD} text-right`}>Middle ≥</TableHead><TableHead className={`${HEAD} text-right`}>Top ≥</TableHead></TableRow></TableHeader>
            <TableBody>
              {(flat ? [['Semua', th]] : sens.map((s) => [s, th?.[s]])).map(([s, v]) => (
                <TableRow key={s}><TableCell className="capitalize">{s}</TableCell><TableCell className="text-right font-semibold">{v?.middle ?? '—'}</TableCell><TableCell className="text-right font-semibold">{v?.top ?? '—'}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card title="Bobot sumber (cadangan)">
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-muted">{sw.map(([k, v]) => <div key={k} className={SRC_COLOR[k]} style={{ width: `${(v / swTotal) * 100}%` }} title={`${SOURCE_LABEL[k]} ${v}%`} />)}</div>
          <div className="space-y-1">{sw.map(([k, v]) => <div key={k} className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2"><i className={cn('size-2.5 rounded-full', SRC_COLOR[k])} />{SOURCE_LABEL[k]}</span><b>{v}%</b></div>)}</div>
        </Card>
      </div>
      <Card title={`Indikator (${snap.indicators.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>Indikator</TableHead>
              {sens.map((s) => <TableHead key={s} className={`${HEAD} text-center`}>{s[0].toUpperCase() + s.slice(1)}</TableHead>)}
              <TableHead className={HEAD}>Sumber penilai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snap.indicators.map((i) => (
              <TableRow key={i.code} className="hover:bg-muted/50">
                <TableCell className="whitespace-normal font-medium">{i.name}{i.subs?.length ? <div className="text-xs font-normal text-muted-foreground">{i.subs.length} sub-indikator</div> : null}</TableCell>
                {sens.map((s) => {
                  const w = i.weights?.[s] ?? i.weight;
                  return <TableCell key={s} className={cn('text-center font-semibold', w !== i.weight && 'text-primary', w === 0 && 'text-muted-foreground')}>{w}%</TableCell>;
                })}
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap gap-1">
                    {i.sources.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium"><i className={cn('size-1.5 rounded-full', SRC_COLOR[s])} />{SOURCE_LABEL[s]}{i.source_weights?.[s] != null ? ` ${i.source_weights[s]}%` : ''}</span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-bold hover:bg-muted/40">
              <TableCell>Total</TableCell>
              {sens.map((s) => <TableCell key={s} className="text-center">{snap.indicators.reduce((t, i) => t + (i.weights?.[s] ?? i.weight), 0)}%</TableCell>)}
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">Bobot yang berbeda dari bobot dasar ditandai biru. Bobot 0% berarti indikator tidak dinilai untuk seniority tersebut.</p>
      </Card>
    </div>
  );
}

function PeriodBody({ p }: { p?: any }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'konfigurasi' ? 'konfigurasi' : 'evaluasi';
  const setTab = (v) => { const n = new URLSearchParams(params); if (v === 'evaluasi') n.delete('tab'); else n.set('tab', v); setParams(n, { replace: true }); };

  const today = todayStr();
  const overdue = p.status === 'active' && p.deadline < today;
  const isLate = (e) => overdue && PENDING.includes(e.status);
  const ev = p.evaluations;
  const total = ev.length;
  const done = ev.filter((e) => FINAL.includes(e.status)).length;
  const review = ev.filter((e) => ['Submitted', 'Under Review'].includes(e.status)).length;
  const late = ev.filter(isLate).length;
  const asmDone = ev.reduce((s, e) => s + e.assessments_done, 0);
  const asmTotal = ev.reduce((s, e) => s + e.assessments_total, 0);
  const scored = ev.filter((e) => FINAL.includes(e.status) && e.final_score != null);
  const avg = scored.length ? scored.reduce((s, e) => s + Number(e.final_score), 0) / scored.length : null;
  const pctAsm = asmTotal ? Math.round((asmDone / asmTotal) * 100) : 0;
  const pctDone = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <PeriodHero p={p} lateCount={late} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={UsersRound} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" label="Karyawan" value={total} sub="masuk cakupan periode" />
        <StatCard icon={ClipboardCheck} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" label="Penilaian masuk" value={`${pctAsm}%`}>
          <Bar value={asmDone} max={asmTotal || 1} /><div className="mt-1">{asmDone} dari {asmTotal} penilaian</div>
        </StatCard>
        <StatCard icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" label="Evaluasi selesai" value={`${done}/${total}`}>
          <Bar value={done} max={total || 1} /><div className="mt-1">{pctDone}% disetujui atau terbit</div>
        </StatCard>
        <StatCard icon={Gauge} tone="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300" label="Rata-rata skor" value={avg == null ? '—' : fmt(avg)} sub={scored.length ? `dari ${scored.length} hasil disetujui` : 'belum ada hasil disetujui'} />
        <StatCard
          icon={late || review ? AlertTriangle : CheckCircle2}
          tone={late ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'}
          label="Perlu tindakan" value={late + review}
        >
          <span className={late ? 'font-semibold text-red-600 dark:text-red-300' : ''}>{late} terlambat</span> · {review} menunggu review
        </StatCard>
      </div>

      {p.readiness && <Readiness r={p.readiness} periodId={p.id} />}

      <Distribution evaluations={ev} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="evaluasi"><UsersRound className="size-4" />Evaluasi ({total})</TabsTrigger>
          <TabsTrigger value="konfigurasi"><Settings2 className="size-4" />Konfigurasi periode</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'evaluasi' ? <EvaluationsTab p={p} isLate={isLate} /> : <ConfigTab snap={p.snapshot} status={p.status} />}
    </div>
  );
}

export function PeriodDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const hr = isHR(user);
  const { data: p, error, loading, reload } = useLoad(() => api.get(`/periods/${id}`), [id]);
  const { busy, error: err, run, setError } = useAction();
  const [scope, setScope] = useState<any>(null);
  const [dl, setDl] = useState<any>(null);

  const confirm = useConfirm();
  const act = (path, ask) => async () => {
    if (ask && !(await confirm(ask))) return;
    await run(async () => { await api.post(`/periods/${id}/${path}`); toast.success(path === 'activate' ? 'Periode dimulai' : path === 'close' ? 'Periode ditutup' : 'Perubahan disimpan'); reload(); });
  };

  return (
    <Page eyebrow="Periode evaluasi" title={p?.name ?? 'Periode'} actions={hr && p && (
      <>
        {p.status === 'draft' && <Button asChild variant="outline"><Link to={`/periods/new?draft=${p.id}`}>Lanjutkan di wizard</Link></Button>}
        {p.status === 'draft' && <Button variant="outline" onClick={() => setScope(p.evaluations.map((e) => e.employee_id))}>Ubah cakupan</Button>}
        {p.status !== 'closed' && <Button variant="outline" onClick={() => { setError(null); setDl({ deadline: p.deadline, reason: '' }); }}>{p.status === 'draft' ? 'Ubah tanggal' : 'Ubah tenggat'}</Button>}
        {p.status === 'draft' && <Button disabled={busy} onClick={act('activate', { title: 'Mulai periode?', tone: 'info', confirmText: 'Mulai periode', description: 'Konfigurasi indikator, bobot, dan ambang saat ini akan dibekukan sebagai snapshot untuk periode ini. Evaluator akan menerima notifikasi penugasan.' })}>Mulai periode</Button>}
        {p.status === 'active' && <Button disabled={busy} onClick={act('close', { title: 'Tutup periode?', tone: 'warning', confirmText: 'Tutup periode', description: 'Semua evaluasi yang sudah dipublikasikan akan berstatus Closed. Periode yang ditutup tidak dapat dibuka kembali.' })}>Tutup periode</Button>}
      </>
    )}>
      <ErrorBox error={err} />
      <Loading loading={loading} error={error}>
        {p && <PeriodBody p={p} />}
      </Loading>
      {scope && (
        <Modal title="Cakupan karyawan" onClose={() => setScope(null)} wide>
          <EmployeePicker selected={scope} setSelected={setScope} />
          <ErrorBox error={err} />
          <Button className="mt-3" disabled={busy} onClick={() => run(async () => { await api.put(`/periods/${id}/employees`, { employee_ids: scope }); toast.success('Cakupan karyawan disimpan'); setScope(null); reload(); })}>Simpan</Button>
        </Modal>
      )}
      {dl && (
        <Modal title={p.status === 'draft' ? 'Ubah tanggal periode' : 'Ubah tenggat'} onClose={() => setDl(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.patch(`/periods/${id}`, p.status === 'draft' ? { deadline: dl.deadline } : { deadline: dl.deadline, reason: dl.reason }); toast.success('Tenggat diperbarui'); setDl(null); reload(); }); }}>
            <Field label="Tenggat"><DatePicker value={dl.deadline} onChange={(e) => setDl({ ...dl, deadline: e.target.value })} required /></Field>
            {p.status === 'active' && <Field label="Alasan (dicatat di audit log)"><Input value={dl.reason} onChange={(e) => setDl({ ...dl, reason: e.target.value })} required /></Field>}
            <ErrorBox error={err} /><Button disabled={busy}>Simpan</Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
