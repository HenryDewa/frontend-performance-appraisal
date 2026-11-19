import { useEffect, useState } from 'react';
import type { Department, Paged } from '../types.ts';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Check, Pencil, Plus, Power, Search, SlidersHorizontal, Trash2, UsersRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, qs } from '../api.ts';
import { PaginationBar } from '@/components/Pagination.tsx';
import { useDebounced } from '../lib/useDebounced.ts';
import { useAuth } from '../auth.tsx';
import { Badge, Card, ErrorBox, Loading, Modal, Page, useAction, useLoad } from '../ui.tsx';

function NameDialog({ title, initial = '', label, onClose, onSave }: { title?: any; initial?: string; label?: any; onClose?: any; onSave?: any }) {
  const [v, setV] = useState(initial);
  const { busy, error, run } = useAction();
  const submit = (e) => { e.preventDefault(); run(async () => { await onSave(v.trim()); onClose(); }); };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">{label}
          <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} maxLength={label === 'Posisi' ? 120 : 60} required />
        </label>
        <ErrorBox error={error} />
        <div className="flex gap-2"><Button disabled={busy || !v.trim()}>Simpan</Button><Button type="button" variant="outline" onClick={onClose}>Batal</Button></div>
      </form>
    </Modal>
  );
}

function DepartmentCard({ d, isAdmin, reload }: { d?: any; isAdmin?: any; reload?: any }) {
  const confirm = useConfirm();
  const [dialog, setDialog] = useState<any>(null); // { kind: 'rename' | 'position' | 'rename-position', pos? }
  const { run, error } = useAction();
  const act = (fn: () => Promise<any>, ok?: string) => run(async () => { await fn(); if (ok) toast.success(ok); reload(); });

  const removeDept = async () => {
    if (!(await confirm({ title: `Hapus departemen ${d.name}?`, tone: 'danger', confirmText: 'Hapus', description: 'Hanya bisa bila belum dipakai karyawan, pengguna, atau periode. Posisi dan konfigurasi sendiri ikut terhapus.' }))) return;
    act(() => api.del(`/departments/${d.id}`), 'Departemen dihapus');
  };
  const removePos = async (p) => {
    if (!(await confirm({ title: `Hapus posisi ${p.name}?`, tone: 'danger', confirmText: 'Hapus', description: 'Hanya bisa bila tidak dipakai karyawan; kalau dipakai, nonaktifkan saja.' }))) return;
    act(() => api.del(`/positions/${p.id}`), 'Posisi dihapus');
  };
  const cloneConfig = async () => {
    if (!(await confirm({ title: `Buat konfigurasi sendiri untuk ${d.name}?`, confirmText: 'Buat', description: 'Indikator, bobot, ambang, dan kebijakan disalin dari set default, lalu bisa diubah khusus departemen ini. Periode departemen ini selanjutnya memakai konfigurasi tersebut; periode lintas departemen tidak lagi bisa memuat karyawannya.' }))) return;
    act(() => api.post(`/departments/${d.id}/config`), 'Konfigurasi departemen dibuat');
  };
  const resetConfig = async () => {
    if (!(await confirm({ title: `Kembalikan ${d.name} ke konfigurasi default?`, tone: 'danger', confirmText: 'Kembalikan', description: 'Konfigurasi khusus departemen dihapus. Periode yang sudah dimulai tetap memakai snapshot-nya.' }))) return;
    act(() => api.del(`/departments/${d.id}/config`), 'Kembali ke konfigurasi default');
  };

  return (
    <Card
      title={<span className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" />{d.name}{!d.active && <Badge tone="gray">Nonaktif</Badge>}</span>}
      actions={(
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" aria-label={`Ubah nama ${d.name}`} onClick={() => setDialog({ kind: 'rename' })}><Pencil className="size-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={d.active ? `Nonaktifkan ${d.name}` : `Aktifkan ${d.name}`} onClick={() => act(() => api.patch(`/departments/${d.id}`, { active: !d.active }), d.active ? 'Departemen dinonaktifkan' : 'Departemen diaktifkan')}><Power className="size-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={`Hapus ${d.name}`} onClick={removeDept}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      )}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Link to={`/employees?department=${encodeURIComponent(d.name)}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><UsersRound className="size-4" />{d.employees} karyawan</Link>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posisi</h4>
            <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'position' })}><Plus className="size-4" />Tambah posisi</Button>
          </div>
          {d.positions.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada posisi — karyawan tidak bisa ditambahkan sebelum ada posisi.</p> : (
            <ul className="flex flex-wrap gap-2">
              {d.positions.map((p) => (
                <li key={p.id} className={cn('group inline-flex items-center gap-1 rounded-full border bg-muted/30 py-1 pl-3 pr-1 text-sm', !p.active && 'opacity-60')}>
                  <span className={cn(!p.active && 'line-through')}>{p.name}</span>
                  <button type="button" className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Ubah posisi ${p.name}`} onClick={() => setDialog({ kind: 'rename-position', pos: p })}><Pencil className="size-3" /></button>
                  <button type="button" className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={p.active ? `Nonaktifkan posisi ${p.name}` : `Aktifkan posisi ${p.name}`} onClick={() => act(() => api.patch(`/positions/${p.id}`, { active: !p.active }))}>{p.active ? <X className="size-3" /> : <Check className="size-3" />}</button>
                  <button type="button" className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Hapus posisi ${p.name}`} onClick={() => removePos(p)}><Trash2 className="size-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="text-sm">
              <div className="flex items-center gap-2 font-medium"><SlidersHorizontal className="size-4 text-muted-foreground" />Konfigurasi penilaian {d.own_config ? <Badge tone="blue">Khusus departemen</Badge> : <Badge tone="gray">Default</Badge>}</div>
              <p className="mt-1 text-xs text-muted-foreground">{d.own_config ? 'Indikator, bobot, ambang, dan kebijakan departemen ini terpisah dari default.' : 'Memakai set indikator dan bobot default bersama.'}</p>
            </div>
            <div className="flex gap-2">
              {d.own_config ? (
                <>
                  <Button size="sm" asChild><Link to={`/config?department=${encodeURIComponent(d.name)}`}>Kelola</Link></Button>
                  <Button size="sm" variant="outline" onClick={resetConfig}>Kembali ke default</Button>
                </>
              ) : <Button size="sm" variant="outline" onClick={cloneConfig}>Buat konfigurasi sendiri</Button>}
            </div>
          </div>
        )}
        <ErrorBox error={error} />
      </div>

      {dialog?.kind === 'rename' && <NameDialog title="Ubah nama departemen" label="Nama departemen" initial={d.name} onClose={() => setDialog(null)} onSave={async (name) => { await api.patch(`/departments/${d.id}`, { name }); toast.success('Nama departemen diubah'); reload(); }} />}
      {dialog?.kind === 'position' && <NameDialog title={`Tambah posisi — ${d.name}`} label="Posisi" onClose={() => setDialog(null)} onSave={async (name) => { await api.post(`/departments/${d.id}/positions`, { name }); toast.success('Posisi ditambahkan'); reload(); }} />}
      {dialog?.kind === 'rename-position' && <NameDialog title="Ubah nama posisi" label="Posisi" initial={dialog.pos.name} onClose={() => setDialog(null)} onSave={async (name) => { await api.patch(`/positions/${dialog.pos.id}`, { name }); toast.success('Posisi diubah'); reload(); }} />}
    </Card>
  );
}

export default function Departments() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const { data, error, loading, reload } = useLoad(() => api.get<Paged<Department>>('/departments' + qs({ page, size: 6, q: dq })), [page, dq]);
  const [adding, setAdding] = useState(false);
  // halaman terakhir yang kosong (mis. setelah menghapus) mundur satu halaman
  useEffect(() => { if (data && data.rows.length === 0 && page > 1) setPage(page - 1); }, [data, page]);
  return (
    <Page
      eyebrow="Organisasi" title="Departemen"
      actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" />Tambah departemen</Button>}
    >
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari departemen…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Cari departemen" />
      </div>
      <Loading loading={loading && !data} error={error}>
        {data && (
          <>
            {data.rows.length === 0 && <Card><p className="py-6 text-center text-sm text-muted-foreground">{dq ? 'Tidak ada departemen yang cocok.' : 'Belum ada departemen.'}</p></Card>}
            <div className="grid gap-4 xl:grid-cols-2">
              {data.rows.map((d) => <DepartmentCard key={d.id} d={d} isAdmin={user.role === 'super_admin'} reload={reload} />)}
            </div>
            <PaginationBar page={data.page} size={data.size} total={data.total} onPage={setPage} unit="departemen" />
          </>
        )}
      </Loading>
      {adding && <NameDialog title="Tambah departemen" label="Nama departemen" onClose={() => setAdding(false)} onSave={async (name) => { await api.post('/departments', { name }); toast.success('Departemen ditambahkan'); reload(); }} />}
    </Page>
  );
}
