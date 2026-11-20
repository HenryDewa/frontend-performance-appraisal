import { useState } from 'react';
import type { Department } from '../types.ts';
import { DatePicker } from '@/components/ui/date-picker';
import { useConfirm } from '@/components/ConfirmProvider';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Award, BarChart3, Briefcase, CalendarClock, GraduationCap, LayoutDashboard, TrendingUp, AlertTriangle, CheckCircle2, Eye, FolderX, Layers, LayoutGrid, List, Lock, MoreHorizontal, Plus, Power, RotateCcw, Search, Trash2, UserX, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chips, DataFlags, PersonAvatar, SENIORITY_BAR, SeniorityBadge, splitStack } from '@/components/employee-ui.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { api, qs } from '../api.ts';
import { useAuth, isHR, isMgmt } from '../auth.tsx';
import { GapBadge, ScoreBar } from '@/components/career-common.tsx';
import CareerCard from '@/components/CareerCard.tsx';
import GapCard from '@/components/GapCard.tsx';
import TrainingCard from '@/components/TrainingCard.tsx';
import MentoringCard from '@/components/MentoringCard.tsx';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard as MetricCard, TrendChart } from './Dashboard.tsx';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/Pagination.tsx';
import { CertificationsCard, SkillsCard } from '@/components/ProfileSkills.tsx';
import { TagInput } from '@/components/TagInput.tsx';
import { useSkillSuggestions } from '../lib/useSkillSuggestions.ts';
import { FormSelect } from '@/components/ui/form-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, Bar, Card, Drawer, ErrorBox, Field, Loading, Modal, Page, fmt, fmtDate, useAction, useLoad } from '../ui.tsx';
import { todayWib } from '../lib/time.ts';

const EMPTY = { code: '', name: '', email: '', position: 'Frontend Developer', seniority: 'middle', join_date: '', department: 'Frontend', tech_stack: '', lead_user_id: '' };

