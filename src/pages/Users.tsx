import { useMemo, useState } from 'react';
import type { Department } from '../types.ts';
import { toast } from 'sonner';
import { Check, Copy, Eye, EyeOff, KeyRound, MoreHorizontal, Pencil, Plus, Power, RotateCcw, Search, ShieldCheck, Sparkles, UserCheck, UserX, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { PersonAvatar } from '@/components/employee-ui.tsx';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '../api.ts';
import { ROLE_LABEL, useAuth } from '../auth.tsx';
import { Badge, Card, ErrorBox, Field, Loading, Modal, Page, useAction, useLoad } from '../ui.tsx';

const ROLE_INFO = {
  super_admin: { desc: 'Akses penuh: konfigurasi, pengguna, dan audit log.', cls: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300', bar: 'bg-violet-500' },
  hr: { desc: 'Mengelola karyawan, periode, evaluator, publikasi hasil, dan laporan.', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300', bar: 'bg-emerald-500' },
  engineering_manager: { desc: 'Mereview dan menyetujui evaluasi divisinya serta melihat dashboard divisi.', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300', bar: 'bg-indigo-500' },
  tech_lead: { desc: 'Menilai anggota timnya sebagai Tech Lead.', cls: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300', bar: 'bg-blue-500' },
  project_manager: { desc: 'Menilai developer pada project yang dipegangnya.', cls: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300', bar: 'bg-cyan-500' },
  client_evaluator: { desc: 'Perwakilan klien: memberi feedback pada developer di project kliennya.', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300', bar: 'bg-amber-500' },
  employee: { desc: 'Mengisi self-assessment dan melihat hasil miliknya sendiri.', cls: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300', bar: 'bg-slate-400' },
};
const HEAD = 'text-xs uppercase tracking-wide text-muted-foreground';
const EMPTY = { email: '', name: '', role: 'employee', department: '', client_id: '', employee_id: '', password: '' };

function RoleBadge({ role }: { role?: any }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', ROLE_INFO[role]?.cls)}>{ROLE_LABEL[role] ?? role}</span>;
}

/** "5 mnt lalu", "kemarin", dst. dari string 'YYYY-MM-DD HH:MM:SS' (UTC dari server). */
function ago(s) {
  if (!s) return null;
  const t = new Date(String(s).replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(t)) return String(s);
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  return d === 1 ? 'kemarin' : d < 30 ? `${d} hari lalu` : new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
const daysSince = (s) => (s ? (Date.now() - new Date(String(s).replace(' ', 'T') + 'Z').getTime()) / 86400000 : Infinity);

/** Password acak yang memenuhi kebijakan (>= 10 karakter, huruf dan angka). */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  const pw = [...bytes].map((b) => chars[b % chars.length]).join('');
  return `${pw}${bytes[0] % 10}`; // pastikan ada angka
}
const pwChecks = (pw: string): [string, boolean][] => [['Minimal 10 karakter', pw.length >= 10], ['Mengandung huruf', /[a-zA-Z]/.test(pw)], ['Mengandung angka', /\d/.test(pw)]];

function PasswordField({ value, onChange, label = 'Password', required }: { value?: any; onChange?: any; label?: string; required?: any }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const checks = pwChecks(value);
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard tidak tersedia */ } };
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold">{label}</span>
        <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => { onChange(generatePassword()); setShow(true); }}><Sparkles />Buat otomatis</Button>
      </div>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} required={required} autoComplete="new-password" className="pr-20 font-mono" />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={show ? 'Sembunyikan' : 'Tampilkan'} onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Salin password" onClick={copy} disabled={!value}>{copied ? <Check className="text-emerald-600" /> : <Copy />}</Button>
        </div>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
        {checks.map(([t, ok]) => <li key={t} className={cn('flex items-center gap-1', ok ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground')}><Check className={cn('size-3', !ok && 'opacity-30')} />{t}</li>)}
      </ul>
    </div>
  );
}

function StatTile({ icon: Icon, tone, label, value, sub, children }: { icon?: any; tone?: any; label?: any; value?: any; sub?: any; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span>
        <div className="min-w-0"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="text-2xl font-extrabold leading-tight tracking-tight">{value}</div></div>
      </div>
      <div className="mt-2.5 text-xs text-muted-foreground">{children ?? sub}</div>
    </div>
  );
}

async function fetchAllEmployees() {
  const rows: any[] = [];
  for (let page = 1; ; page++) {
    const r = await api.get(`/employees?size=100&page=${page}`);
    rows.push(...r.rows);
    if (rows.length >= r.total || r.rows.length === 0) return rows;
  }
}

export default function Users() {
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useLoad(() => api.get('/users'));
  const clients = useLoad(() => api.get('/clients'));
  const depts = useLoad(() => api.get<Department[]>('/departments'));
  const emps = useLoad(fetchAllEmployees);
  const [form, setForm] = useState<any>(null);
  const [reset, setReset] = useState<any>(null); // { user, password }
  const [f, setF] = useState({ q: '', role: '', status: '' });
  const { busy, error: err, run, setError } = useAction();
  const open = (u) => { setError(null); setForm(u); };

  const users = data ?? [];
  const stats = useMemo(() => {
    const active = users.filter((u) => u.active);
    const byRole = Object.fromEntries(Object.keys(ROLE_INFO).map((r) => [r, active.filter((u) => u.role === r).length]));
    return {
      total: users.length, active: active.length, inactive: users.length - active.length, byRole,
      neverLogged: active.filter((u) => !u.last_login).length,
      recent: active.filter((u) => daysSince(u.last_login) <= 7).length,
    };
  }, [users]);

  const term = f.q.trim().toLowerCase();
  const shown = users.filter((u) => (!f.role || u.role === f.role)
    && (f.status === '' || (f.status === 'active') === u.active)
    && (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.employee_name ?? '').toLowerCase().includes(term)));
  const filtered = f.q || f.role || f.status;
  const linkedEmp = form?.employee_id ? (emps.data ?? []).find((x) => String(x.id) === String(form.employee_id)) : null;
  // memilih profil karyawan mengisi nama, email, dan departemen dari profil tersebut
  const pickEmployee = (e) => {
    const x = (emps.data ?? []).find((y) => String(y.id) === e.target.value);
    setForm(x
      ? { ...form, employee_id: e.target.value, name: x.name, email: form.id ? form.email : (x.email ?? form.email), department: form.role === 'engineering_manager' || form.department ? (form.department || x.department) : form.department }
      : { ...form, employee_id: '' });
  };
  const takenEmployees = new Set(users.filter((u) => u.employee_id && u.id !== form?.id).map((u) => u.employee_id));

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { name: form.name.trim(), role: form.role, department: form.department || null, client_id: form.client_id ? Number(form.client_id) : null, employee_id: form.employee_id ? Number(form.employee_id) : null };
      if (form.id) await api.patch(`/users/${form.id}`, body);
      else await api.post('/users', { ...body, email: form.email.trim(), password: form.password });
      toast.success(form.id ? `Pengguna ${form.name} diperbarui` : `Pengguna ${form.name} ditambahkan`);
      setForm(null); reload();
    });
  };

  const toggle = async (u) => {
    if (u.active && !(await confirm({
      title: 'Nonaktifkan pengguna?', tone: 'warning', confirmText: 'Nonaktifkan',
      description: `${u.name} tidak akan dapat login dan sesi yang sedang berjalan langsung berakhir. Riwayat penilaiannya tetap tersimpan.`,
    }))) return;
    run(async () => {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      toast.success(`${u.name} ${u.active ? 'dinonaktifkan' : 'diaktifkan'}`);
      reload();
    });
  };

  const doReset = (e) => {
    e.preventDefault();
    run(async () => {
      await api.patch(`/users/${reset.user.id}`, { password: reset.password });
      toast.success(`Password ${reset.user.name} direset; sesi lamanya berakhir`);
      setReset(null);
    });
  };

  const linked = (u) => {
    if (u.employee_name) return <span className="text-[13px]">{u.employee_name}<span className="ml-1 text-xs text-muted-foreground">{u.employee_code}</span></span>;
    if (u.client_name) return <span className="text-[13px]">{u.client_name}</span>;
    if (u.department) return <span className="text-[13px] text-muted-foreground">Divisi {u.department}</span>;
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <Page eyebrow="Administrasi" title="Pengguna" actions={<Button onClick={() => open({ ...EMPTY })}><Plus />Tambah pengguna</Button>}>
      <ErrorBox error={err && !form && !reset ? err : null} />
      <Loading loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatTile icon={UsersRound} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" label="Total pengguna" value={stats.total}>
                <b className="text-emerald-600 dark:text-emerald-300">{stats.active}</b> aktif · {stats.inactive} nonaktif
              </StatTile>
              <StatTile icon={ShieldCheck} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" label="Komposisi peran (aktif)" value={Object.keys(ROLE_INFO).filter((r) => stats.byRole[r] > 0).length}>
                <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Komposisi peran">
                  {Object.keys(ROLE_INFO).map((r) => stats.byRole[r] > 0 && <div key={r} className={ROLE_INFO[r].bar} style={{ width: `${(stats.byRole[r] / Math.max(1, stats.active)) * 100}%` }} title={`${ROLE_LABEL[r]}: ${stats.byRole[r]}`} />)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">{Object.keys(ROLE_INFO).filter((r) => stats.byRole[r] > 0).map((r) => <span key={r} className="flex items-center gap-1"><i className={cn('size-2 rounded-full', ROLE_INFO[r].bar)} />{ROLE_LABEL[r]} <b>{stats.byRole[r]}</b></span>)}</div>
              </StatTile>
              <StatTile
                icon={stats.neverLogged ? UserX : UserCheck}
                tone={stats.neverLogged ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'}
                label="Aktivitas login" value={stats.recent}
              >
                aktif dalam 7 hari terakhir · <b className={stats.neverLogged ? 'text-amber-600 dark:text-amber-300' : ''}>{stats.neverLogged}</b> belum pernah login
              </StatTile>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari nama, email, atau karyawan…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Cari pengguna" />
              </div>
              <FormSelect className="w-auto min-w-48" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label="Peran">
                <option value="">Semua peran</option>{Object.keys(ROLE_INFO).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </FormSelect>
              <div role="group" aria-label="Status" className="inline-flex rounded-lg border bg-card p-0.5">
                {[['', 'Semua', stats.total], ['active', 'Aktif', stats.active], ['inactive', 'Nonaktif', stats.inactive]].map(([v, label, n]) => (
                  <button key={v} type="button" aria-pressed={f.status === v} onClick={() => setF({ ...f, status: v })}
                    className={cn('rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', f.status === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                    {label}<span className="ml-1.5 text-[11px] opacity-70">{n}</span>
                  </button>
                ))}
              </div>
              {filtered && <Button variant="ghost" size="sm" onClick={() => setF({ q: '', role: '', status: '' })}><RotateCcw />Reset</Button>}
            </div>

            <Card className="py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={HEAD}>Pengguna</TableHead>
                    <TableHead className={HEAD}>Peran</TableHead>
                    <TableHead className={HEAD}>Terhubung ke</TableHead>
                    <TableHead className={HEAD}>Login terakhir</TableHead>
                    <TableHead className={HEAD}>Status</TableHead>
                    <TableHead className={HEAD}><span className="sr-only">Aksi</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((u) => (
                    <TableRow key={u.id} className={cn('hover:bg-muted/50', !u.active && 'opacity-70')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={u.name} />
                          <div className="min-w-0 leading-tight">
                            <b className="block truncate text-[14px]">{u.name}{u.id === me.id && <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">Anda</span>}</b>
                            <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><RoleBadge role={u.role} /></TableCell>
                      <TableCell>{linked(u)}</TableCell>
                      <TableCell className="whitespace-nowrap text-[13px]" title={u.last_login ?? ''}>{u.last_login ? ago(u.last_login) : <span className="text-muted-foreground">Belum pernah</span>}</TableCell>
                      <TableCell><Badge>{u.active ? 'active' : 'inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi untuk ${u.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onSelect={() => open({ ...u, department: u.department ?? '', client_id: u.client_id ?? '', employee_id: u.employee_id ?? '', password: '' })}><Pencil />Ubah pengguna</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setError(null); setReset({ user: u, password: '' }); }}><KeyRound />Reset password</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={busy || (u.id === me.id && u.active)} onSelect={() => toggle(u)}><Power />{u.active ? (u.id === me.id ? 'Tidak dapat menonaktifkan diri' : 'Nonaktifkan') : 'Aktifkan'}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {shown.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{users.length === 0 ? 'Belum ada pengguna.' : 'Tidak ada pengguna yang cocok dengan filter.'}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
            <p className="text-xs text-muted-foreground">Menampilkan {shown.length} dari {users.length} pengguna. Mengubah peran, mereset password, atau menonaktifkan akun langsung mengakhiri sesi pengguna tersebut. Semua perubahan tercatat di audit log.</p>
          </>
        )}
      </Loading>

      {form && (
        <Modal title={form.id ? 'Ubah pengguna' : 'Tambah pengguna'} onClose={() => setForm(null)} wide>
          <form onSubmit={save}>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <PersonAvatar name={form.name || '?'} className="size-11" textClass="text-sm" />
              <div className="min-w-0 leading-tight"><b className="block truncate">{form.name || 'Nama pengguna'}</b><span className="text-xs text-muted-foreground">{form.email || 'email@perusahaan.id'}</span></div>
              <div className="ml-auto"><RoleBadge role={form.role} /></div>
            </div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Nama" hint={linkedEmp ? 'Diambil dari profil karyawan' : undefined}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus disabled={!!linkedEmp} /></Field>
              {form.id
                ? <Field label="Email" hint="Email tidak dapat diubah"><Input value={form.email} disabled /></Field>
                : <Field label="Email" hint={linkedEmp?.email ? 'Diambil dari profil karyawan' : undefined}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!linkedEmp?.email} /></Field>}
              <Field label="Peran" className="sm:col-span-2">
                <FormSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, ...(e.target.value === 'client_evaluator' ? { employee_id: '' } : {}) })}>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect>
                <span className="mt-1 text-xs text-muted-foreground">{ROLE_INFO[form.role]?.desc}</span>
              </Field>
              {form.role === 'engineering_manager' && <Field label="Departemen (batas akses)" hint="Head of Department (Engineering Manager) hanya melihat karyawan di departemen ini"><FormSelect value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required><option value="">Pilih departemen…</option>{(depts.data ?? []).filter((d) => d.active || d.name === form.department).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</FormSelect></Field>}
              {form.role === 'client_evaluator' && (
                <Field label="Client" hint="Perwakilan hanya menilai developer di project milik client ini." className="sm:col-span-2">
                  <FormSelect value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required><option value="">Pilih client…</option>{(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</FormSelect>
                </Field>
              )}
              {form.role !== 'client_evaluator' && <Field
                label={form.role === 'employee' ? 'Profil karyawan' : 'Profil karyawan (opsional)'}
                hint={form.role === 'employee' ? 'Akun ini terhubung ke satu profil karyawan.' : 'Isi bila pengguna ini juga staf yang dievaluasi, agar menerima self-assessment.'}
                className={form.role === 'employee' ? '' : 'sm:col-span-2'}
              >
                <FormSelect value={form.employee_id} onChange={pickEmployee} required={form.role === 'employee'}>
                  <option value="">—</option>
                  {(emps.data ?? []).map((x) => <option key={x.id} value={x.id} disabled={takenEmployees.has(x.id)}>{x.code} — {x.name}{takenEmployees.has(x.id) ? ' (sudah punya akun)' : ''}</option>)}
                </FormSelect>
              </Field>}
            </div>
            {!form.id && <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />}
            {form.id && <p className="mb-3 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">Untuk mengganti password gunakan menu <b>Reset password</b> di daftar. Mengubah peran langsung mengakhiri sesi pengguna.</p>}
            <ErrorBox error={err} />
            <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setForm(null)}>Batal</Button><Button disabled={busy || (!form.id && pwChecks(form.password).some(([, ok]) => !ok))}>{form.id ? 'Simpan perubahan' : 'Tambah pengguna'}</Button></div>
          </form>
        </Modal>
      )}

      {reset && (
        <Modal title="Reset password" onClose={() => setReset(null)}>
          <form onSubmit={doReset}>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <PersonAvatar name={reset.user.name} className="size-11" textClass="text-sm" />
              <div className="leading-tight"><b className="block">{reset.user.name}</b><span className="text-xs text-muted-foreground">{reset.user.email}</span></div>
            </div>
            <PasswordField label="Password baru" value={reset.password} onChange={(v) => setReset({ ...reset, password: v })} required />
            <p className="mb-3 text-xs text-muted-foreground">Sampaikan password ini kepada pengguna lewat saluran yang aman. Semua sesi login lamanya akan berakhir.</p>
            <ErrorBox error={err} />
            <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setReset(null)}>Batal</Button><Button disabled={busy || pwChecks(reset.password).some(([, ok]) => !ok)}><KeyRound />Reset password</Button></div>
          </form>
        </Modal>
      )}
    </Page>
  );
}
