import { memo, useCallback, useMemo, useState } from 'react';
import { useConfirm } from '@/components/ConfirmProvider';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Plus, RefreshCw, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, Card, ErrorBox, Field, Modal, SOURCE_LABEL } from '../ui.tsx';
import {
  NEEDS_PROJECT, PLAN_SOURCES, applyReplace, commonTechLeads, eligibleUsers, groupByTechLead, missingMandatory, planReplace,
  rowIssues, setAllMetrics, setGroupTechLead, sourceUsage, warningSummary,
} from '../lib/wizardEligibility.ts';

const SEN_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };
const RED_BOX = 'border-red-300 bg-red-50/60 dark:border-red-500/40 dark:bg-red-500/5';
const SOURCE_ROLES = { tech_lead: ['tech_lead', 'engineering_manager'], project_manager: ['project_manager'], client: ['client_evaluator'], metrics: ['hr'] };
const MANUAL_CLS = 'rounded border border-blue-200 bg-blue-50 px-1 text-[10px] font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300';

// ---------- konfigurasi ----------
export function ConfigCard({ config }: { config?: any }) {
  if (!config) return null;
  return config.ok ? (
    <Card title="Pemeriksaan konfigurasi">
      <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" aria-hidden />Konfigurasi indikator, bobot, dan ambang valid. Periode dapat dimulai.</p>
    </Card>
  ) : (
    <Card title="Pemeriksaan konfigurasi" className="border-red-300 dark:border-red-500/40">
      <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300"><XCircle className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{config.error}</span></p>
      <p className="mt-2 text-xs text-muted-foreground">Periode masih bisa dibuat sebagai draft, tetapi belum bisa dimulai sebelum konfigurasi diperbaiki. <Link to="/config" className="font-medium text-primary hover:underline">Buka Konfigurasi</Link></p>
    </Card>
  );
}