function EmployeeForm({ initial, onClose, onSaved }: { initial?: any; onClose?: any; onSaved?: any }) {
  const [f, setF] = useState({ ...EMPTY, ...initial, email: initial?.email ?? '', tech_stack: initial?.tech_stack ?? '', lead_user_id: initial?.lead_user_id ?? '' });
  const { busy, error, run } = useAction();
  const leads = useLoad(() => api.get('/evaluators'));
  const depts = useLoad(() => api.get<Department[]>('/departments'));
  const suggestions = useSkillSuggestions();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  // departemen & posisi dipilih dari master; nilai lama yang sudah tidak aktif tetap tampil agar data tidak berubah diam-diam
  const deptList = (depts.data ?? []).filter((d) => d.active || d.name === f.department);
  const positions = (deptList.find((d) => d.name === f.department)?.positions ?? []).filter((p) => p.active || p.name === f.position);
  const setDept = (e) => {
    const d = (depts.data ?? []).find((x) => x.name === e.target.value);
    const first = d?.positions.find((p) => p.active)?.name ?? '';
    setF({ ...f, department: e.target.value, position: d?.positions.some((p) => p.active && p.name === f.position) ? f.position : first });
  };
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { code: f.code, name: f.name, email: f.email || null, position: f.position, seniority: f.seniority, join_date: f.join_date, department: f.department, tech_stack: f.tech_stack || null, lead_user_id: f.lead_user_id ? Number(f.lead_user_id) : null };
      if (initial?.id) await api.patch(`/employees/${initial.id}`, { ...body, status: f.status });
      else await api.post('/employees', body);
      toast.success(initial?.id ? 'Data karyawan diperbarui' : 'Karyawan ditambahkan');
      onSaved();
    });
  };
  return (
    <Drawer title={initial?.id ? 'Ubah karyawan' : 'Tambah karyawan'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Employee ID"><Input value={f.code} onChange={set('code')} required /></Field>
          <Field label="Nama"><Input value={f.name} onChange={set('name')} required /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Jabatan" hint={positions.length ? undefined : 'Departemen ini belum punya posisi — tambahkan di halaman Departemen'}><FormSelect value={f.position} onChange={set('position')} required>{positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</FormSelect></Field>
          <Field label="Seniority"><FormSelect value={f.seniority} onChange={set('seniority')}><option>junior</option><option>middle</option><option>senior</option></FormSelect></Field>
          <Field label="Tanggal bergabung"><DatePicker value={f.join_date} onChange={set('join_date')} required /></Field>
          <Field label="Department"><FormSelect value={f.department} onChange={setDept} required>{deptList.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</FormSelect></Field>
          <Field label="Tech stack" hint="Tambahkan satu per satu, tanpa koma" className="sm:col-span-2"><TagInput value={f.tech_stack} onChange={(v) => setF({ ...f, tech_stack: v })} suggestions={suggestions} placeholder="mis. React" aria-label="Tech stack" /></Field>
          <Field label="Tech Lead">
            <FormSelect value={f.lead_user_id} onChange={set('lead_user_id')}><option value="">—</option>{(leads.data ?? []).filter((u) => u.role === 'tech_lead').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</FormSelect>
          </Field>
          {initial?.id && <Field label="Status"><FormSelect value={f.status} onChange={set('status')}><option>active</option><option>inactive</option></FormSelect></Field>}
        </div>
        <ErrorBox error={error} />
        <div className="mt-2 flex flex-wrap items-center gap-2"><Button disabled={busy}>Simpan</Button><Button type="button" variant="outline" onClick={onClose}>Batal</Button></div>
      </form>
    </Drawer>
  );
}

const DEFAULT_FILTER = { q: '', seniority: '', status: 'active', project_id: '', department: '' };
const HEAD = 'text-xs uppercase tracking-wide text-muted-foreground';

function StatCard({ icon: Icon, tone, title, children }: { icon?: any; tone?: any; title?: any; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn('grid size-7 place-items-center rounded-lg', tone)}><Icon className="size-4" /></span>{title}
      </div>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options, label }: { value?: any; onChange?: any; options?: any; label?: any }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border bg-card p-0.5">
      {options.map(([v, text, count]) => (
        <button
          key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={cn('rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', value === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
          {text}{count != null && <span className={cn('ml-1.5 text-[11px]', value === v ? 'opacity-80' : 'opacity-60')}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

function RowMenu({ e, hr, superAdmin, busy, onToggle, onDelete }: { e?: any; hr?: any; superAdmin?: any; busy?: any; onToggle?: any; onDelete?: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi untuk ${e.name}`} onClick={(ev) => ev.stopPropagation()}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(ev) => ev.stopPropagation()}>
        <DropdownMenuItem asChild><Link to={`/employees/${e.id}`}><Eye />Lihat profil</Link></DropdownMenuItem>
        {hr && <DropdownMenuItem disabled={busy} onSelect={() => onToggle(e)}><Power />{e.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</DropdownMenuItem>}
        {superAdmin && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => onDelete(e)}><Trash2 />Hapus</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PersonCell({ e }: { e?: any }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PersonAvatar name={e.name} />
      <div className="min-w-0 leading-tight">
        <Link to={`/employees/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="block truncate font-semibold text-foreground hover:text-primary hover:underline">{e.name}</Link>
        <span className="block truncate text-xs text-muted-foreground">{e.code}{e.email ? ` · ${e.email}` : ''}</span>
      </div>
    </div>
  );
}

function LeadCell({ name }: { name?: any }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return <div className="flex items-center gap-2"><PersonAvatar name={name} className="size-6" textClass="text-[9px]" /><span className="truncate text-[13px]">{name}</span></div>;
}

function EmployeeCard({ e, onOpen, menu }: { e?: any; onOpen?: any; menu?: any }) {
  return (
    <div
      role="link" tabIndex={0} onClick={onOpen} onKeyDown={(ev) => ev.key === 'Enter' && onOpen()}
      className={cn('group flex cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40', e.status !== 'active' && 'opacity-70')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={e.name} className="size-11" textClass="text-sm" />
          <div className="min-w-0 leading-tight">
            <b className="block truncate text-[15px]">{e.name}</b>
            <span className="block truncate text-xs text-muted-foreground">{e.code} · {e.position}</span>
          </div>
        </div>
        {menu}
      </div>
      <div className="flex flex-wrap items-center gap-1.5"><SeniorityBadge value={e.seniority} /><Badge>{e.status}</Badge><DataFlags emp={e} /></div>
      <Chips items={splitStack(e.tech_stack)} max={4} tone="blue" />
      <dl className="mt-auto grid gap-1.5 border-t pt-3 text-xs">
        <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Tech Lead</dt><dd className="min-w-0"><LeadCell name={e.lead_name} /></dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Project</dt><dd className="min-w-0 text-right"><Chips items={e.projects} max={2} /></dd></div>
      </dl>
    </div>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const nav = useNavigate();
  const hr = isHR(user);
  const superAdmin = user.role === 'super_admin';
  const [f, setF] = useState(() => ({ ...DEFAULT_FILTER, department: new URLSearchParams(window.location.search).get('department') ?? '' }));
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem('fdp_emp_view') === 'cards' ? 'cards' : 'table'; } catch { return 'table'; } });
  const pickView = (v) => { setView(v); try { localStorage.setItem('fdp_emp_view', v); } catch { /* abaikan */ } };
  const { data, error, loading, reload } = useLoad(() => api.get('/employees' + qs({ ...f, page, size: view === 'cards' ? 24 : 25 })), [JSON.stringify(f), page, view]);
  const projects = useLoad(() => api.get('/projects'), []);
  const depts = useLoad(() => api.get<Department[]>('/departments'), []);
  const { busy: actBusy, error: actError, run: actRun } = useAction();
  const setFilter = (k, v) => { setPage(1); setF((x) => ({ ...x, [k]: v })); };
  const filtered = JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTER);

  const confirm = useConfirm();
  const toggleStatus = async (e) => {
    const next = e.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !(await confirm({
      title: 'Nonaktifkan karyawan?', tone: 'warning', confirmText: 'Nonaktifkan',
      description: `"${e.name}" tidak akan muncul pada filter status aktif dan tidak dapat dimasukkan ke periode baru.`,
    }))) return;
    actRun(async () => {
      await api.patch(`/employees/${e.id}`, { status: next });
      toast.success(`${e.name} → ${next}`);
      reload();
    });
  };
  const del = async (e) => {
    if (!(await confirm({
      title: 'Hapus karyawan?', tone: 'danger', confirmText: 'Hapus karyawan',
      description: `"${e.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
    }))) return;
    actRun(async () => {
      await api.del(`/employees/${e.id}`);
      toast.success(`Karyawan ${e.name} dihapus`);
      reload();
    });
  };

  const sum = data?.summary;
  const size = data?.size ?? 25;
  const from = data && data.total ? (page - 1) * size + 1 : 0;
  const to = data ? Math.min(page * size, data.total) : 0;
  const rows = data?.rows ?? [];
  const menu = (e) => <RowMenu e={e} hr={hr} superAdmin={superAdmin} busy={actBusy} onToggle={toggleStatus} onDelete={del} />;

  return (
    <Page eyebrow="Organisasi" title="Daftar Karyawan" actions={hr && <Button onClick={() => setCreating(true)}><Plus />Tambah karyawan</Button>}>
      {sum && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={UsersRound} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" title="Total karyawan">
            <div className="text-3xl font-extrabold leading-none tracking-tight">{sum.total}</div>
            <div className="mt-2 text-xs text-muted-foreground"><b className="text-emerald-600 dark:text-emerald-300">{sum.active}</b> aktif · {sum.inactive} nonaktif</div>
          </StatCard>
          <StatCard icon={Layers} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" title="Komposisi seniority (aktif)">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label="Komposisi seniority">
              {['junior', 'middle', 'senior'].map((s) => sum.by_seniority[s] > 0 && <div key={s} className={SENIORITY_BAR[s]} style={{ width: `${(sum.by_seniority[s] / Math.max(1, sum.active)) * 100}%` }} title={`${s}: ${sum.by_seniority[s]}`} />)}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {['junior', 'middle', 'senior'].map((s) => <span key={s} className="flex items-center gap-1.5 capitalize"><i className={cn('size-2 rounded-full', SENIORITY_BAR[s])} />{s} <b>{sum.by_seniority[s]}</b></span>)}
            </div>
          </StatCard>
          <StatCard
            icon={sum.no_account || sum.no_project ? AlertTriangle : CheckCircle2}
            tone={sum.no_account || sum.no_project ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'}
            title="Kelengkapan data"
          >
            {sum.no_account || sum.no_project ? (
              <>
                <div className="space-y-1 text-[13px]">
                  <div className="flex items-center gap-2"><UserX className="size-4 text-amber-600 dark:text-amber-300" /><b>{sum.no_account}</b> belum punya akun login</div>
                  <div className="flex items-center gap-2"><FolderX className="size-4 text-amber-600 dark:text-amber-300" /><b>{sum.no_project}</b> belum punya project aktif</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Memengaruhi self-assessment dan penilaian PM/klien.</div>
              </>
            ) : <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Semua karyawan aktif lengkap</div>}
          </StatCard>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama atau ID…" value={f.q} onChange={(e) => setFilter('q', e.target.value)} aria-label="Cari karyawan" />
        </div>
        <Segmented
          label="Status" value={f.status} onChange={(v) => setFilter('status', v)}
          options={[['active', 'Aktif', sum?.active], ['inactive', 'Nonaktif', sum?.inactive], ['', 'Semua', sum?.total]]}
        />
        <Segmented
          label="Seniority" value={f.seniority} onChange={(v) => setFilter('seniority', v)}
          options={[['', 'Semua'], ['junior', 'Junior', sum?.by_seniority.junior], ['middle', 'Middle', sum?.by_seniority.middle], ['senior', 'Senior', sum?.by_seniority.senior]]}
        />
        {(depts.data ?? []).length > 1 && (
          <FormSelect className="w-auto min-w-40" value={f.department} onChange={(e) => setFilter('department', e.target.value)} aria-label="Departemen">
            <option value="">Semua departemen</option>
            {(depts.data ?? []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </FormSelect>
        )}
        <FormSelect className="w-auto min-w-44" value={f.project_id} onChange={(e) => setFilter('project_id', e.target.value)} aria-label="Project">
          <option value="">Semua project</option>
          {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FormSelect>
        {filtered && <Button variant="ghost" size="sm" onClick={() => { setPage(1); setF(DEFAULT_FILTER); }}><RotateCcw />Reset</Button>}
        <div className="ml-auto inline-flex rounded-lg border p-0.5" role="group" aria-label="Tampilan">
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="size-8" aria-pressed={view === 'table'} aria-label="Tampilan tabel" onClick={() => pickView('table')}><List /></Button>
          <Button variant={view === 'cards' ? 'secondary' : 'ghost'} size="icon" className="size-8" aria-pressed={view === 'cards'} aria-label="Tampilan kartu" onClick={() => pickView('cards')}><LayoutGrid /></Button>
        </div>
      </div>

      <ErrorBox error={actError} />
      <Loading loading={loading && !data} error={error}>
        {data && (
          <div className={cn('transition-opacity', loading && 'opacity-60')}>
            {rows.length === 0 ? (
              <Card>
                <div className="grid place-items-center gap-2 py-10 text-center">
                  <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"><UsersRound className="size-7" /></span>
                  <b>Tidak ada karyawan yang cocok</b>
                  <span className="text-sm text-muted-foreground">Ubah kata kunci atau filter yang dipakai.</span>
                  {filtered && <Button variant="outline" size="sm" onClick={() => { setPage(1); setF(DEFAULT_FILTER); }}><RotateCcw />Reset filter</Button>}
                </div>
              </Card>
            ) : view === 'cards' ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((e) => <EmployeeCard key={e.id} e={e} onOpen={() => nav(`/employees/${e.id}`)} menu={menu(e)} />)}
              </div>
            ) : (
              <Card className="py-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={HEAD}>Karyawan</TableHead>
                      <TableHead className={HEAD}>Posisi</TableHead>
                      <TableHead className={HEAD}>Seniority</TableHead>
                      <TableHead className={HEAD}>Tech stack</TableHead>
                      <TableHead className={HEAD}>Tech Lead</TableHead>
                      <TableHead className={HEAD}>Project</TableHead>
                      <TableHead className={HEAD}>Status</TableHead>
                      <TableHead className={HEAD}><span className="sr-only">Aksi</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((e) => (
                      <TableRow key={e.id} className={cn('cursor-pointer hover:bg-muted/50', e.status !== 'active' && 'opacity-70')} onClick={() => nav(`/employees/${e.id}`)}>
                        <TableCell className="max-w-64"><PersonCell e={e} /></TableCell>
                        <TableCell className="whitespace-normal"><div className="text-[13px]">{e.position}</div><div className="text-xs text-muted-foreground">{e.department}</div></TableCell>
                        <TableCell><SeniorityBadge value={e.seniority} /></TableCell>
                        <TableCell className="max-w-48 whitespace-normal"><Chips items={splitStack(e.tech_stack)} tone="blue" /></TableCell>
                        <TableCell className="max-w-44"><LeadCell name={e.lead_name} /></TableCell>
                        <TableCell className="max-w-48 whitespace-normal"><Chips items={e.projects} max={2} /></TableCell>
                        <TableCell><div className="flex items-center gap-2"><Badge>{e.status}</Badge><DataFlags emp={e} /></div></TableCell>
                        <TableCell className="text-right">{menu(e)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Menampilkan {from}–{to} dari {data.total} karyawan</span>
              <Pagination page={page} size={data.size} total={data.total} onPage={setPage} />
            </div>
          </div>
        )}
      </Loading>
      {creating && <EmployeeForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </Page>
  );
}

export function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const emp = useLoad(() => api.get(`/employees/${id}`), [id]);
  const hist = useLoad(() => api.get(`/employees/${id}/history`), [id]);
  const projects = useLoad(() => (isHR(user) ? api.get('/projects') : Promise.resolve([])), []);
  const [editing, setEditing] = useState(false);
  const [asg, setAsg] = useState<any>(null);
  const [rev, setRev] = useState(0);
  const bump = () => setRev((n) => n + 1);
  const career = useLoad(() => api.get(`/employees/${id}/career`), [id, rev]);
  const gapsQ = useLoad(() => api.get(`/employees/${id}/gaps`), [id, rev]);
  const [tab, setTab] = useState('ringkasan');
  const { busy, error, run } = useAction();

  const e = emp.data;
  const todayIso = todayWib();
  const canManage = isMgmt(user);
  const isSelf = e != null && user?.employee_id === e.id;
  return (
    <Page title={e ? e.name : 'Profil karyawan'} eyebrow={isSelf ? 'Profil & karier saya' : 'Profil karyawan'} actions={isHR(user) && e && <Button variant="outline" onClick={() => setEditing(true)}>Ubah</Button>}>
      {e && user?.role === 'tech_lead' && !isSelf && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[13px] text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <div>Anda melihat profil anggota tim Anda sebagai supervisor. Tampilan hanya baca; hasil evaluasi baru terlihat setelah dipublikasikan, tanpa rincian skor per sumber penilai.</div>
        </div>
      )}
      <Loading loading={emp.loading} error={emp.error}>
        {e && (() => {
          const hl = [...(hist.data ?? [])];
          const latest = hl[hl.length - 1];
          const prev = hl[hl.length - 2];
          const delta = latest && prev ? latest.final_score - prev.final_score : null;
          const avg = hl.length ? hl.reduce((s, h) => s + h.final_score, 0) / hl.length : null;
          const running = e.assignments.filter((a) => !a.end_date || a.end_date >= todayIso);
          const months = e.join_date ? Math.max(0, Math.floor((Date.now() - new Date(String(e.join_date).slice(0, 10)).getTime()) / (30.44 * 86400000))) : null;
          const tenureText = months == null ? '—' : months >= 12 ? `${Math.floor(months / 12)} th ${months % 12} bln` : `${months} bln`;
          const trend = hl.map((h) => ({ period_id: h.id, period: h.period, avg_score: h.final_score }));
          const curLevel = career.data?.current_level;
          const nextLevel = career.data?.next_level;
          const ready = career.data?.readiness;
          const focus = [...(gapsQ.data?.gaps ?? [])].filter((g) => g.gap > 0).sort((x, y) => y.gap - x.gap).slice(0, 3);
          const info = [
            ['Employee ID', e.code], ['Bergabung', fmtDate(e.join_date)], ['Tech Lead', e.lead_name ?? '—'], ['Email', e.email ?? '—'],
          ];
          return (
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-600/20 sm:p-6">
                <div className="absolute -right-12 -top-12 size-44 rounded-full bg-white/10" />
                <div className="absolute -bottom-16 left-1/3 size-40 rounded-full bg-white/5" />
                <div className="relative flex flex-wrap items-start justify-between gap-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <PersonAvatar name={e.name} className="size-20 shrink-0 border-4 border-white/30 shadow-md" textClass="text-2xl" />
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{e.name}</h2>
                      <div className="mt-0.5 text-sm text-blue-100">{e.position} · {e.department}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 capitalize">{e.seniority}</span>
                        {curLevel && <span className="rounded-full bg-white/20 px-2.5 py-0.5">{curLevel.name}</span>}
                        <span className={`rounded-full px-2.5 py-0.5 capitalize ${e.status === 'active' ? 'bg-emerald-400/30' : 'bg-white/10'}`}>{e.status}</span>
                      </div>
                      {splitStack(e.tech_stack).length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {splitStack(e.tech_stack).map((t) => <span key={t} className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  {nextLevel && ready && (
                    <button type="button" onClick={() => setTab('karier')} className="w-full rounded-xl bg-white/15 px-4 py-3 text-left backdrop-blur transition-colors hover:bg-white/20 sm:w-64">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-blue-100">Menuju {nextLevel.name}</div>
                      <div className="mt-0.5 flex items-end justify-between"><span className="text-3xl font-extrabold leading-none">{ready.progress_pct}%</span><span className="text-xs text-blue-100">{ready.met_all ? 'Memenuhi syarat' : 'kesiapan'}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, ready.progress_pct)}%` }} /></div>
                    </button>
                  )}
                </div>
                <dl className="relative mt-5 grid gap-x-6 gap-y-3 border-t border-white/20 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {info.map(([k, v]) => (
                    <div key={k} className="min-w-0"><dt className="text-xs text-blue-100">{k}</dt><dd className="truncate font-semibold">{v}</dd></div>
                  ))}
                </dl>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Award} tone="blue" value={latest ? fmt(latest.final_score) : '—'} label="Skor terakhir" delta={delta} sub={latest ? latest.classification : 'belum ada hasil'} />
                <MetricCard icon={TrendingUp} tone="violet" value={avg != null ? fmt(avg) : '—'} label="Rata-rata skor" sub={`${hl.length} periode`} />
                <MetricCard icon={Briefcase} tone="cyan" value={running.length} label="Project berjalan" sub={`${e.assignments.length} penugasan tercatat`} />
                <MetricCard icon={CalendarClock} tone="green" value={tenureText} label="Masa kerja" sub={`sejak ${fmtDate(e.join_date)}`} />
              </div>

              <Tabs value={tab} onValueChange={setTab} className="gap-5">
                <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border bg-card p-1 no-scrollbar">
                  {([['ringkasan', 'Ringkasan', LayoutDashboard], ['kinerja', 'Kinerja', BarChart3], ['karier', 'Karier & belajar', GraduationCap], ['skill', 'Skill & sertifikasi', Award], ['project', 'Project', Briefcase]] as [string, string, any][]).map(([v, label, Icon]) => (
                    <TabsTrigger key={v} value={v} className="flex-none gap-1.5 px-3.5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><Icon className="size-4" />{label}</TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="ringkasan" className="grid gap-5 lg:grid-cols-2">
                  <Card title="Tren skor" actions={hl.length > 0 && <Button size="sm" variant="ghost" onClick={() => setTab('kinerja')}>Riwayat</Button>}>
                    {hl.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Belum ada hasil yang dipublikasikan.</p> : <TrendChart data={trend} />}
                  </Card>
                  <Card title="Fokus pengembangan" actions={<Button size="sm" variant="ghost" onClick={() => setTab('karier')}>Selengkapnya</Button>}>
                    {gapsQ.loading ? <p className="text-sm text-muted-foreground">Memuat…</p> : !gapsQ.data?.evaluation ? (
                      <p className="py-4 text-sm text-muted-foreground">Belum ada hasil evaluasi yang dapat dianalisis.</p>
                    ) : focus.length === 0 ? (
                      <p className="flex items-center gap-2 py-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />Semua indikator sudah mencapai target. Pertahankan!</p>
                    ) : (
                      <ul className="space-y-4">
                        {focus.map((g, i) => (
                          <li key={g.code} className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                              <span className="flex items-center gap-2 font-semibold"><span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[10px] font-extrabold text-primary">{i + 1}</span>{g.name}</span>
                              <span className="flex items-center gap-2"><b>{fmt(g.score)}</b><span className="text-xs text-muted-foreground">/ target {fmt(g.target)}</span><GapBadge gap={g.gap} /></span>
                            </div>
                            <ScoreBar score={g.score} target={g.target} />
                            {g.recommendations[0] && <div className="text-xs text-muted-foreground">Saran: {g.recommendations[0].title}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="kinerja" className="space-y-5">
                  <Loading loading={hist.loading} error={hist.error}>
                    {hl.length === 0 ? <Card><p className="py-6 text-center text-sm text-muted-foreground">Belum ada hasil yang disetujui.</p></Card> : (
                      <>
                        <Card title="Riwayat evaluasi">
                          <ul className="divide-y">
                            {[...hl].reverse().map((h, i, arr) => {
                              const before = arr[i + 1];
                              const d = before ? h.final_score - before.final_score : null;
                              return (
                                <li key={h.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
                                  <div className="min-w-36 flex-1 font-semibold">{h.period}</div>
                                  <div className="w-full min-w-32 flex-1 sm:w-auto"><Bar value={h.final_score} /></div>
                                  <div className="w-24 text-right">
                                    <b className="text-lg">{fmt(h.final_score)}</b>
                                    {d != null && <div className={`text-xs font-bold ${d >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{d >= 0 ? '▲' : '▼'} {fmt(Math.abs(d))}</div>}
                                  </div>
                                  <Badge>{h.classification}</Badge>
                                  <Badge>{h.status}</Badge>
                                </li>
                              );
                            })}
                          </ul>
                        </Card>
                      </>
                    )}
                  </Loading>
                </TabsContent>

                <TabsContent value="project" className="space-y-5">
                  <Card title="Riwayat penugasan project" actions={isHR(user) && <Button size="sm" variant="outline" onClick={() => setAsg({ project_id: '', role: 'Developer', start_date: '', end_date: '' })}><Plus />Penugasan</Button>}>
                    {e.assignments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Belum ada penugasan.</p> : (
                      <ol className="relative space-y-5 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-border">
                        {e.assignments.map((a) => {
                          const live = !a.end_date || a.end_date >= todayIso;
                          return (
                            <li key={a.id} className="relative pl-6">
                              <i className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-card ${live ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <div className="flex flex-wrap items-center gap-2">
                                <b>{a.project_name}</b>
                                <span className="text-sm text-muted-foreground">· {a.client_name}</span>
                                <Badge>{a.complexity}</Badge>
                                {live && <Badge tone="green">berjalan</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground">{a.role} · {fmtDate(a.start_date)} → {a.end_date ? fmtDate(a.end_date) : 'sekarang'}</div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="skill" className="space-y-5">
                  <SkillsCard employeeId={e.id} canEdit={isSelf || isHR(user)} />
                  <CertificationsCard employeeId={e.id} canEdit={isSelf || isHR(user)} />
                </TabsContent>

                <TabsContent value="karier" className="space-y-5">
                  <CareerCard employeeId={e.id} rev={rev} />
                  <GapCard employeeId={e.id} canManage={canManage} rev={rev} onChange={bump} />
                  <TrainingCard employeeId={e.id} canManage={canManage} isSelf={isSelf} rev={rev} onChange={bump} />
                  <MentoringCard employee={e} canManage={canManage} rev={rev} onChange={bump} />
                </TabsContent>
              </Tabs>
            </div>
          );
        })()}
      </Loading>
      {editing && <EmployeeForm initial={e} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); emp.reload(); }} />}
      {asg && (
        <Modal title="Tambah penugasan" onClose={() => setAsg(null)}>
          <form onSubmit={(ev) => { ev.preventDefault(); run(async () => { await api.post(`/employees/${id}/assignments`, { project_id: Number(asg.project_id), role: asg.role || null, start_date: asg.start_date, end_date: asg.end_date || null }); toast.success('Penugasan project ditambahkan'); setAsg(null); emp.reload(); }); }}>
            <Field label="Project"><FormSelect value={asg.project_id} onChange={(x) => setAsg({ ...asg, project_id: x.target.value })} required><option value="">Pilih…</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.client_name}</option>)}</FormSelect></Field>
            <Field label="Peran"><Input value={asg.role} onChange={(x) => setAsg({ ...asg, role: x.target.value })} /></Field>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Mulai"><DatePicker value={asg.start_date} onChange={(x) => setAsg({ ...asg, start_date: x.target.value })} required /></Field>
              <Field label="Selesai"><DatePicker value={asg.end_date} onChange={(x) => setAsg({ ...asg, end_date: x.target.value })} /></Field>
            </div>
            <ErrorBox error={error} />
            <Button disabled={busy}>Simpan</Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
