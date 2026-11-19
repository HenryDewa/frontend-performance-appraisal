import { useEffect, useMemo, useState } from 'react';
import type { Department } from '../types.ts';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, ClipboardList, Gauge, Info, ListChecks, Pencil, Plus, Power, Scale, SlidersHorizontal, Sparkles, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '../api.ts';
import { Badge, Card, Drawer, ErrorBox, Field, Loading, Page, SOURCE_LABEL, useAction, useLoad } from '../ui.tsx';

const SOURCES = Object.keys(SOURCE_LABEL);
const SENIORITIES = ['junior', 'middle', 'senior'];
const SRC_COLOR = { tech_lead: 'bg-blue-500', project_manager: 'bg-violet-500', client: 'bg-emerald-500', self: 'bg-amber-500', metrics: 'bg-cyan-500' };
const IND_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-fuchsia-500', 'bg-lime-500', 'bg-sky-500'];
const RULES = {
  extreme: { label: 'Komentar hanya untuk skor ekstrem', short: 'Skor ekstrem', desc: 'Komentar/evidence wajib hanya bila ada skor ≤ 2 atau 5.' },
  either: { label: 'Komentar atau evidence wajib', short: 'Wajib semua skor', desc: 'Setiap indikator wajib diberi komentar atau evidence.' },
  comment: { label: 'Komentar wajib', short: 'Komentar wajib', desc: 'Setiap indikator wajib diberi komentar tertulis.' },
  evidence: { label: 'Evidence wajib', short: 'Evidence wajib', desc: 'Setiap indikator wajib diberi evidence (tautan/catatan).' },
  none: { label: 'Tidak wajib', short: 'Tidak wajib', desc: 'Komentar dan evidence bersifat opsional.' },
};
const emptySub = () => ({ code: '', name: '', weight: '', rubric: { junior: '', middle: '', senior: '' } });
const num = (v) => Number(v) || 0;
const weightFor = (w, base, sen) => { const v = w?.[sen]; return v === '' || v == null ? num(base) : num(v); };
const near100 = (n) => Math.abs(n - 100) < 1e-9;

const MUTED = 'text-xs text-muted-foreground';
const TONE = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
};
const Notice = ({ tone = 'info', className, children }: { tone?: string; className?: any; children?: React.ReactNode }) => (
  <div role="status" className={cn('flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px]', TONE[tone], className)}>
    {tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : tone === 'info' ? <Info className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
    <div className="min-w-0">{children}</div>
  </div>
);

/** Bar bersegmen: items = [{ label, value, color }]. */
function StackBar({ items, className }: { items?: any; className?: any }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className={cn('flex h-3 overflow-hidden rounded-full bg-muted', className)} role="img" aria-label="Komposisi bobot">
      {items.filter((i) => i.value > 0).map((i) => <div key={i.label} className={cn(i.color, 'transition-all')} style={{ width: `${(i.value / total) * 100}%` }} title={`${i.label}: ${i.value}%`} />)}
    </div>
  );
}

