import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Department } from '../types.ts';
import { DatePicker } from '@/components/ui/date-picker';
import { useConfirm } from '@/components/ConfirmProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { api } from '../api.ts';
import { useAuth, isHR } from '../auth.tsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, Card, ErrorBox, Field, Page, SOURCE_LABEL, fmtDate, useAction } from '../ui.tsx';
import { todayWib } from '../lib/time.ts';
import { StepEvaluators } from '../components/WizardEvaluatorStep.tsx';
import { PLAN_SOURCES, missingMandatory } from '../lib/wizardEligibility.ts';

const STEPS = ['Informasi', 'Cakupan karyawan', 'Evaluator', 'Tinjau & buat'];
const SEN_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

// ---------- tanggal ----------
const iso = (d) => d.toISOString().slice(0, 10);
function addDays(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
function defaultInfo() {
  const [ys, ms] = todayWib().split('-');
  const y = Number(ys);
  const q = Math.floor((Number(ms) - 1) / 3);
  const start = iso(new Date(Date.UTC(y, q * 3, 1)));
  const end = iso(new Date(Date.UTC(y, q * 3 + 3, 0)));
  return { name: `Evaluasi Q${q + 1} ${y}`, department: '', start_date: start, end_date: end, deadline: addDays(end, 14) };
}
/** Ringkasan isi wizard; dibandingkan dengan yang terakhir disimpan untuk mengetahui ada perubahan yang belum tersimpan. */
function sigOf(info: any, selected: number[], rows: any[] | null) {
  return JSON.stringify([info, [...selected].sort((a, b) => a - b), rows ? rows.map((r) => [r.employee.id, r.proposals.map((p) => [p.source, p.evaluator_user_id, p.project_id ?? null])]) : null]);
}
const buildAssignments = (rows: any[]) => rows.flatMap((r) => r.proposals.map((p) => ({ employee_id: r.employee.id, source: p.source, evaluator_user_id: p.evaluator_user_id, ...(p.project_id ? { project_id: p.project_id } : {}) })));

function infoErrors(f) {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = 'Nama periode wajib diisi';
  if (!f.start_date) e.start_date = 'Tanggal mulai wajib diisi';
  if (!f.end_date) e.end_date = 'Tanggal akhir wajib diisi';
  if (!f.deadline) e.deadline = 'Tenggat wajib diisi';
  if (f.start_date && f.end_date && f.start_date > f.end_date) e.end_date = 'Tanggal akhir harus sama/setelah tanggal mulai';
  if (f.start_date && f.deadline && f.deadline < f.start_date) e.deadline = 'Tenggat tidak boleh sebelum tanggal mulai';
  return e;
}

// ---------- stepper ----------
function Stepper({ step, maxStep, onGo }: { step?: any; maxStep?: any; onGo?: any }) {
  return (
    <nav aria-label="Langkah pembuatan periode">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = i <= maxStep && !active;
          return (
            <li key={label} className={cn('flex items-center gap-2', i < STEPS.length - 1 && 'flex-1')} aria-current={active ? 'step' : undefined}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onGo(i)}
                className={cn('flex items-center gap-2 rounded-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', reachable && 'cursor-pointer')}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors',
                    done && 'border-primary bg-primary text-primary-foreground',
                    active && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
                    !done && !active && 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-muted-foreground', !active && 'hidden md:inline')}>
                  <span className="sr-only">{done ? 'Selesai: ' : active ? 'Langkah saat ini: ' : 'Berikutnya: '}</span>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && <span aria-hidden className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------- langkah 1 ----------
function StepInfo({ info, setInfo, errors, touched, depts }: { info?: any; setInfo?: any; errors?: any; touched?: any; depts?: any }) {
  const set = (k) => (e) => setInfo({ ...info, [k]: e.target.value });
  const err = (k) => (touched ? errors[k] : null);
  const Err = ({ k }: { k?: any }) => (err(k) ? <small role="alert" className="text-xs text-destructive">{err(k)}</small> : null);
  return (
    <Card title="Informasi periode">
      <div className="max-w-2xl">
        <Field label="Nama periode"><Input value={info.name} onChange={set('name')} aria-invalid={!!err('name')} placeholder="Evaluasi Q4 2026" /><Err k="name" /></Field>
        <Field label="Departemen" hint="Periode khusus satu departemen memakai konfigurasi penilaiannya; “Semua departemen” memakai set default dan tidak boleh memuat departemen yang punya konfigurasi sendiri.">
          <FormSelect value={info.department} onChange={set('department')} aria-label="Departemen periode">
            <option value="">Semua departemen (default)</option>
            {depts.filter((d) => d.active).map((d) => <option key={d.id} value={d.name}>{d.name}{d.own_config ? ' — konfigurasi khusus' : ''}</option>)}
          </FormSelect>
        </Field>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label="Mulai"><DatePicker value={info.start_date} onChange={set('start_date')} aria-invalid={!!err('start_date')} /><Err k="start_date" /></Field>
          <Field label="Akhir"><DatePicker value={info.end_date} onChange={set('end_date')} aria-invalid={!!err('end_date')} /><Err k="end_date" /></Field>
          <Field label="Tenggat pengisian"><DatePicker value={info.deadline} onChange={set('deadline')} aria-invalid={!!err('deadline')} /><Err k="deadline" /></Field>
        </div>
        <p className="text-xs text-muted-foreground">Penugasan project dicocokkan dengan rentang Mulai–Akhir. Tenggat adalah batas pengisian penilaian oleh evaluator.</p>
      </div>
    </Card>
  );
}

// ---------- langkah 2 ----------
function StepScope({ employees, loading, error, selected, setSelected }: { employees?: any; loading?: any; error?: any; selected?: any; setSelected?: any }) {
  const [q, setQ] = useState('');
  const [sen, setSen] = useState('');
  const [dept, setDept] = useState('');
  const depts = useMemo(() => [...new Set<string>(employees.map((e) => e.department).filter(Boolean))].sort(), [employees]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return employees.filter((e) => (!k || `${e.code} ${e.name}`.toLowerCase().includes(k)) && (!sen || e.seniority === sen) && (!dept || e.department === dept));
  }, [employees, q, sen, dept]);
  const sel = new Set(selected);
  const toggle = (id) => setSelected(sel.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allShown = shown.length > 0 && shown.every((e) => sel.has(e.id));
  return (
    <Card title="Cakupan karyawan" actions={<span className="text-sm text-muted-foreground" aria-live="polite">{selected.length} dari {employees.length} dipilih</span>}>
      <ErrorBox error={error} />
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_10rem_12rem]">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode atau nama…" aria-label="Cari karyawan" />
        <FormSelect value={sen} onChange={(e) => setSen(e.target.value)} aria-label="Filter seniority">
          <option value="">Semua seniority</option>
          {Object.entries(SEN_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </FormSelect>
        <FormSelect value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter department">
          <option value="">Semua department</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </FormSelect>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setSelected([...new Set([...selected, ...shown.map((e) => e.id)])])} disabled={!shown.length || allShown}>Pilih semua{q || sen || dept ? ' (hasil filter)' : ''}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setSelected(q || sen || dept ? selected.filter((id) => !shown.some((e) => e.id === id)) : [])} disabled={!selected.length}>Kosongkan</Button>
      </div>
      {loading ? (
        <div className="space-y-2" role="status" aria-label="Memuat"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-2/3" /></div>
      ) : (
        <div className="no-scrollbar max-h-[26rem] overflow-y-auto rounded-lg border p-1">
          {shown.map((e) => (
            <label key={e.id} className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
              <Checkbox checked={sel.has(e.id)} onCheckedChange={() => toggle(e.id)} />
              <span className="font-medium">{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.code} · {SEN_LABEL[e.seniority] ?? e.seniority} · {e.department}</span>
            </label>
          ))}
          {!shown.length && <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada karyawan aktif yang cocok.</div>}
        </div>
      )}
    </Card>
  );
}

// ---------- langkah 4 ----------
function StepReview({ info, plan, activate, setActivate, canActivate, blockReason, error }: { info?: any; plan?: any; activate?: any; setActivate?: any; canActivate?: any; blockReason?: any; error?: any }) {
  const rows = plan?.rows ?? [];
  const bySource = PLAN_SOURCES.map((s) => [s, rows.reduce((n, r) => n + r.proposals.filter((p) => p.source === s).length, 0)]);
  const warnings = rows.flatMap((r) => [...r.warnings.map((w) => `${r.employee.name}: ${w}`), ...(missingMandatory(r) ? [`${r.employee.name}: belum ada evaluator`] : [])]);
  return (
    <div className="space-y-4">
      <Card title="Ringkasan">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Nama periode</dt><dd className="font-medium">{info.name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Rentang</dt><dd className="font-medium">{fmtDate(info.start_date)} – {fmtDate(info.end_date)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tenggat pengisian</dt><dd className="font-medium">{fmtDate(info.deadline)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Karyawan</dt><dd className="font-medium">{rows.length}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {bySource.map(([s, n]) => <Badge key={s} tone="blue">{SOURCE_LABEL[s]}: {n}</Badge>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Self-assessment dibuat otomatis untuk karyawan yang memiliki akun aktif.</p>
      </Card>
      {warnings.length > 0 && (
        <Card title={`Peringatan (${warnings.length})`}>
          <ul className="no-scrollbar max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-amber-800 dark:text-amber-300">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </Card>
      )}
      <Card>
        <label className={cn('flex items-start gap-3 text-sm', !canActivate && 'opacity-70')}>
          <Checkbox className="mt-0.5" checked={activate && canActivate} disabled={!canActivate} onCheckedChange={(v) => setActivate(!!v)} />
          <span>
            <span className="font-semibold">Langsung mulai periode setelah dibuat</span>
            <span className="block text-xs text-muted-foreground">{canActivate ? 'Konfigurasi dibekukan sebagai snapshot dan semua evaluator langsung diberi notifikasi.' : blockReason}</span>
          </span>
        </label>
      </Card>
      <ErrorBox error={error} />
    </div>
  );
}

// ---------- halaman ----------
export default function PeriodWizard() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const draftParam = params.get('draft');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [resuming, setResuming] = useState<{ loading: boolean; error: any }>({ loading: !!draftParam, error: null });
  const loadedDraft = useRef<string | null>(null);
  const resumeAssignments = useRef<any[] | null>(null);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const initial = useRef(defaultInfo());
  const [info, setInfo] = useState(initial.current);
  const [selected, setSelected] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [empState, setEmpState] = useState({ loading: true, error: null });
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [projectsById, setProjectsById] = useState({});
  const [plan, setPlan] = useState<any>(null); // { key, config, rows }
  const [planState, setPlanState] = useState({ loading: false, error: null });
  const [activate, setActivate] = useState(false);
  const [done, setDone] = useState(false);
  const { busy, error: submitError, run } = useAction();
  const keyN = useRef(0);

  const errors = infoErrors(info);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  // periode khusus departemen: hanya karyawan departemen itu; periode default: tanpa departemen yang punya konfigurasi sendiri (harus periode sendiri)
  const ownCfg = useMemo(() => new Set(depts.filter((d) => d.own_config).map((d) => d.name)), [depts]);
  const scopeEmployees = useMemo(() => employees.filter((e) => (info.department ? e.department === info.department : !ownCfg.has(e.department))), [employees, info.department, ownCfg]);
  useEffect(() => { setSelected((sel) => { const ok = sel.filter((id) => scopeEmployees.some((e) => e.id === id)); return ok.length === sel.length ? sel : ok; }); }, [scopeEmployees]);
  const initialSig = useRef(sigOf(initial.current, [], null));
  const signature = useMemo(() => sigOf(info, selected, plan?.rows ?? null), [info, selected, plan]);
  const dirty = !done && signature !== (savedSig ?? initialSig.current);

  // data pendukung
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const all: any[] = [];
        for (let page = 1; ; page++) {
          const r = await api.get(`/employees?status=active&size=100&page=${page}`);
          all.push(...r.rows);
          if (all.length >= r.total || !r.rows.length) break;
        }
        if (!off) { setEmployees(all); setEmpState({ loading: false, error: null }); }
      } catch (error) { if (!off) setEmpState({ loading: false, error }); }
    })();
    api.get('/evaluators').then((d) => !off && setEvaluators(d)).catch(() => {});
    api.get<Department[]>('/departments').then((d) => !off && setDepts(d)).catch(() => {});
    api.get('/projects').then((d) => !off && setProjectsById(Object.fromEntries((Array.isArray(d) ? d : d.rows ?? []).map((p) => [p.id, p])))).catch(() => {});
    return () => { off = true; };
  }, []);

  // lanjutkan draft: muat info, cakupan, dan penilai yang tersimpan
  useEffect(() => {
    if (!draftParam || loadedDraft.current === draftParam || empState.loading) return;
    loadedDraft.current = draftParam;
    let off = false;
    api.get(`/periods/${draftParam}/wizard`).then((r) => {
      if (off) return;
      const next = { name: r.period.name, department: r.period.department ?? '', start_date: r.period.start_date, end_date: r.period.end_date, deadline: r.period.deadline };
      setInfo(next);
      setSelected(r.employee_ids);
      setDraftId(r.period.id);
      resumeAssignments.current = r.assignments.length ? r.assignments : null;
      setSavedSig(sigOf(next, r.employee_ids, null));
      const to = r.employee_ids.length ? 2 : 1;
      setMaxStep(to);
      setStep(to);
      setResuming({ loading: false, error: null });
    }).catch((error) => !off && setResuming({ loading: false, error }));
    return () => { off = true; };
  }, [draftParam, empState.loading]);

  // peringatan saat menutup/reload tab dengan input belum disimpan
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const planKey = useMemo(() => JSON.stringify([[...selected].sort((a, b) => a - b), info.start_date, info.end_date, info.department]), [selected, info.start_date, info.end_date, info.department]);

  const loadPlan = useCallback(async () => {
    setPlanState({ loading: true, error: null });
    try {
      const r = await api.post('/periods/suggest-evaluators', { employee_ids: selected, start_date: info.start_date, end_date: info.end_date, department: info.department || null });
      let rows = r.employees.map((e) => ({ ...e, proposals: e.proposals.map((p) => ({ ...p, key: `s${++keyN.current}` })) }));
      const saved = resumeAssignments.current;
      if (saved) {
        // melanjutkan draft: pakai penilai yang tersimpan, bukan usulan baru (usulan baru hanya lewat "Hitung ulang usulan")
        resumeAssignments.current = null;
        rows = rows.map((row) => ({
          ...row,
          proposals: saved.filter((a) => a.employee_id === row.employee.id).map((a) => ({
            source: a.source, evaluator_user_id: a.evaluator_user_id, evaluator_name: a.evaluator_name, project_id: a.project_id, project_name: a.project_name, alternatives: [], key: `s${++keyN.current}`,
          })),
        }));
        setSavedSig(sigOf(info, selected, rows));
      }
      setPlan({ key: planKey, config: r.config, rows });
      setPlanState({ loading: false, error: null });
    } catch (error) {
      setPlanState({ loading: false, error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);

  useEffect(() => {
    if (step === 2 && plan?.key !== planKey && !planState.loading && !planState.error) loadPlan();
  }, [step, plan, planKey, planState, loadPlan]);

  const setRows = useCallback((fn) => setPlan((p) => ({ ...p, dirty: true, rows: fn(p.rows) })), []);

  const missingCount = plan ? plan.rows.filter(missingMandatory).length : 0;
  const canActivate = !!plan?.config?.ok && missingCount === 0;
  const blockReason = !plan?.config?.ok ? 'Konfigurasi belum valid — perbaiki di halaman Konfigurasi, lalu hitung ulang usulan.' : `${missingCount} karyawan belum memiliki evaluator.`;

  if (!isHR(user)) return <Page title="Buat periode evaluasi"><ErrorBox error={{ message: 'Hanya HR/Admin yang dapat membuat periode.' }} /></Page>;

  const stepError = step === 0 ? (Object.keys(errors).length ? 'Lengkapi informasi periode.' : null)
    : step === 1 ? (selected.length ? null : 'Pilih minimal 1 karyawan.')
      : step === 2 ? (planState.loading || !plan || plan.key !== planKey ? 'Menunggu usulan evaluator…' : null) : null;

  const go = (i) => { if (i === 2) setPlanState((s) => ({ ...s, error: null })); setStep(i); window.scrollTo?.({ top: 0 }); };
  const next = () => {
    if (step === 0) setTouched(true);
    if (stepError) return;
    const n = step + 1;
    setMaxStep((m) => Math.max(m, n));
    go(n);
  };
  const cancel = async () => {
    if (dirty && !(await confirm({ title: 'Batalkan pembuatan periode?', tone: 'danger', confirmText: 'Ya, batalkan', cancelText: 'Lanjut mengisi', description: 'Input yang belum disimpan akan hilang.' }))) return;
    setDone(true);
    navigate('/periods');
  };

  const saveDraft = () => run(async () => {
    setTouched(true);
    if (Object.keys(errors).length) { setStep(0); return; }
    const body = {
      name: info.name.trim(), department: info.department || null, start_date: info.start_date, end_date: info.end_date, deadline: info.deadline, employee_ids: selected,
      // penilai ikut disimpan hanya bila usulannya sudah dihitung untuk cakupan dan tanggal saat ini; selain itu yang tersimpan dibiarkan
      ...(plan && plan.key === planKey ? { assignments: buildAssignments(plan.rows) } : {}),
    };
    const res = draftId ? await api.put(`/periods/${draftId}/wizard`, body) : await api.post('/periods/wizard/draft', body);
    setDraftId(res.id);
    setSavedSig(signature);
    if (draftParam !== String(res.id)) {
      loadedDraft.current = String(res.id); // jangan memuat ulang dari server saat alamat berubah
      setParams({ draft: String(res.id) }, { replace: true });
    }
    toast.success('Draft disimpan', { description: 'Anda dapat melanjutkannya nanti dari detail periode (Lanjutkan di wizard).' });
  });

  const submit = () => run(async () => {
    const assignments = buildAssignments(plan.rows);
    const body = { name: info.name.trim(), department: info.department || null, start_date: info.start_date, end_date: info.end_date, deadline: info.deadline, employee_ids: selected, assignments, activate: activate && canActivate };
    const res = draftId ? await api.put(`/periods/${draftId}/wizard`, body) : await api.post('/periods/wizard', body);
    setDone(true);
    toast.success(res.activated ? `Periode "${info.name}" dibuat dan dimulai` : `Periode "${info.name}" dibuat sebagai draft`, { description: `${res.assigned} penugasan evaluator tersimpan.` });
    navigate(`/periods/${res.id}`);
  });

  return (
    <Page title={draftId ? 'Lanjutkan draft periode' : 'Buat periode evaluasi'} eyebrow="Wizard periode" actions={<Button variant="outline" onClick={cancel}>Batal</Button>}>
      {resuming.loading && <p className="text-sm text-muted-foreground" role="status">Memuat draft…</p>}
      {resuming.error && <ErrorBox error={resuming.error} />}
      <Stepper step={step} maxStep={maxStep} onGo={go} />
      <div className="min-h-64">
        {step === 0 && <StepInfo info={info} setInfo={setInfo} errors={errors} touched={touched} depts={depts} />}
        {step === 1 && <StepScope employees={scopeEmployees} loading={empState.loading} error={empState.error} selected={selected} setSelected={setSelected} />}
        {step === 2 && (
          <StepEvaluators
            plan={plan?.key === planKey ? plan : null} loading={planState.loading || (!planState.error && plan?.key !== planKey)} error={planState.error}
            reload={() => { setPlanState({ loading: false, error: null }); loadPlan(); }} empMap={empMap} evaluators={evaluators} projectsById={projectsById} setRows={setRows}
            department={info.department} onConfig={(c) => setPlan((p) => ({ ...p, config: c }))}
          />
        )}
        {step === 3 && <StepReview info={info} plan={plan} activate={activate} setActivate={setActivate} canActivate={canActivate} blockReason={blockReason} error={submitError} />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="outline" disabled={step === 0 || busy} onClick={() => go(step - 1)}><ArrowLeft className="size-4" />Sebelumnya</Button>
        <div className="flex items-center gap-3">
          {draftId && !dirty && !busy && <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300" role="status"><Check className="size-3.5" />Draft tersimpan</span>}
          <Button type="button" variant="outline" onClick={saveDraft} disabled={busy || resuming.loading}><Save className="size-4" />{busy ? 'Menyimpan…' : 'Simpan draft'}</Button>
          {stepError && step !== 2 && <span className="text-xs text-muted-foreground" role="status">{stepError}</span>}
          {step < 3 ? (
            <Button type="button" onClick={next} disabled={step !== 0 && !!stepError}>Berikutnya<ArrowRight className="size-4" /></Button>
          ) : (
            <Button type="button" onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : activate && canActivate ? (draftId ? 'Simpan & mulai periode' : 'Buat & mulai periode') : (draftId ? 'Simpan periode' : 'Buat periode')}</Button>
          )}
        </div>
      </div>
    </Page>
  );
}