// ---------- editor detail per karyawan ----------
function ProposalRow({ p, emp, evaluators, projectsById, empProjects, onChange, onRemove, rowLabel }: { p?: any; emp?: any; evaluators?: any; projectsById?: any; empProjects?: any; onChange?: any; onRemove?: any; rowLabel?: any }) {
  const project = p.project_id ? projectsById[p.project_id] ?? null : null;
  const opts = eligibleUsers(evaluators, p.source, emp, project);
  if (p.evaluator_user_id && !opts.some((u) => u.id === p.evaluator_user_id)) opts.unshift({ id: p.evaluator_user_id, name: p.evaluator_name });
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[10rem_1fr_auto]">
      <div className="text-[13px] font-semibold">{SOURCE_LABEL[p.source]}{p.manual && <span className={cn('ml-1.5', MANUAL_CLS)}>manual</span>}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <FormSelect value={p.evaluator_user_id ?? ''} onChange={(e) => onChange({ evaluator_user_id: Number(e.target.value), evaluator_name: opts.find((u) => u.id === Number(e.target.value))?.name, manual: true })} aria-label={`Evaluator ${SOURCE_LABEL[p.source]} untuk ${rowLabel}`}>
          {opts.length === 0 && <option value="">Tidak ada evaluator yang memenuhi syarat</option>}
          {opts.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </FormSelect>
        {NEEDS_PROJECT.includes(p.source) && (
          p.added && empProjects.length > 1 ? (
            <FormSelect className="sm:w-52" value={p.project_id ?? ''} aria-label="Project" onChange={(e) => onChange({ project_id: Number(e.target.value), project_name: empProjects.find((x) => x.id === Number(e.target.value))?.name })}>
              {empProjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </FormSelect>
          ) : (
            <span className="text-xs text-muted-foreground" title="Project">Project: <b className="font-medium text-foreground">{p.project_name ?? '—'}</b></span>
          )
        )}
      </div>
      <Button type="button" size="icon" variant="ghost" className="justify-self-end text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Hapus ${SOURCE_LABEL[p.source]} untuk ${rowLabel}`}><X className="size-4" /></Button>
    </div>
  );
}

function RowEditor({ row, emp, evaluators, projectsById, update }: { row?: any; emp?: any; evaluators?: any; projectsById?: any; update?: any }) {
  const empProjects = useMemo(() => {
    const m = new Map();
    row.proposals.forEach((p) => p.project_id && m.set(p.project_id, { id: p.project_id, name: p.project_name }));
    return [...m.values()];
  }, [row.proposals]);
  const addSource = (source) => {
    const project = NEEDS_PROJECT.includes(source) ? empProjects[0] : null;
    if (NEEDS_PROJECT.includes(source) && !project) return toast.error('Karyawan tidak memiliki penugasan project pada rentang periode');
    const taken = new Set(row.proposals.filter((p) => p.source === source).map((p) => p.evaluator_user_id));
    const u = eligibleUsers(evaluators, source, emp, project ? projectsById[project.id] ?? null : null).find((x) => !taken.has(x.id));
    if (!u) return toast.error(`Tidak ada evaluator ${SOURCE_LABEL[source]} lain yang memenuhi syarat`);
    update((r) => ({ ...r, proposals: [...r.proposals, { key: `n${Date.now()}${Math.random()}`, source, evaluator_user_id: u.id, evaluator_name: u.name, project_id: project?.id ?? null, project_name: project?.name ?? null, added: true, manual: true }] }));
    return undefined;
  };
  return (
    <div className="space-y-2 p-1">
      {row.warnings.length > 0 && <div className="flex flex-wrap gap-1.5">{row.warnings.map((w) => <Badge key={w} tone="amber"><span className="sr-only">Peringatan: </span>{w}</Badge>)}</div>}
      {row.proposals.map((p) => (
        <ProposalRow
          key={p.key} p={p} emp={emp} evaluators={evaluators} projectsById={projectsById} empProjects={empProjects} rowLabel={row.employee.name}
          onChange={(patch) => update((r) => ({ ...r, proposals: r.proposals.map((x) => (x.key === p.key ? { ...x, ...patch } : x)) }))}
          onRemove={() => update((r) => ({ ...r, proposals: r.proposals.filter((x) => x.key !== p.key) }))}
        />
      ))}
      {row.proposals.length === 0 && <p className="text-sm text-red-700 dark:text-red-300">Tambahkan minimal satu evaluator agar periode dapat dimulai.</p>}
      {row.infos.length > 0 && <ul className="space-y-0.5 text-xs text-muted-foreground">{row.infos.map((i) => <li key={i}>{i}</li>)}</ul>}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Tambah:</span>
        {PLAN_SOURCES.map((s) => <Button key={s} type="button" size="xs" variant="outline" onClick={() => addSource(s)}><Plus className="size-3" />{SOURCE_LABEL[s]}</Button>)}
      </div>
    </div>
  );
}

// ---------- tabel ringkas ----------
function Chips({ items }: { items?: any }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((p) => (
        <span key={p.key} title={p.project_name ? `${p.evaluator_name} — ${p.project_name}` : p.evaluator_name} className="inline-flex max-w-44 items-center gap-1 truncate rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
          <span className="truncate">{p.evaluator_name}</span>{p.manual && <span className={MANUAL_CLS}>manual</span>}
        </span>
      ))}
    </div>
  );
}