/** Skala 0-100: zona Low / Middle / Top menurut ambang. */
function ThresholdScale({ middle, top }: { middle?: any; top?: any }) {
  const m = Math.min(100, Math.max(0, num(middle)));
  const t = Math.min(100, Math.max(m, num(top)));
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`Low di bawah ${m}, Middle ${m} sampai ${t}, Top mulai ${t}`}>
        <div className="bg-red-400" style={{ width: `${m}%` }} />
        <div className="bg-amber-400" style={{ width: `${t - m}%` }} />
        <div className="bg-emerald-500" style={{ width: `${100 - t}%` }} />
      </div>
      <div className="relative mt-1 h-4 text-[10.5px] font-semibold text-muted-foreground">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${m}%` }}>{m}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>{t}</span>
        <span className="absolute right-0">100</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-red-400" />Low &lt; {m}</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-amber-400" />Middle {m}–{t}</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-500" />Top ≥ {t}</span>
      </div>
    </div>
  );
}

const deptQs = (department) => (department ? `?department=${encodeURIComponent(department)}` : '');

export default function Config() {
  const [params, setParams] = useSearchParams();
  const department = params.get('department') || '';
  const depts = useLoad(() => api.get<Department[]>('/departments'));
  const dep = (depts.data ?? []).find((d) => d.name === department);
  const pickDept = (v) => { const n = new URLSearchParams(params); if (v) n.set('department', v); else n.delete('department'); setParams(n, { replace: true }); };
  const tab = ['indikator', 'penilaian'].includes(params.get('tab') as string) ? params.get('tab') : 'ringkasan';
  const setTab = (v) => { const n = new URLSearchParams(params); if (v === 'ringkasan') n.delete('tab'); else n.set('tab', v); setParams(n, { replace: true }); };
  return (
    <Page eyebrow="Administrasi" title="Konfigurasi penilaian">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <span className="text-sm font-medium">Set konfigurasi</span>
        <FormSelect className="w-auto min-w-48" value={department} onChange={(e) => pickDept(e.target.value)} aria-label="Set konfigurasi">
          <option value="">Default (semua departemen)</option>
          {(depts.data ?? []).map((d) => <option key={d.id} value={d.name}>{d.name}{d.own_config ? ' — khusus' : ' — memakai default'}</option>)}
        </FormSelect>
        <span className="text-xs text-muted-foreground">Departemen tanpa konfigurasi khusus memakai set default. Kelola konfigurasi khusus di halaman Departemen.</span>
      </div>
      {department && depts.data && !dep?.own_config && (
        <Notice tone="info">Departemen <b>{department}</b> belum punya konfigurasi sendiri dan memakai set default. Buat dari halaman <Link to="/departments" className="underline">Departemen</Link> untuk mengubah indikator dan bobotnya.</Notice>
      )}
      <Notice tone="info">Perubahan hanya berlaku untuk periode yang <b>dimulai setelahnya</b>; periode yang sedang berjalan memakai snapshot konfigurasinya sendiri. Semua perubahan tercatat di audit log.</Notice>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ringkasan"><Gauge className="size-4" />Ringkasan</TabsTrigger>
          <TabsTrigger value="indikator"><ClipboardList className="size-4" />Indikator &amp; bobot</TabsTrigger>
          <TabsTrigger value="penilaian"><SlidersHorizontal className="size-4" />Sumber, ambang &amp; kebijakan</TabsTrigger>
        </TabsList>
      </Tabs>
      {(!department || dep?.own_config) && (<>
        {tab === 'ringkasan' && <Overview goto={setTab} department={department} />}
        {tab === 'indikator' && <Indicators department={department} />}
        {tab === 'penilaian' && <Settings department={department} />}
      </>)}
    </Page>
  );
}

// ---------------------------------------------------------------- Ringkasan
function Overview({ goto, department }: { goto?: any; department?: any }) {
  const ind = useLoad(() => api.get('/indicators' + deptQs(department)), [department]);
  const set = useLoad(() => api.get('/settings' + deptQs(department)), [department]);
  const [sen, setSen] = useState('middle');

  return (
    <Loading loading={(ind.loading && !ind.data) || (set.loading && !set.data)} error={ind.error || set.error}>
      {ind.data && set.data && <OverviewBody ind={ind.data} s={set.data} sen={sen} setSen={setSen} goto={goto} />}
    </Loading>
  );
}

function OverviewBody({ ind, s, sen, setSen, goto }: { ind?: any; s?: any; sen?: any; setSen?: any; goto?: any }) {
  const active = ind.indicators.filter((i) => i.active);
  const subTotal = active.reduce((n, i) => n + i.sub_indicators.length, 0);
  const srcTotal = Object.values<any>(s.source_weights).reduce((a, b) => a + num(b), 0);
  const thBad = SENIORITIES.filter((x) => !(num(s.thresholds?.[x]?.middle) > 0 && num(s.thresholds[x].middle) < num(s.thresholds[x].top) && num(s.thresholds[x].top) <= 100));
  const swBad = active.filter((i) => Object.values(i.source_weights ?? {}).some((v) => v != null && v !== '') && !near100(i.sources.reduce((t, k) => t + num(i.source_weights[k]), 0)));
  const subBad = active.filter((i) => i.sub_indicators.some((x) => num(x.weight) > 0) && !near100(i.sub_indicators.reduce((t, x) => t + num(x.weight), 0)));
  const ruleCount = Object.fromEntries(Object.keys(RULES).map((k) => [k, active.filter((i) => i.evidence_rule === k).length]));

  const checks = [
    { ok: SENIORITIES.every((x) => near100(ind.totals_by_seniority?.[x] ?? 0)), title: 'Bobot indikator = 100% untuk tiap seniority', detail: SENIORITIES.map((x) => `${x[0].toUpperCase() + x.slice(1)} ${ind.totals_by_seniority?.[x] ?? 0}%`).join(' · '), tab: 'indikator' },
    { ok: near100(srcTotal), title: 'Bobot sumber penilai global = 100%', detail: `Total ${srcTotal}%`, tab: 'penilaian' },
    { ok: thBad.length === 0, title: 'Ambang klasifikasi valid', detail: thBad.length ? `Perlu diperbaiki: ${thBad.join(', ')}` : 'Low < Middle < Top untuk semua seniority', tab: 'penilaian' },
    { ok: swBad.length === 0, title: 'Bobot sumber per indikator = 100%', detail: swBad.length ? swBad.map((i) => i.name).join(', ') : 'Tidak ada bobot sumber khusus yang salah', tab: 'indikator' },
    { ok: subBad.length === 0, title: 'Bobot sub-indikator = 100%', detail: subBad.length ? subBad.map((i) => i.name).join(', ') : 'Semua sub-indikator seimbang', tab: 'indikator' },
  ];
  const ready = checks.every((c) => c.ok);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [ClipboardList, 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300', 'Indikator aktif', active.length, `${ind.indicators.length - active.length} nonaktif`],
          [ListChecks, 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', 'Sub-indikator', subTotal, `${active.filter((i) => !i.sub_indicators.length).length} indikator dinilai langsung`],
          [Users, 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', 'Sumber penilai', SOURCES.filter((k) => num(s.source_weights[k]) > 0).length, 'dengan bobot global > 0'],
          [Scale, 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', 'Sumber hilang', s.missing_policy === 'block' ? 'Blokir' : 'Redistribusi', s.missing_policy === 'block' ? 'skor tidak dihitung' : 'bobot dibagi ulang & ditandai'],
        ].map(([Icon, tone, label, value, sub]) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-6" /></span>
            <div className="min-w-0"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="text-2xl font-extrabold leading-tight tracking-tight">{value}</div><div className="truncate text-xs text-muted-foreground">{sub}</div></div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card
          title={<span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />Kesehatan konfigurasi</span>}
          actions={<Badge tone={ready ? 'green' : 'amber'}>{ready ? 'Siap untuk periode baru' : 'Perlu perbaikan'}</Badge>}
        >
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c.title} className="flex items-start gap-3">
                <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', c.ok ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300')}>
                  {c.ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                </span>
                <div className="min-w-0 flex-1 text-sm"><b>{c.title}</b><div className="text-[13px] text-muted-foreground">{c.detail}</div></div>
                {!c.ok && <Button size="sm" variant="outline" onClick={() => goto(c.tab)}>Perbaiki</Button>}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Periode tidak dapat dimulai selama ada pemeriksaan yang gagal. Sistem juga memeriksa hal yang sama saat periode dimulai.</p>
        </Card>

        <Card
          title="Komposisi bobot indikator"
          actions={(
            <div role="group" aria-label="Seniority" className="inline-flex rounded-lg border bg-card p-0.5">
              {SENIORITIES.map((x) => (
                <button key={x} type="button" aria-pressed={sen === x} onClick={() => setSen(x)}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors', sen === x ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}>{x}</button>
              ))}
            </div>
          )}
        >
          <StackBar className="mb-3" items={active.map((i, k) => ({ label: i.name, value: weightFor(i.weights, i.weight, sen), color: IND_COLORS[k % IND_COLORS.length] }))} />
          <div className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
            {active.map((i, k) => {
              const w = weightFor(i.weights, i.weight, sen);
              return (
                <div key={i.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2"><i className={cn('size-2.5 shrink-0 rounded-full', IND_COLORS[k % IND_COLORS.length])} /><span className="truncate">{i.name}</span></span>
                  <b className={cn(w !== num(i.weight) && 'text-primary', w === 0 && 'text-muted-foreground')}>{w}%</b>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-sm"><span className="text-muted-foreground">Total {sen}</span><b className={near100(ind.totals_by_seniority?.[sen] ?? 0) ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}>{ind.totals_by_seniority?.[sen] ?? 0}%</b></div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Bobot sumber penilai">
          <StackBar className="mb-3" items={SOURCES.map((k) => ({ label: SOURCE_LABEL[k], value: num(s.source_weights[k]), color: SRC_COLOR[k] }))} />
          <div className="space-y-1">{SOURCES.map((k) => <div key={k} className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2"><i className={cn('size-2.5 rounded-full', SRC_COLOR[k])} />{SOURCE_LABEL[k]}</span><b>{num(s.source_weights[k])}%</b></div>)}</div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => goto('penilaian')}><Pencil />Ubah</Button>
        </Card>
        <Card title="Ambang klasifikasi">
          <div className="space-y-4">{SENIORITIES.map((x) => (
            <div key={x}><div className="mb-1.5 text-xs font-bold capitalize">{x}</div><ThresholdScale middle={s.thresholds?.[x]?.middle} top={s.thresholds?.[x]?.top} /></div>
          ))}</div>
        </Card>
        <Card title="Aturan komentar & evidence">
          <div className="space-y-2">
            {Object.entries(RULES).filter(([k]) => ruleCount[k] > 0).map(([k, r]) => (
              <div key={k} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px]"><span><b>{r.short}</b><div className="text-xs text-muted-foreground">{r.desc}</div></span><Badge tone="blue">{ruleCount[k]}</Badge></div>
            ))}
            {active.length === 0 && <p className="text-sm text-muted-foreground">Belum ada indikator aktif.</p>}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => goto('indikator')}><Pencil />Atur di indikator</Button>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Indikator
function Section({ n, title, desc, children }: { n?: any; title?: any; desc?: any; children?: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{n}</span>
        <div className="leading-tight"><h3 className="m-0 text-[14px] font-bold">{title}</h3>{desc && <p className={cn('mt-0.5', MUTED)}>{desc}</p>}</div>
      </div>
      {children}
    </section>
  );
}

function Indicators({ department }: { department?: any }) {
  const { data, error, loading, reload } = useLoad(() => api.get('/indicators' + deptQs(department)), [department]);
  const [edit, setEdit] = useState<any>(null);
  const { busy, error: err, run, setError } = useAction();
  const confirm = useConfirm();
  const open = (i) => { setError(null); setEdit(i); };

  // validasi live editor
  const swFilled = edit ? edit.sources.some((k) => edit.source_weights[k] !== '' && edit.source_weights[k] != null) : false;
  const swSum = edit ? edit.sources.reduce((s, src) => s + num(edit.source_weights[src]), 0) : 0;
  const subBad = (edit?.sub_indicators ?? []).filter((s) => !/^[a-z0-9_]+$/.test(s.code) || !s.name);
  const subDup = (edit?.sub_indicators ?? []).length !== new Set((edit?.sub_indicators ?? []).map((s) => s.code)).size;
  const subAnyWeight = (edit?.sub_indicators ?? []).some((s) => num(s.weight) > 0);
  const subSum = (edit?.sub_indicators ?? []).reduce((s, x) => s + num(x.weight), 0);
  const valid = edit && edit.sources.length > 0 && (!swFilled || swSum === 100) && subBad.length === 0 && !subDup && (!subAnyWeight || subSum === 100);

  // bobot per seniority: kosong = ikut bobot dasar
  const wOn = edit ? SENIORITIES.some((s) => edit.weights?.[s] !== '' && edit.weights?.[s] != null) : false;
  const totalsFor = (sen) => (data?.indicators ?? [])
    .filter((i) => i.active && (!edit?.id || i.id !== edit.id))
    .reduce((t, i) => t + weightFor(i.weights, i.weight, sen), 0)
    + (edit?.active ? weightFor(wOn ? edit.weights : {}, edit?.weight, sen) : 0);

  const applyExtreme = async () => {
    if (!(await confirm({
      title: 'Terapkan aturan ke semua indikator?', tone: 'warning', confirmText: 'Terapkan',
      description: 'Komentar/evidence akan wajib hanya bila ada skor ekstrem (≤ 2 atau 5) pada SEMUA indikator.\nBerlaku untuk periode yang dimulai berikutnya; periode berjalan tetap memakai aturan lamanya.',
    }))) return;
    run(async () => { await api.post('/indicators/evidence-rule', { evidence_rule: 'extreme', department: department || null }); toast.success('Aturan diterapkan ke semua indikator'); reload(); });
  };

  const toggleActive = async (i) => {
    if (i.active && !(await confirm({
      title: 'Nonaktifkan indikator?', tone: 'warning', confirmText: 'Nonaktifkan',
      description: `"${i.name}" tidak akan dinilai pada periode berikutnya dan bobotnya tidak dihitung. Pastikan total bobot tiap seniority tetap 100%.`,
    }))) return;
    run(async () => { await api.patch(`/indicators/${i.id}`, { active: !i.active }); toast.success(`${i.name} ${i.active ? 'dinonaktifkan' : 'diaktifkan'}`); reload(); });
  };

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const wts = wOn ? Object.fromEntries(SENIORITIES.filter((s) => edit.weights[s] !== '' && edit.weights[s] != null).map((s) => [s, Number(edit.weights[s])])) : null;
      // hanya bobot untuk sumber yang dipilih; bobot sumber yang sudah dilepas tidak ikut tersimpan (kolomnya disembunyikan sehingga tidak terlihat)
      const sw = Object.fromEntries(Object.entries(edit.source_weights).filter(([k, v]) => edit.sources.includes(k) && v !== '' && v != null).map(([k, v]) => [k, Number(v)]));
      const body = {
        name: edit.name, description: edit.description || null, weight: Number(edit.weight), evidence_rule: edit.evidence_rule,
        sources: edit.sources, active: edit.active, rubric: edit.rubric, weights: wts,
        source_weights: Object.keys(sw).length ? sw : null,
        sub_indicators: edit.sub_indicators.length ? edit.sub_indicators.map((s) => ({ code: s.code, name: s.name, weight: Number(s.weight) || 0, rubric: s.rubric })) : null,
      };
      if (edit.id) await api.patch(`/indicators/${edit.id}`, body);
      else await api.post('/indicators', { ...body, code: edit.code, department: department || null });
      toast.success(edit.id ? `Indikator "${edit.name}" diperbarui` : `Indikator "${edit.name}" ditambahkan`);
      setEdit(null); reload();
    });
  };
  const upSub = (idx, patch) => setEdit({ ...edit, sub_indicators: edit.sub_indicators.map((x, j) => (j === idx ? { ...x, ...patch } : x)) });
  const editOf = (i) => ({
    ...i, weights: Object.fromEntries(SENIORITIES.map((s) => [s, i.weights?.[s] ?? ''])), rubric: { junior: '', middle: '', senior: '', ...i.rubric },
    source_weights: { ...Object.fromEntries(i.sources.map((s) => [s, ''])), ...i.source_weights },
    sub_indicators: i.sub_indicators.map((s) => ({ ...s, weight: s.weight ?? '', rubric: { junior: '', middle: '', senior: '', ...s.rubric } })),
  });
  const blank = { code: '', name: '', description: '', weight: 0, evidence_rule: 'extreme', sources: ['tech_lead'], active: true, rubric: { junior: '', middle: '', senior: '' }, weights: {}, source_weights: {}, sub_indicators: [] };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Indikator menentukan <b>apa</b> yang dinilai, dengan bobot, sumber penilai, dan rubrik per seniority.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={applyExtreme} title="Komentar/evidence wajib hanya bila ada skor ≤ 2 atau 5. Berlaku untuk periode yang dimulai berikutnya."><Sparkles />Terapkan “hanya skor ekstrem” ke semua</Button>
          <Button size="sm" onClick={() => open({ ...blank })}><Plus />Indikator</Button>
        </div>
      </div>
      <ErrorBox error={err && !edit ? err : null} />
      <Loading loading={loading && !data} error={error}>
        {data && (
          <>
            <Card>
              <div className="grid gap-3 sm:grid-cols-3">
                {SENIORITIES.map((sen) => {
                  const t = data.totals_by_seniority?.[sen] ?? 0;
                  const ok = near100(t);
                  return (
                    <div key={sen} className={cn('rounded-xl border p-3', ok ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5' : 'border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5')}>
                      <div className="mb-1.5 flex items-center justify-between"><b className="text-sm capitalize">{sen}</b><span className={cn('flex items-center gap-1 text-sm font-extrabold', ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>{ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}{t}%</span></div>
                      <StackBar items={data.indicators.filter((i) => i.active).map((i, k) => ({ label: i.name, value: weightFor(i.weights, i.weight, sen), color: IND_COLORS[k % IND_COLORS.length] }))} className="h-2" />
                      {!ok && <div className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">Harus 100% — {t > 100 ? `kelebihan ${Math.round((t - 100) * 100) / 100}%` : `kurang ${Math.round((100 - t) * 100) / 100}%`}</div>}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-3">
              {data.indicators.map((i, k) => {
                const hasSen = i.weights && Object.keys(i.weights).length > 0;
                return (
                  <div key={i.id} className={cn('rounded-2xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md', !i.active && 'opacity-60')}>
                    <div className="flex flex-wrap items-start gap-4">
                      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white', IND_COLORS[k % IND_COLORS.length])}>{k + 1}</span>
                      <div className="min-w-0 flex-1 basis-64">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-[15px] font-extrabold tracking-tight">{i.name}</h3>{!i.active && <Badge>inactive</Badge>}</div>
                        {i.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{i.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {i.sources.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium"><i className={cn('size-1.5 rounded-full', SRC_COLOR[s])} />{SOURCE_LABEL[s]}{i.source_weights?.[s] != null ? ` ${i.source_weights[s]}%` : ''}</span>
                          ))}
                          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{i.sub_indicators.length ? `${i.sub_indicators.length} sub-indikator` : 'dinilai langsung'}</span>
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" title={RULES[i.evidence_rule]?.desc}>{RULES[i.evidence_rule]?.short}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-5">
                        <div className="text-center"><div className="text-2xl font-extrabold leading-none">{i.weight}%</div><div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">bobot dasar</div></div>
                        {hasSen && (
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {SENIORITIES.map((s) => { const w = i.weights[s] ?? i.weight; return <div key={s}><div className={cn('text-sm font-bold', w !== i.weight && 'text-primary', w === 0 && 'text-muted-foreground')}>{w}%</div><div className="text-[10px] font-semibold uppercase text-muted-foreground">{s.slice(0, 3)}</div></div>; })}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => open(editOf(i))}><Pencil />Ubah</Button>
                        <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label={i.active ? 'Nonaktifkan' : 'Aktifkan'} title={i.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleActive(i)}><Power /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.indicators.length === 0 && <Card><p className="py-6 text-center text-muted-foreground">Belum ada indikator. Tambahkan indikator pertama.</p></Card>}
            </div>
          </>
        )}
      </Loading>

      {edit && (
        <Drawer title={edit.id ? `Ubah indikator — ${edit.name}` : 'Indikator baru'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save}>
            <Section n={1} title="Dasar" desc="Identitas indikator dan aturan komentar/evidence.">
              <div className="grid gap-x-4 md:grid-cols-2">
                {!edit.id && <Field label="Kode" hint="huruf kecil, angka, dan _"><Input value={edit.code} pattern="[a-z0-9_]+" onChange={(e) => setEdit({ ...edit, code: e.target.value })} required /></Field>}
                <Field label="Nama"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
                <Field label="Bobot dasar (%)" hint="Dipakai semua seniority kecuali diatur khusus di bawah"><Input type="number" min="0" max="100" step="0.5" value={edit.weight} onChange={(e) => setEdit({ ...edit, weight: e.target.value })} required /></Field>
                <Field label="Aturan komentar/evidence" hint={RULES[edit.evidence_rule]?.desc}>
                  <FormSelect value={edit.evidence_rule} onChange={(e) => setEdit({ ...edit, evidence_rule: e.target.value })}>
                    {Object.entries(RULES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                  </FormSelect>
                </Field>
              </div>
              <Field label="Deskripsi"><Input value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-[13px]"><Checkbox checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v === true })} />Indikator aktif</label>
            </Section>

            <Section n={2} title="Bobot per seniority" desc="Nonaktif = semua seniority memakai bobot dasar. Bobot 0 berarti indikator tidak dinilai untuk seniority tersebut.">
              <label className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                <Checkbox checked={wOn} onCheckedChange={(v) => setEdit({ ...edit, weights: v === true ? Object.fromEntries(SENIORITIES.map((s) => [s, edit.weight])) : { junior: '', middle: '', senior: '' } })} />
                Bobot berbeda per seniority
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {SENIORITIES.map((s) => {
                  const t = totalsFor(s);
                  const ok = near100(t);
                  return (
                    <div key={s}>
                      <span className="mb-1 block text-xs font-semibold capitalize">{s}</span>
                      <Input type="number" min="0" max="100" step="0.5" disabled={!wOn} placeholder={String(edit.weight)} value={edit.weights?.[s] ?? ''} onChange={(e) => setEdit({ ...edit, weights: { ...edit.weights, [s]: e.target.value } })} />
                      <span className={cn('mt-1 block text-[11px]', ok ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>Total semua indikator: {t}%{ok ? ' ✓' : ' (harus 100)'}</span>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section n={3} title="Sumber penilai" desc="Siapa yang menilai indikator ini, dan seberapa besar pengaruh masing-masing.">
              <div className="mb-3 flex flex-wrap gap-2">
                {SOURCES.map((s) => {
                  const on = edit.sources.includes(s);
                  return (
                    <button key={s} type="button" aria-pressed={on} onClick={() => setEdit({ ...edit, sources: on ? edit.sources.filter((x) => x !== s) : [...edit.sources, s] })}
                      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors', on ? 'border-primary/50 bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                      <i className={cn('size-2 rounded-full', SRC_COLOR[s])} />{SOURCE_LABEL[s]}
                    </button>
                  );
                })}
              </div>
              {edit.sources.length === 0 && <Notice tone="error" className="mb-3">Pilih minimal satu sumber penilai.</Notice>}
              <div className="mb-1 text-[13px] font-semibold">Bobot sumber khusus indikator ini <span className="font-normal text-muted-foreground">(opsional)</span></div>
              <p className={cn('mb-3', MUTED)}>Kosongkan semua untuk memakai bobot sumber global. Jika diisi, total untuk sumber yang dipilih harus 100%.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {edit.sources.map((s) => (
                  <Field key={s} label={SOURCE_LABEL[s]}><Input type="number" min="0" max="100" value={edit.source_weights[s] ?? ''} onChange={(e) => setEdit({ ...edit, source_weights: { ...edit.source_weights, [s]: e.target.value } })} placeholder="global" /></Field>
                ))}
              </div>
              {swFilled && <Notice tone={swSum === 100 ? 'ok' : 'warn'}>Total bobot sumber indikator ini: <b>{swSum}%</b>{swSum === 100 ? '' : ' — harus 100%'}</Notice>}
            </Section>

            <Section n={4} title="Sub-indikator" desc="Pecah indikator menjadi butir konkret dengan rubrik per seniority agar penilaian berbasis fakta. Kosongkan bila cukup dinilai langsung.">
              {edit.sub_indicators.map((s, idx) => (
                <div key={idx} className="mb-3 rounded-xl bg-muted/60 p-3">
                  <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label={`Kode sub ${idx + 1}`}><Input value={s.code} pattern="[a-z0-9_]+" onChange={(e) => upSub(idx, { code: e.target.value })} placeholder="mis. js_ts" /></Field>
                    <Field label="Nama"><Input value={s.name} onChange={(e) => upSub(idx, { name: e.target.value })} /></Field>
                    <Field label="Bobot (%)"><Input type="number" min="0" max="100" value={s.weight} onChange={(e) => upSub(idx, { weight: e.target.value })} placeholder="kosong = rata" /></Field>
                    <div className="mb-3 grid content-end"><Button type="button" variant="destructive" size="sm" onClick={() => setEdit({ ...edit, sub_indicators: edit.sub_indicators.filter((_, j) => j !== idx) })}>Hapus sub</Button></div>
                  </div>
                  {SENIORITIES.map((l) => (
                    <Field key={l} label={`Rubrik ${l}`}><Textarea className="min-h-12 bg-card" value={s.rubric[l] ?? ''} onChange={(e) => upSub(idx, { rubric: { ...s.rubric, [l]: e.target.value } })} /></Field>
                  ))}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEdit({ ...edit, sub_indicators: [...edit.sub_indicators, emptySub()] })}><Plus />Sub-indikator</Button>
              {edit.sub_indicators.length > 0 && (
                <Notice tone={!subAnyWeight || subSum === 100 ? 'ok' : 'warn'} className="mt-3">
                  Total bobot sub-indikator: <b>{subSum}%</b> {!subAnyWeight ? '— semua kosong: rata-rata sama' : subSum === 100 ? '' : '— harus 100%'}
                  {subDup && <div>Kode sub-indikator duplikat.</div>}
                  {subBad.length > 0 && <div>Ada sub-indikator dengan kode/nama tidak valid.</div>}
                </Notice>
              )}
            </Section>

            <ErrorBox error={err} />
            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t bg-card px-4 py-3">
              <span className={cn('text-xs', valid ? 'text-muted-foreground' : 'font-semibold text-amber-700 dark:text-amber-300')}>{valid ? 'Semua isian valid' : 'Perbaiki isian yang ditandai sebelum menyimpan'}</span>
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>Batal</Button><Button disabled={busy || !valid}>Simpan</Button></div>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Sumber, ambang & kebijakan
const SENIORITY_HINT = {
  junior: 'Dievaluasi terhadap ekspektasi levelnya, bukan ekspektasi Senior.',
  middle: 'Mandiri pada lingkupnya.',
  senior: 'Arsitektur, mentoring, tanggung jawab lintas modul.',
};
const POLICIES = {
  redistribute: { title: 'Redistribusi bobot', desc: 'Bobot sumber yang tidak tersedia dibagi ulang ke sumber yang ada dan ditandai pada hasil. Evaluasi tetap dapat diselesaikan.' },
  block: { title: 'Blokir kalkulasi', desc: 'Skor tidak dihitung sampai semua sumber yang relevan terisi. Lebih ketat, tetapi evaluasi bisa tertahan.' },
};

function Settings({ department }: { department?: any }) {
  const { data, error, loading, reload } = useLoad(() => api.get('/settings' + deptQs(department)), [department]);
  const [s, setS] = useState<any>(null);
  const { busy, error: err, run } = useAction();
  useEffect(() => { if (data) setS(structuredClone(data)); }, [data]);

  const norm = (x) => x && ({
    source_weights: Object.fromEntries(SOURCES.map((k) => [k, num(x.source_weights?.[k])])),
    thresholds: Object.fromEntries(SENIORITIES.map((k) => [k, { middle: num(x.thresholds?.[k]?.middle), top: num(x.thresholds?.[k]?.top) }])),
    missing_policy: x.missing_policy,
  });
  const dirty = useMemo(() => JSON.stringify(norm(s)) !== JSON.stringify(norm(data)), [s, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if ((loading && !data) || error || !s) return <Loading loading={loading} error={error} />;
  const total = SOURCES.reduce((a, k) => a + num(s.source_weights[k]), 0);
  const setT = (sen, k, v) => setS({ ...s, thresholds: { ...s.thresholds, [sen]: { ...s.thresholds[sen], [k]: v } } });
  const thErr = (sen) => { const m = num(s.thresholds[sen].middle); const t = num(s.thresholds[sen].top); return !(m > 0 && m < t && t <= 100) ? 'Harus 0 < Middle < Top ≤ 100' : null; };
  const anyThErr = SENIORITIES.some(thErr);
  const canSave = dirty && near100(total) && !anyThErr;
  const equalize = () => { const n = SOURCES.filter((k) => num(s.source_weights[k]) > 0); const base = Math.floor(100 / n.length); setS({ ...s, source_weights: Object.fromEntries(SOURCES.map((k) => [k, n.includes(k) ? base + (k === n[0] ? 100 - base * n.length : 0) : 0])) }); };

  const save = () => run(async () => {
    await api.put('/settings' + deptQs(department), { ...norm(s) });
    toast.success('Pengaturan penilaian disimpan');
    reload();
  });

  return (
    <div className="space-y-4 pb-20">
      <Card
        title="Bobot sumber penilai (global)"
        actions={<span className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={equalize}>Bagi rata</Button><Badge tone={near100(total) ? 'green' : 'amber'}>Total {total}%</Badge></span>}
      >
        <p className={cn('mb-3', MUTED)}>Dipakai oleh indikator yang tidak punya bobot sumber sendiri. Total harus 100%.</p>
        <StackBar className="mb-4" items={SOURCES.map((k) => ({ label: SOURCE_LABEL[k], value: num(s.source_weights[k]), color: SRC_COLOR[k] }))} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SOURCES.map((k) => (
            <div key={k}>
              <span className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><i className={cn('size-2.5 rounded-full', SRC_COLOR[k])} />{SOURCE_LABEL[k]}</span>
              <div className="relative">
                <Input type="number" min="0" max="100" className="pr-8" value={s.source_weights[k] ?? 0} onChange={(e) => setS({ ...s, source_weights: { ...s.source_weights, [k]: e.target.value } })} aria-label={`Bobot ${SOURCE_LABEL[k]}`} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        {!near100(total) && <Notice tone="warn" className="mt-3">Total saat ini {total}% — {total > 100 ? `kelebihan ${total - 100}%` : `kurang ${100 - total}%`}.</Notice>}
      </Card>

      <Card title="Ambang klasifikasi per seniority">
        <p className={cn('mb-4', MUTED)}>Setiap seniority diadu dengan standar levelnya sendiri: Junior tidak dinilai rendah hanya karena belum mampu melakukan tanggung jawab Senior.</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {SENIORITIES.map((sen) => {
            const e = thErr(sen);
            return (
              <div key={sen} className={cn('rounded-2xl border p-4', e && 'border-red-300 dark:border-red-500/40')}>
                <b className="text-sm capitalize">{sen}</b>
                <div className={cn('mb-3', MUTED)}>{SENIORITY_HINT[sen]}</div>
                <ThresholdScale middle={s.thresholds[sen].middle} top={s.thresholds[sen].top} />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Field label="Middle mulai dari"><Input type="number" min="0" max="100" value={s.thresholds[sen].middle} onChange={(ev) => setT(sen, 'middle', ev.target.value)} /></Field>
                  <Field label="Top mulai dari"><Input type="number" min="0" max="100" value={s.thresholds[sen].top} onChange={(ev) => setT(sen, 'top', ev.target.value)} /></Field>
                </div>
                {e && <p className="text-xs font-semibold text-destructive">{e}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Jika sumber penilaian tidak tersedia">
        <p className={cn('mb-3', MUTED)}>Ditampilkan eksplisit pada snapshot periode dan hasil evaluasi; sumber yang hilang tidak pernah dianggap nol secara diam-diam.</p>
        <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Kebijakan sumber hilang">
          {Object.entries(POLICIES).map(([k, p]) => (
            <button key={k} type="button" role="radio" aria-checked={s.missing_policy === k} onClick={() => setS({ ...s, missing_policy: k })}
              className={cn('flex gap-3 rounded-2xl border p-4 text-left transition-all', s.missing_policy === k ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'hover:border-primary/40 hover:bg-muted/40')}>
              <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2', s.missing_policy === k ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{s.missing_policy === k && <CheckCircle2 className="size-3.5" />}</span>
              <span className="leading-snug"><b className="block text-sm">{p.title}</b><span className="text-[13px] text-muted-foreground">{p.desc}</span></span>
            </button>
          ))}
        </div>
      </Card>

      <ErrorBox error={err} />
      <div className={cn('fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform lg:left-64', dirty ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!dirty}>
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2">
          <span className={cn('text-sm', canSave ? 'text-muted-foreground' : 'font-semibold text-amber-700 dark:text-amber-300')}>
            {canSave ? 'Ada perubahan yang belum disimpan' : !near100(total) ? 'Total bobot sumber harus 100%' : anyThErr ? 'Perbaiki ambang klasifikasi yang ditandai' : ''}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setS(structuredClone(data))}>Batalkan perubahan</Button>
            <Button type="button" disabled={busy || !canSave} onClick={save}>Simpan perubahan</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
