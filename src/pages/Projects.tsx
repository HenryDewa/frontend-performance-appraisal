import { useMemo, useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, Briefcase, Building2, CalendarDays, FolderKanban, LogOut, MoreHorizontal, Pencil, Plus, Power, RotateCcw, Search, Trash2, UserCheck, UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { Chips, GradientTile, PersonAvatar, splitStack } from '@/components/employee-ui.tsx';
import { TagInput } from '@/components/TagInput.tsx';
import { useSkillSuggestions } from '../lib/useSkillSuggestions.ts';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, qs } from '../api.ts';
import { useDebounced } from '../lib/useDebounced.ts';
import type { Paged } from '../types.ts';
import { useAuth, isHR } from '../auth.tsx';
import { Badge, Card, Drawer, ErrorBox, Field, Loading, Modal, Page, fmtDate, useAction, useLoad } from '../ui.tsx';
import { todayWib, addDaysWib } from '../lib/time.ts';

const COMPLEXITY = {
  low: { label: 'Rendah', desc: 'Codebase kecil / requirement stabil', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' },
  medium: { label: 'Sedang', desc: 'Beberapa integrasi, perubahan wajar', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300' },
  high: { label: 'Tinggi', desc: 'Legacy / banyak ketergantungan / sering berubah', cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' },
};
const INDUSTRIES = ['Banking', 'Fintech', 'E-commerce', 'Healthcare', 'Education', 'Logistics', 'Telecom', 'Government', 'Media', 'Manufacturing'];
const HEAD = 'text-xs uppercase tracking-wide text-muted-foreground';
const longDate = fmtDate;

function ComplexityBadge({ value }: { value?: any }) {
  const c = COMPLEXITY[value] ?? COMPLEXITY.medium;
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', c.cls)}>{c.label}</span>;
}

function StatTile({ icon: Icon, tone, label, value, sub }: { icon?: any; tone?: any; label?: any; value?: any; sub?: any }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-6" /></span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-extrabold leading-tight tracking-tight">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function RowMenu({ label, hr, superAdmin, active, busy, onEdit, onToggle, onDelete }: { label?: any; hr?: any; superAdmin?: any; active?: any; busy?: any; onEdit?: any; onToggle?: any; onDelete?: any }) {
  if (!hr) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi untuk ${label}`}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onEdit}><Pencil />Ubah</DropdownMenuItem>
        <DropdownMenuItem disabled={busy} onSelect={onToggle}><Power />{active ? 'Nonaktifkan' : 'Aktifkan'}</DropdownMenuItem>
        {superAdmin && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={busy} onSelect={onDelete}><Trash2 />Hapus</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectCard({ p, menu, onMembers, onEdit, hr }: { p?: any; menu?: any; onMembers?: any; onEdit?: any; hr?: any }) {
  return (
    <div className={cn('group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md', !p.active && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <GradientTile name={p.name} />
          <div className="min-w-0 leading-tight">
            <h3 className="truncate text-[16px] font-extrabold tracking-tight">{p.name}</h3>
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Building2 className="size-3.5 shrink-0" />{p.client_name}</span>
          </div>
        </div>
        {menu}
      </div>

      <div className="flex flex-wrap items-center gap-1.5"><ComplexityBadge value={p.complexity} /><Badge>{p.active ? 'active' : 'inactive'}</Badge></div>
      <Chips items={splitStack(p.tech_stack)} max={4} tone="blue" />

      <dl className="grid gap-2 border-t pt-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Project Manager</dt>
          <dd className="min-w-0">
            {p.pm_name
              ? <span className="flex items-center gap-1.5"><PersonAvatar name={p.pm_name} className="size-6" textClass="text-[9px]" /><b className="truncate text-[13px] font-semibold">{p.pm_name}</b></span>
              : <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300"><AlertTriangle className="size-3.5" />Belum ada PM</span>}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Periode</dt>
          <dd className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted-foreground" />{longDate(p.start_date)}{p.end_date ? ` – ${longDate(p.end_date)}` : ' – berjalan'}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" disabled={p.members + p.members_past === 0 && !hr} onClick={onMembers}><UsersRound />{p.members} anggota aktif{p.members_past > 0 && <span className="font-normal text-muted-foreground">· {p.members_past} selesai</span>}</Button>
        {hr && <Button variant="ghost" size="sm" onClick={onEdit}><Pencil />Ubah</Button>}
      </div>
    </div>
  );
}

function ClientCard({ c, menu, onEdit, onProjects, hr }: { c?: any; menu?: any; onEdit?: any; onProjects?: any; hr?: any }) {
  return (
    <div className={cn('flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md', !c.active && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <GradientTile name={c.name} />
          <div className="min-w-0 leading-tight">
            <h3 className="truncate text-[16px] font-extrabold tracking-tight">{c.name}</h3>
            <span className="truncate text-xs text-muted-foreground">{c.industry || 'Industri belum diisi'}</span>
          </div>
        </div>
        {menu}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{c.active ? 'active' : 'inactive'}</Badge>
        {c.industry && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{c.industry}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
        {[['Project', c.projects_count, `${c.active_projects} aktif`], ['Anggota', c.members, 'ditugaskan'], ['Evaluator', c.evaluators, 'akun klien']].map(([label, v, sub]) => (
          <div key={label}><div className="text-xl font-extrabold leading-none">{v}</div><div className="mt-1 text-[11px] font-semibold">{label}</div><div className="text-[10.5px] text-muted-foreground">{sub}</div></div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onProjects} disabled={c.projects_count === 0}><FolderKanban />Lihat project</Button>
        {hr && <Button variant="ghost" size="sm" onClick={onEdit}><Pencil />Ubah</Button>}
      </div>
    </div>
  );
}

const EMPTY_CLIENT = { name: '', industry: '', active: true };
const EMPTY_PROJECT = { client_id: '', name: '', complexity: 'medium', tech_stack: '', pm_user_id: '', start_date: '', end_date: '', active: true };

export default function Projects() {
  const suggestions = useSkillSuggestions();
  const { user } = useAuth();
  const hr = isHR(user);
  const superAdmin = user.role === 'super_admin';
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'client' ? 'client' : 'project';
  const setTab = (v) => { const n = new URLSearchParams(params); if (v === 'project') n.delete('tab'); else n.set('tab', v); setParams(n, { replace: true }); };

  const clients = useLoad(() => api.get('/clients'));
  const projects = useLoad(() => api.get('/projects'));
  const evaluators = useLoad(() => (hr ? api.get('/evaluators') : Promise.resolve([])));
  const [modal, setModal] = useState<any>(null); // { kind, id?, data }
  const [members, setMembers] = useState<any>(null);
  const [f, setF] = useState({ q: '', client_id: '', complexity: '', status: 'active' });
  const { busy, error, run, setError } = useAction();
  const close = () => { setModal(null); setError(null); };
  const reload = () => { clients.reload(); projects.reload(); };

  const cl = clients.data ?? [];
  const pr = projects.data ?? [];
  const pms = (evaluators.data ?? []).filter((u) => u.role === 'project_manager');

  const stats = useMemo(() => ({
    clientsActive: cl.filter((c) => c.active).length,
    projectsActive: pr.filter((p) => p.active).length,
    members: pr.filter((p) => p.active).reduce((s, p) => s + p.members, 0),
    noPm: pr.filter((p) => p.active && !p.pm_user_id).length,
  }), [cl, pr]);

  const term = f.q.trim().toLowerCase();
  const statusOk = (a) => f.status === '' || (f.status === 'active') === !!a;
  const shownProjects = pr.filter((p) => statusOk(p.active)
    && (!f.client_id || String(p.client_id) === f.client_id)
    && (!f.complexity || p.complexity === f.complexity)
    && (!term || p.name.toLowerCase().includes(term) || (p.tech_stack ?? '').toLowerCase().includes(term) || p.client_name.toLowerCase().includes(term)));
  const shownClients = cl.filter((c) => statusOk(c.active) && (!term || c.name.toLowerCase().includes(term) || (c.industry ?? '').toLowerCase().includes(term)));
  const filtered = f.q || f.client_id || f.complexity || f.status !== 'active';
  const resetFilter = () => setF({ q: '', client_id: '', complexity: '', status: 'active' });

  // ---- aksi ----
  const openClient = (c?: any) => { setError(null); setModal({ kind: 'client', id: c?.id, data: c ? { name: c.name, industry: c.industry ?? '', active: c.active } : { ...EMPTY_CLIENT } }); };
  const openProject = (p?: any) => {
    setError(null);
    setModal({ kind: 'project', id: p?.id, data: p
      ? { client_id: String(p.client_id), name: p.name, complexity: p.complexity, tech_stack: p.tech_stack ?? '', pm_user_id: p.pm_user_id ? String(p.pm_user_id) : '', start_date: p.start_date ?? '', end_date: p.end_date ?? '', active: p.active }
      : { ...EMPTY_PROJECT, client_id: f.client_id } });
  };
  const upd = (k, v) => setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const saveClient = (e) => {
    e.preventDefault();
    const d = modal.data;
    run(async () => {
      const body = { name: d.name.trim(), industry: d.industry.trim() || null, ...(modal.id ? { active: d.active } : {}) };
      if (modal.id) await api.patch(`/clients/${modal.id}`, body); else await api.post('/clients', body);
      toast.success(modal.id ? `Client "${d.name}" diperbarui` : `Client "${d.name}" ditambahkan`);
      close(); reload();
    });
  };
  const projectError = modal?.kind === 'project' && modal.data.end_date && modal.data.start_date && modal.data.end_date < modal.data.start_date ? 'Tanggal selesai tidak boleh sebelum tanggal mulai' : null;
  const saveProject = (e) => {
    e.preventDefault();
    const d = modal.data;
    if (projectError) return;
    run(async () => {
      const body = {
        client_id: Number(d.client_id), name: d.name.trim(), complexity: d.complexity, tech_stack: d.tech_stack.trim() || null,
        pm_user_id: d.pm_user_id ? Number(d.pm_user_id) : null, start_date: d.start_date || null, end_date: d.end_date || null,
        ...(modal.id ? { active: d.active } : {}),
      };
      if (modal.id) await api.patch(`/projects/${modal.id}`, body); else await api.post('/projects', body);
      toast.success(modal.id ? `Project "${d.name}" diperbarui` : `Project "${d.name}" ditambahkan`);
      close(); reload();
    });
  };

  const toggle = async (kind, item) => {
    const label = kind === 'client' ? 'client' : 'project';
    if (item.active && !(await confirm({
      title: `Nonaktifkan ${label}?`, tone: 'warning', confirmText: 'Nonaktifkan',
      description: kind === 'client'
        ? `"${item.name}" tidak akan muncul pada pilihan client baru. Project dan riwayat penilaian yang sudah ada tetap tersimpan.`
        : `"${item.name}" tidak akan muncul pada pilihan project baru. Penugasan dan riwayat penilaian yang sudah ada tetap tersimpan.`,
    }))) return;
    run(async () => {
      await api.patch(`/${kind === 'client' ? 'clients' : 'projects'}/${item.id}`, { active: !item.active });
      toast.success(`${item.name} ${item.active ? 'dinonaktifkan' : 'diaktifkan'}`);
      reload();
    });
  };
  const del = async (kind, item) => {
    const label = kind === 'client' ? 'client' : 'project';
    if (!(await confirm({
      title: `Hapus ${label}?`, tone: 'danger', confirmText: `Hapus ${label}`,
      description: `"${item.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.${kind === 'client' ? '\nClient yang masih memiliki project atau akun evaluator tidak dapat dihapus.' : '\nProject yang masih memiliki penugasan atau riwayat penilaian tidak dapat dihapus.'}`,
    }))) return;
    run(async () => {
      try {
        await api.del(`/${kind === 'client' ? 'clients' : 'projects'}/${item.id}`);
        toast.success(`${item.name} dihapus`);
        reload();
      } catch (e) {
        toast.error(e.message); // mis. 409: masih dipakai data lain
      }
    });
  };

  const menuFor = (kind, item) => (
    <RowMenu
      label={item.name} hr={hr} superAdmin={superAdmin} active={item.active} busy={busy}
      onEdit={() => (kind === 'client' ? openClient(item) : openProject(item))}
      onToggle={() => toggle(kind, item)} onDelete={() => del(kind, item)}
    />
  );

  const emptyState = (kind) => (
    <Card>
      <div className="grid place-items-center gap-2 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">{kind === 'client' ? <Building2 className="size-7" /> : <Briefcase className="size-7" />}</span>
        <b>{(kind === 'client' ? cl : pr).length === 0 ? `Belum ada ${kind}` : `Tidak ada ${kind} yang cocok`}</b>
        <span className="text-sm text-muted-foreground">{(kind === 'client' ? cl : pr).length === 0 ? `Tambahkan ${kind} pertama untuk mulai mengelola penugasan.` : 'Ubah filter atau kata kunci pencarian.'}</span>
        <div className="flex gap-2">
          {filtered && <Button variant="outline" size="sm" onClick={resetFilter}><RotateCcw />Reset filter</Button>}
          {hr && (kind === 'client' ? cl : pr).length === 0 && <Button size="sm" onClick={() => (kind === 'client' ? openClient() : openProject())}><Plus />Tambah {kind}</Button>}
        </div>
      </div>
    </Card>
  );

  return (
    <Page
      eyebrow="Organisasi"
      title="Client & Project"
      actions={hr && (
        <>
          <Button variant="outline" onClick={() => openClient()}><Plus />Client</Button>
          <Button onClick={() => openProject()} disabled={cl.filter((c) => c.active).length === 0} title={cl.length === 0 ? 'Tambahkan client lebih dulu' : undefined}><Plus />Project</Button>
        </>
      )}
    >
      <ErrorBox error={error && !modal ? error : null} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Building2} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" label="Client aktif" value={stats.clientsActive} sub={`dari ${cl.length} client`} />
        <StatTile icon={FolderKanban} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" label="Project aktif" value={stats.projectsActive} sub={`dari ${pr.length} project`} />
        <StatTile icon={UsersRound} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" label="Anggota ditugaskan" value={stats.members} sub="penugasan aktif pada project aktif" />
        <StatTile
          icon={stats.noPm ? AlertTriangle : UserCheck}
          tone={stats.noPm ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'}
          label="Project tanpa PM" value={stats.noPm} sub={stats.noPm ? 'tidak dapat dinilai oleh PM' : 'semua project punya PM'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border bg-card p-3 shadow-sm">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="project"><FolderKanban className="size-4" />Project ({pr.length})</TabsTrigger>
            <TabsTrigger value="client"><Building2 className="size-4" />Client ({cl.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder={tab === 'project' ? 'Cari project, client, stack…' : 'Cari client atau industri…'} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Cari" />
        </div>
        <div role="group" aria-label="Status" className="inline-flex rounded-lg border bg-card p-0.5">
          {[['active', 'Aktif'], ['inactive', 'Nonaktif'], ['', 'Semua']].map(([v, label]) => (
            <button key={v} type="button" aria-pressed={f.status === v} onClick={() => setF({ ...f, status: v })}
              className={cn('rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', f.status === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{label}</button>
          ))}
        </div>
        {tab === 'project' && (
          <>
            <FormSelect className="w-auto min-w-44" value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} aria-label="Client">
              <option value="">Semua client</option>{cl.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FormSelect>
            <FormSelect className="w-auto min-w-40" value={f.complexity} onChange={(e) => setF({ ...f, complexity: e.target.value })} aria-label="Kompleksitas">
              <option value="">Semua kompleksitas</option>{Object.entries(COMPLEXITY).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </FormSelect>
          </>
        )}
        {filtered && <Button variant="ghost" size="sm" onClick={resetFilter}><RotateCcw />Reset</Button>}
      </div>

      {tab === 'project' ? (
        <Loading loading={projects.loading && !projects.data} error={projects.error}>
          {shownProjects.length === 0 ? emptyState('project') : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shownProjects.map((p) => <ProjectCard key={p.id} p={p} hr={hr} menu={menuFor('project', p)} onMembers={() => setMembers(p)} onEdit={() => openProject(p)} />)}
            </div>
          )}
        </Loading>
      ) : (
        <Loading loading={clients.loading && !clients.data} error={clients.error}>
          {shownClients.length === 0 ? emptyState('client') : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shownClients.map((c) => <ClientCard key={c.id} c={c} hr={hr} menu={menuFor('client', c)} onEdit={() => openClient(c)} onProjects={() => { setF({ ...f, q: '', client_id: String(c.id), status: '' }); setTab('project'); }} />)}
            </div>
          )}
        </Loading>
      )}

      {members && <MembersDrawer project={members} canAdd={hr} onChanged={reload} onClose={() => setMembers(null)} />}

      {modal?.kind === 'client' && (
        <Modal title={modal.id ? 'Ubah client' : 'Tambah client'} onClose={close}>
          <form onSubmit={saveClient}>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <GradientTile name={modal.data.name || 'Client'} />
              <div className="text-xs text-muted-foreground">{modal.id ? 'Perubahan nama berlaku di seluruh riwayat dan laporan.' : 'Client adalah pemilik project; perwakilannya dapat menilai developer pada project tersebut.'}</div>
            </div>
            <Field label="Nama client"><Input value={modal.data.name} onChange={(e) => upd('name', e.target.value)} required maxLength={200} autoFocus /></Field>
            <Field label="Industri">
              <Input list="industry-list" value={modal.data.industry} onChange={(e) => upd('industry', e.target.value)} placeholder="Pilih atau ketik industri" maxLength={200} />
              <datalist id="industry-list">{[...new Set([...INDUSTRIES, ...cl.map((c) => c.industry).filter(Boolean)])].map((i) => <option key={i} value={i} />)}</datalist>
            </Field>
            {modal.id && <ActiveToggle active={modal.data.active} onChange={(v) => upd('active', v)} label="Client aktif" hint="Client nonaktif tidak muncul pada pilihan baru." />}
            <ErrorBox error={error} />
            <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Batal</Button><Button disabled={busy}>{modal.id ? 'Simpan perubahan' : 'Tambah client'}</Button></div>
          </form>
        </Modal>
      )}

      {modal?.kind === 'project' && (
        <Modal title={modal.id ? 'Ubah project' : 'Tambah project'} onClose={close} wide>
          <form onSubmit={saveProject}>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Client">
                <FormSelect value={modal.data.client_id} onChange={(e) => upd('client_id', e.target.value)} required>
                  <option value="">Pilih client…</option>
                  {cl.filter((c) => c.active || String(c.id) === modal.data.client_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Nama project"><Input value={modal.data.name} onChange={(e) => upd('name', e.target.value)} required maxLength={200} autoFocus /></Field>
            </div>
            <div className="mb-3">
              <div className="mb-1.5 text-[13px] font-semibold">Kompleksitas</div>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Kompleksitas">
                {Object.entries(COMPLEXITY).map(([k, c]) => (
                  <button key={k} type="button" role="radio" aria-checked={modal.data.complexity === k} onClick={() => upd('complexity', k)}
                    className={cn('rounded-xl border p-3 text-left transition-all', modal.data.complexity === k ? cn('ring-2 ring-primary/60', c.cls) : 'hover:border-primary/40 hover:bg-muted/40')}>
                    <b className="block text-sm">{c.label}</b><span className="text-xs text-muted-foreground">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Tech stack" hint="Tambahkan satu per satu, tanpa koma" className="sm:col-span-2"><TagInput value={modal.data.tech_stack} onChange={(v) => upd('tech_stack', v)} suggestions={suggestions} placeholder="mis. React" aria-label="Tech stack" /></Field>
              <Field label="Project Manager" hint="PM menilai developer pada project ini" className="sm:col-span-2">
                <FormSelect value={modal.data.pm_user_id} onChange={(e) => upd('pm_user_id', e.target.value)}>
                  <option value="">— belum ada —</option>{pms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Mulai"><DatePicker value={modal.data.start_date} onChange={(e) => upd('start_date', e.target.value)} /></Field>
              <Field label="Selesai (kosongkan bila berjalan)"><DatePicker value={modal.data.end_date} onChange={(e) => upd('end_date', e.target.value)} /></Field>
            </div>
            {modal.id && <ActiveToggle active={modal.data.active} onChange={(v) => upd('active', v)} label="Project aktif" hint="Project nonaktif tidak muncul pada pilihan penugasan baru." />}
            {projectError && <p className="mt-2 text-xs font-semibold text-destructive">{projectError}</p>}
            <ErrorBox error={error} />
            <div className="mt-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Batal</Button><Button disabled={busy || !!projectError || !modal.data.client_id}>{modal.id ? 'Simpan perubahan' : 'Tambah project'}</Button></div>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function ActiveToggle({ active, onChange, label, hint }: { active?: any; onChange?: any; label?: any; hint?: any }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border p-3">
      <div className="leading-tight"><b className="text-sm">{label}</b><div className="text-xs text-muted-foreground">{hint}</div></div>
      <button
        type="button" role="switch" aria-checked={active} aria-label={label} onClick={() => onChange(!active)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40', active ? 'bg-primary' : 'bg-muted-foreground/30')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', active ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

function MembersDrawer({ project, canAdd, onChanged, onClose }: { project?: any; canAdd?: boolean; onChanged?: () => void; onClose?: any }) {
  const { data, error, loading, reload } = useLoad(() => api.get(`/projects/${project.id}/members?history=1`), [project.id]);
  const [adding, setAdding] = useState(false);
  const confirm = useConfirm();
  const { busy, error: actionError, run } = useAction();
  const all = data ?? [];
  const members = all.filter((m) => m.active);
  const past = all.filter((m) => !m.active);
  const done = (msg) => { toast.success(msg); reload(); onChanged?.(); };
  const end = async (m) => {
    if (!(await confirm({ title: `Akhiri penugasan ${m.name}?`, tone: 'warning', confirmText: 'Akhiri penugasan', description: 'Tanggal selesai diisi kemarin (hari terakhir penugasan) agar karyawan langsung tidak lagi dihitung anggota aktif. Riwayat penugasan tetap tersimpan.' }))) return;
    run(async () => { await api.patch(`/assignments/${m.assignment_id}`, { end_date: addDaysWib(-1) }); done(`Penugasan ${m.name} diakhiri`); });
  };
  const remove = async (m) => {
    if (!(await confirm({ title: `Hapus ${m.name} dari project?`, tone: 'danger', confirmText: 'Hapus', description: 'Catatan penugasan ini dihapus permanen sehingga hilang juga dari riwayat project karyawan. Bila hanya sudah selesai, gunakan "Akhiri" agar riwayat tetap tersimpan.' }))) return;
    run(async () => { await api.del(`/assignments/${m.assignment_id}`); done(`${m.name} dihapus dari project`); });
  };
  const MemberCard = (m, ended = false) => (
                <li key={m.assignment_id} className="rounded-xl border bg-card p-3.5">
                  <div className="flex items-start gap-3">
                    <PersonAvatar name={m.name} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <Link to={`/employees/${m.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">{m.name}</Link>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{m.seniority}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{m.code} · {m.department} · Lead: {m.lead_name ?? '—'}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium"><Briefcase className="size-3.5 text-muted-foreground" />{m.role || 'Tanpa peran'}</span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-3.5" />{longDate(m.start_date)} – {m.end_date ? longDate(m.end_date) : 'berjalan'}</span>
                      </div>
                      {m.tech_stack && <div className="mt-2"><Chips items={splitStack(m.tech_stack)} max={5} tone="blue" /></div>}
                    </div>
                    {canAdd && (
                      <div className="flex shrink-0 gap-1">
                        {!ended && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => end(m)} title="Isi tanggal selesai kemarin; riwayat penugasan tetap tersimpan"><LogOut />Akhiri</Button>}
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" disabled={busy} onClick={() => remove(m)} aria-label={`Hapus ${m.name} dari project`} title="Hapus dari project"><Trash2 className="size-4" /></Button>
                      </div>
                    )}
                  </div>
                </li>
    );
  return (
    <Drawer title={`Anggota — ${project.name}`} onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{project.client_name}</div>
          <div className="text-lg font-semibold">{loading && !data ? '…' : members.length} anggota aktif</div>
        </div>
        {canAdd && !adding && <Button onClick={() => setAdding(true)}><Plus />Tambah anggota</Button>}
      </div>
      {canAdd && adding && <AddMember project={project} memberIds={members.map((m) => m.id)} onCancel={() => setAdding(false)} onAdded={() => { setAdding(false); reload(); onChanged?.(); }} />}
      <ErrorBox error={actionError} />
      <Loading loading={loading && !data} error={error}>
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-10 text-center">
            <UsersRound className="mx-auto mb-2 size-8 text-muted-foreground/60" />
            <p className="font-medium">Belum ada anggota aktif</p>
            <p className="mt-1 text-xs text-muted-foreground">{canAdd ? 'Klik "Tambah anggota" untuk menugaskan karyawan ke project ini.' : 'Penugasan karyawan ke project ini akan tampil di sini.'}</p>
          </div>
        ) : (
          <ul className="grid gap-2.5">{members.map((m) => MemberCard(m))}</ul>
        )}
      </Loading>
      {past.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Riwayat penugasan selesai ({past.length})</h3>
          <ul className="grid gap-2.5 opacity-80">{past.map((m) => MemberCard(m, true))}</ul>
        </section>
      )}
    </Drawer>
  );
}

/** Cari karyawan aktif, pilih satu, isi peran dan tanggal, lalu simpan sebagai penugasan project. */
function AddMember({ project, memberIds, onCancel, onAdded }: { project: any; memberIds: number[]; onCancel: () => void; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const [pick, setPick] = useState<any>(null);
  const [f, setF] = useState({ role: '', start_date: todayWib(), end_date: '' });
  const { busy, error, run } = useAction();
  const found = useLoad(() => api.get<Paged<any>>('/employees' + qs({ status: 'active', q: dq, page: 1, size: 8 })), [dq]);
  const rows = found.data?.rows ?? [];
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post(`/employees/${pick.id}/assignments`, { project_id: project.id, role: f.role.trim() || null, start_date: f.start_date, end_date: f.end_date || null });
      toast.success(`${pick.name} ditambahkan ke ${project.name}`);
      onAdded();
    });
  };
  return (
    <form onSubmit={save} className="mb-4 grid gap-3 rounded-xl border bg-muted/20 p-3">
      <div className="text-sm font-semibold">Tambah anggota</div>
      {pick ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
          <div className="flex items-center gap-2.5"><PersonAvatar name={pick.name} className="size-8" /><div className="leading-tight"><div className="font-semibold">{pick.name}</div><div className="text-xs text-muted-foreground">{pick.code} · {pick.department} · {pick.seniority}</div></div></div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPick(null)}>Ganti</Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau kode karyawan" aria-label="Cari karyawan" /></div>
          <Loading loading={found.loading && !found.data} error={found.error}>
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {rows.map((r) => {
                const already = memberIds.includes(r.id);
                return (
                  <li key={r.id}>
                    <button type="button" disabled={already} onClick={() => setPick(r)} className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
                      <span className="flex min-w-0 items-center gap-2.5"><PersonAvatar name={r.name} className="size-7" /><span className="min-w-0 leading-tight"><span className="block truncate text-sm font-medium">{r.name}</span><span className="block truncate text-xs text-muted-foreground">{r.code} · {r.department} · {r.projects?.length ? `${r.projects.length} project berjalan` : 'belum ada project'}</span></span></span>
                      {already && <Badge tone="green">sudah anggota</Badge>}
                    </button>
                  </li>
                );
              })}
              {rows.length === 0 && <li className="px-1 py-3 text-center text-xs text-muted-foreground">Tidak ada karyawan aktif yang cocok.</li>}
            </ul>
            {found.data && found.data.total > rows.length && <p className="text-xs text-muted-foreground">Menampilkan {rows.length} dari {found.data.total} karyawan. Ketik nama untuk mempersempit.</p>}
          </Loading>
        </div>
      )}
      {pick && (
        <>
          <Field label="Peran di project"><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} maxLength={120} placeholder="mis. Frontend Developer" /></Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Mulai"><DatePicker value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} required /></Field>
            <Field label="Selesai (kosongkan bila berjalan)"><DatePicker value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          </div>
        </>
      )}
      <ErrorBox error={error} />
      <div className="flex gap-2"><Button disabled={busy || !pick || !f.start_date}>Simpan anggota</Button><Button type="button" variant="outline" onClick={onCancel}>Batal</Button></div>
    </form>
  );
}