const EmployeeTableRow = memo(function EmployeeTableRow({ row, emp, open, onToggle, evaluators, projectsById, update }: { row?: any; emp?: any; open?: any; onToggle?: any; evaluators?: any; projectsById?: any; update?: any }) {
  const missing = missingMandatory(row);
  const issues = rowIssues(row);
  const by = (s) => row.proposals.filter((p) => p.source === s);
  const tl = by('tech_lead');
  const label = `${open ? 'Tutup' : 'Buka'} detail evaluator ${row.employee.name}`;
  const note = [...row.warnings, ...(missing ? ['Belum ada evaluator'] : [])].join('\n');
  return (
    <>
      <TableRow className={cn('cursor-pointer', missing && RED_BOX)} onClick={() => onToggle(row.employee.id)} data-missing={missing || undefined}>
        <TableCell>
          <button type="button" aria-expanded={open} aria-label={label} onClick={(e) => { e.stopPropagation(); onToggle(row.employee.id); }} className="flex items-center gap-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {open ? <ChevronDown className="size-4 shrink-0" aria-hidden /> : <ChevronRight className="size-4 shrink-0" aria-hidden />}
            <span><span className="block font-medium">{row.employee.name}</span><span className="block text-xs text-muted-foreground">{row.employee.code} · {SEN_LABEL[row.employee.seniority]}</span></span>
          </button>
        </TableCell>
        <TableCell>
          {tl.length === 0 ? <span className="text-muted-foreground">—</span> : (
            <div className="flex flex-wrap gap-1">
              {tl[0].manual ? <Chips items={[tl[0]]} /> : <span className="text-xs text-muted-foreground">ikut tim</span>}
              {tl.length > 1 && <Chips items={tl.slice(1)} />}
            </div>
          )}
        </TableCell>
        <TableCell><Chips items={by('project_manager')} /></TableCell>
        <TableCell><Chips items={by('client')} /></TableCell>
        <TableCell><Chips items={by('metrics')} /></TableCell>
        <TableCell>
          {issues > 0 ? <span title={note} className={cn('inline-flex items-center gap-1 text-xs font-semibold', missing ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300')}><AlertTriangle className="size-3.5" aria-hidden /><span className="sr-only">Peringatan: </span>{issues}</span> : <span className="text-muted-foreground">—</span>}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className={cn('bg-muted/30', missing && RED_BOX)}>
            <RowEditor row={row} emp={emp} evaluators={evaluators} projectsById={projectsById} update={(fn) => update(row.employee.id, fn)} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

// ---------- panel grup ----------
function GroupPanel({ group, visibleRows, open, onToggle, expanded, onToggleRow, empMap, evaluators, projectsById, update, setRows }: { group?: any; visibleRows?: any; open?: any; onToggle?: any; expanded?: any; onToggleRow?: any; empMap?: any; evaluators?: any; projectsById?: any; update?: any; setRows?: any }) {
  const issues = group.rows.filter((r) => rowIssues(r) > 0).length;
  const members = useMemo(() => group.rows.map((r) => empMap[r.employee.id] ?? r.employee), [group.rows, empMap]);
  const options = useMemo(() => commonTechLeads(evaluators, members), [evaluators, members]);
  const none = group.key === 'none';
  const changeTL = (e) => {
    const to = evaluators.find((u) => u.id === Number(e.target.value));
    if (!to) return;
    const ids = new Set(group.rows.map((r) => r.employee.id));
    setRows((rows) => setGroupTechLead(rows, ids, to));
    toast.success(`Tech Lead ${to.name} ditetapkan untuk ${ids.size} karyawan`);
  };
  return (
    <section className={cn('rounded-lg border bg-card', none && 'border-amber-300 dark:border-amber-500/40')}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button type="button" aria-expanded={open} onClick={() => onToggle(group.key)} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {open ? <ChevronDown className="size-4 shrink-0" aria-hidden /> : <ChevronRight className="size-4 shrink-0" aria-hidden />}
          <span className="font-semibold">{group.name}</span>
          <span className="text-xs text-muted-foreground">{group.rows.length} karyawan</span>
          {issues > 0 ? <Badge tone="amber">⚠ {issues} perlu perhatian</Badge> : <Badge tone="green">✓ tanpa masalah</Badge>}
        </button>
        <div className="w-full sm:w-64">
          <FormSelect value="" disabled={options.length === 0} onChange={changeTL} aria-label={`${none ? 'Tetapkan' : 'Ganti'} Tech Lead tim ${group.name}`}>
            <option value="">{none ? 'Tetapkan Tech Lead tim…' : 'Ganti Tech Lead tim…'}</option>
            {options.filter((u) => u.id !== group.techLeadId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </FormSelect>
        </div>
        {options.length === 0 && <p className="w-full pl-6 text-xs text-muted-foreground">Tidak ada pengguna yang eligible sebagai Tech Lead untuk semua anggota grup ini (Tech Lead harus lead tim karyawan, atau Engineering Manager divisi yang sama). Ubah per baris.</p>}
      </div>
      {open && (
        <div className="border-t">
          {visibleRows.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Tidak ada karyawan yang cocok dengan filter.</p> : (
            <Table className="min-w-[48rem]">
              <TableHeader>
                <TableRow>
                  {['Karyawan', 'Tech Lead', 'PM', 'Client', 'Metrics', 'Catatan'].map((h) => <TableHead key={h} className="text-xs uppercase tracking-wide text-muted-foreground">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((r) => (
                  <EmployeeTableRow key={r.employee.id} row={r} emp={empMap[r.employee.id]} open={expanded.has(r.employee.id)} onToggle={onToggleRow} evaluators={evaluators} projectsById={projectsById} update={update} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </section>
  );
}

// ---------- aksi massal ----------
function BulkReplaceModal({ rows, empMap, evaluators, projectsById, visibleIds, filterActive, setRows, onClose }: { rows?: any; empMap?: any; evaluators?: any; projectsById?: any; visibleIds?: any; filterActive?: any; setRows?: any; onClose?: any }) {
  const [source, setSource] = useState('tech_lead');
  const [fromSel, setFromSel] = useState<any>(null);
  const [toSel, setToSel] = useState('');
  const [scope, setScope] = useState(filterActive ? 'filtered' : 'all');
  const [checked, setChecked] = useState(new Set());
  const usage = useMemo(() => sourceUsage(rows, source), [rows, source]);
  const fromId = usage.some((u) => u.id === fromSel) ? fromSel : usage[0]?.id ?? null;
  const candidates = useMemo(() => evaluators.filter((u) => SOURCE_ROLES[source].includes(u.role) && u.id !== fromId), [evaluators, source, fromId]);
  const toId = toSel ? Number(toSel) : null;
  const affected = useMemo(() => rows.filter((r) => r.proposals.some((p) => p.source === source && p.evaluator_user_id === fromId)), [rows, source, fromId]);
  const scopeIds = scope === 'all' ? null : scope === 'filtered' ? visibleIds : checked;
  const preview = useMemo(() => planReplace({ rows, empMap, evaluators, projectsById, source, fromId, toId, scopeIds }), [rows, empMap, evaluators, projectsById, source, fromId, toId, scopeIds]);
  const reasons = useMemo(() => {
    const m = new Map();
    preview.skipped.forEach((s) => m.set(s.reason, [...(m.get(s.reason) ?? []), s.name]));
    return [...m.entries()];
  }, [preview]);
  const to = evaluators.find((u) => u.id === toId);
  const pickScope = (s) => {
    if (s === 'checked' && scope !== 'checked') setChecked(new Set(planReplace({ rows, empMap, evaluators, projectsById, source, fromId, toId: null, scopeIds }).skipped.map((x) => x.empId)));
    setScope(s);
  };
  const apply = () => {
    setRows((rs) => applyReplace(rs, preview.changes, to));
    toast.success(`${preview.changes.length} diganti, ${preview.skipped.length} dilewati`);
    onClose();
  };
  const scopeBtn = (id, children) => <Button key={id} type="button" size="sm" variant={scope === id ? 'default' : 'outline'} aria-pressed={scope === id} onClick={() => pickScope(id)}>{children}</Button>;
  return (
    <Modal title="Ganti evaluator massal" onClose={onClose} wide>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Sumber" className="sm:col-span-2">
          <FormSelect value={source} onChange={(e) => { setSource(e.target.value); setFromSel(null); setToSel(''); }} aria-label="Sumber">
            {PLAN_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </FormSelect>
        </Field>
        <Field label="Dari" className="min-w-0">
          <FormSelect value={fromId ?? ''} onChange={(e) => setFromSel(Number(e.target.value))} aria-label="Dari evaluator">
            {usage.length === 0 && <option value="">Belum ada evaluator</option>}
            {usage.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.count} karyawan</option>)}
          </FormSelect>
        </Field>
        <Field label="Menjadi" className="min-w-0">
          <FormSelect value={toSel} onChange={(e) => setToSel(e.target.value)} aria-label="Menjadi evaluator">
            <option value="">Pilih pengganti…</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </FormSelect>
        </Field>
      </div>
      <div className="mb-3">
        <div className="mb-1.5 text-[13px] font-semibold">Cakupan</div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cakupan">
          {scopeBtn('all', `Semua ${affected.length} karyawan`)}
          {filterActive && scopeBtn('filtered', 'Sesuai filter aktif')}
          {scopeBtn('checked', 'Hanya yang saya centang')}
        </div>
        {scope === 'checked' && (
          <div className="no-scrollbar mt-2 max-h-40 overflow-y-auto rounded-lg border p-1">
            {affected.map((r) => (
              <label key={r.employee.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                <Checkbox checked={checked.has(r.employee.id)} onCheckedChange={(v) => setChecked((c) => { const n = new Set(c); if (v) n.add(r.employee.id); else n.delete(r.employee.id); return n; })} />
                {r.employee.name}<span className="text-xs text-muted-foreground">{r.employee.code}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 text-sm" aria-live="polite">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pratinjau</div>
        <p className="text-emerald-700 dark:text-emerald-300">✓ {preview.changes.length} karyawan akan diganti</p>
        <p className={preview.skipped.length ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}>✗ {preview.skipped.length} tidak bisa diganti</p>
        {reasons.map(([reason, names]) => (
          <p key={reason} className="mt-1 text-xs text-muted-foreground"><b className="font-medium text-foreground">{reason}</b> — {names.length} karyawan: {names.slice(0, 5).join(', ')}{names.length > 5 ? `, +${names.length - 5} lainnya` : ''}</p>
        ))}
        {preview.changes.length === 0 && to && <p className="mt-2 text-xs text-muted-foreground">Untuk mengganti Tech Lead/PM secara permanen, ubah data tim atau project di data master; wizard tidak mengubah data master.</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="button" disabled={preview.changes.length === 0} onClick={apply}>Terapkan</Button>
      </div>
    </Modal>
  );
}

function BulkMetricsModal({ rows, empMap, evaluators, setRows, onClose }: { rows?: any; empMap?: any; evaluators?: any; setRows?: any; onClose?: any }) {
  const hr = evaluators.filter((u) => u.role === 'hr');
  const [sel, setSel] = useState('');
  const to = hr.find((u) => u.id === Number(sel));
  const apply = () => {
    const res = setAllMetrics(rows, empMap, to);
    setRows(() => res.rows);
    toast.success(`${res.changed} diganti, ${res.skipped} dilewati`);
    onClose();
  };
  return (
    <Modal title="Objective Metrics untuk semua" onClose={onClose}>
      <Field label="Evaluator Objective Metrics (role HR)">
        <FormSelect value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Evaluator Objective Metrics">
          <option value="">Pilih pengguna HR…</option>
          {hr.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </FormSelect>
      </Field>
      <p className="mb-3 text-xs text-muted-foreground">Semua evaluator Objective Metrics pada {rows.length} karyawan diganti. Karyawan yang akunnya sama dengan evaluator dilewati.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="button" disabled={!to} onClick={apply}>Terapkan</Button>
      </div>
    </Modal>
  );
}

// ---------- langkah 3 ----------
export function StepEvaluators({ plan, loading, error, reload, empMap, evaluators, projectsById, setRows }: { plan?: any; loading?: any; error?: any; reload?: any; empMap?: any; evaluators?: any; projectsById?: any; setRows?: any }) {
  const rows = plan?.rows ?? [];
  const [filter, setFilter] = useState('all');
  const [warnText, setWarnText] = useState<any>(null);
  const [q, setQ] = useState('');
  const [openMap, setOpenMap] = useState({});
  const [expanded, setExpanded] = useState(() => new Set());
  const [bulk, setBulk] = useState<any>(null);

  const summary = useMemo(() => warningSummary(rows), [rows]);
  const kind = warnText ? summary.find((s) => s.text === warnText) ?? null : null;
  const counts = useMemo(() => ({
    all: rows.length,
    attention: rows.filter((r) => rowIssues(r) > 0).length,
    missing: rows.filter(missingMandatory).length,
    evaluators: rows.reduce((s, r) => s + r.proposals.length, 0),
    warnings: rows.reduce((s, r) => s + rowIssues(r), 0),
  }), [rows]);
  const filterActive = filter !== 'all' || !!kind || !!q.trim();

  const visible = useMemo(() => {
    const k = q.trim().toLowerCase();
    const ids = kind ? new Set(kind.empIds) : null;
    return rows.filter((r) => (filter === 'all' || (filter === 'attention' ? rowIssues(r) > 0 : missingMandatory(r)))
      && (!ids || ids.has(r.employee.id)) && (!k || `${r.employee.code} ${r.employee.name}`.toLowerCase().includes(k)));
  }, [rows, filter, kind, q]);
  const visibleIds = useMemo(() => new Set(visible.map((r) => r.employee.id)), [visible]);

  const groups = useMemo(() => groupByTechLead(rows), [rows]);
  const isOpen = (g) => openMap[g.key] ?? (g.key === 'none' || g.rows.some((r) => rowIssues(r) > 0));
  const toggleGroup = useCallback((key) => setOpenMap((m) => {
    const g = groups.find((x) => x.key === key);
    const cur = m[key] ?? (key === 'none' || g.rows.some((r) => rowIssues(r) > 0));
    return { ...m, [key]: !cur };
  }), [groups]);
  const setAll = (v) => setOpenMap(Object.fromEntries(groups.map((g) => [g.key, v])));
  const toggleRow = useCallback((id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const update = useCallback((empId, fn) => setRows((rs) => rs.map((r) => (r.employee.id === empId ? fn(r) : r))), [setRows]);
  const confirm = useConfirm();
  const recalc = async () => {
    if (plan?.dirty && !(await confirm({
      title: 'Hitung ulang usulan?', tone: 'warning', confirmText: 'Hitung ulang', cancelText: 'Pertahankan',
      description: 'Semua perubahan manual pada evaluator akan dihapus dan diganti usulan baru dari sistem.',
    }))) return;
    reload();
  };

  const chip = (id: string, children: any, tone?: any) => (
    <Button key={id} type="button" size="sm" variant={filter === id ? 'default' : 'outline'} aria-pressed={filter === id} onClick={() => setFilter(id)} className={cn(tone === 'red' && filter !== id && 'border-red-300 text-red-700 dark:border-red-500/40 dark:text-red-300')}>{children}</Button>
  );

  return (
    <div className="space-y-4">
      <ErrorBox error={error} />
      {error && !loading && <Button type="button" variant="outline" onClick={reload}><RefreshCw className="size-4" />Coba lagi</Button>}
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Menghitung usulan evaluator">
          <Skeleton className="h-16 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" />
        </div>
      ) : plan && (
        <>
          <ConfigCard config={plan.config} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm" aria-live="polite">
            <span><b>{counts.all}</b> karyawan</span>
            <span><b>{counts.evaluators}</b> evaluator ditugaskan</span>
            <span className={cn(counts.warnings && 'text-amber-700 dark:text-amber-300')}><AlertTriangle className="mr-1 inline size-3.5" aria-hidden /><b>{counts.warnings}</b> peringatan</span>
            {counts.missing > 0 && <span className="text-red-700 dark:text-red-300"><b>{counts.missing}</b> tanpa evaluator</span>}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline">Aksi massal <ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setBulk('replace')}>Ganti evaluator…</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setBulk('metrics')}>Objective Metrics untuk semua…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" size="sm" variant="outline" onClick={recalc}><RefreshCw className="size-3.5" />Hitung ulang usulan</Button>
            </div>
          </div>

          {summary.length > 0 && (
            <Card title="Ringkasan peringatan">
              <ul className="divide-y text-sm">
                {summary.map((s) => (
                  <li key={s.text} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span className={s.text === 'Belum ada evaluator' ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}><b>{s.empIds.length}</b> karyawan — {s.text}</span>
                    <Button type="button" size="xs" variant="outline" aria-pressed={warnText === s.text} onClick={() => setWarnText(warnText === s.text ? null : s.text)}>{warnText === s.text ? 'Sedang ditampilkan' : 'Lihat daftar'}</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {chip('all', `Semua (${counts.all})`)}
            {chip('attention', `Perlu perhatian (${counts.attention})`)}
            {chip('missing', `Tanpa evaluator (${counts.missing})`, 'red')}
            {kind && (
              <button type="button" onClick={() => setWarnText(null)} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" aria-label={`Hapus filter peringatan: ${kind.text}`}>
                {kind.text} <X className="size-3" />
              </button>
            )}
            <Input className="ml-auto h-8 w-full sm:w-56" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama/kode…" aria-label="Cari karyawan" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{visible.length} dari {rows.length} karyawan ditampilkan</span>
            <span className="flex gap-2"><Button type="button" size="xs" variant="ghost" onClick={() => setAll(true)}>Buka semua</Button><Button type="button" size="xs" variant="ghost" onClick={() => setAll(false)}>Tutup semua</Button></span>
          </div>

          <div className="space-y-3">
            {groups.map((g) => {
              const vr = g.rows.filter((r) => visibleIds.has(r.employee.id));
              if (filterActive && vr.length === 0) return null;
              return <GroupPanel key={g.key} group={g} visibleRows={vr} open={isOpen(g)} onToggle={toggleGroup} expanded={expanded} onToggleRow={toggleRow} empMap={empMap} evaluators={evaluators} projectsById={projectsById} update={update} setRows={setRows} />;
            })}
            {filterActive && visible.length === 0 && <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">Tidak ada karyawan yang cocok dengan filter.</p>}
          </div>
        </>
      )}
      {bulk === 'replace' && <BulkReplaceModal rows={rows} empMap={empMap} evaluators={evaluators} projectsById={projectsById} visibleIds={visibleIds} filterActive={filterActive} setRows={setRows} onClose={() => setBulk(null)} />}
      {bulk === 'metrics' && <BulkMetricsModal rows={rows} empMap={empMap} evaluators={evaluators} setRows={setRows} onClose={() => setBulk(null)} />}
    </div>
  );
}
