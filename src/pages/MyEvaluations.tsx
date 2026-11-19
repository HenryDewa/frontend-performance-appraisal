import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { useConfirm } from '@/components/ConfirmProvider';
import { useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleDot, Circle, ClipboardList, Clock, TriangleAlert } from 'lucide-react';
import { StatCard } from './Dashboard.tsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormSelect } from '@/components/ui/form-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, Bar, Card, ErrorBox, Field, Loading, Modal, Page, SOURCE_LABEL, fmt, fmtDate, useAction, useLoad } from '../ui.tsx';

const TH = 'text-xs uppercase tracking-wide text-muted-foreground';
const MUTED = 'text-xs text-muted-foreground';
const RUBRIC = 'rounded-lg bg-muted p-3 text-[13px]';
const WARN = 'mb-3 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';

const dayDiff = (d) => (d ? Math.ceil((+new Date(String(d).slice(0, 10) + 'T00:00:00') - +new Date(new Date().toDateString())) / 86400000) : null);
const initials = (n = '') => n.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

export function MyEvaluations() {
  const { data, error, loading } = useLoad(() => api.get('/my/assessments'));
  const [filter, setFilter] = useState('todo');
  const rows = data ?? [];
  const isTodo = (a) => a.status === 'draft' && a.period_status === 'active';
  const todo = rows.filter(isTodo);
  const late = todo.filter((a) => (dayDiff(a.deadline) ?? 0) < 0);
  const soon = todo.filter((a) => { const d = dayDiff(a.deadline); return d != null && d >= 0 && d <= 3; });
  const done = rows.filter((a) => !isTodo(a));
  const shown = filter === 'todo' ? todo : filter === 'done' ? done : rows;
  const FILTERS = [['todo', 'Perlu diisi', todo.length], ['done', 'Selesai / ditutup', done.length], ['all', 'Semua', rows.length]];

  return (
    <Page title="My Evaluations" eyebrow="Evaluasi berkala">
      <Loading loading={loading} error={error}>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ClipboardList} tone="blue" value={todo.length} label="Perlu diisi" sub={todo.length ? 'penilaian menunggu Anda' : 'semua sudah beres'} />
            <StatCard icon={Clock} tone={late.length ? 'red' : 'amber'} value={late.length} label="Terlambat" sub={late.length ? 'segera selesaikan' : 'tidak ada yang lewat tenggat'} />
            <StatCard icon={TriangleAlert} tone="amber" value={soon.length} label="Tenggat ≤ 3 hari" sub="prioritaskan lebih dulu" />
            <StatCard icon={CircleCheck} tone="green" value={done.length} label="Sudah selesai" sub={`dari ${rows.length} penilaian`} />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter penilaian">
            {FILTERS.map(([k, label, n]) => (
              <Button key={k} role="tab" aria-selected={filter === k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>
                {label}<span className={`ml-1 rounded-full px-1.5 text-[11px] font-bold ${filter === k ? 'bg-white/25' : 'bg-muted'}`}>{n}</span>
              </Button>
            ))}
          </div>

          {shown.length === 0 ? (
            <Card><p className="py-6 text-center text-sm text-muted-foreground">{filter === 'todo' ? 'Tidak ada penilaian yang harus diisi. Kerja bagus!' : 'Tidak ada penilaian pada filter ini.'}</p></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((a) => {
                const left = dayDiff(a.deadline);
                const open = isTodo(a);
                const overdue = open && left != null && left < 0;
                const pct = a.total_indicators ? Math.round((a.scored / a.total_indicators) * 100) : 0;
                return (
                  <div key={a.id} className={`flex flex-col rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${overdue ? 'border-red-300 dark:border-red-500/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{initials(a.employee_name)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{a.employee_name}</div>
                        <div className={MUTED}>{a.seniority} · {a.period_name}</div>
                      </div>
                      <Badge>{a.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Sebagai {SOURCE_LABEL[a.source]}</span>
                      {a.project_name && <span className="rounded-full bg-muted px-2 py-0.5">{a.project_name}</span>}
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Progres pengisian</span><b>{a.scored}/{a.total_indicators}</b></div>
                      <Bar value={a.scored} max={Math.max(a.total_indicators, 1)} label={`${pct}%`} />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                      <div className="text-xs">
                        <div className="text-muted-foreground">Tenggat {fmtDate(a.deadline)}</div>
                        {open && left != null && (
                          <div className={`font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : left <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                            {overdue ? `terlambat ${-left} hari` : left === 0 ? 'hari ini' : `${left} hari lagi`}
                          </div>
                        )}
                      </div>
                      <Button asChild size="sm" variant={open ? 'default' : 'outline'}><Link to={`/assessments/${a.id}`}>{open ? (a.scored ? 'Lanjutkan' : 'Mulai isi') : 'Lihat'}</Link></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Loading>
    </Page>
  );
}

const SCALE: [number, string, string][] = [
  [1, 'Jauh di bawah ekspektasi', 'Tidak memenuhi persyaratan dasar peran meski dukungan telah diberikan'],
  [2, 'Di bawah ekspektasi', 'Memenuhi sebagian persyaratan; ada gap berulang'],
  [3, 'Memenuhi ekspektasi', 'Menjalankan tanggung jawab sesuai standar level dan konteks project'],
  [4, 'Melebihi ekspektasi', 'Konsisten memberi hasil di atas standar peran'],
  [5, 'Outstanding', 'Dampak jelas dan berkelanjutan di atas ekspektasi peran'],
];
const CATEGORIES = ['pull_request', 'code_review', 'ticket', 'document', 'client_feedback', 'metric', 'other'];
const RULE_TEXT = { none: '', comment: 'Komentar wajib', evidence: 'Evidence wajib', either: 'Komentar atau evidence wajib' };
const DEFAULT_EXTREME = { low: 2, high: 5 };
const TONE_NEUTRAL = 'border-border bg-muted text-muted-foreground';
const TONE_AMBER = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
const TONE_GREEN = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
const PILL = 'flex size-9 cursor-pointer items-center justify-center rounded-lg border bg-card text-sm font-bold transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed';
const STATUS = {
  empty: { label: 'Kosong', Icon: Circle, cls: 'text-muted-foreground' },
  partial: { label: 'Sebagian', Icon: CircleDot, cls: 'text-sky-600 dark:text-sky-400' },
  need: { label: 'Perlu komentar/evidence', Icon: TriangleAlert, cls: 'text-amber-600 dark:text-amber-400' },
  done: { label: 'Selesai', Icon: CircleCheck, cls: 'text-emerald-600 dark:text-emerald-400' },
};

const AUTOSAVE_MS = 1500;
const QUICK_KEY = 'fdp_quick_form';
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const readQuick = () => {
  try { return localStorage.getItem(QUICK_KEY) !== '0'; } catch { return true; }
};

// Susun payload draft: hanya slot yang sudah punya skor (sama seperti tombol "Simpan draft").
function buildPayload(data, items) {
  const payload: any[] = [];
  for (const ind of data.indicators.filter((i) => i.sources.includes(data.assessment.source))) {
    const subs = ind.subs ?? [];
    const indIt = items[ind.code] ?? {};
    if (subs.length) {
      subs.forEach((s, si) => {
        const it = items[`${ind.code}/${s.code}`] ?? {};
        if (it.score != null) payload.push({ indicator_code: ind.code, sub_code: s.code, score: it.score, comment: si === 0 ? (indIt.comment || null) : null, shared: indIt.shared });
      });
    } else if (indIt.score != null) {
      payload.push({ indicator_code: ind.code, score: indIt.score, comment: indIt.comment || null, shared: indIt.shared });
    }
  }
  return payload;
}

export function EvaluationForm() {
  const confirm = useConfirm();
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api.get(`/assessments/${id}`), [id]);
  const [items, setItems] = useState({});
  const [dirty, setDirty] = useState(false);
  const [evModal, setEvModal] = useState<any>(null);
  const { busy, error: err, run, setError } = useAction();
  const [msg, setMsg] = useState('');
  const [auto, setAuto] = useState<{ state: string; at: Date | null }>({ state: 'idle', at: null });
  const [quick, setQuick] = useState(readQuick);
  const [fillScore, setFillScore] = useState(3);
  const [openComments, setOpenComments] = useState({});
  const [onlyPending, setOnlyPending] = useState(false);
  const [uniform, setUniform] = useState<any>(null);
  const [curCode, setCurCode] = useState<any>(null);

  // Ref ke state terbaru agar autosave/flush tidak memakai closure usang.
  const itemsRef = useRef({});
  const dataRef = useRef<any>(null);
  const editableRef = useRef(false);
  const dirtyRef = useRef(false);
  const verRef = useRef(0);
  const savingRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const autoRef = useRef(() => {});
  dataRef.current = data;
  editableRef.current = !!data?.editable;

  useEffect(() => {
    if (!data) return;
    const next = {};
    for (const s of data.scores) next[s.sub_code ? `${s.indicator_code}/${s.sub_code}` : s.indicator_code] = { score: s.score, comment: s.comment ?? '', shared: s.shared };
    // komentar indikator ber-sub disimpan pada baris sub pertama — tampilkan kembali di level indikator
    for (const ind of data.indicators) {
      if (ind.subs?.length) {
        const first = next[`${ind.code}/${ind.subs[0].code}`];
        next[ind.code] = { comment: first?.comment ?? '', shared: first?.shared };
      }
    }
    clearTimeout(timerRef.current);
    itemsRef.current = next;
    dirtyRef.current = false;
    verRef.current += 1;
    setItems(next);
    setDirty(false);
  }, [data]);

  // Simpan draft; antrekan bila ada simpanan berjalan, ulangi bila ada perubahan baru selama menyimpan.
  const save = async () => {
    clearTimeout(timerRef.current);
    while (savingRef.current) await savingRef.current.catch(() => {});
    if (!dirtyRef.current || !dataRef.current) return;
    const ver = verRef.current;
    const payload = buildPayload(dataRef.current, itemsRef.current);
    const p = (async () => {
      if (payload.length) await api.put(`/assessments/${id}/scores`, { items: payload });
      if (verRef.current === ver) { dirtyRef.current = false; setDirty(false); }
    })();
    savingRef.current = p;
    try { await p; } finally { if (savingRef.current === p) savingRef.current = null; }
    if (dirtyRef.current) await save();
  };

  const autoSave = async () => {
    if (!editableRef.current || !dirtyRef.current) return;
    setAuto((a) => ({ ...a, state: 'saving' }));
    try {
      await save();
      setAuto({ state: 'saved', at: new Date() });
    } catch {
      setAuto((a) => ({ ...a, state: 'error' }));
    }
  };
  autoRef.current = autoSave;

  const commit = (fn) => {
    const next = fn(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    dirtyRef.current = true;
    verRef.current += 1;
    setDirty(true);
    setMsg('');
    clearTimeout(timerRef.current);
    if (editableRef.current) timerRef.current = setTimeout(() => autoRef.current(), AUTOSAVE_MS);
  };
  const patch = (code, p) => commit((x) => ({ ...x, [code]: { score: null, comment: '', shared: true, ...x[code], ...p } }));

  // Flush saat pindah halaman (unmount) dan saat tab disembunyikan.
  useEffect(() => {
    const flush = () => { if (editableRef.current && dirtyRef.current) save().catch(() => {}); };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(timerRef.current);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Peringatan tutup tab hanya selama ada perubahan belum tersimpan / sedang menyimpan.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  const toggleQuick = (v) => {
    setQuick(v);
    try { localStorage.setItem(QUICK_KEY, v ? '1' : '0'); } catch { /* abaikan */ }
  };

  if (loading || error || !data) return <Page title="Form penilaian"><Loading loading={loading} error={error} /></Page>;
  const { editable, indicators, employee, period, projects } = data;
  const slotTotal = indicators.reduce((n, i) => n + (i.subs?.length || 1), 0);
  const scored = indicators.reduce((n, i) => n + (i.subs?.length
    ? i.subs.filter((s) => items[`${i.code}/${s.code}`]?.score != null).length
    : (items[i.code]?.score != null ? 1 : 0)), 0);
  const isClient = data.assessment.source === 'client';
  const isSelf = data.assessment.source === 'self';
  const seniority = employee.seniority;
  const canShare = !isClient && !isSelf && editable;

  // skor indikator ber-sub = rata-rata berbobot sub (tampilan read-only)
  const indScore = (ind) => {
    const vals = ind.subs.map((s) => items[`${ind.code}/${s.code}`]?.score);
    if (vals.some((v) => v == null)) return null;
    const w = ind.subs.map((s) => Number(s.weight) || 0);
    const wSum = w.reduce((a, b) => a + b, 0);
    const ws = wSum ? w.map((x) => x / wSum) : w.map(() => 1 / ind.subs.length);
    return ind.subs.reduce((acc, s, i) => acc + vals[i] * ws[i], 0);
  };

  const thr = { ...DEFAULT_EXTREME, ...(data.extreme_threshold ?? {}) };
  const slotKeys = (ind) => (ind.subs?.length ? ind.subs.map((s) => `${ind.code}/${s.code}`) : [ind.code]);

  // Status indikator: jumlah terisi + apakah aturan komentar/evidence sedang mewajibkan dan sudah terpenuhi.
  const indState = (ind) => {
    const vals = slotKeys(ind).map((k) => items[k]?.score);
    const total = vals.length;
    const n = vals.filter((v) => v != null).length;
    const triggered = vals.some((v) => v != null && (v <= thr.low || v >= thr.high));
    const hasComment = !!(items[ind.code]?.comment ?? '').trim();
    const hasEv = data.evidence.some((x) => x.indicator_code === ind.code);
    const rule = ind.evidence_rule || 'none';
    let required = false;
    let satisfied = true;
    if (rule === 'comment') { required = true; satisfied = hasComment; }
    else if (rule === 'evidence') { required = true; satisfied = hasEv; }
    else if (rule === 'either') { required = true; satisfied = hasComment || hasEv; }
    else if (rule === 'extreme') { required = triggered; satisfied = !triggered || hasComment || hasEv; }
    const status = n === 0 ? 'empty' : n < total ? 'partial' : (required && !satisfied ? 'need' : 'done');
    return { n, total, triggered, required, satisfied, status };
  };
  const states = Object.fromEntries(indicators.map((i) => [i.code, indState(i)]));
  const doneCount = indicators.filter((i) => states[i.code].status === 'done').length;
  const hideDone = onlyPending && editable;
  const visibleInds = hideDone ? indicators.filter((i) => states[i.code].status !== 'done') : indicators;

  const ruleBadge = (ind) => {
    const r = ind.evidence_rule;
    if (!r || r === 'none') return null;
    const st = states[ind.code];
    let text; let tone;
    if (r === 'extreme') {
      if (!st.triggered) { text = `Wajib hanya bila ada skor ≤${thr.low} atau ≥${thr.high}`; tone = TONE_NEUTRAL; }
      else if (st.satisfied) { text = 'Terpenuhi (skor ekstrem punya komentar/evidence)'; tone = TONE_GREEN; }
      else { text = 'Perlu komentar/evidence (ada skor ekstrem)'; tone = TONE_AMBER; }
    } else { text = RULE_TEXT[r]; tone = st.satisfied ? TONE_GREEN : TONE_AMBER; }
    return <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-normal ${tone}`}>{text}</span>;
  };
  const statusBadge = (ind) => {
    const st = states[ind.code];
    const { label, Icon, cls } = STATUS[st.status];
    return <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cls}`}><Icon className="size-3.5" aria-hidden="true" />{st.status === 'partial' ? `${label} ${st.n}/${st.total}` : label}</span>;
  };

  // Scroll ke indikator dan fokus ke kontrol skor pertama yang belum terisi.
  const goTo = (code) => {
    setCurCode(code);
    const go = () => {
      const el = document.getElementById(`ind-${code}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!editable) return;
      const rows = [...el.querySelectorAll('[data-score-row]')];
      const row = rows.find((r) => !r.querySelector('input:checked')) ?? rows[0];
      const target = row?.querySelector<HTMLElement>('input:checked') ?? row?.querySelector<HTMLElement>('input');
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    };
    if (hideDone && states[code]?.status === 'done') { setOnlyPending(false); setTimeout(go, 60); } else go();
  };
  const jumpPending = () => {
    const first = indicators.find((i) => states[i.code].status !== 'done');
    if (first) goTo(first.code); else setMsg('Semua indikator sudah selesai');
  };

  // Navigasi keyboard antar baris skor: panah atas/bawah pindah baris, 1–5 memberi skor.
  const rowKeys = (slot) => (e) => {
    if (!editable || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type !== 'radio')) return;
    if (/^[1-5]$/.test(e.key)) { e.preventDefault(); patch(slot, { score: Number(e.key) }); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const rows = [...document.querySelectorAll('fieldset[data-score-row]:not([disabled])')];
    const at = rows.indexOf(e.currentTarget);
    const nextRow = rows[at + (e.key === 'ArrowDown' ? 1 : -1)];
    if (at < 0 || !nextRow) return;
    e.preventDefault();
    const t = nextRow.querySelector<HTMLElement>('input:checked') ?? nextRow.querySelector<HTMLElement>('input');
    if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  };

  const scoreRow = (slot, label) => (
    <fieldset className="min-w-0 border-0 p-0 disabled:opacity-60" disabled={!editable} data-score-row onKeyDown={rowKeys(slot)}>
      <legend className="sr-only">Skor {label} (tekan 1–5, panah atas/bawah pindah baris)</legend>
      <div className="flex gap-1.5">
        {SCALE.map(([n, l]) => (
          <label key={n} title={`${n} — ${l}`} className={PILL}>
            <input type="radio" className="sr-only" name={`s-${slot}`} aria-label={`${label}: ${n} — ${l}`} checked={items[slot]?.score === n} onChange={() => patch(slot, { score: n })} />
            {n}
          </label>
        ))}
      </div>
    </fieldset>
  );

  // Dipanggil sebagai fungsi (bukan komponen) agar input tidak di-remount tiap render.
  const scoreSlot = (slot) => (
    <fieldset className="my-2 grid min-w-0 grid-cols-2 gap-2 border-0 p-0 disabled:opacity-60 sm:grid-cols-5" disabled={!editable} data-score-row>
      {SCALE.map(([n, l]) => (
        <label
          key={n}
          title={l}
          className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border bg-card p-2 text-center text-xs transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed"
        >
          <input type="radio" className="sr-only" name={`s-${slot}`} checked={items[slot]?.score === n} onChange={() => patch(slot, { score: n })} />
          <b className="text-base">{n}</b><span className="leading-tight">{l}</span>
        </label>
      ))}
    </fieldset>
  );

  const deleteEvidence = (x) => run(async () => {
    await save().catch(() => {});
    await api.del(`/assessments/${id}/evidence/${x.id}`);
    toast.success('Bukti dihapus');
    reload();
  });
  const addEvidence = (ind) => { setError(null); setEvModal({ indicator_code: ind.code, category: 'pull_request', url: '', note: '', evidence_date: '', source_label: '' }); };

  const evidenceList = (evs) => evs.map((x) => (
    <div key={x.id} className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[13px]">
      <span><Badge>{x.category}</Badge> {x.url && <a className="text-primary underline-offset-4 hover:underline" href={x.url} target="_blank" rel="noopener noreferrer">{x.url}</a>} {x.note} {x.evidence_date && <span className="text-muted-foreground">({fmtDate(x.evidence_date)})</span>}</span>
      {editable && <Button variant="destructive" size="sm" onClick={() => deleteEvidence(x)}>Hapus</Button>}
    </div>
  ));

  // Area komentar/evidence bersama (satu per indikator), dipakai baris cepat dan matriks.
  const commentArea = (ind) => {
    const it = items[ind.code] ?? {};
    const evs = data.evidence.filter((x) => x.indicator_code === ind.code);
    const expanded = openComments[ind.code] ?? (!!it.comment || states[ind.code].required);
    return (
      <>
        <button
          type="button"
          className="mt-2 text-xs text-primary underline-offset-4 hover:underline"
          aria-expanded={expanded}
          onClick={() => setOpenComments((o) => ({ ...o, [ind.code]: !expanded }))}
        >
          {expanded ? '▾' : '▸'} Komentar{evs.length ? ` · ${evs.length} evidence` : ''}{!expanded && it.comment ? ' · terisi' : ''}
        </button>
        {expanded && (
          <div className="mt-2 space-y-2">
            <Textarea aria-label={`Komentar ${ind.name}`} rows={2} value={it.comment ?? ''} disabled={!editable} onChange={(e) => patch(ind.code, { comment: e.target.value })} maxLength={4000} />
            {canShare && (
              <label className="flex flex-wrap items-center gap-2 text-[13px]"><Checkbox checked={it.shared !== false} onCheckedChange={(v) => patch(ind.code, { shared: v === true })} /> Boleh dibagikan ke karyawan setelah dipublikasikan</label>
            )}
            <div>
              {evidenceList(evs)}
              {editable && <Button variant="outline" size="sm" onClick={() => addEvidence(ind)}>+ Evidence</Button>}
            </div>
          </div>
        )}
      </>
    );
  };

  // ---- Matriks ringkas: indikator dengan sub ----
  const matrixCard = (ind) => {
    const sc = indScore(ind);
    return (
      <div key={ind.code} id={`ind-${ind.code}`} className="scroll-mt-36">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0 flex-1 basis-56">
              <h2 className="text-sm" title={ind.description || undefined}>{ind.name} <span className="text-xs font-normal text-muted-foreground">· bobot {ind.weight}%</span></h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">{statusBadge(ind)}{ruleBadge(ind)}</div>
            </div>
            <div className="text-[13px]">Skor: <b>{sc == null ? '—' : fmt(sc)}/5</b></div>
          </div>
          {editable && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Semua sub =</span>
              {SCALE.map(([n, l]) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-7 p-0"
                  title={`Setel semua sub ke ${n} — ${l}`}
                  aria-label={`Setel semua sub ${ind.name} ke ${n}`}
                  onClick={() => commit((x) => {
                    const next = { ...x };
                    for (const s of ind.subs) { const k = `${ind.code}/${s.code}`; next[k] = { comment: '', shared: true, ...x[k], score: n }; }
                    return next;
                  })}
                >
                  {n}
                </Button>
              ))}
            </div>
          )}
          <div className="mt-2 divide-y">
            {ind.subs.map((sub) => {
              const rb = sub.rubric?.[seniority];
              return (
                <div key={sub.code} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-2">
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="text-[13px] font-medium">{sub.name}{Number(sub.weight) > 0 && <span className="text-xs font-normal text-muted-foreground"> · {sub.weight}%</span>}</div>
                    {rb && (
                      <details open className="mt-0.5">
                        <summary className="cursor-pointer text-xs text-primary">Rubrik {seniority}</summary>
                        <div className={`${RUBRIC} mt-1`}>{rb}</div>
                      </details>
                    )}
                  </div>
                  {scoreRow(`${ind.code}/${sub.code}`, `${ind.name} — ${sub.name}`)}
                </div>
              );
            })}
          </div>
          {commentArea(ind)}
        </Card>
      </div>
    );
  };

  // ---- Tampilan cepat: indikator tanpa sub ----
  const quickRow = (ind) => {
    const rubric = ind.rubric?.[seniority];
    return (
      <div key={ind.code} id={`ind-${ind.code}`} className="scroll-mt-36 py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-56">
            <div className="text-sm font-semibold" title={ind.description || undefined}>
              {ind.name} <span className="text-xs font-normal text-muted-foreground">· bobot {ind.weight}%</span>
              <span className="ml-2">{ruleBadge(ind)}</span>
            </div>
            {rubric && (
              <details open className="mt-1">
                <summary className="cursor-pointer text-xs text-primary">Rubrik {seniority}</summary>
                <div className={`${RUBRIC} mt-1`}>{rubric}</div>
              </details>
            )}
          </div>
          {scoreRow(ind.code, ind.name)}
        </div>
        {commentArea(ind)}
      </div>
    );
  };

  const quickGroup = (inds, key) => {
    const unscored = inds.filter((i) => items[i.code]?.score == null);
    return (
      <Card key={key}>
        {editable && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted p-3 text-[13px]">
            <b>Isi cepat</b>
            <FormSelect aria-label="Skor untuk isi cepat" className="w-auto" value={fillScore} onChange={(e) => setFillScore(Number(e.target.value))}>
              {SCALE.map(([n, l]) => <option key={n} value={n}>{n} — {l}</option>)}
            </FormSelect>
            <Button
              variant="outline"
              size="sm"
              disabled={unscored.length === 0}
              onClick={() => commit((x) => {
                const next = { ...x };
                for (const i of unscored) next[i.code] = { comment: '', shared: true, ...x[i.code], score: fillScore };
                return next;
              })}
            >
              Terapkan ke indikator yang belum dinilai ({unscored.length})
            </Button>
          </div>
        )}
        <div className="divide-y">{inds.map(quickRow)}</div>
      </Card>
    );
  };

  // kelompokkan indikator tanpa sub yang berurutan saat tampilan cepat aktif
  const segments: any[] = [];
  for (const ind of visibleInds) {
    const last = segments[segments.length - 1];
    if (quick && !ind.subs?.length) {
      if (last?.kind === 'quick') last.inds.push(ind); else segments.push({ kind: 'quick', inds: [ind] });
    } else segments.push({ kind: quick ? 'matrix' : 'full', ind });
  }

  const fullCard = (ind) => {
    const it = items[ind.code] ?? {};
    const evs = data.evidence.filter((x) => x.indicator_code === ind.code);
    return (
      <div key={ind.code} id={`ind-${ind.code}`} className="scroll-mt-36"><Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2>{ind.name} <span className="text-xs font-normal text-muted-foreground">· bobot {ind.weight}%</span></h2>{ruleBadge(ind)}</div>
        <p className={`mb-2 ${MUTED}`}>{ind.description}</p>
        {ind.rubric?.[seniority] && <div className={RUBRIC}><b>Rubrik {seniority}:</b> {ind.rubric[seniority]}</div>}
        {ind.subs?.length ? (
          <>
            {ind.subs.map((sub) => (
              <div key={sub.code} className="mt-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <b className="text-[13px]">{sub.name}</b>
                  {Number(sub.weight) > 0 && <span className={MUTED}>bobot sub {sub.weight}%</span>}
                </div>
                {sub.rubric?.[seniority] && <div className={RUBRIC}>{sub.rubric[seniority]}</div>}
                {scoreSlot(`${ind.code}/${sub.code}`)}
              </div>
            ))}
            <p className="mb-3 mt-2 text-[13px]">
              Skor indikator (rata-rata berbobot sub): <b>{indScore(ind) == null ? '—' : fmt(indScore(ind))}/5</b>
            </p>
          </>
        ) : (
          scoreSlot(ind.code)
        )}
        <Field label="Komentar"><Textarea value={it.comment ?? ''} disabled={!editable} onChange={(e) => patch(ind.code, { comment: e.target.value })} maxLength={4000} /></Field>
        {canShare && (
          <label className="mb-3 flex flex-wrap items-center gap-2 text-[13px]"><Checkbox checked={it.shared !== false} onCheckedChange={(v) => patch(ind.code, { shared: v === true })} /> Boleh dibagikan ke karyawan setelah dipublikasikan</label>
        )}
        <h3 className="mb-2 mt-4">Evidence</h3>
        {evidenceList(evs)}
        {editable && <Button variant="outline" size="sm" onClick={() => addEvidence(ind)}>+ Evidence</Button>}
      </Card></div>
    );
  };

  // ---- Panel navigasi / ringkasan status ----
  const navItem = (ind) => {
    const st = states[ind.code];
    const { Icon, cls } = STATUS[st.status];
    const text = st.status === 'partial' ? `Sebagian ${st.n}/${st.total}` : STATUS[st.status].label;
    return (
      <button
        key={ind.code}
        type="button"
        onClick={() => goTo(ind.code)}
        aria-current={curCode === ind.code ? 'true' : undefined}
        className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${curCode === ind.code ? 'bg-muted' : ''}`}
      >
        <Icon className={`mt-0.5 size-4 shrink-0 ${cls}`} aria-hidden="true" />
        <span className="min-w-0"><span className="block truncate font-medium">{ind.name}</span><span className={`block text-xs ${cls}`}>{text}</span></span>
      </button>
    );
  };
  const navChip = (ind) => {
    const st = states[ind.code];
    const { Icon, cls } = STATUS[st.status];
    return (
      <button
        key={ind.code}
        type="button"
        onClick={() => goTo(ind.code)}
        aria-current={curCode === ind.code ? 'true' : undefined}
        title={`${ind.name} — ${STATUS[st.status].label}`}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs ${curCode === ind.code ? 'border-primary' : ''}`}
      >
        <Icon className={`size-3.5 ${cls}`} aria-hidden="true" />
        <span className="max-w-32 truncate">{ind.name}</span>
      </button>
    );
  };

  const doSubmit = () => run(async () => { await save(); await api.post(`/assessments/${id}/submit`); toast.success('Penilaian dikirim'); nav('/my-evaluations'); });
  const onSubmit = async () => {
    const vals = indicators.flatMap(slotKeys).map((k) => items[k]?.score).filter((v) => v != null);
    const counts: Record<string, number> = {};
    for (const v of vals) counts[v] = (counts[v] ?? 0) + 1;
    const [top, cnt] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    if (vals.length >= 8 && cnt / vals.length >= 0.85) { setUniform({ value: top, count: cnt, total: vals.length }); return; }
    if (await confirm({ title: 'Kirim penilaian?', tone: 'info', confirmText: 'Kirim penilaian', cancelText: 'Periksa lagi', description: 'Setelah dikirim, penilaian tidak dapat diubah kecuali dibuka kembali oleh HR atau reviewer.' })) doSubmit();
  };

  const autoStatus = !editable ? null
    : auto.state === 'saving' ? <span className={MUTED}>Menyimpan…</span>
    : auto.state === 'error' ? <button type="button" className="text-xs text-destructive underline-offset-4 hover:underline" onClick={autoSave}>Gagal menyimpan otomatis — coba lagi</button>
    : dirty ? <span className={MUTED}>Perubahan belum disimpan</span>
    : auto.state === 'saved' ? <span className={MUTED}>Tersimpan otomatis pukul {clock(auto.at)}</span>
    : null;

  return (
    <Page title={isSelf ? 'Self-assessment' : `Penilaian: ${employee.name}`} actions={<Button asChild variant="outline"><Link to="/my-evaluations">← Kembali</Link></Button>}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><span className={MUTED}>Karyawan</span><div>{employee.name} · {employee.seniority}</div></div>
          <div><span className={MUTED}>Periode</span><div>{period.name}</div></div>
          <div><span className={MUTED}>Rentang penilaian</span><div>{fmtDate(period.start_date)} – {fmtDate(period.end_date)}</div></div>
          <div><span className={MUTED}>Tenggat</span><div>{fmtDate(period.deadline)}</div></div>
          <div><span className={MUTED}>Sebagai</span><div>{SOURCE_LABEL[data.assessment.source]}</div></div>
          <div><span className={MUTED}>Status</span><div><Badge>{data.assessment.status}</Badge></div></div>
        </div>
        <h3 className="mb-2 mt-5">Konteks penugasan pada periode ini</h3>
        {projects.length === 0 ? <p className={MUTED}>Tidak ada penugasan project.</p> : projects.map((p, i) => (
          <div key={i} className="text-[13px]">{p.name} ({p.client_name}) · kompleksitas <b>{p.complexity}</b> · {p.tech_stack} · {p.role} · {fmtDate(p.start_date)} – {p.end_date ? fmtDate(p.end_date) : 'berjalan'}</div>
        ))}
        <p className={`my-3 ${MUTED}`}>Pertimbangkan seniority, kompleksitas project, kondisi codebase, perubahan requirement, ketergantungan pada tim lain, dan masa penugasan aktual. Jumlah task/commit/PR bukan ukuran produktivitas tunggal.</p>
        {data.review_reason && <Alert className={WARN}><AlertDescription className="text-amber-800 dark:text-amber-300"><b>Dikembalikan untuk revisi:</b> {data.review_reason}</AlertDescription></Alert>}
        {!editable && <Alert className={WARN}><AlertDescription className="text-amber-800 dark:text-amber-300">Form hanya-baca (status {data.assessment.status}, evaluasi {data.evaluation.status}).</AlertDescription></Alert>}
        <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">Skala penilaian</summary>
          <Table className="mt-2"><TableBody>{SCALE.map(([n, l, d]) => <TableRow key={n}><TableCell><b>{n}</b></TableCell><TableCell>{l}</TableCell><TableCell className={MUTED}>{d}</TableCell></TableRow>)}</TableBody></Table>
        </details>
      </Card>

      <nav aria-label="Ringkasan status indikator" className="no-scrollbar sticky top-16 z-20 flex items-center gap-2 overflow-x-auto rounded-lg border bg-background/95 p-2 backdrop-blur lg:hidden">
        <span className="shrink-0 text-xs font-semibold">{scored}/{slotTotal}</span>
        {editable && <Button size="sm" className="shrink-0" onClick={jumpPending}>Lompat ke yang belum diisi</Button>}
        {editable && <label className="flex shrink-0 items-center gap-1.5 text-xs"><Checkbox checked={onlyPending} onCheckedChange={(v) => setOnlyPending(v === true)} /> Belum selesai saja</label>}
        {indicators.map(navChip)}
      </nav>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-4">
      {indicators.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 px-1 text-[13px]">
          <Checkbox checked={quick} onCheckedChange={(v) => toggleQuick(v === true)} />
          <b>Tampilan cepat (ringkas)</b>
          <span className="text-muted-foreground">— baris ringkas dan matriks sub-indikator; tekan 1–5 pada baris untuk memberi skor, panah atas/bawah pindah baris.</span>
        </label>
      )}

      {hideDone && doneCount > 0 && <p className={`px-1 ${MUTED}`}>{doneCount} indikator selesai disembunyikan.</p>}
      {segments.map((s) => (s.kind === 'quick' ? quickGroup(s.inds, `q${s.inds[0].code}`) : s.kind === 'matrix' ? matrixCard(s.ind) : fullCard(s.ind)))}
      {hideDone && segments.length === 0 && <Card><p className="text-[13px]">Semua indikator sudah selesai. Matikan filter untuk melihat semuanya.</p></Card>}

      <div className="sticky bottom-3 z-10 rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-48 space-y-1.5 text-sm"><div><b>{scored}/{slotTotal}</b> butir penilaian diisi</div><Bar value={scored} max={slotTotal} /></div>
          <div className="flex flex-wrap items-center gap-2">
            <span role="status" aria-live="polite">{autoStatus}</span>
            {msg && <span className="text-[13px] text-emerald-600 dark:text-emerald-300">{msg}</span>}
            {editable && <Button variant="outline" disabled={busy || !dirty} onClick={() => run(async () => { await save(); setMsg('Draft tersimpan'); toast.success('Draft penilaian tersimpan'); reload(); })}>Simpan draft</Button>}
            {editable && <Button disabled={busy} onClick={onSubmit}>Kirim</Button>}
          </div>
        </div>
        <ErrorBox error={err} />
        {err?.details && Array.isArray(err.details) && <ul className="mt-2 list-disc pl-5 text-[13px]">{err.details.map((d, i) => <li key={i}>{typeof d === 'string' ? d : d.message}</li>)}</ul>}
      </div>
      </div>

      <aside className="hidden lg:block" aria-label="Panel navigasi indikator">
        <div className="no-scrollbar sticky top-20 max-h-[calc(100vh-6rem)] space-y-3 overflow-y-auto rounded-xl border bg-card p-3 shadow-sm">
          <div className="space-y-1.5 text-sm"><div><b>{scored}/{slotTotal}</b> butir terisi <span className={MUTED}>· {doneCount}/{indicators.length} indikator selesai</span></div><Bar value={scored} max={slotTotal} /></div>
          {editable && <Button className="w-full" onClick={jumpPending}>Lompat ke yang belum diisi</Button>}
          {editable && (
            <label className="flex items-center gap-2 text-[13px]"><Checkbox checked={onlyPending} onCheckedChange={(v) => setOnlyPending(v === true)} /> Tampilkan yang belum selesai saja</label>
          )}
          <div className="space-y-0.5 border-t pt-2">{indicators.map(navItem)}</div>
        </div>
      </aside>
      </div>

      {uniform && (
        <Modal title="Sebagian besar skor sama" onClose={() => setUniform(null)}>
          <p className="text-sm">{uniform.count} dari {uniform.total} butir bernilai {uniform.value}. Pastikan ini disengaja.</p>
          <p className={`mt-2 ${MUTED}`}>Setelah dikirim, penilaian tidak dapat diubah tanpa reopen.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setUniform(null)}>Periksa lagi</Button>
            <Button onClick={() => { setUniform(null); doSubmit(); }}>Tetap kirim</Button>
          </div>
        </Modal>
      )}

      {evModal && (
        <Modal title="Tambah evidence" onClose={() => setEvModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/assessments/${id}/evidence`, { ...evModal, url: evModal.url || null, note: evModal.note || null, evidence_date: evModal.evidence_date || null, source_label: evModal.source_label || null }); toast.success('Bukti ditambahkan'); setEvModal(null); await save().catch(() => {}); reload(); }); }}>
            <Field label="Kategori"><FormSelect value={evModal.category} onChange={(e) => setEvModal({ ...evModal, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</FormSelect></Field>
            <Field label="Tautan (http/https)"><Input type="url" value={evModal.url} onChange={(e) => setEvModal({ ...evModal, url: e.target.value })} placeholder="https://" /></Field>
            <Field label="Catatan"><Textarea value={evModal.note} onChange={(e) => setEvModal({ ...evModal, note: e.target.value })} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tanggal"><DatePicker value={evModal.evidence_date} onChange={(e) => setEvModal({ ...evModal, evidence_date: e.target.value })} /></Field>
              <Field label="Sumber"><Input value={evModal.source_label} onChange={(e) => setEvModal({ ...evModal, source_label: e.target.value })} placeholder="GitHub, Jira…" /></Field>
            </div>
            <p className={`mb-3 ${MUTED}`}>Jangan melampirkan data rahasia klien yang tidak berhak disimpan perusahaan.</p>
            <ErrorBox error={err} /><Button disabled={busy}>Tambah</Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
