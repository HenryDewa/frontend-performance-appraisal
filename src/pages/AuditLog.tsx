import { Fragment, useMemo, useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  AlertTriangle, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FileDown, KeyRound, LogIn, RotateCcw, Scale, Search, ShieldAlert, SlidersHorizontal, Target, UserCog, UsersRound, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { PersonAvatar } from '@/components/employee-ui.tsx';
import { api, qs } from '../api.ts';
import { Card, Drawer, ErrorBox, Loading, Page, useLoad } from '../ui.tsx';

// kategori = awalan kode aksi ("auth.login" -> auth)
const CATEGORY = {
  auth: { label: 'Autentikasi', Icon: KeyRound, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  user: { label: 'Pengguna', Icon: UserCog, cls: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  employee: { label: 'Karyawan', Icon: UsersRound, cls: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  assignment: { label: 'Penugasan', Icon: UsersRound, cls: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  client: { label: 'Client', Icon: Building2, cls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300' },
  project: { label: 'Project', Icon: Building2, cls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300' },
  period: { label: 'Periode', Icon: CalendarDays, cls: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  evaluation: { label: 'Evaluasi', Icon: ClipboardCheck, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  assessment: { label: 'Penilaian', Icon: ClipboardCheck, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  calibration: { label: 'Kalibrasi', Icon: Scale, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  report: { label: 'Laporan', Icon: FileDown, cls: 'bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300' },
  indicator: { label: 'Indikator', Icon: SlidersHorizontal, cls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  settings: { label: 'Pengaturan', Icon: SlidersHorizontal, cls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  gap_targets: { label: 'Target gap', Icon: SlidersHorizontal, cls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  career_level: { label: 'Jalur karier', Icon: Target, cls: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
  devplan: { label: 'Rencana pengembangan', Icon: Target, cls: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
  training: { label: 'Training', Icon: Target, cls: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
  mentorship: { label: 'Mentoring', Icon: Target, cls: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
};
const catOf = (action) => CATEGORY[String(action).split('.')[0]] ?? { label: String(action).split('.')[0], Icon: Activity, cls: 'bg-muted text-muted-foreground' };

const VERB = {
  'auth.login': 'masuk ke aplikasi', 'auth.login_failed': 'gagal login', 'auth.logout': 'keluar', 'auth.password_changed': 'mengganti password',
  'auth.password_reset_requested': 'meminta reset password', 'auth.password_reset': 'mereset password lewat tautan',
  'user.create': 'membuat pengguna', 'user.update': 'mengubah pengguna',
  'employee.create': 'menambah karyawan', 'employee.update': 'mengubah karyawan', 'employee.delete': 'menghapus karyawan',
  'assignment.create': 'menambah penugasan project', 'assignment.update': 'mengubah penugasan project',
  'client.create': 'menambah client', 'client.update': 'mengubah client', 'client.delete': 'menghapus client',
  'project.create': 'menambah project', 'project.update': 'mengubah project', 'project.delete': 'menghapus project',
  'period.create': 'membuat periode', 'period.wizard': 'membuat periode lewat wizard', 'period.scope': 'mengubah cakupan periode', 'period.update': 'mengubah periode',
  'period.activate': 'memulai periode', 'period.close': 'menutup periode',
  'assessment.assign': 'menugaskan evaluator', 'assessment.replace': 'mengganti evaluator', 'assessment.reopen': 'membuka kembali penilaian', 'assessment.submit': 'mengirim penilaian',
  'evaluation.submitted': 'semua penilaian masuk', 'evaluation.approved': 'menyetujui evaluasi', 'evaluation.returned': 'mengembalikan evaluasi untuk revisi',
  'evaluation.published': 'mempublikasikan evaluasi', 'evaluation.closed': 'menutup evaluasi', 'evaluation.revised': 'merevisi evaluasi',
  'evaluation.review_started': 'memulai review', 'evaluation.started': 'mulai menilai', 'evaluation.reopened': 'membuka kembali evaluasi', 'evaluation.comment': 'berkomentar pada evaluasi',
  'calibration.session_create': 'membuat sesi kalibrasi', 'calibration.session_close': 'menutup sesi kalibrasi', 'calibration.item_add': 'menambah item kalibrasi',
  'calibration.item_remove': 'mengeluarkan item kalibrasi', 'calibration.item_decide': 'memutuskan item kalibrasi',
  'report.export': 'mengunduh laporan', 'report.export_self': 'mengunduh laporan miliknya',
  'indicator.create': 'menambah indikator', 'indicator.update': 'mengubah indikator', 'indicator.bulk_evidence_rule': 'menerapkan aturan komentar ke semua indikator',
  'settings.update': 'mengubah pengaturan penilaian', 'gap_targets.update': 'mengubah target gap', 'career_level.create': 'menambah level karier', 'career_level.update': 'mengubah level karier',
  'devplan.create': 'membuat rencana pengembangan', 'devplan.update': 'mengubah rencana pengembangan', 'devplan.acknowledge': 'meng-acknowledge rencana pengembangan',
  'training.create': 'menambah training', 'training.update': 'mengubah training', 'training.delete': 'menghapus training', 'training.assign': 'menugaskan training',
  'mentorship.create': 'membuat mentoring', 'mentorship.update': 'mengubah mentoring',
};
const verbOf = (a) => VERB[a] ?? a;
const isRisky = (a) => a === 'auth.login_failed' || a.endsWith('.delete');

const PRESETS = [['', 'Semua waktu'], ['today', 'Hari ini'], ['7', '7 hari'], ['30', '30 hari']];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const rangeOf = (preset) => {
  if (!preset) return { from: '', to: '' };
  const now = new Date();
  const from = new Date(now);
  if (preset !== 'today') from.setDate(from.getDate() - (Number(preset) - 1));
  return { from: ymd(from), to: ymd(now) };
};
const dayLabel = (d) => {
  const today = ymd(new Date());
  const y = new Date(); y.setDate(y.getDate() - 1);
  const pretty = new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return d === today ? `Hari ini · ${pretty}` : d === ymd(y) ? `Kemarin · ${pretty}` : pretty;
};

function Tile({ icon: Icon, tone, label, value, sub, children }: { icon?: any; tone?: any; label?: any; value?: any; sub?: any; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 text-[26px] font-extrabold leading-none tracking-tight">{value}</div></div>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span>
      </div>
      <div className="mt-2.5 text-xs text-muted-foreground">{children ?? sub}</div>
    </div>
  );
}

function Spark({ daily }: { daily?: any }) {
  const days: any[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(ymd(d)); }
  const map = Object.fromEntries((daily ?? []).map((x) => [x.date, x.n]));
  const max = Math.max(1, ...days.map((d) => map[d] ?? 0));
  return (
    <div className="flex h-7 items-end gap-1" role="img" aria-label="Aktivitas 7 hari terakhir">
      {days.map((d) => <i key={d} className="w-full rounded-sm bg-primary/60" style={{ height: `${Math.max(8, ((map[d] ?? 0) / max) * 100)}%` }} title={`${d}: ${map[d] ?? 0}`} />)}
    </div>
  );
}

// ---- rincian entri ----
function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function DiffTable({ before, after }: { before?: any; after?: any }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const rows = keys.filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]));
  if (!rows.length) return <p className="text-sm text-muted-foreground">Tidak ada perbedaan nilai yang tercatat.</p>;
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[1fr_1fr_1fr] bg-muted/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><span>Bidang</span><span>Sebelum</span><span>Sesudah</span></div>
      {rows.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-t px-3 py-2 text-[13px]">
          <span className="font-semibold">{k}</span>
          <span className="break-words text-red-700 dark:text-red-300">{show(before?.[k])}</span>
          <span className="break-words text-emerald-700 dark:text-emerald-300">{show(after?.[k])}</span>
        </div>
      ))}
    </div>
  );
}

function Detail({ row, onClose }: { row?: any; onClose?: any }) {
  const c = catOf(row.action);
  const d = row.detail;
  const hasDiff = isObj(d) && ('before' in d || 'after' in d);
  return (
    <Drawer title="Rincian aktivitas" onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', c.cls)}><c.Icon className="size-5" /></span>
        <div className="min-w-0 leading-tight"><b className="block">{row.actor_name ?? 'Sistem'} {verbOf(row.action)}</b><span className="text-xs text-muted-foreground">{row.at}</span></div>
      </div>
      <dl className="mb-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 rounded-xl bg-muted/50 p-3 text-[13px]">
        <dt className="text-muted-foreground">Kode aksi</dt><dd><code className="rounded bg-card px-1.5 py-0.5 text-xs">{row.action}</code></dd>
        <dt className="text-muted-foreground">Kategori</dt><dd>{c.label}</dd>
        <dt className="text-muted-foreground">Aktor</dt><dd>{row.actor_name ?? '—'}{row.actor_id ? <span className="text-xs text-muted-foreground"> · ID {row.actor_id}</span> : ''}</dd>
        <dt className="text-muted-foreground">Objek</dt><dd>{row.entity ?? '—'}{row.entity_id ? <span className="text-xs text-muted-foreground"> · ID {row.entity_id}</span> : ''}</dd>
        <dt className="text-muted-foreground">Ringkasan</dt><dd className="break-words">{row.summary ?? '—'}</dd>
        <dt className="text-muted-foreground">ID log</dt><dd>#{row.id}</dd>
      </dl>
      <h3 className="mb-2 text-sm font-bold">{hasDiff ? 'Perubahan' : 'Data tercatat'}</h3>
      {d == null ? <p className="text-sm text-muted-foreground">Tidak ada data tambahan.</p>
        : hasDiff ? (
          <div className="space-y-3">
            <DiffTable before={d.before} after={d.after} />
            {Object.keys(d).filter((k) => k !== 'before' && k !== 'after').length > 0 && (
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 text-xs">{JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'before' && k !== 'after')), null, 2)}</pre>
            )}
          </div>
        ) : <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 text-xs">{JSON.stringify(d, null, 2)}</pre>}
      <p className="mt-4 text-xs text-muted-foreground">Log bersifat tetap: tidak dapat diubah atau dihapus dari aplikasi maupun database (dijaga trigger).</p>
      <div className="mt-4"><Button variant="outline" onClick={onClose}>Tutup</Button></div>
    </Drawer>
  );
}

const EMPTY = { action: '', actor: '', preset: '7', from: rangeOf('7').from, to: rangeOf('7').to };

export default function AuditLog() {
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [detail, setDetail] = useState<any>(null);
  const summary = useLoad(() => api.get('/audit-log/summary'));
  const { data, error, loading } = useLoad(() => api.get('/audit-log' + qs({ action: f.action, actor: f.actor, from: f.from, to: f.to, page, size })), [JSON.stringify(f), page, size]);
  const setFilter = (patch) => { setPage(1); setF((x) => ({ ...x, ...patch })); };
  const pickPreset = (p) => setFilter({ preset: p, ...rangeOf(p) });
  const filtered = f.action || f.actor || f.preset !== '7';

  const s = summary.data;
  const cats = (s?.categories ?? []).slice(0, 8);
  const pages = data ? Math.max(1, Math.ceil(data.total / size)) : 1;

  // kelompokkan entri per hari (urutan tetap menurun)
  const groups = useMemo(() => {
    const out: any[] = [];
    for (const r of data?.rows ?? []) {
      const day = String(r.at).slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.day === day) last.rows.push(r); else out.push({ day, rows: [r] });
    }
    return out;
  }, [data]);

  return (
    <Page eyebrow="Administrasi" title="Audit Log">
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile icon={Activity} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" label="Aktivitas 24 jam" value={s.events_24h}><Spark daily={s.daily} /></Tile>
          <Tile icon={LogIn} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" label="Login 24 jam" value={s.logins_24h}>
            <span className={s.failed_logins_24h ? 'font-bold text-red-600 dark:text-red-300' : ''}>{s.failed_logins_24h} gagal login</span>
          </Tile>
          <Tile icon={SlidersHorizontal} tone="bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300" label="Perubahan konfigurasi (7 hari)" value={s.config_changes_7d} sub="pengaturan, indikator, target, jalur karier" />
          <Tile icon={FileDown} tone="bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300" label="Unduhan laporan (7 hari)" value={s.exports_7d} sub={s.top_actors[0] ? `paling aktif: ${s.top_actors[0].actor_name} (${s.top_actors[0].n})` : 'belum ada aktivitas'} />
        </div>
      )}

      <div className="space-y-3 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari aktor…" value={f.actor} onChange={(e) => setFilter({ actor: e.target.value })} aria-label="Cari aktor" />
          </div>
          <div role="group" aria-label="Rentang waktu" className="inline-flex rounded-lg border bg-card p-0.5">
            {PRESETS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={f.preset === k} onClick={() => pickPreset(k)}
                className={cn('rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', f.preset === k ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <DatePicker className="w-auto min-w-40" value={f.from} onChange={(e) => setFilter({ from: e.target.value, preset: 'custom' })} aria-label="Dari tanggal" />
            <span className="text-muted-foreground">–</span>
            <DatePicker className="w-auto min-w-40" value={f.to} onChange={(e) => setFilter({ to: e.target.value, preset: 'custom' })} aria-label="Sampai tanggal" />
          </div>
          {filtered && <Button variant="ghost" size="sm" onClick={() => { setPage(1); setF(EMPTY); }}><RotateCcw />Reset</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Kategori">
          <button type="button" aria-pressed={!f.action} onClick={() => setFilter({ action: '' })} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition-colors', !f.action ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>Semua kategori</button>
          {cats.map((c) => {
            const meta = catOf(`${c.category}.x`);
            const on = f.action === `${c.category}.`;
            return (
              <button key={c.category} type="button" aria-pressed={on} onClick={() => setFilter({ action: on ? '' : `${c.category}.` })}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors', on ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                <meta.Icon className="size-3.5" />{meta.label}<span className="opacity-60">{c.n}</span>
              </button>
            );
          })}
          <span className="ml-1 text-[11px] text-muted-foreground">jumlah = 7 hari terakhir</span>
        </div>
      </div>

      <Loading loading={loading && !data} error={error}>
        {data && (
          <Card className={cn('transition-opacity', loading && 'opacity-60')}>
            {groups.length === 0 ? (
              <div className="grid place-items-center gap-2 py-10 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"><ShieldAlert className="size-7" /></span>
                <b>Tidak ada aktivitas yang cocok</b>
                <span className="text-sm text-muted-foreground">Ubah rentang waktu atau filter.</span>
              </div>
            ) : (
              <div className="space-y-5">
                {groups.map((g) => (
                  <Fragment key={g.day}>
                    <div>
                      <div className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground"><span>{dayLabel(g.day)}</span><span className="h-px flex-1 bg-border" /><span className="font-semibold normal-case">{g.rows.length} entri</span></div>
                      <ul className="divide-y">
                        {g.rows.map((r) => {
                          const c = catOf(r.action);
                          const risky = isRisky(r.action);
                          return (
                            <li key={r.id}>
                              <button type="button" onClick={() => setDetail(r)} className={cn('group flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40', risky && 'bg-red-50/60 hover:bg-red-50 dark:bg-red-500/5 dark:hover:bg-red-500/10')}>
                                <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl', c.cls)}>{risky ? <AlertTriangle className="size-4" /> : <c.Icon className="size-4" />}</span>
                                <span className="min-w-0 flex-1 leading-snug">
                                  <span className="flex flex-wrap items-center gap-x-1.5 text-[13.5px]">
                                    {r.actor_name ? <><PersonAvatar name={r.actor_name} className="size-5" textClass="text-[8px]" /><b>{r.actor_name}</b></> : <b>Sistem</b>}
                                    <span className={cn(risky && 'font-semibold text-red-700 dark:text-red-300')}>{verbOf(r.action)}</span>
                                  </span>
                                  {r.summary && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{r.summary}</span>}
                                </span>
                                <span className="hidden shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground sm:block">{c.label}</span>
                                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{String(r.at).slice(11, 16)}</span>
                                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <span className="text-xs text-muted-foreground">{data.total} entri{filtered ? ' sesuai filter' : ''} · halaman {page} dari {pages}</span>
              <div className="flex items-center gap-2">
                <FormSelect className="w-auto min-w-28" value={String(size)} onChange={(e) => { setPage(1); setSize(Number(e.target.value)); }} aria-label="Entri per halaman">
                  {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / halaman</option>)}
                </FormSelect>
                <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft /></Button>
                <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Halaman berikutnya"><ChevronRight /></Button>
              </div>
            </div>
          </Card>
        )}
      </Loading>
      <ErrorBox error={summary.error} />
      {detail && <Detail row={detail} onClose={() => setDetail(null)} />}
    </Page>
  );
}
